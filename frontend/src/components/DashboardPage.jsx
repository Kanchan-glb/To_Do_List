import { useState, useEffect } from "react";
import { useTasks } from "../context/TaskContext";
import { format, subDays, isThisWeek, parseISO } from "date-fns";

import MorningPlanner from "./MorningPlanner";
import NightReview from "./NightReview";
import TaskDetailsModal from "./TaskDetailsModal";
import TaskActivityCenter from "./TaskActivityCenter";
import ProductivityAnalytics from "./ProductivityAnalytics";
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
const IcoPlusCircle = () => <Ico><circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="16" /><line x1="8" y1="12" x2="16" y2="12" /></Ico>;
const IcoCalendar = () => <Ico><rect x="3" y="4" width="18" height="18" rx="2" ry="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" /></Ico>;
const IcoStar = () => <Ico><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" /></Ico>;
const IcoRepeat = () => <Ico><polyline points="1 4 1 10 7 10" /><path d="M3.51 15a9 9 0 102.13-9.36L1 10" /></Ico>;

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
  const [selectedTask, setSelectedTask] = useState(null);
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
  // ════════════════════════════════════════
  // ── ADVANCED DAILY & WEEKLY METRICS ──
  // ════════════════════════════════════════
  let totalWorkToday = 0;
  let completedToday = 0;
  let pendingToday = 0;
  let carryForward = 0;
  let remainingToday = 0;
  let rescheduledToday = 0;

  let totalThisWeek = 0;
  let completedThisWeek = 0;
  let remainingThisWeek = 0;
  let overdueThisWeek = 0;

  const weeklyCompletions = { 'Mon': 0, 'Tue': 0, 'Wed': 0, 'Thu': 0, 'Fri': 0, 'Sat': 0, 'Sun': 0 };

  tasks.forEach(task => {
    const taskDueStr = task.dueDate || task.createdDate || "2099-01-01";
    let taskDateObj;
    try { taskDateObj = parseISO(taskDueStr); } catch (e) { taskDateObj = new Date(); }

    const isCompleted = task.completed;
    const isCompletedToday = task.completedDate === todayStr;
    const isDueToday = task.dueDate === todayStr;
    const isOverdue = !isCompleted && taskDueStr < todayStr;
    const isCarryForward = taskDueStr < todayStr && (!isCompleted || isCompletedToday);

    // --- TODAY STATS ---
    if (isDueToday || isCarryForward) {
      totalWorkToday++;
      if (isCompleted) {
        completedToday++;
      } else {
        if (taskDueStr < todayStr) {
          carryForward++;
        } else {
          pendingToday++;
        }
      }
    }

    const wasRescheduledToday = task.rescheduleHistory?.some(h => h.rescheduledAtDate === todayStr);
    if (wasRescheduledToday) rescheduledToday++;

    remainingToday = pendingToday + carryForward;

    // --- THIS WEEK STATS ---
    const dueThisWeek = isThisWeek(taskDateObj, { weekStartsOn: 1 });
    const completedThisWeekFlag = isCompleted && task.completedDate && isThisWeek(parseISO(task.completedDate), { weekStartsOn: 1 });

    if (dueThisWeek || isOverdue) totalThisWeek++;
    if (completedThisWeekFlag) completedThisWeek++;
    if ((dueThisWeek && !isCompleted) || isOverdue) remainingThisWeek++;
    if (isOverdue) overdueThisWeek++;

    if (completedThisWeekFlag) {
      const dayName = format(parseISO(task.completedDate), 'EEE');
      if (weeklyCompletions[dayName] !== undefined) weeklyCompletions[dayName]++;
    }
  });

  const weeklyCompletionPct = totalThisWeek === 0 ? 0 : Math.round((completedThisWeek / totalThisWeek) * 100);

  let mostProductiveDay = "None";
  let maxCompletions = 0;
  Object.entries(weeklyCompletions).forEach(([day, count]) => {
    if (count > maxCompletions) {
      maxCompletions = count;
      mostProductiveDay = day;
    }
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
      {/* <header className="db-header">
        <div>
          <h1 className="db-greeting">
            Welcome back, {userName}! <span className="wave-emoji">👋</span>
          </h1>
          <p className="db-date">{todayLabel}</p>
        </div>
      </header> */}

      {/* ══════════ TOP ROW (Notifications + Hero) ══════════ */}
      <div className="db-top-section" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {notificationStatus === "default" && (
          <div style={{ background: "#eff6ff", border: "1px solid #bfdbfe", padding: "12px 16px", borderRadius: "12px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
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
          <div style={{ background: "#fef2f2", border: "1px solid #fecaca", padding: "12px 16px", borderRadius: "12px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
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
              <svg width="80" height="80" viewBox="0 0 110 110">
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
      </div>



      {/* ══════════ SUMMARIES GRID ══════════ */}
      <div className="db-summaries-wrapper">
        <div className="db-summary-group">
          <h3 className="db-summary-title">Today's Summary</h3>
          <section className="db-stats-row compact">
        {[
          { icon: <IcoTasks />, label: "Total Work Today", value: totalWorkToday, color: "#6366f1", bg: "#e0e7ff" },
          { icon: <IcoCheck />, label: "Completed Today", value: completedToday, color: "#10b981", bg: "#d1fae5" },
          { icon: <IcoClock />, label: "Pending Today", value: pendingToday, color: "#f59e0b", bg: "#fef3c7" },
          { icon: <IcoAlert />, label: "Carry Forward", value: carryForward, color: "#ef4444", bg: "#fef2f2" },
          { icon: <IcoZap />, label: "Remaining Today", value: remainingToday, color: "#d97706", bg: "#ffedd5" },
          { icon: <IcoRepeat />, label: "Rescheduled Today", value: rescheduledToday, color: "#3b82f6", bg: "#eff6ff" },
        ].map(({ icon, label, value, color, bg }) => (
          <div className="db-stat-card" key={label}>
            <div className="db-stat-icon" style={{ background: bg, color }}>{icon}</div>
            <div className="db-stat-body">
              <p className="db-stat-value" style={{ color }}>{value}</p>
              <p className="db-stat-label">{label}</p>
            </div>
          </div>
        ))}
          </section>
        </div>

        <div className="db-summary-group">
          <h3 className="db-summary-title">This Week Summary</h3>
          <section className="db-stats-row compact">
        {[
          { icon: <IcoCalendar />, label: "Total This Week", value: totalThisWeek, color: "#3b82f6", bg: "#eff6ff" },
          { icon: <IcoCheck />, label: "Completed This Week", value: completedThisWeek, color: "#10b981", bg: "#d1fae5" },
          { icon: <IcoClock />, label: "Remaining This Week", value: remainingThisWeek, color: "#f59e0b", bg: "#fef3c7" },
          { icon: <IcoAlert />, label: "Overdue This Week", value: overdueThisWeek, color: "#ef4444", bg: "#fef2f2" },
          { icon: <IcoTarget />, label: "Weekly Completion", value: `${weeklyCompletionPct}%`, color: "#a855f7", bg: "#faf5ff" },
          { icon: <IcoStar />, label: "Most Productive Day", value: mostProductiveDay, color: "#0ea5e9", bg: "#e0f2fe" },
        ].map(({ icon, label, value, color, bg }) => (
          <div className="db-stat-card" key={label}>
            <div className="db-stat-icon" style={{ background: bg, color }}>{icon}</div>
            <div className="db-stat-body">
              <p className="db-stat-value" style={{ color }}>{value}</p>
              <p className="db-stat-label">{label}</p>
            </div>
          </div>
        ))}
          </section>
        </div>
      </div>

      {/* ══════════ BOTTOM GRID (TASKS & ANALYTICS) ══════════ */}
      <section className="dashboard-bottom-grid">
        <TaskActivityCenter />
        <ProductivityAnalytics />
      </section>

      {selectedTask && <TaskDetailsModal task={selectedTask} onClose={() => setSelectedTask(null)} />}
    </div>
  );
}

export default DashboardPage;
