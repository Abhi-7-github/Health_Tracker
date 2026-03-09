import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { signIn } from "../api";

function SignInPage() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: "", password: "" });
  const [status, setStatus] = useState({ loading: false, error: "", success: "" });

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((previous) => ({ ...previous, [name]: value }));
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

  return (
    <section className="auth-section" aria-labelledby="signin-title">
      <div className="auth-card">
        <h1 id="signin-title">Welcome Back</h1>
        <p className="auth-subtitle">Sign in to continue managing your health records.</p>

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

          <button type="submit" className="btn-primary" disabled={status.loading}>
            {status.loading ? "Signing in..." : "Sign In"}
          </button>

          {status.error ? <p className="auth-message error">{status.error}</p> : null}
          {status.success ? <p className="auth-message success">{status.success}</p> : null}
        </form>

        <p className="auth-helper">
          New here? <Link to="/signup">Create an account</Link>
        </p>
      </div>
    </section>
  );
}

export default SignInPage;
