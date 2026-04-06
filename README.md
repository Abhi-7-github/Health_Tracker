# Health_Tracker

Health_Tracker is a full-stack web app for capturing daily health metrics, calculating wellness insights, and generating a diet plan.

## Present Features

- User authentication (sign up and sign in) with JWT-based protected routes.
- Dashboard form for daily metrics:
	- Age
	- Height (cm)
	- Weight (kg)
	- Steps for today
	- Sleep hours
	- Temperature
	- Blood pressure (systolic/diastolic)
	- Sugar level
- Emotional health questionnaire with 1-5 rating scale.
- Automatic BMI calculation.
- Wellness score generation based on:
	- Steps progress toward 10,000
	- Sleep progress toward 8 hours
	- BMI balance around a healthy reference
- Health status detection (fever, high BP, high sugar, normal).
- Smart tips engine combining physical and emotional status.
- Medicines and advice module (non-prescriptive guidance).
- Smart health suggestions after dashboard generation.
- Daily history persistence (up to 14 records returned by API).
- Personalized diet plan generation with:
	- Gemini API when configured
	- Local fallback plan when Gemini key is missing/unavailable
- Latest report retrieval for chart fallback.
- Report Chat page with:
	- Pie chart for today's health contribution
	- Daily improvement bar graph
	- Health status indicator
	- Emotional score trend line
- Persistent client session using localStorage (token, user, last report payload).

## Tech Stack

- Frontend: React + Vite + React Router
- Backend: Node.js + Express
- Database: MongoDB + Mongoose
- Auth: JSON Web Token (JWT) + bcrypt password hashing
- AI (optional): Google Gemini API (`gemini-1.5-flash`)

## Project Structure

```
Health_Tracker/
	client/   # React frontend
	server/   # Express + MongoDB backend
```

## How It Works (Functionalities)

### 1) Authentication Flow

1. User signs up with name, email, and password.
2. Password is hashed with bcrypt before saving.
3. Server returns a JWT token and user profile.
4. Client stores token and user in localStorage.
5. Protected frontend routes (`/dashboard`, `/report`, `/report-chat`) require token.

### 2) Dashboard Generate Flow

1. Authenticated user opens dashboard.
2. Existing dashboard values are preloaded if available.
3. User submits all required fields.
4. Backend validates input and upserts dashboard data.
5. Backend computes:
	 - BMI
	 - Wellness score
	 - Suggestions
 	 - Health status
 	 - Tips and medicines guidance
6. Latest emotional state is included in response.
7. A day-wise history record is upserted (by `userId + dayKey`).
8. Client redirects to report page with current metrics.

### 3) Report and Diet Plan Flow

1. Report page receives latest metrics from dashboard.
2. Backend recalculates BMI and BMI category.
3. Backend estimates target calories.
4. Backend computes health status and pulls latest emotional state.
5. Backend generates tips and medicine guidance.
6. Diet plan source:
	 - Gemini API response if `GEMINI_API_KEY` exists and request succeeds.
	 - Fallback rule-based diet plan otherwise.
7. Report is stored per user/day.
8. Client saves a small payload in localStorage for chart fallback.

### 4) Report Chat (Insights) Flow

1. Client fetches:
	 - Dashboard history
	 - Current dashboard snapshot
	 - Latest report
2. It chooses best available "today" data using fallback priority.
3. Pie chart shows contribution split for:
	 - Steps
	 - Sleep
	 - BMI
	 - Remaining
4. Improvement graph shows score trend across available days.
5. Health status badge and emotional trend line are shown.

## API Overview

### Health

- `GET /health`

### Auth

- `POST /api/auth/signup`
- `POST /api/auth/signin`

### Dashboard (Bearer token required)

- `GET /api/dashboard` - get current dashboard snapshot
- `POST /api/dashboard/generate` - save metrics + compute BMI/wellness/suggestions
- `GET /api/dashboard/history` - get historical entries (sorted, up to 14)
- `POST /api/dashboard/plan` - generate diet plan
- `GET /api/dashboard/report/latest` - latest stored report

### Emotion (Bearer token required)

- `POST /api/emotion/submit` - submit emotional questionnaire answers

## Local Setup

### 1) Clone and Install

```bash
git clone <your-repo-url>
cd Health_Tracker

cd server
npm install

cd ../client
npm install
```

### 2) Configure Environment

Create `server/.env`:

```env
PORT=5001
MONGO_URI=<your-mongodb-connection-string>
JWT_SECRET=<your-jwt-secret>
GEMINI_API_KEY=<optional>
```

Create `client/.env`:

```env
VITE_API_URL=http://localhost:5001
```

Note:
- The client defaults to `http://localhost:5001`.
- The backend default port in code is `5000` if `PORT` is not set.
- Set `PORT=5001` (recommended) or update `VITE_API_URL` accordingly.

### 3) Run the App

In one terminal:

```bash
cd server
npm start
```

In another terminal:

```bash
cd client
npm run dev
```

Open the client URL shown by Vite (usually `http://localhost:5173`).

## Data Models (Current)

- User: `name`, `email`, `password` (hashed)
- Dashboard: one current record per user + vitals + health/emotional status
- DashboardHistory: day-wise snapshots + BMI + wellness score + health/emotional status
- Report: day-wise report + BMI category + target calories + health/emotional status + tips + medicines
- EmotionRecord: emotional questionnaire submissions (answers + score + state)

## Current Notes

- Node.js 18+ is recommended (backend uses built-in `fetch` for Gemini API call).
- If Gemini API is not configured, the app still works with fallback diet plan generation.