import React, { useEffect, useState } from "react";
import axios from "axios";
import { useLocation, useNavigate } from "react-router-dom";
import "./Auth.css";
import appLogo from "../../images/logo.png";

const codeTokens = [
  { text: "const", className: "token-keyword" },
  { text: " codula", className: "token-variable" },
  { text: " = ", className: "token-plain" },
  { text: "{", className: "token-punctuation" },

  { text: "\n  ", className: "token-plain" },
  { text: "community", className: "token-property" },
  { text: ": ", className: "token-plain" },
  { text: '"beginner programmers"', className: "token-string" },
  { text: ",", className: "token-punctuation" },

  { text: "\n  ", className: "token-plain" },
  { text: "purpose", className: "token-property" },
  { text: ": ", className: "token-plain" },
  { text: '"learn together"', className: "token-string" },
  { text: ",", className: "token-punctuation" },

  { text: "\n  ", className: "token-plain" },
  { text: "features", className: "token-property" },
  { text: ": ", className: "token-plain" },
  { text: "[", className: "token-punctuation" },

  { text: "\n    ", className: "token-plain" },
  { text: '"share code"', className: "token-string" },
  { text: ",", className: "token-punctuation" },

  { text: "\n    ", className: "token-plain" },
  { text: '"ask questions"', className: "token-string" },
  { text: ",", className: "token-punctuation" },

  { text: "\n    ", className: "token-plain" },
  { text: '"track progress"', className: "token-string" },

  { text: "\n  ", className: "token-plain" },
  { text: "]", className: "token-punctuation" },

  { text: "\n", className: "token-plain" },
  { text: "};", className: "token-punctuation" },

  { text: "\n\n", className: "token-plain" },
  { text: "codula", className: "token-variable" },
  { text: ".", className: "token-plain" },
  { text: "connect", className: "token-function" },
  { text: "();", className: "token-punctuation" },
];

const totalCodeLength = codeTokens.reduce(
  (sum, token) => sum + token.text.length,
  0
);

function Auth() {
  const location = useLocation();
  const navigate = useNavigate();

  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [loginError, setLoginError] = useState(null);
  const [showRegisterClosed, setShowRegisterClosed] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [visibleChars, setVisibleChars] = useState(0);

  useEffect(() => {
    if (location.pathname.toLowerCase().includes("register")) {
      setShowRegisterClosed(true);
      navigate("/login", { replace: true });
    }
  }, [location.pathname, navigate]);

  useEffect(() => {
    const prefersReducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;

    if (prefersReducedMotion) {
      setVisibleChars(totalCodeLength);
      return undefined;
    }

    setVisibleChars(0);

    let intervalId;
    const startTimeout = window.setTimeout(() => {
      intervalId = window.setInterval(() => {
        setVisibleChars((prev) => {
          const next = Math.min(prev + 3, totalCodeLength);

          if (next >= totalCodeLength) {
            window.clearInterval(intervalId);
          }

          return next;
        });
      }, 12);
    }, 120);

    return () => {
      window.clearTimeout(startTimeout);
      window.clearInterval(intervalId);
    };
  }, []);

  const validateEmail = (value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);

  const handleEmailChange = (event) => {
    setLoginEmail(event.target.value);

    if (
      loginError === "email" ||
      loginError === "credentials" ||
      loginError === "server"
    ) {
      setLoginError(null);
    }
  };

  const handlePasswordChange = (event) => {
    setLoginPassword(event.target.value);

    if (
      loginError === "password" ||
      loginError === "credentials" ||
      loginError === "server"
    ) {
      setLoginError(null);
    }
  };

  const handleLogin = async (event) => {
    event.preventDefault();
    setLoginError(null);

    const normalizedEmail = loginEmail.trim();

    if (!normalizedEmail || !validateEmail(normalizedEmail)) {
      setLoginError("email");
      return;
    }

    if (!loginPassword.trim()) {
      setLoginError("password");
      return;
    }

    setIsSubmitting(true);

    try {
      const serverAddress = window.location.origin;

      const response = await axios.post(`${serverAddress}/api/users/login`, {
        email: normalizedEmail,
        password: loginPassword,
      });

      localStorage.setItem("token", response.data.access_token);
      navigate("/home");
    } catch (error) {
      if (error.response?.status === 401) {
        setLoginError("credentials");
      } else {
        setLoginError("server");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRegisterClick = (event) => {
    event.preventDefault();
    setShowRegisterClosed(true);
  };

  const closeRegisterModal = () => {
    setShowRegisterClosed(false);
  };

  const renderTypedCode = () => {
    let remaining = visibleChars;

    return codeTokens.map((token, index) => {
      if (remaining <= 0) return null;

      const visibleText = token.text.slice(0, remaining);
      remaining -= visibleText.length;

      return (
        <span key={index} className={token.className}>
          {visibleText}
        </span>
      );
    });
  };

  return (
    <main className="auth-page">
      <section className="auth-visual" aria-label="Information about Codula">

        <div className="auth-visual-content">
          <h1>A social network for beginner programmers.</h1>

          <p className="auth-description">
            Share code, ask questions and follow the progress of other
            developers while improving your own skills.
          </p>

          <div className="auth-code-window" aria-hidden="true">
            <div className="auth-code-header">
              <div className="auth-window-dots">
                <span />
                <span />
                <span />
              </div>

              <span className="auth-code-filename">community.js</span>
            </div>

            <pre className="auth-code-content">
              <code>{renderTypedCode()}</code>
              {visibleChars < totalCodeLength && (
                <span className="auth-typing-cursor" />
              )}
            </pre>
          </div>
        </div>
      </section>

    <section className="auth-form-panel">
      <div className="auth-card-wrap">
        <div className="auth-brand auth-brand-right">
          <img src={appLogo} alt="" />
          <span>Codula</span>
        </div>

        <form className="auth-card" onSubmit={handleLogin} noValidate>
          <div className="auth-card-header">
            <p>Welcome back</p>
            <h2>Log in to your account</h2>
          </div>

          <div className="auth-field">
            <label htmlFor="login-email">Email</label>

            <input
              id="login-email"
              type="email"
              placeholder="you@example.com"
              value={loginEmail}
              onChange={handleEmailChange}
              autoComplete="email"
              className={loginError === "email" ? "invalid-input" : ""}
            />

            {loginError === "email" && (
              <div className="auth-field-error">Please enter a valid email address.</div>
            )}
          </div>

          <div className="auth-field">
            <label htmlFor="login-password">Password</label>

            <input
              id="login-password"
              type="password"
              placeholder="Enter your password"
              value={loginPassword}
              onChange={handlePasswordChange}
              autoComplete="current-password"
              className={
                loginError === "password" || loginError === "credentials"
                  ? "invalid-input"
                  : ""
              }
            />

            {loginError === "password" && (
              <div className="auth-field-error">Please enter your password.</div>
            )}

            {loginError === "credentials" && (
              <div className="auth-field-error">Email or password is incorrect.</div>
            )}
          </div>

          {loginError === "server" && (
            <p className="auth-form-error" role="alert">
              It was not possible to connect to the server. Please try again.
            </p>
          )}

          <button
            className="auth-submit"
            type="submit"
            disabled={isSubmitting}
          >
            {isSubmitting ? "Logging in..." : "Log in"}
          </button>

          <p className="auth-switch">
            New here?{" "}
            <a href="/register" onClick={handleRegisterClick}>
              Create an account
            </a>
          </p>
        </form>
      </div>
    </section>

      {showRegisterClosed && (
        <div
          className="auth-modal-backdrop"
          role="dialog"
          aria-modal="true"
          aria-labelledby="register-closed-title"
          onMouseDown={closeRegisterModal}
        >
          <div
            className="auth-modal"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <button
              className="auth-modal-close"
              type="button"
              onClick={closeRegisterModal}
              aria-label="Close"
            >
              ×
            </button>

            <h3 id="register-closed-title">Registration closed</h3>
            <p>Registration is currently closed. Please try again later.</p>

            <button
              className="auth-modal-button"
              type="button"
              onClick={closeRegisterModal}
            >
              Got it
            </button>
          </div>
        </div>
      )}
    </main>
  );
}

export default Auth;