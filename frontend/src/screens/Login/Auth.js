import React, { useEffect, useState } from "react";
import axios from "axios";
import { useLocation, useNavigate } from "react-router-dom";
import "./Auth.css";
import appLogo from "../../images/logo.png";

function Auth() {
  const location = useLocation();
  const navigate = useNavigate();

  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [loginError, setLoginError] = useState(null);
  const [showRegisterClosed, setShowRegisterClosed] = useState(false);

  useEffect(() => {
    if (location.pathname.toLowerCase().includes("register")) {
      setShowRegisterClosed(true);
      navigate("/login", { replace: true });
    }
  }, [location.pathname, navigate]);

  const validateEmail = (value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);

  const handleLogin = async () => {
    setLoginError(null);

    if (!loginEmail.trim() || !validateEmail(loginEmail)) {
      setLoginError("email");
      return;
    }

    if (!loginPassword.trim()) {
      setLoginError("password");
      return;
    }

    try {
      const serverAddress = window.location.origin;
      const response = await axios.post(serverAddress + "/api/users/login", {
        email: loginEmail,
        password: loginPassword,
      });
      localStorage.setItem("token", response.data.access_token);
      navigate("/home");
    } catch (error) {
      setLoginError("password");
    }
  };

  const handleRegisterClick = (event) => {
    event.preventDefault();
    setShowRegisterClosed(true);
  };

  const closeRegisterModal = () => setShowRegisterClosed(false);

  return (
    <main className="auth-page">
      <section className="auth-visual" aria-label="Programming illustration">
        <div className="auth-visual-content">
          <h1>
            A social network
            <br />
            for beginner
            <br />
            programmers.
          </h1>

          <p>
            Codula is a place where new developers can share code, ask questions,
            follow each other's progress, and learn together.
          </p>

          <div className="code-window" aria-hidden="true">
            <div className="window-dots">
              <span></span>
              <span></span>
              <span></span>
            </div>
            <pre>{`const codula = {
  type: "social network",
  for: "beginner programmers",
  goal: "share, ask, improve"
};

codula.connect(developers);`}</pre>
          </div>
        </div>
      </section>

      <section className="auth-form-panel">
        <div className="auth-card-shell">
          <div className="auth-card">
            <img src={appLogo} alt="Codula logo" className="auth-logo" />

            <div className="auth-card-header">
              <span>Welcome back</span>
              <h2>Login to your account</h2>
            </div>

            <label className="auth-field">
              <span>Email</span>
              <input
                type="email"
                placeholder="you@example.com"
                value={loginEmail}
                onChange={(e) => {
                  setLoginEmail(e.target.value);
                  if (loginError === "email") setLoginError(null);
                }}
                className={loginError === "email" ? "invalid-input" : ""}
              />
            </label>
            {loginError === "email" && <div className="error-input">Please enter a valid email address.</div>}

            <label className="auth-field">
              <span>Password</span>
              <input
                type="password"
                placeholder="Password"
                value={loginPassword}
                onChange={(e) => {
                  setLoginPassword(e.target.value);
                  if (loginError === "password") setLoginError(null);
                }}
                className={loginError === "password" ? "invalid-input" : ""}
              />
            </label>
            {loginError === "password" && <div className="error-input">Credentials do not match. Please try again.</div>}

            <button className="auth-submit" onClick={handleLogin}>Login</button>

            <p className="auth-switch">
              New here? <a href="/register" onClick={handleRegisterClick}>Create an account</a>
            </p>
          </div>
        </div>
      </section>

      {showRegisterClosed && (
        <div className="auth-modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="register-closed-title">
          <div className="auth-modal">
            <button className="auth-modal-close" onClick={closeRegisterModal} aria-label="Close">×</button>
            <h3 id="register-closed-title">Registration closed</h3>
            <p>Registration is currently closed. Please try again later.</p>
            <button className="auth-modal-button" onClick={closeRegisterModal}>Got it</button>
          </div>
        </div>
      )}
    </main>
  );
}

export default Auth;
