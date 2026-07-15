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
      {/* <section className="settings-hero">
        <div className="settings-hero-text">
          <p className="eyebrow">Profile</p>
          <h1>Manage Your Profile</h1>
          <p>Update your personal details and secure your account.</p>
        </div>
      </section> */}

      <div className="profile-grid">
        <div className="settings-panel profile-card">
          <div className="profile-card-header">
            <h2>Personal Details</h2>
          </div>
          <form onSubmit={handleSaveProfile} className="profile-form">
            <div className="form-content">
              <div className="settings-form-group">
                <label>Email Address</label>
                <input
                  type="text"
                  value={email}
                  className="settings-input disabled-input"
                  disabled
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
            </div>

            <div className="form-actions">
              <button type="submit" className="settings-btn-primary">Update Profile</button>
            </div>
          </form>
        </div>

        <div className="settings-panel profile-card">
          <div className="profile-card-header">
            <h2>Change Password</h2>
          </div>
          <form onSubmit={handleChangePassword} className="profile-form">
            <div className="form-content">
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

              {error && <p className="form-message error-msg">{error}</p>}
              {message && <p className="form-message success-msg">{message}</p>}
            </div>

            <div className="form-actions">
              <button type="submit" className="settings-btn-secondary">Update Password</button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

export default ProfilePage;
