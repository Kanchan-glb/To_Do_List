import { useState, useEffect } from "react";
import "../settings.css"; // Reuse settings styles

function ProfilePage() {
  const [userName, setUserName] = useState("");
  const [email, setEmail] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    const savedName = localStorage.getItem("smartName") || "";
    const savedEmail = localStorage.getItem("smartEmail") || "";
    setUserName(savedName);
    setEmail(savedEmail);
  }, []);

  const handleSaveProfile = (e) => {
    e.preventDefault();
    if (!userName.trim()) {
      setError("Name cannot be empty.");
      return;
    }
    
    // Update name
    localStorage.setItem("smartName", userName.trim());
    
    // Update in users array
    const storedUsers = JSON.parse(localStorage.getItem("smartUsers") || "[]");
    const userIndex = storedUsers.findIndex(u => u.email === email);
    if (userIndex !== -1) {
      storedUsers[userIndex].name = userName.trim();
      localStorage.setItem("smartUsers", JSON.stringify(storedUsers));
    }
    
    setError("");
    setMessage("Profile updated successfully!");
    setTimeout(() => setMessage(""), 3000);
  };

  const handleChangePassword = (e) => {
    e.preventDefault();
    setError("");
    setMessage("");

    if (newPassword !== confirmPassword) {
      setError("New passwords do not match.");
      return;
    }

    if (newPassword.length < 8) {
      setError("New password must be at least 8 characters.");
      return;
    }

    const storedUsers = JSON.parse(localStorage.getItem("smartUsers") || "[]");
    const userIndex = storedUsers.findIndex(u => u.email === email);

    if (userIndex === -1) {
      setError("User not found.");
      return;
    }

    if (storedUsers[userIndex].password !== currentPassword) {
      setError("Current password is incorrect.");
      return;
    }

    // Update password
    storedUsers[userIndex].password = newPassword;
    localStorage.setItem("smartUsers", JSON.stringify(storedUsers));
    
    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
    setMessage("Password changed successfully!");
    setTimeout(() => setMessage(""), 3000);
  };

  return (
    <div className="settings-page">
      <section className="settings-hero">
        <div className="settings-hero-text">
          <p className="eyebrow">Profile</p>
          <h1>Manage Your Profile</h1>
          <p>Update your personal details and secure your account.</p>
        </div>
      </section>

      <div className="settings-panel">
        <h2 style={{ marginBottom: "16px", fontSize: "1.2rem", color: "var(--text-primary)" }}>Personal Details</h2>
        <form onSubmit={handleSaveProfile} style={{ marginBottom: "40px" }}>
          <div className="settings-form-group">
            <label>Email Address</label>
            <input
              type="text"
              value={email}
              className="settings-input"
              disabled
              style={{ opacity: 0.7, background: "var(--bg-app)" }}
            />
          </div>

          <div className="settings-form-group">
            <label>Display Name</label>
            <input
              type="text"
              value={userName}
              onChange={(e) => setUserName(e.target.value)}
              className="settings-input"
              required
            />
          </div>

          <button type="submit" className="settings-btn-primary">Update Profile</button>
        </form>

        <div style={{ borderTop: "1px solid var(--border-light)", margin: "32px 0" }}></div>

        <h2 style={{ marginBottom: "16px", fontSize: "1.2rem", color: "var(--text-primary)" }}>Change Password</h2>
        <form onSubmit={handleChangePassword}>
          <div className="settings-form-group">
            <label>Current Password</label>
            <input
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              className="settings-input"
              required
            />
          </div>

          <div className="settings-form-group">
            <label>New Password</label>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="settings-input"
              required
            />
          </div>

          <div className="settings-form-group">
            <label>Confirm New Password</label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="settings-input"
              required
            />
          </div>

          {error && <p className="form-message" style={{ color: "var(--color-danger)", fontWeight: "600", marginBottom: "16px" }}>{error}</p>}
          {message && <p className="form-message success" style={{ color: "var(--color-success)", fontWeight: "600", marginBottom: "16px" }}>{message}</p>}

          <button type="submit" className="settings-btn-secondary" style={{ border: "1px solid var(--border-light)" }}>Update Password</button>
        </form>
      </div>
    </div>
  );
}

export default ProfilePage;
