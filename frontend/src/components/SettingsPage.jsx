import { useState } from "react";
import { useTasks } from "../context/TaskContext";
import { requestNotificationPermission } from "../services/notification";
import "../settings.css";

function SettingsPage() {
  const { geminiApiKey, setGeminiApiKey } = useTasks();
  const [keyInput, setKeyInput] = useState(geminiApiKey || "");
  const [userName, setUserName] = useState(() => localStorage.getItem("smartName") || "User");
  const [message, setMessage] = useState("");
  const [theme, setTheme] = useState(localStorage.getItem("app-theme") || "light");

  const handleSave = (e) => {
    e.preventDefault();
    setGeminiApiKey(keyInput.trim());
    localStorage.setItem("smartName", userName.trim());
    setMessage("Settings saved successfully!");
    setTimeout(() => setMessage(""), 3000);
  };

  const handleTestNotification = () => {
    requestNotificationPermission();
    if ("Notification" in window && Notification.permission === "granted") {
      new Notification("Smart Productivity Manager", {
        body: "Reminders are configured successfully!",
        icon: "/icon-192.png"
      });
    } else {
      alert("Notification permissions not granted or supported. Please enable them in browser settings.");
    }
  };

  const handleResetData = () => {
    if (confirm("Are you sure you want to delete all tasks, history, and settings? This cannot be undone.")) {
      localStorage.clear();
      window.location.reload();
    }
  };

  const handleForceUpdate = () => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.getRegistrations().then(function (registrations) {
        for (let registration of registrations) {
          registration.unregister();
        }
        alert("System updated successfully! Reloading...");
        window.location.reload();
      });
    } else {
      window.location.reload();
    }
  };

  const testMorningNotification = () => {
    import('../services/notification').then(({ sendBrowserNotification }) => {
      sendBrowserNotification("Test: Good Morning! ☀️", {
        body: "This is exactly what the 8 AM notification will look like.",
        data: { isMorning: true }
      });
      alert("Test notification sent! Check your phone's notification panel.");
    });
  };

  return (
    <div className="settings-page">
      <section className="settings-hero">
        <div className="settings-hero-text">
          <p className="eyebrow">Settings</p>
          <h1>Configure Workspace</h1>
          <p>Personalize preferences, set your AI credentials, and manage notification targets.</p>
        </div>
      </section>

      <div className="settings-panel">
        <form onSubmit={handleSave}>
          <div className="settings-form-group">
            <label>Test Background Notification</label>
            <button 
              type="button" 
              onClick={testMorningNotification}
              style={{ background: "#0ea5e9", color: "white", padding: "10px 16px", border: "none", borderRadius: "8px", cursor: "pointer", width: "100%", fontWeight: "bold" }}
            >
              🔔 Test Morning Notification
            </button>
            <p style={{ fontSize: "0.8rem", color: "var(--text-muted)", marginTop: "8px" }}>Click to see if your phone allows the notification.</p>
          </div>

          <div className="settings-form-group">
            <label htmlFor="user-display-name">Display Name</label>
            <input
              type="text"
              id="user-display-name"
              value={userName}
              onChange={(e) => setUserName(e.target.value)}
              className="settings-input"
              placeholder="Your name"
              required
            />
          </div>

          {/* <div className="settings-form-group">
            <label>App Theme</label>
            <div>
              <button
                type="button"
                className="settings-btn-secondary"
                onClick={() => {
                  const newTheme = theme === "dark" ? "light" : "dark";
                  setTheme(newTheme);
                  localStorage.setItem("app-theme", newTheme);
                  if (newTheme === "dark") {
                    document.documentElement.classList.add("dark-mode");
                  } else {
                    document.documentElement.classList.remove("dark-mode");
                  }
                }}
                style={{
                  background: theme === "dark" ? "var(--sidebar-bg-top)" : "var(--bg-app)",
                  color: theme === "dark" ? "#fff" : "var(--text-primary)",
                  border: "1px solid var(--border-light)"
                }}
              >
                {theme === "dark" ? "🌙 Dark Mode" : "☀️ Light Mode"}
              </button>
            </div>
          </div> */}

          {/* <div className="settings-form-group">
            <label htmlFor="gemini-api-key">Gemini API Key</label>
            <input
              type="password"
              id="gemini-api-key"
              value={keyInput}
              onChange={(e) => setKeyInput(e.target.value)}
              className="settings-input"
              placeholder="AIzaSy..."
            />
            <span className="settings-hint">
              💡 If left blank, the app runs local smart rules to break down tasks and provide suggestions.
            </span>
          </div> */}

          <div className="settings-form-group">
            <label>Notifications & Alerts</label>
            <div>
              <button
                type="button"
                className="settings-btn-secondary"
                onClick={handleTestNotification}
              >
                🔔 Request Permissions & Test Reminder
              </button>
            </div>
          </div>

          {/* <div className="settings-form-group">
            <label htmlFor="app-theme">Theme Option</label>
            <select
              id="app-theme"
              value={theme}
              onChange={(e) => setTheme(e.target.value)}
              className="settings-input"
            >
              <option value="light">Premium Light Theme</option>
              <option value="dark" disabled>Premium Dark Theme (Coming Soon)</option>
            </select>
          </div> */}

          {message && <p className="form-message success" style={{ color: "#10b981", fontWeight: "600", marginBottom: "16px" }}>{message}</p>}

          <div style={{ borderTop: "1px solid #e5e7eb", paddingTop: "24px", marginTop: "10px" }}>
            <button type="submit" className="settings-btn-primary">Save Changes</button>
          </div>

        </form>
      </div>

      <div className="danger-zone">
        <h3>Danger Zone</h3>
        <p>Permanently delete all your tasks, history, and workspace settings.</p>
        <div style={{ display: "flex", gap: "10px" }}>
          <button type="button" className="danger-btn" onClick={handleResetData}>
            Delete Data & Reset App
          </button>
          <button type="button" className="danger-btn" onClick={handleForceUpdate} style={{ background: "#3b82f6", color: "white" }}>
            Fix Notifications (Update System)
          </button>
        </div>
      </div>
    </div>
  );
}

export default SettingsPage;
