import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { fetchDashboard, fetchDashboardHistory, fetchLatestReport } from "../api";

function getTodayKey() {
  return new Date().toISOString().slice(0, 10);
}

function toNum(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function formatDay(dayKey) {
  const date = new Date(dayKey);
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function clamp01(value) {
  return Math.max(0, Math.min(1, value));
}

function computeScore(entry) {
  const steps = Math.min((entry?.stepsToday || 0) / 10000, 1);
  const sleep = Math.min((entry?.sleepHours || 0) / 8, 1);
  const bmi = entry?.bmi || 22;
  const bmiBalance = Math.max(0, 1 - Math.abs(22 - bmi) / 22);
  return Math.round((steps * 0.4 + sleep * 0.3 + bmiBalance * 0.3) * 100);
}

function calcBmi(heightCm, weightKg) {
  if (!heightCm || !weightKg) return 0;
  const heightM = heightCm / 100;
  if (!heightM) return 0;
  return Number((weightKg / (heightM * heightM)).toFixed(1));
}

function getHealthStatusColor(status) {
  const colors = {
    Fever: "#c64b3c",
    "High BP": "#b26a2f",
    "High Sugar": "#b0538f",
    Normal: "#3a6ea5",
  };
  return colors[status] || "#6b6b6b";
}

function HealthPieChart({ today }) {
  const stepsPct = clamp01((today?.stepsToday || 0) / 10000) * 100;
  const sleepPct = clamp01((today?.sleepHours || 0) / 8) * 100;
  const bmiPct = clamp01(1 - Math.abs((today?.bmi || 22) - 22) / 22) * 100;

  const stepsContribution = Number((stepsPct * 0.4).toFixed(2));
  const sleepContribution = Number((sleepPct * 0.3).toFixed(2));
  const bmiContribution = Number((bmiPct * 0.3).toFixed(2));
  const achieved = Number((stepsContribution + sleepContribution + bmiContribution).toFixed(2));
  const remaining = Math.max(0, Number((100 - achieved).toFixed(2)));

  const metrics = [
    { label: "Steps", value: stepsContribution, raw: stepsPct, color: "#3A6EA5" },
    { label: "Sleep", value: sleepContribution, raw: sleepPct, color: "#4F7D6A" },
    { label: "BMI", value: bmiContribution, raw: bmiPct, color: "#E6A15A" },
    { label: "Remaining", value: remaining, raw: remaining, color: "#D9D4CC" },
  ];

  const portions = metrics.map((item) => item.value);
  const pieBackground = `conic-gradient(
    ${metrics[0].color} 0% ${portions[0]}%,
    ${metrics[1].color} ${portions[0]}% ${portions[0] + portions[1]}%,
    ${metrics[2].color} ${portions[0] + portions[1]}% ${portions[0] + portions[1] + portions[2]}%,
    ${metrics[3].color} ${portions[0] + portions[1] + portions[2]}% 100%
  )`;

  return (
    <div className="chart-card">
      <h3>Today Data (Pie Chart)</h3>
      <div className="pie-wrap" role="img" aria-label="Today's health pie chart">
        <div className="pie-chart" style={{ background: pieBackground }} />
      </div>
      <p className="chart-detail">Steps: {today?.stepsToday || 0}</p>
      <p className="chart-detail">Sleep: {today?.sleepHours || 0} hrs</p>
      <p className="chart-detail">BMI: {today?.bmi || 0}</p>
      <div className="chart-legend">
        {metrics.map((item) => (
          <p key={item.label}>
            <span style={{ color: item.color }}>●</span> {item.label}: {item.value.toFixed(0)}%
            {item.label !== "Remaining" ? ` (raw ${item.raw.toFixed(0)}%)` : ""}
          </p>
        ))}
      </div>
    </div>
  );
}

function ImprovementChart({ history }) {
  const normalized = history.map((entry) => ({
    ...entry,
    score: entry.wellnessScore || computeScore(entry),
  }));
  const maxScore = Math.max(...normalized.map((entry) => entry.score || 0), 100);

  return (
    <div className="chart-card">
      <h3>Daily Improvement (Graph)</h3>
      <div className="bars-wrap">
        {normalized.map((entry) => {
          const height = Math.max(8, ((entry.score || 0) / maxScore) * 170);
          return (
            <div className="bar-item" key={entry.dayKey}>
              <div className="bar" style={{ height: `${height}px` }} title={`Score ${entry.score || 0}`} />
              <p>{formatDay(entry.dayKey)}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function EmotionalTrendChart({ history }) {
  const scores = history.map((entry) => Number(entry.emotionalScore) || 0);
  const hasScores = scores.some((value) => value > 0);
  if (!hasScores) {
    return (
      <div className="chart-card">
        <h3>Emotional Trend</h3>
        <p className="chart-detail">Submit emotional check-ins to see the trend.</p>
      </div>
    );
  }

  const maxScore = Math.max(...scores, 1);
  const points = scores
    .map((score, index) => {
      const x = scores.length === 1 ? 50 : (index / (scores.length - 1)) * 100;
      const y = 100 - (score / maxScore) * 100;
      return `${x},${y}`;
    })
    .join(" ");

  return (
    <div className="chart-card">
      <h3>Emotional Trend</h3>
      <svg className="line-chart" viewBox="0 0 100 100" preserveAspectRatio="none" role="img" aria-label="Emotional score trend">
        <polyline points={points} fill="none" stroke="#4f7d6a" strokeWidth="3" />
      </svg>
      <p className="chart-detail">Latest score: {scores[scores.length - 1] || 0}</p>
    </div>
  );
}

function ReportChatPage() {
  const navigate = useNavigate();
  const [history, setHistory] = useState([]);
  const [dashboardSnapshot, setDashboardSnapshot] = useState(null);
  const [latestReportFromDb, setLatestReportFromDb] = useState(null);
  const [status, setStatus] = useState({ loading: true, error: "" });

  const fallbackFromReport = useMemo(() => {
    try {
      const stored = JSON.parse(localStorage.getItem("lastReportPayload") || "{}");
      const input = stored.input || {};
      return {
        dayKey: getTodayKey(),
        stepsToday: toNum(input.stepsToday),
        sleepHours: toNum(input.sleepHours),
        bmi: toNum(stored.bmi) || calcBmi(toNum(input.height), toNum(input.weight)),
        healthStatus: stored.healthStatus || "",
        emotionalState: stored.emotionalState || "",
        emotionalScore: toNum(stored.emotionalScore),
        wellnessScore: 0,
      };
    } catch {
      return null;
    }
  }, []);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      navigate("/signin");
      return;
    }

    async function loadHistory() {
      try {
        const [historyResponse, dashboardResponse, latestReportResponse] = await Promise.all([
          fetchDashboardHistory(),
          fetchDashboard(),
          fetchLatestReport(),
        ]);

        setHistory(historyResponse.data || []);

        const dashboardData = dashboardResponse.data || {};
        const latestReportData = latestReportResponse?.data || null;
        if (latestReportData) {
          setLatestReportFromDb({
            dayKey: latestReportData.dayKey || getTodayKey(),
            stepsToday: toNum(latestReportData.stepsToday),
            sleepHours: toNum(latestReportData.sleepHours),
            bmi: toNum(latestReportData.bmi),
            healthStatus: latestReportData.healthStatus || "",
            emotionalState: latestReportData.emotionalState || "",
            emotionalScore: toNum(latestReportData.emotionalScore),
            wellnessScore: 0,
          });
        }

        setDashboardSnapshot({
          dayKey: getTodayKey(),
          stepsToday: toNum(dashboardData.stepsToday),
          sleepHours: toNum(dashboardData.sleepHours),
          bmi: calcBmi(toNum(dashboardData.height), toNum(dashboardData.weight)),
          healthStatus: dashboardData.healthStatus || "",
          emotionalState: dashboardData.emotionalState || "",
          emotionalScore: toNum(dashboardData.emotionalScore),
          wellnessScore: 0,
        });

        setStatus({ loading: false, error: "" });
      } catch (error) {
        setStatus({ loading: false, error: error.message || "Failed to load charts" });
      }
    }

    loadHistory();
  }, [navigate]);

  const today = useMemo(() => {
    const key = getTodayKey();
    const todayFromHistory = history.find((item) => item.dayKey === key) || history[history.length - 1] || null;
    const dbFallback = latestReportFromDb;

    if (!todayFromHistory && fallbackFromReport) {
      return {
        ...fallbackFromReport,
        stepsToday: toNum(fallbackFromReport.stepsToday) || toNum(dbFallback?.stepsToday) || toNum(dashboardSnapshot?.stepsToday),
        sleepHours: toNum(fallbackFromReport.sleepHours) || toNum(dbFallback?.sleepHours) || toNum(dashboardSnapshot?.sleepHours),
        bmi: toNum(fallbackFromReport.bmi) || toNum(dbFallback?.bmi) || toNum(dashboardSnapshot?.bmi),
        healthStatus: fallbackFromReport.healthStatus || dbFallback?.healthStatus || dashboardSnapshot?.healthStatus || "",
        emotionalState: fallbackFromReport.emotionalState || dbFallback?.emotionalState || dashboardSnapshot?.emotionalState || "",
        emotionalScore: toNum(fallbackFromReport.emotionalScore) || toNum(dbFallback?.emotionalScore) || toNum(dashboardSnapshot?.emotionalScore),
      };
    }

    if (!todayFromHistory) {
      return dbFallback || dashboardSnapshot;
    }

    if (!fallbackFromReport && !dashboardSnapshot && !dbFallback) {
      return todayFromHistory;
    }

    return {
      ...todayFromHistory,
      stepsToday:
        toNum(todayFromHistory.stepsToday) ||
        toNum(dbFallback?.stepsToday) ||
        toNum(fallbackFromReport?.stepsToday) ||
        toNum(dashboardSnapshot?.stepsToday),
      sleepHours:
        toNum(todayFromHistory.sleepHours) ||
        toNum(dbFallback?.sleepHours) ||
        toNum(fallbackFromReport?.sleepHours) ||
        toNum(dashboardSnapshot?.sleepHours),
      bmi: toNum(todayFromHistory.bmi) || toNum(dbFallback?.bmi) || toNum(fallbackFromReport?.bmi) || toNum(dashboardSnapshot?.bmi),
      healthStatus:
        todayFromHistory.healthStatus ||
        dbFallback?.healthStatus ||
        fallbackFromReport?.healthStatus ||
        dashboardSnapshot?.healthStatus ||
        "",
      emotionalState:
        todayFromHistory.emotionalState ||
        dbFallback?.emotionalState ||
        fallbackFromReport?.emotionalState ||
        dashboardSnapshot?.emotionalState ||
        "",
      emotionalScore:
        toNum(todayFromHistory.emotionalScore) ||
        toNum(dbFallback?.emotionalScore) ||
        toNum(fallbackFromReport?.emotionalScore) ||
        toNum(dashboardSnapshot?.emotionalScore),
    };
  }, [history, fallbackFromReport, dashboardSnapshot, latestReportFromDb]);

  const graphHistory = useMemo(() => {
    if (history.length) return history;
    if (latestReportFromDb) return [latestReportFromDb];
    if (fallbackFromReport) return [fallbackFromReport];
    return dashboardSnapshot ? [dashboardSnapshot] : [];
  }, [history, latestReportFromDb, fallbackFromReport, dashboardSnapshot]);

  return (
    <section className="insights-section" aria-labelledby="insights-title">
      <div className="insights-card">
        <h2 id="insights-title">Report Chat</h2>
        <p className="insights-subtitle">Pie chart contains today's data and graph contains daily improvement.</p>

        {status.loading ? <p>Loading chart data...</p> : null}
        {status.error ? <p className="auth-message error">{status.error}</p> : null}

        {!status.loading && !status.error ? (
          <div className="charts-grid">
            <HealthPieChart today={today} />
            <ImprovementChart history={graphHistory} />
            <div className="chart-card">
              <h3>Health Status</h3>
              <div className="status-pill" style={{ background: getHealthStatusColor(today?.healthStatus) }}>
                {today?.healthStatus || "N/A"}
              </div>
              <p className="chart-detail">Emotional State: {today?.emotionalState || "N/A"}</p>
            </div>
            <EmotionalTrendChart history={graphHistory} />
          </div>
        ) : null}

        {!status.loading && !status.error && graphHistory.length < 2 ? (
          <p className="insights-note">Add data on more days to see daily improvement trends clearly.</p>
        ) : null}

        <div className="insights-actions">
          <button type="button" className="btn-primary" onClick={() => navigate("/report")}>Back to Report</button>
        </div>
      </div>
    </section>
  );
}

export default ReportChatPage;
