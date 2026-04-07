const medicineMap = {
  Fever: [
    "Paracetamol (acetaminophen) may help reduce fever (follow label; avoid overdose).",
    "Hydrate well; consider oral rehydration solution if needed.",
    "Seek medical advice if fever is very high, lasts >48 hours, or with severe symptoms.",
  ],
  "High BP": [
    "Recheck BP after 5 minutes of rest.",
    "If BP is repeatedly high or you feel unwell, consult a clinician.",
    "Lifestyle: reduce salt, limit alcohol, stay active, manage stress.",
  ],
  "High Sugar": [
    "Recheck glucose if possible and drink water.",
    "Avoid sugary drinks/foods; choose balanced meals.",
    "If you take diabetes medication, follow your prescribed plan; do not start new medicines without a doctor.",
    "Seek medical care urgently if sugar is very high with symptoms (confusion, vomiting, deep breathing).",
  ],
};

const medicineDisclaimer = "General guidance only, not a prescription.";

const HEALTH_THRESHOLDS = {
  // Celsius. Fever is often considered >= 37.5°C.
  temperatureFeverC: 37.5,
  // mmHg.
  bpSystolicHigh: 140,
  bpDiastolicHigh: 90,
  // mg/dL (assumed). Without fasting/random context, keep conservative.
  sugarHigh: 140,
};

function detectHealthConditions({ temperature, bpSystolic, bpDiastolic, sugarLevel }) {
  const temp = Number(temperature) || 0;
  const systolic = Number(bpSystolic) || 0;
  const diastolic = Number(bpDiastolic) || 0;
  const sugar = Number(sugarLevel) || 0;

  const conditions = [];
  if (temp >= HEALTH_THRESHOLDS.temperatureFeverC) conditions.push("Fever");
  if (systolic >= HEALTH_THRESHOLDS.bpSystolicHigh || diastolic >= HEALTH_THRESHOLDS.bpDiastolicHigh) {
    conditions.push("High BP");
  }
  if (sugar >= HEALTH_THRESHOLDS.sugarHigh) conditions.push("High Sugar");

  return conditions;
}

function formatHealthStatus(conditions) {
  if (!Array.isArray(conditions) || !conditions.length) return "Normal";
  return conditions.join(" & ");
}

function parseHealthStatus(healthStatus) {
  if (Array.isArray(healthStatus)) return healthStatus.filter(Boolean);
  if (!healthStatus || healthStatus === "Normal") return [];

  // Accept formats like: "Fever & High Sugar", "Fever, High Sugar", "Fever + High Sugar"
  return String(healthStatus)
    .split(/\s*(?:&|,|\+|\band\b)\s*/i)
    .map((part) => part.trim())
    .filter(Boolean);
}

function detectHealthStatus(payload) {
  return formatHealthStatus(detectHealthConditions(payload));
}

function generateTips({ healthStatus, emotionalState }) {
  const tips = [];

  const healthTips = {
    Fever: "Stay hydrated and rest.",
    "High BP": "Reduce salt intake and exercise regularly.",
    "High Sugar": "Avoid sugary foods and keep meals balanced.",
    Normal: "Keep up consistent routines and regular check-ins.",
  };

  const emotionalTips = {
    "High Stress": "Practice breathing exercises or take short breaks.",
    Moderate: "Schedule short mindfulness breaks during the day.",
    Good: "Maintain your current stress-management habits.",
  };

  const conditions = parseHealthStatus(healthStatus);
  if (!conditions.length && healthTips.Normal) {
    tips.push(healthTips.Normal);
  }

  for (const condition of conditions) {
    if (healthTips[condition]) tips.push(healthTips[condition]);
  }

  if (emotionalState && emotionalTips[emotionalState]) {
    tips.push(emotionalTips[emotionalState]);
  }

  if (!tips.length) {
    tips.push("Keep up consistent routines and regular check-ins.");
  }

  return tips;
}

function getMedicineAdvice(healthStatus) {
  const conditions = parseHealthStatus(healthStatus);
  if (!conditions.length) return [];

  const deduped = new Set();
  for (const condition of conditions) {
    const items = medicineMap[condition];
    if (Array.isArray(items)) {
      for (const item of items) deduped.add(item);
    }
  }
  return Array.from(deduped);
}

module.exports = {
  detectHealthStatus,
  detectHealthConditions,
  formatHealthStatus,
  generateTips,
  getMedicineAdvice,
  medicineMap,
  medicineDisclaimer,
};
