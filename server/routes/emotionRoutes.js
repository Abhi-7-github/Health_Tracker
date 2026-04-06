const express = require("express");
const authenticate = require("../middleware/authenticate");
const Dashboard = require("../models/Dashboard");
const DashboardHistory = require("../models/DashboardHistory");
const EmotionRecord = require("../models/EmotionRecord");
const { evaluateEmotionalState } = require("../utils/emotionUtils");

const router = express.Router();

function getDayKey(date = new Date()) {
  return date.toISOString().slice(0, 10);
}

router.post("/submit", authenticate, async (req, res) => {
  try {
    const { answers } = req.body;
    if (!Array.isArray(answers) || answers.length === 0) {
      return res.status(400).json({ message: "Answers array is required" });
    }

    const { totalScore, emotionalState, normalizedAnswers } = evaluateEmotionalState(answers);
    if (!normalizedAnswers.length) {
      return res.status(400).json({ message: "Answers must be numbers between 1 and 5" });
    }

    const record = await EmotionRecord.create({
      userId: req.user.userId,
      answers: normalizedAnswers,
      totalScore,
      emotionalState,
    });

    await Dashboard.findOneAndUpdate(
      { userId: req.user.userId },
      {
        $set: { emotionalScore: totalScore, emotionalState },
        $setOnInsert: { userId: req.user.userId },
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    const dayKey = getDayKey();
    await DashboardHistory.findOneAndUpdate(
      { userId: req.user.userId, dayKey },
      {
        $set: { emotionalScore: totalScore, emotionalState },
        $setOnInsert: { userId: req.user.userId, dayKey },
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    return res.status(200).json({
      message: "Emotional health saved",
      emotionalState,
      emotionalScore: totalScore,
      recordId: record._id,
    });
  } catch (error) {
    return res.status(500).json({ message: "Server error", error: error.message });
  }
});

module.exports = router;
