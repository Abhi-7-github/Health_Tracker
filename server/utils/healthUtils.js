const medicineMap = {
  Fever: ["Paracetamol (consult doctor)"],
  "High BP": ["Consult doctor", "Lifestyle changes"],
  "High Sugar": ["Monitor glucose", "Consult doctor"],
};

const medicineDisclaimer = "General guidance only, not a prescription.";

function detectHealthStatus({ temperature, bpSystolic, bpDiastolic, sugarLevel }) {
  const temp = Number(temperature) || 0;
  const systolic = Number(bpSystolic) || 0;
  const diastolic = Number(bpDiastolic) || 0;
  const sugar = Number(sugarLevel) || 0;

  if (temp > 38) return "Fever";
  if (systolic > 140 || diastolic > 90) return "High BP";
  if (sugar > 180) return "High Sugar";
  return "Normal";
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

  if (healthStatus && healthTips[healthStatus]) {
    tips.push(healthTips[healthStatus]);
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
  return medicineMap[healthStatus] ? [...medicineMap[healthStatus]] : [];
}

module.exports = {
  detectHealthStatus,
  generateTips,
  getMedicineAdvice,
  medicineMap,
  medicineDisclaimer,
};
