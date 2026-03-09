const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const authRoutes = require("./routes/authRoutes");
const dashboardRoutes = require("./routes/dashboardRoutes");

dotenv.config();

const app = express();

app.use(cors());
app.use(express.json());

app.use("/api/auth", authRoutes);
app.use("/api/dashboard", dashboardRoutes);

app.get("/health", (req, res) => {
	res.status(200).json({ message: "Health Tracker API is running" });
});

module.exports = app;






