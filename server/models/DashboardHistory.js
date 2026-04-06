const mongoose = require("mongoose");

const dashboardHistorySchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    dayKey: {
      type: String,
      required: true,
      index: true,
    },
    age: {
      type: Number,
      default: 0,
    },
    height: {
      type: Number,
      default: 0,
    },
    weight: {
      type: Number,
      default: 0,
    },
    stepsToday: {
      type: Number,
      default: 0,
    },
    sleepHours: {
      type: Number,
      default: 0,
    },
    temperature: {
      type: Number,
      default: 0,
    },
    bpSystolic: {
      type: Number,
      default: 0,
    },
    bpDiastolic: {
      type: Number,
      default: 0,
    },
    sugarLevel: {
      type: Number,
      default: 0,
    },
    bmi: {
      type: Number,
      default: 0,
    },
    wellnessScore: {
      type: Number,
      default: 0,
    },
    healthStatus: {
      type: String,
      default: "Normal",
    },
    emotionalScore: {
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

dashboardHistorySchema.index({ userId: 1, dayKey: 1 }, { unique: true });

module.exports = mongoose.model("DashboardHistory", dashboardHistorySchema);
