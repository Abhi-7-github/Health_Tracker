import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { signUp } from "../api";

function SignUpPage() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [status, setStatus] = useState({ loading: false, error: "", success: "" });

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((previous) => ({ ...previous, [name]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setStatus({ loading: true, error: "", success: "" });

    try {
      const data = await signUp(form);
      localStorage.setItem("token", data.token);
      localStorage.setItem("user", JSON.stringify(data.user));
      setStatus({ loading: false, error: "", success: "Account created successfully" });
      navigate("/signin");
    } catch (error) {
      setStatus({ loading: false, error: error.message, success: "" });
    }
  };

  return (
    <section className="auth-section" aria-labelledby="signup-title">
      <div className="auth-card">
        <h1 id="signup-title">Create Your Account</h1>
        <p className="auth-subtitle">Start tracking your health with a clear and simple dashboard.</p>

        <form className="auth-form" onSubmit={handleSubmit}>
          <label htmlFor="signup-name">Full Name</label>
          <input
            id="signup-name"
            name="name"
            type="text"
            placeholder="Your full name"
            value={form.name}
            onChange={handleChange}
            required
          />

          <label htmlFor="signup-email">Email</label>
          <input
            id="signup-email"
            name="email"
            type="email"
            placeholder="you@example.com"
            value={form.email}
            onChange={handleChange}
            required
          />

          <label htmlFor="signup-password">Password</label>
          <input
            id="signup-password"
            name="password"
            type="password"
            placeholder="Choose a password"
            value={form.password}
            onChange={handleChange}
            required
            minLength={6}
          />

          <button type="submit" className="btn-primary" disabled={status.loading}>
            {status.loading ? "Creating..." : "Sign Up"}
          </button>

          {status.error ? <p className="auth-message error">{status.error}</p> : null}
          {status.success ? <p className="auth-message success">{status.success}</p> : null}
        </form>

        <p className="auth-helper">
          Already have an account? <Link to="/signin">Sign in</Link>
        </p>
      </div>
    </section>
  );
}

export default SignUpPage;
