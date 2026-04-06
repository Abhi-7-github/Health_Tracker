import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { getDietPlan } from "../api";

function ReportPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const [status, setStatus] = useState({ loading: true, error: "" });
  const [report, setReport] = useState({
    bmi: 0,
    bmiCategory: "",
    targetCalories: 0,
    dietPlan: "",
    healthStatus: "",
    emotionalState: "",
    tips: [],
    medicines: [],
    medicineDisclaimer: "",
  });

  const metrics = useMemo(() => location.state?.metrics || null, [location.state]);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      navigate("/signin");
      return;
    }

    if (!metrics) {
      navigate("/dashboard");
      return;
    }

    async function loadPlan() {
      try {
        const response = await getDietPlan(metrics);
        localStorage.setItem(
          "lastReportPayload",
          JSON.stringify({
            input: response.input || metrics,
            bmi: response.bmi || 0,
            bmiCategory: response.bmiCategory || "",
            targetCalories: response.targetCalories || 0,
            healthStatus: response.healthStatus || "",
            emotionalState: response.emotionalState || "",
            emotionalScore: response.emotionalScore || 0,
          })
        );

        setReport({
          bmi: response.bmi || 0,
          bmiCategory: response.bmiCategory || "",
          targetCalories: response.targetCalories || 0,
          dietPlan: response.dietPlan || "No plan available",
          healthStatus: response.healthStatus || "",
          emotionalState: response.emotionalState || "",
          tips: response.tips || [],
          medicines: response.medicines || [],
          medicineDisclaimer: response.medicineDisclaimer || "",
        });
        setStatus({ loading: false, error: "" });
      } catch (error) {
        setStatus({ loading: false, error: error.message || "Failed to generate report" });
      }
    }

    loadPlan();
  }, [metrics, navigate]);

  return (
    <section className="report-section" aria-labelledby="report-title">
      <div className="report-card">
        <div className="report-strip" />

        <div className="report-content" id="report-title">
          <p className="report-title">Your BMI:</p>
          <p className="report-value">{status.loading ? "Calculating..." : report.bmi || "N/A"}</p>

          {!status.loading && !status.error ? (
            <p className="report-meta">Category: {report.bmiCategory || "N/A"} | Target Calories: {report.targetCalories || "N/A"}</p>
          ) : null}

          {!status.loading && !status.error ? (
            <div className="report-status-grid">
              <div className={report.healthStatus ? `status-badge ${report.healthStatus.replace(/\s/g, "-").toLowerCase()}` : "status-badge"}>
                Health Status: {report.healthStatus || "N/A"}
              </div>
              <div className="status-note">Emotional State: {report.emotionalState || "N/A"}</div>
            </div>
          ) : null}

          <p className="report-title">Calculated BMI and summary:</p>

          <p className="report-title report-plan-label">CREATE THE DIET PLAN:</p>

          <div className="report-plan-box">
            {status.loading ? "Generating your personalized diet plan..." : null}
            {status.error ? <span className="auth-message error">{status.error}</span> : null}
            {!status.loading && !status.error ? report.dietPlan : null}
          </div>

          {!status.loading && !status.error ? (
            <div className="report-insights">
              <div className="insight-card">
                <h3>Smart Tips</h3>
                {report.tips?.length ? (
                  <ul>
                    {report.tips.map((tip) => (
                      <li key={tip}>{tip}</li>
                    ))}
                  </ul>
                ) : (
                  <p>No tips available yet.</p>
                )}
              </div>

              <div className="insight-card">
                <h3>Medicines & Advice</h3>
                {report.medicines?.length ? (
                  <ul>
                    {report.medicines.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                ) : (
                  <p>No medicine guidance needed.</p>
                )}
                {report.medicineDisclaimer ? <p className="disclaimer">{report.medicineDisclaimer}</p> : null}
              </div>
            </div>
          ) : null}

          <div className="report-actions">
            <button type="button" className="report-chat-btn" onClick={() => navigate("/report-chat")}>Report chat</button>
            <button type="button" className="report-help-btn" onClick={() => navigate("/dashboard")}>Back to Dashboard</button>
          </div>
        </div>
      </div>
    </section>
  );
}

export default ReportPage;
