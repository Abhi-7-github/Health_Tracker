const nodemailer = require("nodemailer");

function getEmailProvider() {
	return String(process.env.EMAIL_PROVIDER || "smtp").toLowerCase();
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

	const response = await fetch("https://api.resend.com/emails", {
		method: "POST",
		headers: {
			Authorization: `Bearer ${apiKey}`,
			"Content-Type": "application/json",
		},
		body: JSON.stringify({
			from: fromAddress,
			to,
			subject,
			text,
		}),
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

async function sendMail({ to, subject, text }) {
	if (!isMailerConfigured()) {
		const provider = getEmailProvider();
		const error = new Error(
			provider === "resend"
				? "Email provider is not configured (missing RESEND_API_KEY/EMAIL_FROM)"
				: "SMTP is not configured (missing SMTP_HOST/SMTP_PORT/SMTP_USER/SMTP_PASS/SMTP_FROM)"
		);
		error.code = "SMTP_NOT_CONFIGURED";
		throw error;
	}

	const provider = getEmailProvider();
	if (provider === "resend") {
		return sendMailWithResend({ to, subject, text });
	}

	const transporter = nodemailer.createTransport(getSmtpConfig());

	return transporter.sendMail({
		from: process.env.EMAIL_FROM || process.env.SMTP_FROM,
		to,
		subject,
		text,
	});
}

module.exports = {
	isMailerConfigured,
	sendMail,
};
