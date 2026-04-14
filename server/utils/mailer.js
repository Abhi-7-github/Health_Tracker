const nodemailer = require("nodemailer");
const https = require("https");

function getEmailProvider() {
	if (process.env.EMAIL_PROVIDER) {
		return String(process.env.EMAIL_PROVIDER).toLowerCase();
	}
	// If user didn't explicitly choose, prefer Resend when configured (works on hosts that block SMTP).
	if (process.env.RESEND_API_KEY) {
		return "resend";
	}
	return "smtp";
}

function getSmtpConfig() {
	const smtpPass = process.env.SMTP_PASS ? String(process.env.SMTP_PASS).replace(/\s+/g, "") : undefined;
	return {
		host: process.env.SMTP_HOST,
		port: Number(process.env.SMTP_PORT || 587),
		secure: String(process.env.SMTP_SECURE || "").toLowerCase() === "true",
		requireTLS: String(process.env.SMTP_REQUIRE_TLS || "").toLowerCase() === "true" || Number(process.env.SMTP_PORT || 587) === 587,
		connectionTimeout: Number(process.env.SMTP_CONNECTION_TIMEOUT_MS || 10000),
		greetingTimeout: Number(process.env.SMTP_GREETING_TIMEOUT_MS || 10000),
		socketTimeout: Number(process.env.SMTP_SOCKET_TIMEOUT_MS || 10000),
		auth: process.env.SMTP_USER
			? {
				user: process.env.SMTP_USER,
				pass: smtpPass,
			}
			: undefined,
	};
}

function isMailerConfigured() {
	const fromAddress = process.env.EMAIL_FROM || process.env.SMTP_FROM;
	const provider = getEmailProvider();

	if (provider === "resend") {
		return Boolean(process.env.RESEND_API_KEY && fromAddress);
	}

	return Boolean(
		process.env.SMTP_HOST &&
		process.env.SMTP_PORT &&
		fromAddress &&
		process.env.SMTP_USER &&
		process.env.SMTP_PASS
	);
}

async function sendMailWithResend({ to, subject, text }) {
	const apiKey = process.env.RESEND_API_KEY;
	const fromAddress = process.env.EMAIL_FROM || process.env.SMTP_FROM;

	if (!apiKey || !fromAddress) {
		const error = new Error("Resend is not configured (missing RESEND_API_KEY/EMAIL_FROM)");
		error.code = "RESEND_NOT_CONFIGURED";
		throw error;
	}

	const payload = JSON.stringify({
		from: fromAddress,
		to,
		subject,
		text,
	});

	// Prefer global fetch when available (Node 18+).
	if (typeof fetch === "function") {
		const response = await fetch("https://api.resend.com/emails", {
			method: "POST",
			headers: {
				Authorization: `Bearer ${apiKey}`,
				"Content-Type": "application/json",
			},
			body: payload,
		});

		const body = await response.json().catch(() => ({}));
		if (!response.ok) {
			const message = body?.message || body?.error || `Resend request failed (${response.status})`;
			throw new Error(message);
		}

		return {
			messageId: body?.id,
			accepted: [to],
			rejected: [],
			response: "resend",
		};
	}

	// Fallback for older Node versions without fetch.
	const body = await new Promise((resolve, reject) => {
		const req = https.request(
			{
				method: "POST",
				hostname: "api.resend.com",
				path: "/emails",
				headers: {
					Authorization: `Bearer ${apiKey}`,
					"Content-Type": "application/json",
					"Content-Length": Buffer.byteLength(payload),
				},
			},
			(res) => {
				let data = "";
				res.on("data", (chunk) => {
					data += chunk;
				});
				res.on("end", () => {
					let parsed = {};
					try {
						parsed = data ? JSON.parse(data) : {};
					} catch {
						parsed = {};
					}
					if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
						return resolve(parsed);
					}
					const message = parsed?.message || parsed?.error || `Resend request failed (${res.statusCode})`;
					return reject(new Error(message));
				});
			}
		);
		req.on("error", reject);
		req.write(payload);
		req.end();
	});

	return {
		messageId: body?.id,
		accepted: [to],
		rejected: [],
		response: "resend",
	};
}

async function sendMail({ to, subject, text }) {
	if (!isMailerConfigured()) {
		const provider = getEmailProvider();
		const error = new Error(
			provider === "resend"
				? "Email provider is not configured (missing RESEND_API_KEY/EMAIL_FROM)"
				: "SMTP is not configured (missing SMTP_HOST/SMTP_PORT/SMTP_USER/SMTP_PASS/SMTP_FROM)"
		);
		error.code = provider === "resend" ? "RESEND_NOT_CONFIGURED" : "SMTP_NOT_CONFIGURED";
		throw error;
	}

	const provider = getEmailProvider();
	if (provider === "resend") {
		return sendMailWithResend({ to, subject, text });
	}

	const transporter = nodemailer.createTransport(getSmtpConfig());
	try {
		return await transporter.sendMail({
			from: process.env.EMAIL_FROM || process.env.SMTP_FROM,
			to,
			subject,
			text,
		});
	} catch (smtpError) {
		const canFallbackToResend = Boolean(process.env.RESEND_API_KEY && (process.env.EMAIL_FROM || process.env.SMTP_FROM));
		const smtpCode = smtpError?.code ? String(smtpError.code) : "";
		const smtpMessage = smtpError?.message ? String(smtpError.message) : "";
		const looksLikeNetworkIssue =
			/timeout/i.test(smtpMessage) ||
			["ETIMEDOUT", "ESOCKET", "ECONNECTION", "ECONNRESET", "EAI_AGAIN", "ENOTFOUND"].includes(smtpCode);

		if (canFallbackToResend && looksLikeNetworkIssue) {
			try {
				return await sendMailWithResend({ to, subject, text });
			} catch (resendError) {
				// Prefer the original SMTP error, but include context.
				smtpError.fallbackError = resendError;
				throw smtpError;
			}
		}

		throw smtpError;
	}
}

module.exports = {
	isMailerConfigured,
	sendMail,
};
