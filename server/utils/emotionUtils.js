function normalizeAnswers(answers) {
  if (!Array.isArray(answers)) return [];

  return answers
    .map((value) => {
      const parsed = Number(value);
      if (!Number.isFinite(parsed)) return null;
      return Math.min(5, Math.max(1, parsed));
    })
    .filter((value) => value !== null);
}

function evaluateEmotionalState(answers) {
  const normalized = normalizeAnswers(answers);
  if (!normalized.length) {
    return { totalScore: 0, emotionalState: "Good", normalizedAnswers: [] };
  }

  const totalScore = normalized.reduce((sum, value) => sum + value, 0);

  let emotionalState = "Good";
  if (totalScore > 20) {
    emotionalState = "High Stress";
  } else if (totalScore > 10) {
    emotionalState = "Moderate";
  }

  return { totalScore, emotionalState, normalizedAnswers: normalized };
}

module.exports = {
  normalizeAnswers,
  evaluateEmotionalState,
};
