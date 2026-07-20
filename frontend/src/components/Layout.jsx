import { NavLink, useNavigate } from "react-router-dom";
import { useTasks } from "../context/TaskContext";
import { useState, useRef, useEffect } from "react";

/* ── SVG Icon Components ── */
const Icon = ({ d, size = 18, stroke = "currentColor", fill = "none", strokeWidth = 1.75, children, viewBox = "0 0 24 24" }) => (
  <svg width={size} height={size} viewBox={viewBox} fill={fill} stroke={stroke} strokeWidth={strokeWidth}
    strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    {d ? <path d={d} /> : children}
  </svg>
);

const DashIcon = () => <Icon><rect x="3" y="3" width="7" height="7" rx="1.5" /><rect x="14" y="3" width="7" height="7" rx="1.5" /><rect x="3" y="14" width="7" height="7" rx="1.5" /><rect x="14" y="14" width="7" height="7" rx="1.5" /></Icon>;
const TaskIcon = () => <Icon><path d="M9 11l3 3L22 4" /><path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11" /></Icon>;
const PlanIcon = () => <Icon><rect x="3" y="4" width="18" height="18" rx="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" /></Icon>;
const ReportIcon = () => <Icon><line x1="18" y1="20" x2="18" y2="10" /><line x1="12" y1="20" x2="12" y2="4" /><line x1="6" y1="20" x2="6" y2="14" /></Icon>;
const SettingIcon = () => <Icon><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z" /></Icon>;
const BellIcon = () => <Icon size={24}><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" /><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" /></Icon>;
const LogoutIcon = () => <Icon><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4" /><polyline points="16 17 21 12 16 7" /><line x1="21" y1="12" x2="9" y2="12" /></Icon>;
const TimerIcon = () => <Icon><circle cx="12" cy="12" r="9" /><polyline points="12 7 12 12 15 15" /></Icon>;
const PlayIcon = () => <Icon d="M5 3l14 9-14 9V3z" fill="currentColor" stroke="none" />;
const PauseIcon = () => <Icon><rect x="6" y="4" width="4" height="16" /><rect x="14" y="4" width="4" height="16" /></Icon>;
const SwitchIcon = () => <Icon><polyline points="17 1 21 5 17 9" /><path d="M3 11V9a4 4 0 014-4h14" /><polyline points="7 23 3 19 7 15" /><path d="M21 13v2a4 4 0 01-4 4H3" /></Icon>;
const SearchIcon = () => <Icon><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></Icon>;
const UserIcon = () => <Icon size={16}><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" /><circle cx="12" cy="7" r="4" /></Icon>;
const KeyIcon = () => <Icon size={16}><rect x="3" y="11" width="18" height="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0110 0v4" /></Icon>;
const ChevronIcon = () => <Icon size={14} strokeWidth={2.5}><polyline points="6 9 12 15 18 9" /></Icon>;
const MenuIcon = () => <Icon size={24}><line x1="3" y1="12" x2="21" y2="12" /><line x1="3" y1="6" x2="21" y2="6" /><line x1="3" y1="18" x2="21" y2="18" /></Icon>;
const PlusIcon = () => <Icon size={16}><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></Icon>;
const CirclePlusIcon = () => <Icon><circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="16" /><line x1="8" y1="12" x2="16" y2="12" /></Icon>;
const ProgressIcon = () => <Icon><polyline points="22 12 18 12 15 21 9 3 6 12 2 12" /></Icon>;

function Layout({ children }) {
  const userName = localStorage.getItem("smartName") || "User";
  const {
    getDailyProgress,
    focusTimeLeft,
    isFocusRunning,
    setIsFocusRunning,
    focusMode,
    switchFocusMode,
    pomodoroSettings,
    updatePomodoroSettings
  } = useTasks();

  const { completionRate, todayCompleted, todayCount } = getDailyProgress();

  const navigate = useNavigate();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [timerDropdownOpen, setTimerDropdownOpen] = useState(false);
  const [showTimerSettings, setShowTimerSettings] = useState(false);
  const [tempSettings, setTempSettings] = useState(pomodoroSettings || { work: 25, shortBreak: 5, longBreak: 15 });
  const [isSidebarOpen, setIsSidebarOpen] = useState(() => {
    const saved = localStorage.getItem("sidebarOpen");
    if (saved !== null) return JSON.parse(saved);
    return window.innerWidth > 900;
  });
  const dropdownRef = useRef(null);
  const timerDropdownRef = useRef(null);

  // Persist sidebar state
  useEffect(() => {
    localStorage.setItem("sidebarOpen", JSON.stringify(isSidebarOpen));
  }, [isSidebarOpen]);

  // Handle escape key to close sidebar on mobile
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape" && window.innerWidth <= 900 && isSidebarOpen) {
        setIsSidebarOpen(false);
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isSidebarOpen]);

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setDropdownOpen(false);
      }
      if (timerDropdownRef.current && !timerDropdownRef.current.contains(e.target)) {
        setTimerDropdownOpen(false);
        setShowTimerSettings(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const handleLogout = () => {
    localStorage.removeItem("smartAuth");
    localStorage.removeItem("smartName");
    localStorage.removeItem("smartEmail");
    window.location.href = "/login";
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  const getModeLabel = (mode) => {
    if (mode === "work") return "Focus Block";
    if (mode === "shortBreak") return "Short Break";
    return "Long Break";
  };

  const getModeColor = (mode) => {
    if (mode === "work") return "#6366f1";
    if (mode === "shortBreak") return "#10b981";
    return "#f59e0b";
  };

  const navItems = [
    { label: "Dashboard", path: "/dashboard", icon: <DashIcon /> },
    { label: "Tasks", path: "/tasks", icon: <TaskIcon /> },
    { label: "Planner", path: "/planner", icon: <PlanIcon /> },
    // { label: "Reports", path: "/reports", icon: <ReportIcon /> },
    { label: "Reports", path: "/progress", icon: <ProgressIcon /> },
    // { label: "Settings", path: "/settings", icon: <SettingIcon /> },
    { label: "Profile", path: "/profile", icon: <UserIcon /> },
  ];

  const progressDeg = Math.round((completionRate / 100) * 360);

  return (
    <div className="app-shell">

      {/* ═══════════════════ SIDEBAR & OVERLAY ═══════════════════ */}
      <div
        className={`sidebar-overlay ${isSidebarOpen ? "open" : ""}`}
        onClick={() => setIsSidebarOpen(false)}
      />

      <aside className={`sidebar ${isSidebarOpen ? "open" : ""}`}>

        {/* Brand */}
        <div className="brand-block">
          <div className="brand-icon">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
            </svg>
          </div>
          <div>
            <p className="brand-eyebrow">Productivity Suite</p>
            <h2 className="brand-name">Smart Planner</h2>
          </div>
        </div>

        {/* Divider */}
        <div className="sidebar-divider" />

        {/* Navigation */}
        <nav className="sidebar-nav" aria-label="Main navigation">
          <p className="nav-section-label">MENU</p>
          {navItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) => `nav-item${isActive ? " active" : ""}`}
              onClick={() => {
                if (window.innerWidth <= 900) {
                  setIsSidebarOpen(false);
                }
              }}
            >
              <span className="nav-icon">{item.icon}</span>
              <span className="nav-label">{item.label}</span>
              <span className="nav-active-dot" />
            </NavLink>
          ))}
        </nav>

        {/* Divider */}
        <div className="sidebar-divider" />



        {/* Progress Footer */}
        <div className="sidebar-footer">
          <div className="footer-progress-ring">
            <svg width="52" height="52" viewBox="0 0 52 52">
              <circle cx="26" cy="26" r="22" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="4" />
              <circle
                cx="26" cy="26" r="22" fill="none"
                stroke="url(#prog-grad)" strokeWidth="4"
                strokeLinecap="round"
                strokeDasharray={`${(completionRate / 100) * 138.2} 138.2`}
                transform="rotate(-90 26 26)"
              />
              <defs>
                <linearGradient id="prog-grad" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#818cf8" />
                  <stop offset="100%" stopColor="#34d399" />
                </linearGradient>
              </defs>
              <text x="26" y="30" textAnchor="middle" fill="white" fontSize="11" fontWeight="700" fontFamily="Outfit,sans-serif">
                {completionRate}%
              </text>
            </svg>
          </div>
          <div className="footer-text">
            <p className="footer-title">Today's Progress</p>
            <p className="footer-count">{todayCompleted} <span>/ {todayCount} tasks</span></p>
          </div>
        </div>

      </aside>

      {/* ═══════════════════ MAIN AREA ═══════════════════ */}
      <div className="main-container">

        {/* ─── TOPBAR ─── */}
        <header className="topbar">

          {/* Left: Page greeting */}
          <div className="topbar-left" style={{ display: "flex", alignItems: "center" }}>
            <button
              className="menu-toggle-btn"
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              aria-label="Toggle sidebar"
              aria-expanded={isSidebarOpen}
            >
              <MenuIcon />
            </button>
            <div>
              <p className="topbar-eyebrow">Welcome back</p>
              <h3 className="topbar-title">
                {userName}
              </h3>
            </div>
          </div>

          <button
  type="button"
  className="topbar-add-task-btn"
  style={{
    background: "linear-gradient(135deg, #4f46e5, #7c3aed)",
    color: "#fff",
    border: "none",
    borderRadius: "10px",
    padding: "10px 18px",
    fontWeight: "600",
    boxShadow: "0 6px 18px rgba(79, 70, 229, 0.28)",
  }}
  onClick={() =>
    navigate("/tasks", {
      state: {
        openAddTaskModal: true,
        timestamp: Date.now(),
      },
    })
  }
>
  <CirclePlusIcon />
  <span>Add Task</span>
</button>
          {/* Right: Actions */}
          <div className="topbar-actions">
            {/* Pomodoro Timer Dropdown */}
            <div className="timer-menu-wrap" ref={timerDropdownRef}>
              <button
                type="button"
                className={`topbar-icon-btn timer-btn ${timerDropdownOpen ? "open" : ""}`}
                onClick={() => setTimerDropdownOpen(!timerDropdownOpen)}
                style={{ borderColor: isFocusRunning ? getModeColor(focusMode) : '' }}
                aria-label="Pomodoro Timer"
              >
                <TimerIcon />
                {isFocusRunning && <span className="timer-active-dot" style={{ background: getModeColor(focusMode) }} />}
              </button>

              {timerDropdownOpen && (
                <div className="timer-dropdown">
                  <div className="timer-dropdown-header">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <h4 className="timer-dropdown-title" style={{ margin: 0 }}>Pomodoro Timer</h4>
                      <button
                        type="button"
                        className="timer-settings-btn"
                        onClick={() => {
                          if (!showTimerSettings) setTempSettings(pomodoroSettings);
                          setShowTimerSettings(!showTimerSettings);
                        }}
                        title="Edit Timer Durations"
                        style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: 'var(--text-secondary)', padding: '4px', borderRadius: '4px' }}
                      >
                        <PlusIcon />
                      </button>
                    </div>
                    {!showTimerSettings && (
                      <div className="timer-mode-tabs">
                        <button
                          className={`timer-tab ${focusMode === "work" ? "active" : ""}`}
                          onClick={() => switchFocusMode("work")}
                        >Focus</button>
                        <button
                          className={`timer-tab ${focusMode === "shortBreak" ? "active" : ""}`}
                          onClick={() => switchFocusMode("shortBreak")}
                        >Short Break</button>
                        <button
                          className={`timer-tab ${focusMode === "longBreak" ? "active" : ""}`}
                          onClick={() => switchFocusMode("longBreak")}
                        >Long Break</button>
                      </div>
                    )}
                  </div>

                  {showTimerSettings ? (
                    <div className="timer-settings-view">
                      {focusMode === "work" && (
                        <div className="timer-setting-row">
                          <label>Focus (min)</label>
                          <input type="number" min="1" max="90" value={tempSettings.work} onChange={(e) => setTempSettings({ ...tempSettings, work: Number(e.target.value) })} />
                        </div>
                      )}
                      {focusMode === "shortBreak" && (
                        <div className="timer-setting-row">
                          <label>Short Break (min)</label>
                          <input type="number" min="1" max="30" value={tempSettings.shortBreak} onChange={(e) => setTempSettings({ ...tempSettings, shortBreak: Number(e.target.value) })} />
                        </div>
                      )}
                      {focusMode === "longBreak" && (
                        <div className="timer-setting-row">
                          <label>Long Break (min)</label>
                          <input type="number" min="1" max="60" value={tempSettings.longBreak} onChange={(e) => setTempSettings({ ...tempSettings, longBreak: Number(e.target.value) })} />
                        </div>
                      )}
                      <button
                        type="button"
                        className="timer-save-btn"
                        onClick={() => {
                          updatePomodoroSettings(tempSettings);
                          setShowTimerSettings(false);
                        }}
                      >
                        Save Settings
                      </button>
                    </div>
                  ) : (
                    <>
                      <div className="timer-dropdown-body">
                        <div className="timer-display-circle" style={{
                          borderColor: `${getModeColor(focusMode)}30`,
                          background: `radial-gradient(circle, ${getModeColor(focusMode)}10 0%, transparent 70%)`
                        }}>
                          <span className="timer-time" style={{ color: getModeColor(focusMode) }}>{formatTime(focusTimeLeft)}</span>
                          <span className="timer-label">{getModeLabel(focusMode)}</span>
                        </div>
                      </div>

                      <div className="timer-dropdown-footer">
                        <button
                          type="button"
                          className={`timer-action-btn ${isFocusRunning ? "running" : ""}`}
                          onClick={() => setIsFocusRunning(!isFocusRunning)}
                          style={{
                            background: isFocusRunning ? 'transparent' : getModeColor(focusMode),
                            color: isFocusRunning ? getModeColor(focusMode) : '#fff',
                            borderColor: isFocusRunning ? getModeColor(focusMode) : 'transparent'
                          }}
                        >
                          {isFocusRunning ? <><PauseIcon /> Pause</> : <><PlayIcon /> Start</>}
                        </button>
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>

            {/* Quick Add Task Button */}
            {/* Quick Add Task Button */}


            {/* Bell notification button */}
            {/* <button type="button" className="topbar-icon-btn bell-btn" aria-label="Notifications"
              onClick={() => navigate("/settings")}>
              <BellIcon />
            </button> */}

            {/* Avatar with dropdown */}
            <div className="avatar-menu-wrap" ref={dropdownRef}
              onMouseEnter={() => setDropdownOpen(true)}
              onMouseLeave={() => setDropdownOpen(false)}>
              <button
                type="button"
                className={`avatar-btn${dropdownOpen ? " open" : ""}`}
                onClick={() => setDropdownOpen((v) => !v)}
                aria-haspopup="true"
                aria-expanded={dropdownOpen}
                aria-label="User menu"
              >
                <span className="avatar-letter">
                  {userName.charAt(0).toUpperCase()}
                </span>
                <span className="avatar-status" />
                <span className="avatar-chevron"><ChevronIcon /></span>
              </button>

              {/* Dropdown panel */}
              {dropdownOpen && (
                <div className="avatar-dropdown" role="menu">
                  {/* User info header */}
                  <div className="dropdown-header">
                    <div className="dropdown-avatar">{userName.charAt(0).toUpperCase()}</div>
                    <div className="dropdown-user-info">
                      <p className="dropdown-name">{userName}</p>
                      <p className="dropdown-badge">Premium</p>
                    </div>
                  </div>

                  <div className="dropdown-divider" />

                  {/* <button className="dropdown-item" role="menuitem"
                    onClick={() => { setDropdownOpen(false); navigate("/settings"); }}>
                    <div className="dropdown-item-icon indigo"><UserIcon /></div>
                    <div className="dropdown-item-text">
                      <span className="dropdown-item-label">My Profile</span>
                      <span className="dropdown-item-sub">Account settings</span>
                    </div>
                  </button> */}

                  {/* <button className="dropdown-item" role="menuitem"
                    onClick={() => { setDropdownOpen(false); navigate("/settings"); }}>
                    <div className="dropdown-item-icon teal"><KeyIcon /></div>
                    <div className="dropdown-item-text">
                      <span className="dropdown-item-label">Security</span>
                      <span className="dropdown-item-sub">Change password</span>
                    </div>
                  </button> */}

                  {/* <button className="dropdown-item" role="menuitem"
                    onClick={() => { setDropdownOpen(false); navigate("/settings"); }}>
                    <div className="dropdown-item-icon violet"><SettingIcon /></div>
                    <div className="dropdown-item-text">
                      <span className="dropdown-item-label">Preferences</span>
                      <span className="dropdown-item-sub">App settings</span>
                    </div>
                  </button> */}

                  <div className="dropdown-divider" />

                  <button className="dropdown-item danger" role="menuitem"
                    onClick={handleLogout}>
                    <div className="dropdown-item-icon red"><LogoutIcon /></div>
                    <div className="dropdown-item-text">
                      <span className="dropdown-item-label">Logout</span>
                      <span className="dropdown-item-sub">End session</span>
                    </div>
                  </button>
                </div>
              )}
            </div>

          </div>
        </header>

        <main className="main-area">
          {children}
        </main>
      </div>
    </div>
  );
}

export default Layout;
