const nodemailer = require("nodemailer");

function getSmtpConfig() {
	const smtpPass = process.env.SMTP_PASS ? String(process.env.SMTP_PASS).replace(/\s+/g, "") : undefined;
	return {
		host: process.env.SMTP_HOST,
		port: Number(process.env.SMTP_PORT || 587),
		secure: String(process.env.SMTP_SECURE || "").toLowerCase() === "true",
		requireTLS: String(process.env.SMTP_REQUIRE_TLS || "").toLowerCase() === "true" || Number(process.env.SMTP_PORT || 587) === 587,
		auth: process.env.SMTP_USER
			? {
				user: process.env.SMTP_USER,
				pass: smtpPass,
			}
			: undefined,
	};
}

function isMailerConfigured() {
	return Boolean(
		process.env.SMTP_HOST &&
		process.env.SMTP_PORT &&
		process.env.SMTP_FROM &&
		process.env.SMTP_USER &&
		process.env.SMTP_PASS
	);
}

async function sendMail({ to, subject, text }) {
	if (!isMailerConfigured()) {
		const error = new Error("SMTP is not configured (missing SMTP_HOST/SMTP_PORT/SMTP_FROM)");
		error.code = "SMTP_NOT_CONFIGURED";
		throw error;
	}

	const transporter = nodemailer.createTransport(getSmtpConfig());
	await transporter.verify();

	return transporter.sendMail({
		from: process.env.SMTP_FROM,
		to,
		subject,
		text,
	});
}

module.exports = {
	isMailerConfigured,
	sendMail,
};
