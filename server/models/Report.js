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
    bmiCategory: {
      type: String,
      default: "unknown",
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
    targetCalories: {
      type: Number,
      default: 0,
    },
    dietPlan: {
      type: String,
      default: "",
    },
    tips: {
      type: [String],
      default: [],
    },
    medicines: {
      type: [String],
      default: [],
    },
    medicineDisclaimer: {
      type: String,
      default: "General guidance only, not a prescription.",
    },
  },
  { timestamps: true }
);

reportSchema.index({ userId: 1, dayKey: 1 }, { unique: true });

module.exports = mongoose.model("Report", reportSchema);
