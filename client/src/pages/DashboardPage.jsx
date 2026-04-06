import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { fetchDashboard, generateDashboard, submitEmotion } from "../api";

const emotionalQuestions = [
  "I feel calm and in control today.",
  "I can handle my daily responsibilities.",
  "I am sleeping with a relaxed mind.",
  "I feel supported by people around me.",
  "I can focus on my tasks without stress.",
  "I feel optimistic about the day ahead.",
];

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
    temperature: "",
    bpSystolic: "",
    bpDiastolic: "",
    sugarLevel: "",
  });
  const [status, setStatus] = useState({ loading: false, error: "", success: "" });
  const [suggestions, setSuggestions] = useState([]);
  const [emotionStatus, setEmotionStatus] = useState({ loading: false, error: "", success: "" });
  const [emotionResult, setEmotionResult] = useState({ emotionalState: "", emotionalScore: 0 });
  const [emotionalAnswers, setEmotionalAnswers] = useState(() => emotionalQuestions.map(() => 0));

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
          temperature: data.temperature ? String(data.temperature) : "",
          bpSystolic: data.bpSystolic ? String(data.bpSystolic) : "",
          bpDiastolic: data.bpDiastolic ? String(data.bpDiastolic) : "",
          sugarLevel: data.sugarLevel ? String(data.sugarLevel) : "",
        });
        setEmotionResult({
          emotionalState: data.emotionalState || "",
          emotionalScore: Number(data.emotionalScore) || 0,
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

    const requiredFields = ["age", "height", "weight", "stepsToday", "sleepHours"];
    const isMissingRequired = requiredFields.some((field) => String(form[field]).trim() === "");
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
            temperature: Number(form.temperature) || 0,
            bpSystolic: Number(form.bpSystolic) || 0,
            bpDiastolic: Number(form.bpDiastolic) || 0,
            sugarLevel: Number(form.sugarLevel) || 0,
          },
        },
      });
    } catch (error) {
      setStatus({ loading: false, error: error.message, success: "" });
    }
  };

  const handleEmotionAnswer = (index, value) => {
    setEmotionalAnswers((previous) => {
      const next = [...previous];
      next[index] = value;
      return next;
    });
  };

  const handleEmotionSubmit = async () => {
    const hasMissing = emotionalAnswers.some((value) => value <= 0);
    if (hasMissing) {
      setEmotionStatus({ loading: false, error: "Please rate every question.", success: "" });
      return;
    }

    setEmotionStatus({ loading: true, error: "", success: "" });
    try {
      const response = await submitEmotion({ answers: emotionalAnswers });
      setEmotionResult({
        emotionalState: response.emotionalState || "",
        emotionalScore: Number(response.emotionalScore) || 0,
      });
      setEmotionStatus({ loading: false, error: "", success: response.message || "Saved" });
    } catch (error) {
      setEmotionStatus({ loading: false, error: error.message, success: "" });
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

          <label htmlFor="temperature">TEMPERATURE (C):</label>
          <input id="temperature" name="temperature" type="number" value={form.temperature} onChange={handleChange} min="30" max="45" step="0.1" />

          <label htmlFor="bpSystolic">BP SYSTOLIC:</label>
          <div className="bp-group">
            <input
              id="bpSystolic"
              name="bpSystolic"
              type="number"
              value={form.bpSystolic}
              onChange={handleChange}
              min="50"
              max="220"
              placeholder="Systolic"
            />
            <input
              id="bpDiastolic"
              name="bpDiastolic"
              type="number"
              value={form.bpDiastolic}
              onChange={handleChange}
              min="30"
              max="140"
              placeholder="Diastolic"
              aria-label="BP Diastolic"
            />
          </div>

          <label htmlFor="sugarLevel">SUGAR LEVEL:</label>
          <input id="sugarLevel" name="sugarLevel" type="number" value={form.sugarLevel} onChange={handleChange} min="40" max="400" />

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

        <div className="emotional-section">
          <h2>Emotional Health Check</h2>
          <p className="emotional-subtitle">Rate each statement from 1 (low) to 5 (high).</p>

          <div className="emotional-questions">
            {emotionalQuestions.map((question, index) => (
              <div className="emotional-question" key={question}>
                <p>{question}</p>
                <div className="rating-row" role="group" aria-label={question}>
                  {[1, 2, 3, 4, 5].map((value) => (
                    <button
                      key={value}
                      type="button"
                      className={emotionalAnswers[index] === value ? "rating-btn active" : "rating-btn"}
                      onClick={() => handleEmotionAnswer(index, value)}
                    >
                      {value}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <button type="button" className="btn-primary" onClick={handleEmotionSubmit} disabled={emotionStatus.loading}>
            {emotionStatus.loading ? "Saving..." : "Submit Emotional Health"}
          </button>

          {emotionStatus.error ? <p className="auth-message error">{emotionStatus.error}</p> : null}
          {emotionStatus.success ? <p className="auth-message success">{emotionStatus.success}</p> : null}

          {emotionResult.emotionalState ? (
            <div className="emotional-result">
              <p>Emotional State: {emotionResult.emotionalState}</p>
              <p>Score: {emotionResult.emotionalScore}</p>
            </div>
          ) : null}
        </div>
      </div>
    </section>
  );
}

export default DashboardPage;
