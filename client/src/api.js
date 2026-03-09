const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:5001";

async function request(path, options = {}) {
  const token = localStorage.getItem("token");

	const response = await fetch(`${API_BASE_URL}${path}`, {
		headers: {
			"Content-Type": "application/json",
			...(token ? { Authorization: `Bearer ${token}` } : {}),
			...(options.headers || {}),
		},
		...options,
	});

	const data = await response.json().catch(() => ({}));

	if (!response.ok) {
		const message = data.message || "Request failed";
		throw new Error(message);
	}

	return data;
}

export function signUp(payload) {
	return request("/api/auth/signup", {
		method: "POST",
		body: JSON.stringify(payload),
	});
}

export function signIn(payload) {
	return request("/api/auth/signin", {
		method: "POST",
		body: JSON.stringify(payload),
	});
}

export function fetchDashboard() {
	return request("/api/dashboard", {
		method: "GET",
	});
}

export function generateDashboard(payload) {
	return request("/api/dashboard/generate", {
		method: "POST",
		body: JSON.stringify(payload),
	});
}

export function getDietPlan(payload) {
	return request("/api/dashboard/plan", {
		method: "POST",
		body: JSON.stringify(payload),
	});
}

export function fetchDashboardHistory() {
	return request("/api/dashboard/history", {
		method: "GET",
	});
}

export function fetchLatestReport() {
	return request("/api/dashboard/report/latest", {
		method: "GET",
	});
}
