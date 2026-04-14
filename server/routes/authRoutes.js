const express = require("express");
const bcrypt = require("bcryptjs");
const crypto = require("crypto");
const jwt = require("jsonwebtoken");
const User = require("../models/User");
const { isMailerConfigured, sendMail } = require("../utils/mailer");

const router = express.Router();

router.post("/signup", async (req, res) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ message: "Name, email, and password are required" });
    }

    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return res.status(409).json({ message: "User already exists" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = await User.create({
      name,
      email: email.toLowerCase(),
      password: hashedPassword,
    });

    const token = jwt.sign(
      { userId: newUser._id, email: newUser.email },
      process.env.JWT_SECRET || "dev_jwt_secret",
      { expiresIn: "7d" }
    );

    return res.status(201).json({
      message: "User created successfully",
      token,
      user: {
        id: newUser._id,
        name: newUser.name,
        email: newUser.email,
      },
    });
  } catch (error) {
    return res.status(500).json({ message: "Server error", error: error.message });
  }
});

router.post("/signin", async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: "Email and password are required" });
    }

    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const token = jwt.sign(
      { userId: user._id, email: user.email },
      process.env.JWT_SECRET || "dev_jwt_secret",
      { expiresIn: "7d" }
    );

    return res.status(200).json({
      message: "Sign in successful",
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
      },
    });
  } catch (error) {
    return res.status(500).json({ message: "Server error", error: error.message });
  }
});

router.post("/forgot-password", async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ message: "Email is required" });
    }

    const normalizedEmail = String(email).toLowerCase().trim();
    const user = await User.findOne({ email: normalizedEmail });

    const otp = String(Math.floor(100000 + Math.random() * 900000));
    const otpHash = crypto.createHash("sha256").update(otp).digest("hex");
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

    if (user) {
      user.passwordResetOtpHash = otpHash;
      user.passwordResetOtpExpiresAt = expiresAt;
      await user.save();

      const inProduction = process.env.NODE_ENV === "production";
      const mailerConfigured = isMailerConfigured();
      let emailSent = false;
      let mailErrorMessage = "";
      let mailInfo = null;

      if (!mailerConfigured) {
        const provider = String(process.env.EMAIL_PROVIDER || "smtp").toLowerCase();
        mailErrorMessage =
          provider === "resend"
            ? "Email provider is not configured (check RESEND_API_KEY and EMAIL_FROM)"
            : "SMTP is not configured (check SMTP_HOST/SMTP_PORT/SMTP_USER/SMTP_PASS/SMTP_FROM)";
        if (inProduction) {
          return res.status(500).json({ message: "Email service is not configured" });
        }
      } else {
        try {
          const info = await sendMail({
            to: user.email,
            subject: "Health Tracker password reset OTP",
            text: `Your password reset OTP is ${otp}. It expires in 10 minutes. If you did not request this, you can ignore this email.`,
          });
          emailSent = true;
          mailInfo = info
            ? {
              messageId: info.messageId,
              accepted: info.accepted,
              rejected: info.rejected,
              response: info.response,
            }
            : null;
        } catch (mailError) {
          mailErrorMessage = mailError?.message ? String(mailError.message) : "Failed to send email";
          if (inProduction) {
            return res.status(500).json({ message: "Failed to send OTP email" });
          }
        }
      }

      const response = {
        message: "If that email exists, an OTP has been sent.",
      };

      if (!inProduction) {
        response.emailSent = emailSent;
        if (mailInfo) {
          response.mailInfo = mailInfo;
        }
        if (!emailSent && mailErrorMessage) {
          response.mailError = mailErrorMessage;
        }
        const returnOtp = String(process.env.RETURN_OTP_IN_RESPONSE || "").toLowerCase() === "true";
        if (returnOtp) {
          response.otp = otp;
          response.expiresAt = expiresAt;
        }
      }

      return res.status(200).json(response);
    }

    return res.status(200).json({ message: "If that email exists, an OTP has been sent." });
  } catch (error) {
    return res.status(500).json({ message: "Server error", error: error.message });
  }
});

router.post("/reset-password", async (req, res) => {
  try {
    const { email, otp, newPassword } = req.body;
    if (!email || !otp || !newPassword) {
      return res.status(400).json({ message: "Email, otp, and newPassword are required" });
    }

    if (String(newPassword).length < 6) {
      return res.status(400).json({ message: "Password must be at least 6 characters" });
    }

    const normalizedEmail = String(email).toLowerCase().trim();
    const user = await User.findOne({ email: normalizedEmail });
    if (!user || !user.passwordResetOtpHash || !user.passwordResetOtpExpiresAt) {
      return res.status(400).json({ message: "Invalid or expired OTP" });
    }
    if (user.passwordResetOtpExpiresAt.getTime() <= Date.now()) {
      return res.status(400).json({ message: "Invalid or expired OTP" });
    }

    const providedHash = crypto.createHash("sha256").update(String(otp)).digest("hex");
    const expectedBuffer = Buffer.from(String(user.passwordResetOtpHash), "hex");
    const providedBuffer = Buffer.from(providedHash, "hex");
    const otpMatches =
      expectedBuffer.length === providedBuffer.length && crypto.timingSafeEqual(expectedBuffer, providedBuffer);
    if (!otpMatches) {
      return res.status(400).json({ message: "Invalid or expired OTP" });
    }

    const hashedPassword = await bcrypt.hash(String(newPassword), 10);
    user.password = hashedPassword;
    user.passwordResetOtpHash = null;
    user.passwordResetOtpExpiresAt = null;
    await user.save();

    return res.status(200).json({ message: "Password updated successfully" });
  } catch (error) {
    return res.status(500).json({ message: "Server error", error: error.message });
  }
});

router.post("/verify-reset-otp", async (req, res) => {
  try {
    const { email, otp } = req.body;
    if (!email || !otp) {
      return res.status(400).json({ message: "Email and otp are required" });
    }

    const normalizedEmail = String(email).toLowerCase().trim();
    const user = await User.findOne({ email: normalizedEmail });
    if (!user || !user.passwordResetOtpHash || !user.passwordResetOtpExpiresAt) {
      return res.status(400).json({ message: "Invalid or expired OTP" });
    }
    if (user.passwordResetOtpExpiresAt.getTime() <= Date.now()) {
      return res.status(400).json({ message: "Invalid or expired OTP" });
    }

    const providedHash = crypto.createHash("sha256").update(String(otp)).digest("hex");
    const expectedBuffer = Buffer.from(String(user.passwordResetOtpHash), "hex");
    const providedBuffer = Buffer.from(providedHash, "hex");
    const otpMatches =
      expectedBuffer.length === providedBuffer.length && crypto.timingSafeEqual(expectedBuffer, providedBuffer);
    if (!otpMatches) {
      return res.status(400).json({ message: "Invalid or expired OTP" });
    }

    return res.status(200).json({ message: "OTP verified" });
  } catch (error) {
    return res.status(500).json({ message: "Server error", error: error.message });
  }
});

module.exports = router;
