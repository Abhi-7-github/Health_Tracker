const mongoose = require("mongoose");

const reportSchema = new mongoose.Schema(
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
    bmi: {
      type: Number,
      default: 0,
    },
    bmiCategory: {
      type: String,
      default: "unknown",
    },
    targetCalories: {
      type: Number,
      default: 0,
    },
    dietPlan: {
      type: String,
      default: "",
    },
  },
  { timestamps: true }
);

reportSchema.index({ userId: 1, dayKey: 1 }, { unique: true });

module.exports = mongoose.model("Report", reportSchema);
