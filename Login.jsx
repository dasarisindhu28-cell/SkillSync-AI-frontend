
import { useState } from "react";
import axios from "axios";
import "./Login.css";

const API_URL = "http://localhost:8080/api";

export default function Login({
  mode = "login",
  onModeChange,
  onLogin,
}) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const isRegister = mode === "register";

  const switchMode = (nextMode) => {
    setError("");
    setMessage("");
    onModeChange?.(nextMode);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");
    setMessage("");

    if (isRegister && !name.trim()) {
      setError("Please enter your name.");
      return;
    }

    setLoading(true);

    try {
      const endpoint = isRegister ? "register" : "login";

      const payload = isRegister
        ? {
            name: name.trim(),
            email: email.trim(),
            password,
          }
        : {
            email: email.trim(),
            password,
          };

      const response = await axios.post(
        `${API_URL}/auth/${endpoint}`,
        payload
      );

      if (isRegister) {
        setMessage("Account created! Please log in.");
        setPassword("");
        switchMode("login");
        setMessage("Account created! Please log in.");
        return;
      }

      if (!response.data?.token) {
        setError("Login succeeded without a token. Please check the backend.");
        return;
      }

      onLogin?.({
        ...response.data,
        email: response.data.email || email.trim(),
      });
    } catch (err) {
      setError(
        err.response?.data?.message ||
          err.response?.data?.error ||
          (isRegister
            ? "Unable to create your account. The email may already be registered."
            : "Login failed. Check your email and password.")
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="auth-card">
      <div className="auth-brand-icon">S</div>

      <h2>{isRegister ? "Create your account" : "Welcome back!"}</h2>

      <p className="auth-subtitle">
        {isRegister
          ? "Join SkillSync AI and discover your career opportunities."
          : "Log in to continue your career journey."}
      </p>

      {error && (
        <div className="auth-message auth-error" role="alert">
          {error}
        </div>
      )}

      {message && (
        <div className="auth-message auth-success" role="status">
          {message}
        </div>
      )}

      <form onSubmit={handleSubmit}>
        {isRegister && (
          <label className="auth-field">
            Full name
            <input
              type="text"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Enter your name"
              autoComplete="name"
              required
            />
          </label>
        )}

        <label className="auth-field">
          Email address
          <input
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="you@example.com"
            autoComplete="email"
            required
          />
        </label>

        <label className="auth-field">
          Password
          <input
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="Enter your password"
            autoComplete={
              isRegister ? "new-password" : "current-password"
            }
            minLength={8}
            required
          />
        </label>

        <button
          type="submit"
          className="auth-submit-button"
          disabled={loading}
        >
          {loading
            ? "Please wait..."
            : isRegister
              ? "Create Account"
              : "Login"}
        </button>
      </form>

      <p className="auth-switch">
        {isRegister
          ? "Already have an account?"
          : "Don't have an account?"}{" "}
        <button
          type="button"
          onClick={() =>
            switchMode(isRegister ? "login" : "register")
          }
        >
          {isRegister ? "Login" : "Create Account"}
        </button>
      </p>
    </section>
  );
}
