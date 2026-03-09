import { useState } from "react";
import { BrowserRouter, NavLink, Navigate, Route, Routes, useNavigate } from "react-router-dom";
import "./App.css";
import SignInPage from "./pages/SignInPage";
import SignUpPage from "./pages/SignUpPage";
import DashboardPage from "./pages/DashboardPage";
import ReportPage from "./pages/ReportPage";
import ReportChatPage from "./pages/ReportChatPage";

function PrivateRoute({ children }) {
	const token = localStorage.getItem("token");
	return token ? children : <Navigate to="/signin" replace />;
}

function AppLayout() {
	const navigate = useNavigate();
	const [showProfileMenu, setShowProfileMenu] = useState(false);

	const token = localStorage.getItem("token");
	const isAuthenticated = Boolean(token);

	let userInitial = "U";
	try {
		const user = JSON.parse(localStorage.getItem("user") || "{}");
		if (user?.name) {
			userInitial = String(user.name).trim().charAt(0).toUpperCase() || "U";
		}
	} catch {
		userInitial = "U";
	}

	const handleLogout = () => {
		localStorage.removeItem("token");
		localStorage.removeItem("user");
		localStorage.removeItem("lastReportPayload");
		setShowProfileMenu(false);
		navigate("/signin");
	};

	return (
		<div className="app-shell">
				<header className="topbar">
					<div className="topbar-inner">
						<p className="brand">HT</p>
						<nav className="topnav" aria-label="Primary">
							{isAuthenticated ? (
								<div className="profile-menu-wrap">
									<button
										type="button"
										className="nav-icon-link"
										onClick={() => setShowProfileMenu((previous) => !previous)}
										aria-label="Open profile menu"
									>
										<span className="nav-avatar">{userInitial}</span>
									</button>

									{showProfileMenu ? (
										<div className="profile-menu" role="menu">
											<button type="button" className="profile-menu-item" onClick={() => { setShowProfileMenu(false); navigate("/dashboard"); }}>
												Dashboard
											</button>
											<button type="button" className="profile-menu-item logout" onClick={handleLogout}>
												Logout
											</button>
										</div>
									) : null}
								</div>
							) : (
								<>
									<NavLink to="/signin" className={({ isActive }) => (isActive ? "nav-link active" : "nav-link")}>
										Sign In
									</NavLink>
									<NavLink to="/signup" className={({ isActive }) => (isActive ? "nav-link active" : "nav-link")}>
										Sign Up
									</NavLink>
								</>
							)}
						</nav>
					</div>
				</header>

				<main className="page-content">
					<Routes>
						<Route path="/signin" element={<SignInPage />} />
						<Route path="/signup" element={<SignUpPage />} />
						<Route
							path="/dashboard"
							element={
								<PrivateRoute>
									<DashboardPage />
								</PrivateRoute>
							}
						/>
						<Route
							path="/report"
							element={
								<PrivateRoute>
									<ReportPage />
								</PrivateRoute>
							}
						/>
						<Route
							path="/report-chat"
							element={
								<PrivateRoute>
									<ReportChatPage />
								</PrivateRoute>
							}
						/>
						<Route path="*" element={<Navigate to="/signin" replace />} />
					</Routes>
				</main>
		</div>
	);
}

function App() {
	return (
		<BrowserRouter>
			<AppLayout />
		</BrowserRouter>
	);
}

export default App;
