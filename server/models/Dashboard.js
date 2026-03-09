const mongoose = require("mongoose");

const dashboardSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
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
  },
  { timestamps: true }
);

module.exports = mongoose.model("Dashboard", dashboardSchema);
