import { useState, useEffect, useRef, useMemo } from "react";
import { useTasks } from "../context/TaskContext";
import { format, isThisWeek, parseISO, isToday, isYesterday, isTomorrow } from "date-fns";
import TaskDetailsModal from "./TaskDetailsModal";
import TaskActivityCenter from "./TaskActivityCenter";
import ProductivityAnalytics from "./ProductivityAnalytics";
import { useNavigate } from "react-router-dom";
import DraggableGrid from "./dnd/DraggableGrid";
import DraggableCard from "./dnd/DraggableCard";
import "../dashboard.css";

/* ── Micro SVG Icons ── */
const Ico = ({ children, size = 24 }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2.4"
    strokeLinecap="round"
    strokeLinejoin="round"
    style={{
      flexShrink: 0,
      display: "block"
    }}
  >
    {children}
  </svg>
);
const IcoSettings = () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path></svg>;
const IcoReset = () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 12a9 9 0 1 0 3-6.7"/><polyline points="3 3 3 9 9 9"/></svg>;
const IcoTarget = () => <Ico><circle cx="12" cy="12" r="10" /><circle cx="12" cy="12" r="6" /><circle cx="12" cy="12" r="2" /></Ico>;
const IcoClock = () => (
  <svg
    width="22"
    height="22"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2.5"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <circle cx="12" cy="12" r="9" />
    <path d="M12 7v5l3 2" />
  </svg>
);
const IcoAlert = () => <Ico><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" /><line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" /></Ico>;
const IcoZap = () => <Ico><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" /></Ico>;
const IcoCheck = () => <Ico><polyline points="20 6 9 17 4 12" /></Ico>;
const IcoArrow = () => <Ico size={14}><line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" /></Ico>;
const IcoTasks = () => <Ico><path d="M9 11l3 3L22 4" /><path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11" /></Ico>;
const IcoFire = () => <Ico><path d="M12 2c0 0-5.5 4-5.5 9a5.5 5.5 0 0011 0C17.5 6 12 2 12 2z" /><path d="M12 12c0 0-2 1.5-2 3a2 2 0 004 0c0-1.5-2-3-2-3z" /></Ico>;
const IcoRepeat = () => <Ico><polyline points="1 4 1 10 7 10" /><path d="M3.51 15a9 9 0 102.13-9.36L1 10" /></Ico>;
const IcoCalendar = () => <Ico><rect x="3" y="4" width="18" height="18" rx="2" ry="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" /></Ico>;
const IcoStar = () => <Ico><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" /></Ico>;

const IcoCalendarCheck = () => (
  <Ico>
    <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
    <line x1="16" y1="2" x2="16" y2="6" />
    <line x1="8" y1="2" x2="8" y2="6" />
    <line x1="3" y1="10" x2="21" y2="10" />
    <path d="m9 16 2 2 4-4" />
  </Ico>
);

const IcoCalendarRange = () => (
  <Ico>
    <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
    <line x1="16" y1="2" x2="16" y2="6" />
    <line x1="8" y1="2" x2="8" y2="6" />
    <line x1="3" y1="10" x2="21" y2="10" />
    <rect x="7" y="14" width="10" height="4" rx="1" fill="currentColor" opacity="0.15" />
    <line x1="7" y1="14" x2="17" y2="14" />
  </Ico>
);

/* ── Priority badge colors ── */
const PRIORITY_COLORS = {
  High: { bg: "#fef2f2", color: "#dc2626", border: "#fecaca" },
  Medium: { bg: "#fffbeb", color: "#d97706", border: "#fde68a" },
  Low: { bg: "#f0fdf4", color: "#16a34a", border: "#bbf7d0" },
};

/* ── Format due date for compact display ── */
function formatDueDisplay(dueDate, dueTime) {
  if (!dueDate) return null;
  try {
    const dateObj = parseISO(dueDate);
    let label = "";
    if (isToday(dateObj)) {
      label = "Today";
    } else if (isYesterday(dateObj)) {
      label = "Yesterday";
    } else if (isTomorrow(dateObj)) {
      label = "Tomorrow";
    } else {
      label = format(dateObj, "dd MMM yyyy");
    }

    if (dueTime) {
      try {
        label += `, ${format(new Date(`2000-01-01T${dueTime}`), "h:mm a")}`;
      } catch {
        label += `, ${dueTime}`;
      }
    }
    return label;
  } catch {
    return dueDate;
  }
}

/* ── Compact task row: title and View Details side by side ── */
function TaskPreviewCard({ task, onSelect }) {
  return (
    <div
      className="db-task-preview-row"
      style={{
        display: "grid",
        gridTemplateColumns: "minmax(0, 1fr) auto",
        alignItems: "center",
        columnGap: "12px",
        width: "100%",
        boxSizing: "border-box",
        padding: "10px 12px",
        border: "1px solid var(--border-light)",
        borderRadius: "10px",
        background: "var(--bg-card)"
      }}
    >
      <span
        className="db-tpc-title"
        title={task.title}
        style={{
          display: "block",
          minWidth: 0,
          margin: 0,
          fontWeight: "700",
          color: "var(--text-primary)",
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
          textAlign: "left"
        }}
      >
        {task.title}
      </span>

      <button
        type="button"
        onClick={() => onSelect(task)}
        className="db-task-details-btn"
        style={{
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
          width: "auto",
          margin: 0,
          border: "1px solid #c7d2fe",
          background: "#eef2ff",
          color: "#4f46e5",
          padding: "7px 12px",
          borderRadius: "8px",
          fontSize: "0.78rem",
          lineHeight: 1.2,
          fontWeight: "700",
          whiteSpace: "nowrap",
          cursor: "pointer"
        }}
      >
        View Details
      </button>
    </div>
  );
}

/* ── Section card (Pending / Overdue / Completed) ── */
function TaskPreviewSection({
  title,
  icon,
  accentColor,
  accentBg,
  tasks,
  emptyMsg,
  viewAllLabel,
  onViewAll,
  onSelect
}) {
  const preview = tasks.slice(0, 3);

  return (
    <div
      className="db-preview-section"
      style={{ "--section-accent": accentColor, "--section-accent-bg": accentBg }}
    >
      <div className="db-preview-header">
        <div className="db-preview-heading">
          <span className="db-preview-icon" style={{ color: accentColor }}>{icon}</span>
          <h3 className="db-preview-title">{title}</h3>
          <span
            className="db-preview-count"
            style={{ background: accentBg, color: accentColor }}
          >
            {tasks.length}
          </span>
        </div>
      </div>

      <div
        className="db-preview-list"
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "stretch",
          gap: "10px",
          width: "100%"
        }}
      >
        {preview.length === 0 ? (
          <p className="db-preview-empty">{emptyMsg}</p>
        ) : (
          preview.map(task => (
            <TaskPreviewCard key={task.id} task={task} onSelect={onSelect} />
          ))
        )}
      </div>

      <button type="button" className="db-preview-viewall" onClick={onViewAll}>
        <span>{viewAllLabel}</span>
        <IcoArrow />
      </button>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════ */
function DashboardPage() {
  const navigate = useNavigate();
  const {
    tasks,
    getDailyProgress,
    morningPlannerCompleted,
    nightReviewCompleted,
    focusTimeLeft,
    isFocusRunning,
    setIsFocusRunning,
    focusMode,
    focusStats,
    switchFocusMode
  } = useTasks();

  const [currentTime, setCurrentTime] = useState(new Date());
  const [selectedTask, setSelectedTask] = useState(null);
  const [todayOpen, setTodayOpen] = useState(false);
  const [weekOpen, setWeekOpen] = useState(false);
  const [notificationStatus, setNotificationStatus] = useState(
    "Notification" in window ? Notification.permission : "unsupported"
  );

  const userName = localStorage.getItem("smartName") || "User";
  const todayTimeoutRef = useRef(null);
  const weekTimeoutRef = useRef(null);

  /* ── Hover/click handlers for summary widgets ── */
  const handleTodayEnter = () => { if (todayTimeoutRef.current) clearTimeout(todayTimeoutRef.current); setTodayOpen(true); };
  const handleTodayLeave = () => { todayTimeoutRef.current = setTimeout(() => setTodayOpen(false), 300); };
  const handleWeekEnter = () => { if (weekTimeoutRef.current) clearTimeout(weekTimeoutRef.current); setWeekOpen(true); };
  const handleWeekLeave = () => { weekTimeoutRef.current = setTimeout(() => setWeekOpen(false), 300); };
  const handleTodayPanelEnter = () => { if (todayTimeoutRef.current) clearTimeout(todayTimeoutRef.current); };
  const handleWeekPanelEnter = () => { if (weekTimeoutRef.current) clearTimeout(weekTimeoutRef.current); };
  const handleTodayClick = (e) => { e.stopPropagation(); setTodayOpen(p => !p); setWeekOpen(false); };
  const handleWeekClick = (e) => { e.stopPropagation(); setWeekOpen(p => !p); setTodayOpen(false); };

  useEffect(() => {
    const h = () => { setTodayOpen(false); setWeekOpen(false); };
    document.addEventListener("click", h);
    return () => document.removeEventListener("click", h);
  }, []);

  useEffect(() => {
    const t = setInterval(() => setCurrentTime(new Date()), 10000);
    return () => clearInterval(t);
  }, []);

  /* ── Notification permission ── */
  const handleRequestPermission = () => {
    if ("Notification" in window) {
      Notification.requestPermission().then(p => setNotificationStatus(p));
    }
  };

  /* ── Daily progress ── */
  const { todayCount, todayCompleted, completionRate, pendingCount, completedCount, overdueCount, streak } = getDailyProgress();

  const todayStr = format(currentTime, "yyyy-MM-dd");
  const todayLabel = format(currentTime, "EEEE, MMMM d");
  const timeLabel = format(currentTime, "h:mm a");

  const getTaskStatus = (task) => {
    if (task.completed) return "Completed";
    const now = new Date();
    const today = format(now, "yyyy-MM-dd");
    const taskTime = task.dueTime || "23:59";
    const taskDateObj = new Date(`${task.dueDate}T${taskTime}`);
    if (taskDateObj < now) return "Overdue";
    if (task.dueDate === today) return "Pending";
    return "Incoming";
  };

  /* ── Task preview data (memoized) ── */
  const pendingTasks = useMemo(() =>
    tasks
      .filter(t => getTaskStatus(t) === "Pending")
      .sort((a, b) => {
        const ad = (a.dueDate || "9999-12-31") + "T" + (a.dueTime || "23:59");
        const bd = (b.dueDate || "9999-12-31") + "T" + (b.dueTime || "23:59");
        return ad.localeCompare(bd);
      }),
    [tasks]);

  const overdueTasks = useMemo(() =>
    tasks
      .filter(t => getTaskStatus(t) === "Overdue")
      .sort((a, b) => {
        const ad = (a.dueDate || "") + "T" + (a.dueTime || "00:00");
        const bd = (b.dueDate || "") + "T" + (b.dueTime || "00:00");
        return bd.localeCompare(ad); // most-recently-overdue first
      }),
    [tasks]);

  const completedTasks = useMemo(() =>
    tasks
      .filter(t => getTaskStatus(t) === "Completed")
      .sort((a, b) => {
        const at = a.completedAt || a.completedDate || "0";
        const bt = b.completedAt || b.completedDate || "0";
        return bt.localeCompare(at); // most-recently-completed first
      }),
    [tasks]);

  /* ── Advanced daily & weekly metrics ── */
  let totalWorkToday = 0, completedToday = 0, pendingToday = 0;
  let carryForward = 0, remainingToday = 0, rescheduledToday = 0;
  let totalThisWeek = 0, completedThisWeek = 0, remainingThisWeek = 0, overdueThisWeek = 0;
  const weeklyCompletions = { Mon: 0, Tue: 0, Wed: 0, Thu: 0, Fri: 0, Sat: 0, Sun: 0 };

  tasks.forEach(task => {
    const taskDueStr = task.dueDate || task.createdDate || "2099-01-01";
    let taskDateObj;
    try { taskDateObj = parseISO(taskDueStr); } catch { taskDateObj = new Date(); }

    const isCompleted = task.completed;
    const isCompletedToday = task.completedDate === todayStr;
    const isDueToday = task.dueDate === todayStr;
    const isOverdue = !isCompleted && taskDueStr < todayStr;
    const isCarryForward = taskDueStr < todayStr && (!isCompleted || isCompletedToday);

    if (isDueToday || isCarryForward) {
      totalWorkToday++;
      if (isCompleted) { completedToday++; }
      else if (taskDueStr < todayStr) { carryForward++; }
      else { pendingToday++; }
    }

    if (task.rescheduleHistory?.some(h => h.rescheduledAtDate === todayStr)) rescheduledToday++;
    remainingToday = pendingToday + carryForward;

    const dueThisWeek = isThisWeek(taskDateObj, { weekStartsOn: 1 });
    const completedThisWeekFlag = isCompleted && task.completedDate && isThisWeek(parseISO(task.completedDate), { weekStartsOn: 1 });

    if (dueThisWeek || isOverdue) totalThisWeek++;
    if (completedThisWeekFlag) completedThisWeek++;
    if ((dueThisWeek && !isCompleted) || isOverdue) remainingThisWeek++;
    if (isOverdue) overdueThisWeek++;

    if (completedThisWeekFlag) {
      const dayName = format(parseISO(task.completedDate), "EEE");
      if (weeklyCompletions[dayName] !== undefined) weeklyCompletions[dayName]++;
    }
  });

  const weeklyCompletionPct = totalThisWeek === 0 ? 0 : Math.round((completedThisWeek / totalThisWeek) * 100);
  let mostProductiveDay = "None", maxComp = 0;
  Object.entries(weeklyCompletions).forEach(([day, count]) => {
    if (count > maxComp) { maxComp = count; mostProductiveDay = day; }
  });

  const currentHour = new Date().getHours();
  const greeting = currentHour < 12 ? "Good morning" : currentHour < 17 ? "Good afternoon" : "Good evening";

  /* ════════════════ RENDER ════════════════ */
  const renderWidget = (id) => {
    switch (id) {
      case 'pending': return (
        <TaskPreviewSection title="Pending Tasks" icon={<IcoClock />} accentColor="#d97706" accentBg="#fef3c7" tasks={pendingTasks} emptyMsg="No pending tasks. Great job!" viewAllLabel="View All Pending" onViewAll={() => navigate("/tasks", { state: { filterStatus: "Pending" } })} onSelect={setSelectedTask} />
      );
      case 'overdue': return (
        <TaskPreviewSection title="Overdue Tasks" icon={<IcoAlert />} accentColor="#dc2626" accentBg="#fef2f2" tasks={overdueTasks} emptyMsg="No overdue tasks. You're all caught up! 🎉" viewAllLabel="View All Overdue" onViewAll={() => navigate("/tasks", { state: { filterStatus: "Overdue" } })} onSelect={setSelectedTask} />
      );
      case 'completed': return (
        <TaskPreviewSection title="Completed Tasks" icon={<IcoCheck />} accentColor="#059669" accentBg="#d1fae5" tasks={completedTasks} emptyMsg="No completed tasks yet." viewAllLabel="View All Completed" onViewAll={() => navigate("/tasks", { state: { filterStatus: "Completed" } })} onSelect={setSelectedTask} />
      );
      case 'activity': return <TaskActivityCenter />;
      case 'analytics': return <ProductivityAnalytics />;
      default: return null;
    }
  };

  return (
    <DraggableGrid 
      page="dashboard" 
      defaultLayout={['pending', 'overdue', 'completed', 'activity', 'analytics']}
      renderOverlay={(id) => renderWidget(id)}
    >
      {({ layout, resetLayout }) => (
        <div className="page-fade-in dashboard-page">
      <div className="dashboard-summary-buttons">
        {/* Today's Summary */}
        <div className="today-summary-trigger" onMouseEnter={handleTodayEnter} onMouseLeave={handleTodayLeave} onClick={e => e.stopPropagation()}>
          <button type="button" className={`db-summary-trigger-btn ${todayOpen ? "active" : ""}`} onClick={handleTodayClick} aria-label="View Today's Summary" title="View Today's Summary">
            <IcoCalendarCheck />
            <span className="db-summary-trigger-label">Today</span>
          </button>
          {todayOpen && (
            <div className="db-hover-panel-dropdown" onMouseEnter={handleTodayPanelEnter} onMouseLeave={handleTodayLeave}>
              <h3 className="db-summary-title" style={{ marginBottom: "16px", fontSize: "1.1rem", borderBottom: "1px solid var(--border-light)", paddingBottom: "8px" }}>Today's Summary</h3>
              <section className="db-stats-row compact panel-layout">
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
          )}
        </div>

        {/* Week's Summary */}
        <div className="week-summary-trigger" onMouseEnter={handleWeekEnter} onMouseLeave={handleWeekLeave} onClick={e => e.stopPropagation()}>
          <button type="button" className={`db-summary-trigger-btn ${weekOpen ? "active" : ""}`} onClick={handleWeekClick} aria-label="View This Week Summary" title="View This Week Summary">
            <IcoCalendarRange />
            <span className="db-summary-trigger-label">Week</span>
          </button>
          {weekOpen && (
            <div className="db-hover-panel-dropdown" onMouseEnter={handleWeekPanelEnter} onMouseLeave={handleWeekLeave}>
              <h3 className="db-summary-title" style={{ marginBottom: "16px", fontSize: "1.1rem", borderBottom: "1px solid var(--border-light)", paddingBottom: "8px" }}>This Week Summary</h3>
              <section className="db-stats-row compact panel-layout">
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
          )}
        </div>
        
        {/* Reset Layout */}
        {/* <button type="button" className="db-summary-trigger-btn" onClick={resetLayout} aria-label="Reset Layout" title="Reset Layout to Default">
          <IcoReset />
          <span className="db-summary-trigger-label">Reset Layout</span>
        </button> */}
      </div>

      {/* ── Notification banners ── */}
      <div className="db-top-section" style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
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
          <div style={{ background: "#fef2f2", border: "1px solid #fecaca", padding: "12px 16px", borderRadius: "12px" }}>
            <strong style={{ color: "#991b1b", display: "block", marginBottom: "4px" }}>Notifications Blocked</strong>
            <span style={{ color: "#ef4444", fontSize: "0.9rem" }}>You have blocked notifications. Please allow them in your browser settings to receive native task reminders.</span>
          </div>
        )}

        {/* ── Hero banner ── */}
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

      {/* ══════════ TASK PREVIEW SECTIONS ══════════ */}
      <section className="db-task-preview-grid">
        {layout.slice(0, 3).map(id => (
          <DraggableCard key={id} id={id}>
            {renderWidget(id)}
          </DraggableCard>
        ))}
      </section>

      {/* ══════════ BOTTOM GRID (Activity + Analytics) ══════════ */}
      <section className="dashboard-bottom-grid">
        {layout.slice(3).map(id => (
          <DraggableCard key={id} id={id}>
            {renderWidget(id)}
          </DraggableCard>
        ))}
      </section>

      {/* ══════════ FLOATING SUMMARY WIDGETS ══════════ */}


      {selectedTask && (
        <TaskDetailsModal
          task={selectedTask}
          onClose={() => setSelectedTask(null)}
          onEdit={() => {}}
        />
      )}
    </div>
    )}
  </DraggableGrid>
  );
}

export default DashboardPage;