import { useMemo, useState } from "react";

function LoginPage() {
  const [isLogin, setIsLogin] = useState(true);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [message, setMessage] = useState("");
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  const passwordRules = useMemo(
    () => [
      { label: "At least 8 characters", valid: password.length >= 8 },
      { label: "One uppercase letter", valid: /[A-Z]/.test(password) },
      { label: "One lowercase letter", valid: /[a-z]/.test(password) },
      { label: "One number", valid: /\d/.test(password) },
      { label: "One special character", valid: /[^A-Za-z0-9]/.test(password) },
    ],
    [password]
  );

  const isEmailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  const isPasswordValid = passwordRules.every((rule) => rule.valid);
  const shouldShowPasswordRules = !isLogin;
  const storedUsers = JSON.parse(localStorage.getItem("smartUsers") || "[]");

  const handleSubmit = (event) => {
    event.preventDefault();

    if (!isEmailValid) {
      setMessage("Please enter a valid email address.");
      return;
    }

    if (!isLogin && !isPasswordValid) {
      setMessage("Password does not meet the required rules.");
      return;
    }

    if (!isLogin && !name.trim()) {
      setMessage("Please enter your name to create an account.");
      return;
    }

    if (!isLogin) {
      const nextUsers = [...storedUsers, { name: name.trim(), email, password }];
      localStorage.setItem("smartUsers", JSON.stringify(nextUsers));
      setIsLogin(true);
      setName("");
      setPassword("");
      setMessage("Account created successfully. Please login now.");
      return;
    }

    const validUser = storedUsers.find((user) => user.email === email && user.password === password);
    if (!validUser) {
      setMessage("Invalid email or password.");
      return;
    }

    localStorage.setItem("smartAuth", "true");
    localStorage.setItem("smartEmail", email);
    localStorage.setItem("smartName", validUser.name || email.split("@")[0]);
    window.location.href = "/dashboard";
  };

  return (
    <div className="login-page">
      <div className="login-card">
        {isLoggedIn ? (
          <div className="welcome-screen">
            <div className="welcome-icon">✓</div>
            <h1>Welcome aboard</h1>
            <p>Your account is ready. Choose how you want to continue.</p>
            <div className="welcome-actions">
              <button type="button" className="login-button" onClick={() => window.location.reload()}>Go to dashboard</button>
              <button type="button" className="secondary-button">View profile</button>
            </div>
          </div>
        ) : (
          <>
            <div className="login-header">
              <p className="login-eyebrow">Secure access</p>
              <h1>{isLogin ? "Login to your workspace" : "Create your account"}</h1>
              <p className="login-subtitle">
                {isLogin ? "Use your credentials to continue." : "Sign up to start organizing your work."}
              </p>
            </div>

            <form className="login-form" onSubmit={handleSubmit}>
              {!isLogin && (
                <label>
                  <span>Full name</span>
                  <input
                    type="text"
                    value={name}
                    onChange={(event) => {
                      setName(event.target.value);
                      setMessage("");
                    }}
                    placeholder="Your name"
                    required
                  />
                </label>
              )}

              <label>
                <span>Email</span>
                <input
                  type="email"
                  value={email}
                  onChange={(event) => {
                    setEmail(event.target.value);
                    setMessage("");
                  }}
                  placeholder="you@example.com"
                  required
                />
              </label>

              <label>
                <span>Password</span>
                <div className="password-field">
                  <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(event) => {
                      setPassword(event.target.value);
                      setMessage("");
                    }}
                    placeholder="Enter your password"
                    required
                  />
                  <button
                    type="button"
                    className="password-toggle"
                    onClick={() => setShowPassword((value) => !value)}
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? (
                      <svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
                        <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
                        <line x1="1" y1="1" x2="23" y2="23" />
                      </svg>
                    ) : (
                      <svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                        <circle cx="12" cy="12" r="3" />
                      </svg>
                    )}
                  </button>
                </div>
              </label>

              {shouldShowPasswordRules ? (
                <ul className="password-rules">
                  {passwordRules.map((rule) => (
                    <li key={rule.label} className={rule.valid ? "valid" : ""}>
                      {rule.valid ? "✓" : ""} {rule.label}
                    </li>
                  ))}
                </ul>
              ) : null}

              {message ? <p className={`form-message ${message.includes("successful") ? "success" : "error"}`}>{message}</p> : null}

              <button className="login-button" type="submit">
                {isLogin ? "Login" : "Create account"}
              </button>
            </form>

            <button className="switch-link" type="button" onClick={() => {
              setIsLogin((value) => !value);
              setMessage("");
              setPassword("");
            }}>
              {isLogin ? "Create new account" : "Already have an account? Login"}
            </button>
          </>
        )}
      </div>
    </div>
  );
}

export default LoginPage;
