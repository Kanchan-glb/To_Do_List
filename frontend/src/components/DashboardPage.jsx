import { useState, useEffect } from "react";
import { useTasks } from "../context/TaskContext";
import { format, subDays } from "date-fns";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import MorningPlanner from "./MorningPlanner";
import NightReview from "./NightReview";
import { useNavigate } from "react-router-dom";
import "../dashboard.css";

/* ── Micro SVG Icons ── */
const Ico = ({ children, size = 18 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor"
    strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{children}</svg>
);
const IcoTarget = () => <Ico><circle cx="12" cy="12" r="10" /><circle cx="12" cy="12" r="6" /><circle cx="12" cy="12" r="2" /></Ico>;
const IcoClock = () => <Ico><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></Ico>;
const IcoAlert = () => <Ico><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" /><line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" /></Ico>;
const IcoZap = () => <Ico><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" /></Ico>;
const IcoCheck = () => <Ico><polyline points="20 6 9 17 4 12" /></Ico>;
const IcoPlus = () => <Ico><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></Ico>;
const IcoArrow = () => <Ico size={14}><line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" /></Ico>;
const IcoTasks = () => <Ico><path d="M9 11l3 3L22 4" /><path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11" /></Ico>;
const IcoFire = () => <Ico><path d="M12 2c0 0-5.5 4-5.5 9a5.5 5.5 0 0011 0C17.5 6 12 2 12 2z" /><path d="M12 12c0 0-2 1.5-2 3a2 2 0 004 0c0-1.5-2-3-2-3z" /></Ico>;
const IcoSun = () => <Ico><circle cx="12" cy="12" r="5" /><line x1="12" y1="1" x2="12" y2="3" /><line x1="12" y1="21" x2="12" y2="23" /><line x1="4.22" y1="4.22" x2="5.64" y2="5.64" /><line x1="18.36" y1="18.36" x2="19.78" y2="19.78" /><line x1="1" y1="12" x2="3" y2="12" /><line x1="21" y1="12" x2="23" y2="12" /><line x1="4.22" y1="19.78" x2="5.64" y2="18.36" /><line x1="18.36" y1="5.64" x2="19.78" y2="4.22" /></Ico>;
const IcoMoon = () => <Ico><path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z" /></Ico>;
const IcoPlay = () => <Ico><polygon points="5 3 19 12 5 21 5 3" fill="currentColor" stroke="none" /></Ico>;
const IcoPause = () => <Ico><rect x="6" y="4" width="4" height="16" /><rect x="14" y="4" width="4" height="16" /></Ico>;
const IcoReset = () => <Ico><polyline points="1 4 1 10 7 10" /><path d="M3.51 15a9 9 0 102.13-9.36L1 10" /></Ico>;

function DashboardPage() {
  const navigate = useNavigate();
  const {
    tasks,
    getDailyProgress,
    morningPlannerCompleted,
    nightReviewCompleted,
    updateTask,
    focusTimeLeft,
    isFocusRunning,
    setIsFocusRunning,
    focusMode,
    focusStats,
    switchFocusMode
  } = useTasks();

  const [activeReviewState, setActiveReviewState] = useState(null);
  const [currentTime, setCurrentTime] = useState(new Date());
  const userName = localStorage.getItem("smartName") || "User";

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 10000);
    return () => clearInterval(timer);
  }, []);

  const {
    todayCount,
    todayCompleted,
    completionRate,
    pendingCount,
    completedCount,
    overdueCount,
    streak
  } = getDailyProgress();

  const todayStr = format(currentTime, "yyyy-MM-dd");
  const todayLabel = format(currentTime, "EEEE, MMMM d");
  const timeLabel = format(currentTime, "h:mm a");
  
  const pendingTodayTasks = tasks.filter((t) => !t.completed && t.dueDate === todayStr);

  const overdueTasks = tasks.filter(t => {
    if (t.completed) return false;
    if (!t.dueDate) return false;
    const tDate = new Date(t.dueDate + "T" + (t.dueTime || "23:59"));
    return tDate < new Date();
  });

  if (activeReviewState === "morning") return <MorningPlanner onClose={() => setActiveReviewState(null)} />;
  if (activeReviewState === "night") return <NightReview onClose={() => setActiveReviewState(null)} />;

  const formatTime = (s) => `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;

  /* Weekly chart data */
  const chartData = Array.from({ length: 7 }, (_, i) => {
    const d = subDays(new Date(), 6 - i);
    const dayStr = format(d, "yyyy-MM-dd");
    return {
      day: format(d, "EEE"),
      done: tasks.filter((t) => t.completed && (t.completedDate || t.dueDate) === dayStr).length,
    };
  });

  const currentHour = new Date().getHours();

  /* Greeting based on time */
  const greeting = currentHour < 12 ? "Good morning" : currentHour < 17 ? "Good afternoon" : "Good evening";

  /* Mode config */
  const modeConfig = {
    work: { label: "Deep Work", duration: 25, color: "#4f46e5", bg: "rgba(79,70,229,0.12)" },
    shortBreak: { label: "Short Break", duration: 5, color: "#059669", bg: "rgba(5,150,105,0.12)" },
    longBreak: { label: "Long Break", duration: 15, color: "#d97706", bg: "rgba(217,119,6,0.12)" },
  };
  const mc = modeConfig[focusMode];
  const totalSecs = mc.duration * 60;
  const elapsed = totalSecs - focusTimeLeft;
  const ringPct = Math.round((elapsed / totalSecs) * 100);

  const [notificationStatus, setNotificationStatus] = useState(
    "Notification" in window ? Notification.permission : "unsupported"
  );

  const handleRequestPermission = () => {
    if ("Notification" in window) {
      Notification.requestPermission().then((perm) => {
        setNotificationStatus(perm);
      });
    }
  };

  return (
    <div className="page-fade-in dashboard-page">
      <header className="db-header">
        <div>
          <h1 className="db-greeting">
            Welcome back, {userName}! <span className="wave-emoji">👋</span>
          </h1>
          <p className="db-date">{todayLabel}</p>
        </div>
      </header>

      {notificationStatus === "default" && (
        <div style={{ background: "#eff6ff", border: "1px solid #bfdbfe", padding: "12px 16px", borderRadius: "12px", marginBottom: "24px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <strong style={{ color: "#1e40af", display: "block", marginBottom: "4px" }}>Enable Native Notifications</strong>
            <span style={{ color: "#3b82f6", fontSize: "0.9rem" }}>Never miss a task reminder! Allow browser notifications to see alerts even when the app is minimized.</span>
          </div>
          <button onClick={handleRequestPermission} style={{ background: "#2563eb", color: "white", border: "none", padding: "8px 16px", borderRadius: "8px", fontWeight: "600", cursor: "pointer", flexShrink: 0, marginLeft: "16px" }}>
            Enable
          </button>
        </div>
      )}
      {notificationStatus === "denied" && (
        <div style={{ background: "#fef2f2", border: "1px solid #fecaca", padding: "12px 16px", borderRadius: "12px", marginBottom: "24px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <strong style={{ color: "#991b1b", display: "block", marginBottom: "4px" }}>Notifications Blocked</strong>
            <span style={{ color: "#ef4444", fontSize: "0.9rem" }}>You have blocked notifications. Please allow them in your browser settings to receive native task reminders.</span>
          </div>
        </div>
      )}

      {/* ══════════ HERO BANNER ══════════ */}
      <section className="db-hero">
        <div className="db-hero-left">
          <p className="db-hero-eyebrow">{todayLabel} &nbsp;•&nbsp; {timeLabel}</p>
          <h1 className="db-hero-title">{greeting}, {userName} 👋</h1>
          <p className="db-hero-sub">
            You have <strong>{todayCount} tasks</strong> today — {todayCompleted} done, {pendingCount} remaining.
          </p>
          <div className="db-hero-tags">
            <span className="db-tag indigo"><IcoFire /> {streak} day streak</span>
            <span className="db-tag emerald"><IcoCheck /> {completionRate}% complete</span>
            {overdueCount > 0 && <span className="db-tag rose"><IcoAlert /> {overdueCount} overdue</span>}
          </div>
        </div>
        <div className="db-hero-right">
          <div className="db-hero-ring-wrap">
            <svg width="110" height="110" viewBox="0 0 110 110">
              <circle cx="55" cy="55" r="46" fill="none" stroke="#e2e8f0" strokeWidth="8" />
              <circle
                cx="55" cy="55" r="46" fill="none"
                stroke="url(#heroGrad)" strokeWidth="8"
                strokeLinecap="round"
                strokeDasharray={`${(completionRate / 100) * 289.0} 289.0`}
                transform="rotate(-90 55 55)"
              />
              <defs>
                <linearGradient id="heroGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#4f46e5" />
                  <stop offset="100%" stopColor="#10b981" />
                </linearGradient>
              </defs>
              <text x="55" y="49" textAnchor="middle" fill="#0d1b2a" fontSize="18" fontWeight="800" fontFamily="Outfit,sans-serif">{completionRate}%</text>
              <text x="55" y="64" textAnchor="middle" fill="#8fa3b1" fontSize="9" fontFamily="Inter,sans-serif">Today</text>
            </svg>
          </div>
        </div>
      </section>

      {/* ══════════ QUICK ACTIONS ══════════ */}
      <section className="db-quick-actions">
        <div className="db-quick-btns">
          <button type="button" className="db-quick-btn" onClick={() => setActiveReviewState("morning")}>
            <IcoSun /> Morning Planner
          </button>
          <button type="button" className="db-quick-btn" onClick={() => setActiveReviewState("night")}>
            <IcoMoon /> Night Review
          </button>
          <button type="button" className="db-quick-btn" onClick={() => navigate("/tasks")}>
            <IcoTasks /> Manage Tasks
          </button>
          <button type="button" className="db-quick-btn" onClick={() => navigate("/reports")}>
            <IcoZap /> View Reports
          </button>
        </div>
      </section>



      {/* ══════════ STAT CARDS ══════════ */}
      <section className="db-stats-row">
        {[
          { icon: <IcoTarget />, label: "Completion Rate", value: `${completionRate}%`, sub: `${todayCompleted}/${todayCount} tasks`, color: "#4f46e5", bg: "#ede9fe" },
          { icon: <IcoTasks />, label: "Pending Tasks", value: pendingCount, sub: "Needs attention", color: "#d97706", bg: "#fef3c7" },
          { icon: <IcoAlert />, label: "Overdue Items", value: overdueCount, sub: "Rescheduling needed", color: "#e11d48", bg: "#ffe4e6" },
          { icon: <IcoZap />, label: "Focus Minutes", value: `${focusStats.workMinutes}m`, sub: `${focusStats.completedSessions} sessions`, color: "#7c3aed", bg: "#f3e8ff" },
        ].map(({ icon, label, value, sub, color, bg }) => (
          <div className="db-stat-card" key={label}>
            <div className="db-stat-icon" style={{ background: bg, color }}>{icon}</div>
            <div className="db-stat-body">
              <p className="db-stat-label">{label}</p>
              <p className="db-stat-value" style={{ color }}>{value}</p>
              <p className="db-stat-sub">{sub}</p>
            </div>
          </div>
        ))}
      </section>

      {/* ══════════ MAIN CONTENT GRID ══════════ */}
      <div className="db-main-grid">
        <div className="db-left-col" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {/* ── Today's Tasks ── */}
          <section className="db-card db-tasks-card" style={{ display: 'flex', flexDirection: 'column' }}>
            <div className="db-card-header">
              <div>
                <h2 className="db-card-title">Today's Tasks</h2>
                <p className="db-card-sub">{todayCompleted} of {todayCount} completed</p>
              </div>
              <button type="button" className="db-add-btn" onClick={() => navigate("/tasks", { state: { openAddTaskModal: true } })}>
                <IcoPlus /> Add Task
              </button>
            </div>

            {(pendingTodayTasks.length === 0 && overdueTasks.length === 0) ? (
              <div className="db-empty">
                <div className="db-empty-icon"><IcoTasks /></div>
                <p className="db-empty-title">All caught up!</p>
                <p className="db-empty-sub">You have no pending or overdue tasks.</p>
                <button type="button" className="db-empty-btn" onClick={() => navigate("/tasks")}>
                  Go to Tasks <IcoArrow />
                </button>
              </div>
            ) : (
              <>
                {/* Progress bar */}
                <div className="db-task-progress">
                  <div className="db-task-progress-fill" style={{ width: `${completionRate}%` }} />
                </div>

                <div className="db-task-list">
                  {/* Overdue Section */}
                  {overdueTasks.length > 0 && (
                    <div style={{ marginBottom: "16px" }}>
                      <h3 style={{ fontSize: "0.9rem", color: "#ef4444", marginBottom: "8px", borderBottom: "1px solid #fee2e2", paddingBottom: "4px" }}>
                        ⚠️ Overdue Tasks
                      </h3>
                      {overdueTasks.map((task) => (
                        <div key={task.id} className="db-task-item" style={{ borderLeft: "3px solid #ef4444" }}>
                          <button
                            type="button"
                            className="db-task-check"
                            onClick={() => updateTask(task.id, { completed: true })}
                            aria-label="Mark complete"
                          />
                          <div className="db-task-body">
                            <span className="db-task-title">{task.title}</span>
                            <div className="db-task-meta">
                              <span style={{ color: "#ef4444", background: "#fee2e2", padding: "2px 6px", borderRadius: "8px", fontWeight: "600" }}>{task.dueDate}</span>
                              {task.dueTime && <span>⏰ {task.dueTime}</span>}
                              <span className={`badge priority-${task.priority}`}>{task.priority}</span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Today's Section */}
                  {pendingTodayTasks.length > 0 && (
                    <div>
                      <h3 style={{ fontSize: "0.9rem", color: "var(--text-secondary)", marginBottom: "8px", borderBottom: "1px solid var(--border-light)", paddingBottom: "4px" }}>
                        📅 Today's Tasks
                      </h3>
                      {pendingTodayTasks.map((task) => (
                        <div key={task.id} className="db-task-item">
                          <button
                            type="button"
                            className="db-task-check"
                            onClick={() => updateTask(task.id, { completed: true })}
                            aria-label="Mark complete"
                          />
                          <div className="db-task-body">
                            <span className="db-task-title">{task.title}</span>
                            <div className="db-task-meta">
                              {task.dueTime && <span>⏰ {task.dueTime}</span>}
                              <span className={`badge priority-${task.priority}`}>{task.priority}</span>
                              {task.category && <span className="badge category">{task.category}</span>}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </>
            )}
          </section>


        </div>

        {/* ── Right Column ── */}
        <div className="db-right-col">

          {/* ── Pomodoro Timer ── */}
          <section className="db-card db-pomo-card">
            <div className="db-card-header">
              <div>
                <h2 className="db-card-title">Focus Timer</h2>
                <p className="db-card-sub">Pomodoro technique</p>
              </div>
              <span className="db-pomo-mode-pill" style={{ background: mc.bg, color: mc.color }}>
                {mc.label}
              </span>
            </div>

            {/* Mode tabs */}
            <div className="db-pomo-tabs">
              {Object.entries(modeConfig).map(([key, cfg]) => (
                <button
                  key={key}
                  type="button"
                  className={`db-pomo-tab${focusMode === key ? " active" : ""}`}
                  style={focusMode === key ? { color: cfg.color, borderColor: cfg.color, background: cfg.bg } : {}}
                  onClick={() => switchFocusMode(key)}
                >
                  {cfg.label}
                </button>
              ))}
            </div>

            {/* Timer ring */}
            <div className="db-pomo-ring-wrap">
              <svg width="150" height="150" viewBox="0 0 150 150">
                <circle cx="75" cy="75" r="62" fill="none" stroke="rgba(0,0,0,0.06)" strokeWidth="8" />
                <circle
                  cx="75" cy="75" r="62" fill="none"
                  stroke={mc.color} strokeWidth="8"
                  strokeLinecap="round"
                  strokeDasharray={`${(ringPct / 100) * 389.6} 389.6`}
                  transform="rotate(-90 75 75)"
                  style={{ transition: "stroke-dasharray 1s linear" }}
                />
              </svg>
              <div className="db-pomo-ring-center">
                <span className="db-pomo-time" style={{ color: mc.color }}>{formatTime(focusTimeLeft)}</span>
                <span className="db-pomo-time-label">{mc.label}</span>
              </div>
            </div>

            {/* Controls */}
            <div className="db-pomo-controls">
              <button
                type="button"
                className="db-pomo-primary-btn"
                style={{ background: mc.color }}
                onClick={() => setIsFocusRunning(!isFocusRunning)}
              >
                {isFocusRunning ? <><IcoPause /> Pause</> : <><IcoPlay /> Start Focus</>}
              </button>
              <button
                type="button"
                className="db-pomo-reset-btn"
                onClick={() => switchFocusMode(focusMode)}
              >
                <IcoReset />
              </button>
            </div>

            <p className="db-pomo-stats">
              <span><strong>{focusStats.workMinutes}m</strong> focused today</span>
              <span>·</span>
              <span><strong>{focusStats.completedSessions}</strong> sessions</span>
            </p>
          </section>
        </div>
      </div>

      {/* ══════════ CHART SECTION ══════════ */}
      <section className="db-card db-chart-full">
        <div className="db-card-header">
          <div>
            <h2 className="db-card-title">Productivity Overview</h2>
            <p className="db-card-sub">Tasks completed over the past 7 days</p>
          </div>
          <button type="button" className="db-link-btn" onClick={() => navigate("/reports")}>
            Full Report <IcoArrow />
          </button>
        </div>
        <div style={{ width: "100%", height: 220 }}>
          <ResponsiveContainer>
            <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="chartGradFull" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#4f46e5" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis dataKey="day" stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} dy={10} />
              <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} allowDecimals={false} dx={-10} />
              <Tooltip
                contentStyle={{ background: "rgba(255,255,255,0.9)", backdropFilter: "blur(8px)", border: "1px solid rgba(226,232,240,0.8)", borderRadius: "12px", fontSize: "0.85rem", boxShadow: "0 8px 24px rgba(0,0,0,0.08)" }}
                cursor={{ stroke: "#4f46e5", strokeWidth: 1, strokeDasharray: "4 4" }}
              />
              <Area type="monotone" dataKey="done" name="Tasks Done" stroke="#4f46e5" strokeWidth={3} fill="url(#chartGradFull)" dot={{ fill: "white", stroke: "#4f46e5", strokeWidth: 2, r: 4 }} activeDot={{ r: 6, fill: "#4f46e5", stroke: "white", strokeWidth: 2 }} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </section>

    </div>
  );
}

export default DashboardPage;
