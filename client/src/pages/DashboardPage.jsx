import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { fetchDashboard, generateDashboard } from "../api";

function DashboardPage() {
  const navigate = useNavigate();
  const user = useMemo(() => {
    try {
      return JSON.parse(localStorage.getItem("user") || "{}");
    } catch {
      return {};
    }
  }, []);

  const [form, setForm] = useState({
    age: "",
    height: "",
    weight: "",
    stepsToday: "",
    sleepHours: "",
  });
  const [status, setStatus] = useState({ loading: false, error: "", success: "" });
  const [suggestions, setSuggestions] = useState([]);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      navigate("/signin");
      return;
    }

    async function loadDashboard() {
      try {
        const response = await fetchDashboard();
        const data = response.data || {};
        setForm({
          age: data.age ? String(data.age) : "",
          height: data.height ? String(data.height) : "",
          weight: data.weight ? String(data.weight) : "",
          stepsToday: data.stepsToday ? String(data.stepsToday) : "",
          sleepHours: data.sleepHours ? String(data.sleepHours) : "",
        });
      } catch (error) {
        setStatus({ loading: false, error: error.message, success: "" });
      }
    }

    loadDashboard();
  }, [navigate]);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((previous) => ({ ...previous, [name]: value }));
  };

  const handleGenerate = async (event) => {
    event.preventDefault();

    const isMissingRequired = Object.values(form).some((value) => String(value).trim() === "");
    if (isMissingRequired) {
      setStatus({ loading: false, error: "Please fill all dashboard details.", success: "" });
      return;
    }

    setStatus({ loading: true, error: "", success: "" });

    try {
      const response = await generateDashboard(form);
      setSuggestions(response.suggestions || []);
      setStatus({ loading: false, error: "", success: response.message || "Generated successfully" });
      navigate("/report", {
        state: {
          metrics: {
            age: Number(form.age) || 0,
            height: Number(form.height) || 0,
            weight: Number(form.weight) || 0,
            stepsToday: Number(form.stepsToday) || 0,
            sleepHours: Number(form.sleepHours) || 0,
          },
        },
      });
    } catch (error) {
      setStatus({ loading: false, error: error.message, success: "" });
    }
  };

  return (
    <section className="dashboard-section" aria-labelledby="dashboard-title">
      <div className="dashboard-card">
        <h1 id="dashboard-title">Welcome, {user?.name || "Name"}</h1>
        <p className="dashboard-subtitle">Good to see you again. Please provide your details.</p>

        <form className="dashboard-form" onSubmit={handleGenerate}>
          <label htmlFor="age">AGE:</label>
          <input id="age" name="age" type="number" value={form.age} onChange={handleChange} min="1" required />

          <label htmlFor="height">HEIGHT:</label>
          <input id="height" name="height" type="number" value={form.height} onChange={handleChange} min="1" required />

          <label htmlFor="weight">WEIGHT:</label>
          <input id="weight" name="weight" type="number" value={form.weight} onChange={handleChange} min="1" required />

          <label htmlFor="stepsToday">STEPS FOR TODAY:</label>
          <input id="stepsToday" name="stepsToday" type="number" value={form.stepsToday} onChange={handleChange} min="0" required />

          <label htmlFor="sleepHours">SLEEP:</label>
          <input id="sleepHours" name="sleepHours" type="number" value={form.sleepHours} onChange={handleChange} min="0" step="0.5" required />

          <div className="dashboard-actions">
            <button type="submit" className="btn-generate" disabled={status.loading}>
              {status.loading ? "Generating..." : "Generate"}
            </button>
          </div>
        </form>

        {status.error ? <p className="auth-message error">{status.error}</p> : null}
        {status.success ? <p className="auth-message success">{status.success}</p> : null}

        {suggestions.length ? (
          <div className="suggestions-box">
            <p>Suggestions:</p>
            <ul>
              {suggestions.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>
        ) : null}
      </div>
    </section>
  );
}

export default DashboardPage;
