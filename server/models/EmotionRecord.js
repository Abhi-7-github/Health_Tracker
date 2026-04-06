const mongoose = require("mongoose");

const emotionRecordSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    answers: {
      type: [Number],
      default: [],
    },
    totalScore: {
      type: Number,
      default: 0,
    },
    emotionalState: {
      type: String,
      default: "Good",
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("EmotionRecord", emotionRecordSchema);
