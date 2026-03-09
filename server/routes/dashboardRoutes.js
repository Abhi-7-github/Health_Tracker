const express = require("express");
const jwt = require("jsonwebtoken");
const Dashboard = require("../models/Dashboard");
const DashboardHistory = require("../models/DashboardHistory");
const Report = require("../models/Report");

const router = express.Router();

function authenticate(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ message: "Authorization token missing" });
  }

  const token = authHeader.split(" ")[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || "dev_jwt_secret");
    req.user = decoded;
    return next();
  } catch (error) {
    return res.status(401).json({ message: "Invalid or expired token" });
  }
}

function toNumber(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function calculateBmi(weightKg, heightCm) {
  if (!weightKg || !heightCm) return 0;
  const heightM = heightCm / 100;
  if (!heightM) return 0;
  return Number((weightKg / (heightM * heightM)).toFixed(1));
}

function calculateWellnessScore(payload, bmi) {
  const stepScore = Math.min((payload.stepsToday || 0) / 10000, 1);
  const sleepScore = Math.min((payload.sleepHours || 0) / 8, 1);
  const bmiBalance = bmi ? Math.max(0, 1 - Math.abs(22 - bmi) / 22) : 0.5;
  return Math.round((stepScore * 0.4 + sleepScore * 0.3 + bmiBalance * 0.3) * 100);
}

function getDayKey(date = new Date()) {
  return date.toISOString().slice(0, 10);
}

function getBmiCategory(bmi) {
  if (!bmi) return "unknown";
  if (bmi < 18.5) return "underweight";
  if (bmi < 25) return "normal";
  if (bmi < 30) return "overweight";
  return "obese";
}

function estimateCalories(payload, bmiCategory) {
  const weight = payload.weight || 60;
  const steps = payload.stepsToday || 0;
  const sleep = payload.sleepHours || 7;

  let calories = Math.round(weight * 30);
  if (steps < 6000) calories -= 120;
  if (steps > 10000) calories += 120;
  if (sleep < 6.5) calories -= 80;

  if (bmiCategory === "underweight") calories += 180;
  if (bmiCategory === "overweight") calories -= 180;
  if (bmiCategory === "obese") calories -= 260;

  return Math.max(1200, calories);
}

function createFallbackDietPlan(payload, bmi, bmiCategory) {
  const targetCalories = estimateCalories(payload, bmiCategory);
  return [
    `Goal: Maintain a ${targetCalories} kcal/day target with balanced meals.`,
    `BMI: ${bmi || "N/A"} (${bmiCategory}).`,
    "Breakfast: Oats + milk/curd + fruit + nuts.",
    "Lunch: Rice/roti + dal + vegetables + lean protein.",
    "Dinner: Soup + vegetables + protein + small carb portion.",
    "Snacks: Fruit, sprouts, buttermilk, or roasted chana.",
    "Hydration: 2.5 to 3 liters of water across the day.",
    "Caution: Reduce sugary drinks and late-night heavy meals.",
  ].join("\n");
}

async function generateDietPlanWithGemini(input) {
  const apiKey = process.env.GEMINI_API_KEY;

  const prompt = `Create a practical one-day diet plan in plain text using this health data:\n\nAge: ${input.age}\nHeight(cm): ${input.height}\nWeight(kg): ${input.weight}\nSteps today: ${input.stepsToday}\nSleep hours: ${input.sleepHours}\nBMI: ${input.bmi}\nBMI category: ${input.bmiCategory}\nTarget calories/day: ${input.targetCalories}\n\nRequired output:\nGoal:\nBreakfast:\nLunch:\nDinner:\nSnacks:\nHydration:\nCaution:\n\nRules: Keep it realistic, brief, and based on the given numbers only.`;

  if (!apiKey) {
    return createFallbackDietPlan(input, input.bmi, input.bmiCategory);
  }

  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;
  const response = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [
        {
          parts: [{ text: prompt }],
        },
      ],
      generationConfig: {
        temperature: 0.5,
        maxOutputTokens: 500,
      },
    }),
  });

  if (!response.ok) {
    throw new Error("Gemini API request failed");
  }

  const data = await response.json();
  const text = data?.candidates?.[0]?.content?.parts?.map((part) => part.text).filter(Boolean).join("\n");
  if (!text) {
    throw new Error("No diet plan returned from Gemini");
  }

  return text;
}

router.get("/", authenticate, async (req, res) => {
  try {
    const dashboard = await Dashboard.findOne({ userId: req.user.userId });

    if (!dashboard) {
      return res.status(200).json({
        data: {
          age: 0,
          height: 0,
          weight: 0,
          stepsToday: 0,
          sleepHours: 0,
        },
      });
    }

    return res.status(200).json({ data: dashboard });
  } catch (error) {
    return res.status(500).json({ message: "Server error", error: error.message });
  }
});

router.post("/generate", authenticate, async (req, res) => {
  try {
    const requiredFields = ["age", "height", "weight", "stepsToday", "sleepHours"];
    const hasMissingRequired = requiredFields.some((field) => req.body[field] === undefined || req.body[field] === null || req.body[field] === "");

    if (hasMissingRequired) {
      return res.status(400).json({ message: "All dashboard details are required" });
    }

    const payload = {
      age: toNumber(req.body.age),
      height: toNumber(req.body.height),
      weight: toNumber(req.body.weight),
      stepsToday: toNumber(req.body.stepsToday),
      sleepHours: toNumber(req.body.sleepHours),
    };

    const dashboard = await Dashboard.findOneAndUpdate(
      { userId: req.user.userId },
      { userId: req.user.userId, ...payload },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    );

    const suggestions = [];
    const bmi = calculateBmi(dashboard.weight, dashboard.height);
    const wellnessScore = calculateWellnessScore(dashboard, bmi);
    const dayKey = getDayKey();

    await DashboardHistory.findOneAndUpdate(
      { userId: req.user.userId, dayKey },
      {
        userId: req.user.userId,
        dayKey,
        age: dashboard.age,
        height: dashboard.height,
        weight: dashboard.weight,
        stepsToday: dashboard.stepsToday,
        sleepHours: dashboard.sleepHours,
        bmi,
        wellnessScore,
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    if (dashboard.stepsToday < 8000) suggestions.push("Try to reach at least 8,000 steps today.");
    if (dashboard.sleepHours < 7) suggestions.push("Aim for 7 to 8 hours of sleep.");
    if (dashboard.weight > 0 && dashboard.height > 0) suggestions.push("Keep tracking weekly progress for stable results.");

    return res.status(200).json({
      message: "Health details generated successfully",
      data: dashboard,
      bmi,
      wellnessScore,
      suggestions: suggestions.length ? suggestions : ["Great consistency. Keep going."],
    });
  } catch (error) {
    return res.status(500).json({ message: "Server error", error: error.message });
  }
});

router.get("/history", authenticate, async (req, res) => {
  try {
    const history = await DashboardHistory.find({ userId: req.user.userId })
      .sort({ dayKey: 1 })
      .limit(14)
      .lean();

    return res.status(200).json({ data: history });
  } catch (error) {
    return res.status(500).json({ message: "Server error", error: error.message });
  }
});

router.get("/report/latest", authenticate, async (req, res) => {
  try {
    const report = await Report.findOne({ userId: req.user.userId }).sort({ createdAt: -1 }).lean();
    return res.status(200).json({ data: report || null });
  } catch (error) {
    return res.status(500).json({ message: "Server error", error: error.message });
  }
});

router.post("/plan", authenticate, async (req, res) => {
  try {
    let payload = {
      age: toNumber(req.body.age),
      height: toNumber(req.body.height),
      weight: toNumber(req.body.weight),
      stepsToday: toNumber(req.body.stepsToday),
      sleepHours: toNumber(req.body.sleepHours),
    };

    if (!payload.height || !payload.weight) {
      const dashboard = await Dashboard.findOne({ userId: req.user.userId });
      if (dashboard) {
        payload = {
          age: payload.age || dashboard.age,
          height: payload.height || dashboard.height,
          weight: payload.weight || dashboard.weight,
          stepsToday: payload.stepsToday || dashboard.stepsToday,
          sleepHours: payload.sleepHours || dashboard.sleepHours,
        };
      }
    }

    if (!payload.height || !payload.weight) {
      return res.status(400).json({ message: "Height and weight are required to calculate BMI" });
    }

    const bmi = calculateBmi(payload.weight, payload.height);
    const bmiCategory = getBmiCategory(bmi);
    const targetCalories = estimateCalories(payload, bmiCategory);

    let dietPlan;
    try {
      dietPlan = await generateDietPlanWithGemini({ ...payload, bmi, bmiCategory, targetCalories });
    } catch (error) {
      dietPlan = createFallbackDietPlan(payload, bmi, bmiCategory);
    }

    await Report.findOneAndUpdate(
      { userId: req.user.userId, dayKey: getDayKey() },
      {
        userId: req.user.userId,
        dayKey: getDayKey(),
        age: payload.age,
        height: payload.height,
        weight: payload.weight,
        stepsToday: payload.stepsToday,
        sleepHours: payload.sleepHours,
        bmi,
        bmiCategory,
        targetCalories,
        dietPlan,
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    return res.status(200).json({
      message: "Diet plan generated",
      bmi,
      bmiCategory,
      targetCalories,
      input: payload,
      dietPlan,
    });
  } catch (error) {
    return res.status(500).json({ message: "Server error", error: error.message });
  }
});

module.exports = router;
