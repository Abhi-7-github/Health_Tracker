import { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { forgotPassword, resetPassword, signIn, verifyResetOtp } from "../api";

function SignInPage() {
  const navigate = useNavigate();
  const [view, setView] = useState("signin");
  const [form, setForm] = useState({ email: "", password: "" });
  const [resetForm, setResetForm] = useState({ email: "", otp: "", newPassword: "", confirmPassword: "" });
  const [otpVerified, setOtpVerified] = useState(false);
  const [status, setStatus] = useState({ loading: false, error: "", success: "" });

  const title = useMemo(() => {
		if (view === "forgot") return "Reset your password";
		if (view === "reset") return "Choose a new password";
		return "Welcome Back";
	}, [view]);

  const subtitle = useMemo(() => {
		if (view === "forgot") return "Enter your account email to receive a reset token.";
		if (view === "reset") return "Use the reset token and set a new password.";
		return "Sign in to continue managing your health records.";
	}, [view]);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((previous) => ({ ...previous, [name]: value }));
  };

  const handleResetChange = (event) => {
		const { name, value } = event.target;
		setResetForm((previous) => ({ ...previous, [name]: value }));
    if (name === "otp") {
      setOtpVerified(false);
    }
	};

  const handleSubmit = async (event) => {
    event.preventDefault();
    setStatus({ loading: true, error: "", success: "" });

    try {
      const data = await signIn(form);
      localStorage.setItem("token", data.token);
      localStorage.setItem("user", JSON.stringify(data.user));
      setStatus({ loading: false, error: "", success: "Sign in successful" });
      navigate("/dashboard");
    } catch (error) {
      setStatus({ loading: false, error: error.message, success: "" });
    }
  };

  const handleRequestReset = async (event) => {
    event.preventDefault();
    setStatus({ loading: true, error: "", success: "" });

    try {
      const data = await forgotPassword({ email: resetForm.email });
      const successMessage = data.message || "If that email exists, an OTP has been sent.";
      const emailNotSentMessage =
        data?.emailSent === false
          ? `OTP email was not sent (SMTP not configured or failed). ${data?.mailError ? `Reason: ${data.mailError}` : ""}`.trim()
          : "";
      setStatus({ loading: false, error: emailNotSentMessage, success: successMessage });
      setResetForm((previous) => ({
        ...previous,
        otp: "",
      }));
      setOtpVerified(false);
      setView("reset");
    } catch (error) {
      setStatus({ loading: false, error: error.message, success: "" });
    }
  };

  const handleVerifyOtp = async () => {
    setStatus({ loading: true, error: "", success: "" });
    try {
      const data = await verifyResetOtp({ email: resetForm.email, otp: resetForm.otp });
      setOtpVerified(true);
      setStatus({ loading: false, error: "", success: data.message || "OTP verified" });
    } catch (error) {
      setOtpVerified(false);
      setStatus({ loading: false, error: error.message, success: "" });
    }
  };

  const handleResetPassword = async (event) => {
    event.preventDefault();
    setStatus({ loading: true, error: "", success: "" });

    if (resetForm.newPassword !== resetForm.confirmPassword) {
      setStatus({ loading: false, error: "Passwords do not match", success: "" });
      return;
    }

    try {
      const data = await resetPassword({ email: resetForm.email, otp: resetForm.otp, newPassword: resetForm.newPassword });
      setStatus({ loading: false, error: "", success: data.message || "Password updated. You can sign in now." });
      setForm((previous) => ({ ...previous, password: "" }));
      setResetForm({ email: "", otp: "", newPassword: "", confirmPassword: "" });
      setView("signin");
    } catch (error) {
      setStatus({ loading: false, error: error.message, success: "" });
    }
  };

  return (
    <section className="auth-section" aria-labelledby="signin-title">
      <div className="auth-card">
      <h1 id="signin-title">{title}</h1>
      <p className="auth-subtitle">
        {view === "forgot" ? "Enter your account email to receive an OTP." : null}
        {view === "reset" ? "Verify the OTP, then set a new password." : null}
        {view === "signin" ? subtitle : null}
      </p>

      {view === "signin" ? (
        <form className="auth-form" onSubmit={handleSubmit}>
          <label htmlFor="signin-email">Email</label>
          <input
            id="signin-email"
            name="email"
            type="email"
            placeholder="you@example.com"
            value={form.email}
            onChange={handleChange}
            required
          />

          <label htmlFor="signin-password">Password</label>
          <input
            id="signin-password"
            name="password"
            type="password"
            placeholder="Enter your password"
            value={form.password}
            onChange={handleChange}
            required
          />

          <div className="auth-inline-actions">
            <button
              type="button"
              className="auth-link-button"
              onClick={() => {
                setStatus({ loading: false, error: "", success: "" });
                setResetForm((previous) => ({ ...previous, email: form.email }));
                setView("forgot");
              }}
            >
              Forgot password?
            </button>
          </div>

          <button type="submit" className="btn-primary" disabled={status.loading}>
            {status.loading ? "Signing in..." : "Sign In"}
          </button>

          {status.error ? <p className="auth-message error">{status.error}</p> : null}
          {status.success ? <p className="auth-message success">{status.success}</p> : null}
        </form>
      ) : null}

      {view === "forgot" ? (
        <form className="auth-form" onSubmit={handleRequestReset}>
          <label htmlFor="forgot-email">Email</label>
          <input
            id="forgot-email"
            name="email"
            type="email"
            placeholder="you@example.com"
            value={resetForm.email}
            onChange={handleResetChange}
            required
          />

          <button type="submit" className="btn-primary" disabled={status.loading}>
            {status.loading ? "Requesting..." : "Send OTP"}
          </button>

          <button
            type="button"
            className="auth-link-button"
            onClick={() => {
              setStatus({ loading: false, error: "", success: "" });
              setView("signin");
            }}
            disabled={status.loading}
          >
            Back to sign in
          </button>

          {status.error ? <p className="auth-message error">{status.error}</p> : null}
          {status.success ? <p className="auth-message success">{status.success}</p> : null}
        </form>
      ) : null}

      {view === "reset" ? (
        <form className="auth-form" onSubmit={handleResetPassword}>
          <label htmlFor="reset-otp">OTP</label>
          <input
            id="reset-otp"
            name="otp"
            type="text"
            placeholder="Enter the 6-digit OTP"
            value={resetForm.otp}
            onChange={handleResetChange}
            required
            autoComplete="off"
          />

          <button
            type="button"
            className="btn-primary"
            onClick={handleVerifyOtp}
            disabled={status.loading || !resetForm.otp}
          >
            {status.loading ? "Verifying..." : otpVerified ? "OTP verified" : "Verify OTP"}
          </button>

          {otpVerified ? (
            <>
              <label htmlFor="reset-new-password">New password</label>
              <input
                id="reset-new-password"
                name="newPassword"
                type="password"
                placeholder="Enter a new password"
                value={resetForm.newPassword}
                onChange={handleResetChange}
                required
                minLength={6}
              />

              <label htmlFor="reset-confirm-password">Confirm new password</label>
              <input
                id="reset-confirm-password"
                name="confirmPassword"
                type="password"
                placeholder="Re-enter the new password"
                value={resetForm.confirmPassword}
                onChange={handleResetChange}
                required
                minLength={6}
              />

              <button type="submit" className="btn-primary" disabled={status.loading}>
                {status.loading ? "Updating..." : "Update password"}
              </button>
            </>
          ) : null}

          <button
            type="button"
            className="auth-link-button"
            onClick={() => {
              setStatus({ loading: false, error: "", success: "" });
              setOtpVerified(false);
              setView("signin");
            }}
            disabled={status.loading}
          >
            Back to sign in
          </button>

          {status.error ? <p className="auth-message error">{status.error}</p> : null}
          {status.success ? <p className="auth-message success">{status.success}</p> : null}
        </form>
      ) : null}

      {view === "signin" ? (
        <p className="auth-helper">
          New here? <Link to="/signup">Create an account</Link>
        </p>
      ) : null}
      </div>
    </section>
  );
}

export default SignInPage;
