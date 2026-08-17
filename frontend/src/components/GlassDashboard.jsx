import { useState, useEffect, useRef, useMemo, Suspense } from "react";
import { useTasks } from "../context/TaskContext";
import { format, isThisWeek, parseISO, isToday, isYesterday, isTomorrow } from "date-fns";
import { useNavigate } from "react-router-dom";
import "./glassDashboard.css";

import TaskDetailsModal from "./TaskDetailsModal";
import TaskActivityCenter from "./GlassTaskActivityCenter";
import ProductivityAnalytics from "./GlassProductivityAnalytics";
import GlassWeeklyProgress from "./GlassWeeklyProgress";
import GlassReportTracker from "./GlassReportTracker";
import GlassPerformanceInsights from "./GlassPerformanceInsights";
import GlassOrbitalWidget from "./GlassOrbitalWidget";

/* ── Micro SVG Icons ── */
const Ico = ({ children, size = 24 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, display: "block" }}>
    {children}
  </svg>
);
const IcoSettings = () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path></svg>;
const IcoReset = () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 12a9 9 0 1 0 3-6.7" /><polyline points="3 3 3 9 9 9" /></svg>;
const IcoTarget = () => <Ico><circle cx="12" cy="12" r="10" /><circle cx="12" cy="12" r="6" /><circle cx="12" cy="12" r="2" /></Ico>;
const IcoClock = () => <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></svg>;
const IcoAlert = () => <Ico><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" /><line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" /></Ico>;
const IcoZap = () => <Ico><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" /></Ico>;
const IcoCheck = () => <Ico><polyline points="20 6 9 17 4 12" /></Ico>;
const IcoArrow = () => <Ico size={14}><line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" /></Ico>;
const IcoTasks = () => <Ico><path d="M9 11l3 3L22 4" /><path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11" /></Ico>;
const IcoFire = () => <Ico><path d="M12 2c0 0-5.5 4-5.5 9a5.5 5.5 0 0011 0C17.5 6 12 2 12 2z" /><path d="M12 12c0 0-2 1.5-2 3a2 2 0 004 0c0-1.5-2-3-2-3z" /></Ico>;
const IcoRepeat = () => <Ico><polyline points="1 4 1 10 7 10" /><path d="M3.51 15a9 9 0 102.13-9.36L1 10" /></Ico>;
const IcoCalendar = () => <Ico><rect x="3" y="4" width="18" height="18" rx="2" ry="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" /></Ico>;
const IcoStar = () => <Ico><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" /></Ico>;
const IcoCalendarCheck = () => <Ico><rect x="3" y="4" width="18" height="18" rx="2" ry="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" /><path d="m9 16 2 2 4-4" /></Ico>;
const IcoCalendarRange = () => <Ico><rect x="3" y="4" width="18" height="18" rx="2" ry="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" /><rect x="7" y="14" width="10" height="4" rx="1" fill="currentColor" opacity="0.15" /><line x1="7" y1="14" x2="17" y2="14" /></Ico>;

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

/* ── Compact task row ── */
function TaskPreviewCard({ task, onSelect }) {
  return (
    <div className="glass-task-preview-row">
      <span
        title={task.title}
        style={{ fontWeight: "700", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontSize: "0.9rem" }}
      >
        {task.title}
      </span>
      <button type="button" onClick={() => onSelect(task)} className="glass-task-details-btn">
        View
      </button>
    </div>
  );
}

/* ── Section card ── */
function TaskPreviewSection({ title, icon, tasks, emptyMsg, viewAllLabel, onViewAll, onSelect }) {
  const preview = tasks.slice(0, 3);

  return (
    <div className="glass-card" style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <div className="glass-card-header">
        <div style={{ display: "flex", alignItems: "center", gap: "8px", fontWeight: "700" }}>
          <span>{icon}</span>
          <h3>{title}</h3>
        </div>
        <span style={{ background: "rgba(255,255,255,0.3)", padding: "2px 8px", borderRadius: "20px", fontSize: "0.8rem", fontWeight: "800" }}>
          {tasks.length}
        </span>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: "8px", flex: 1 }}>
        {preview.length === 0 ? (
          <p style={{ opacity: 0.8, fontSize: "0.9rem", fontStyle: "italic" }}>{emptyMsg}</p>
        ) : (
          preview.map(task => (
            <TaskPreviewCard key={task.id} task={task} onSelect={onSelect} />
          ))
        )}
      </div>

      <button type="button" className="glass-view-all-btn" onClick={onViewAll}>
        <span>{viewAllLabel}</span>
        <IcoArrow />
      </button>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════ */
export default function GlassDashboard() {
  const navigate = useNavigate();
  const { tasks, getDailyProgress, deleteTask } = useTasks();

  const [currentTime, setCurrentTime] = useState(new Date());
  const [selectedTask, setSelectedTask] = useState(null);

  const userName = localStorage.getItem("smartName") || "User";

  useEffect(() => {
    const t = setInterval(() => setCurrentTime(new Date()), 10000);
    return () => clearInterval(t);
  }, []);

  const { todayCount, todayCompleted, completionRate, pendingCount, completedCount, overdueCount, streak } = getDailyProgress();

  const todayLabel = format(currentTime, "EEEE, MMMM d");
  const timeLabel = format(currentTime, "h:mm a");

  const getTaskStatus = (task) => task.status || (task.completed ? "Completed" : "Pending");

  const pendingTasks = useMemo(() =>
    tasks.filter(t => getTaskStatus(t) === "Pending").sort((a, b) => {
      const ad = (a.dueDate || "9999-12-31") + "T" + (a.dueTime || "23:59");
      const bd = (b.dueDate || "9999-12-31") + "T" + (b.dueTime || "23:59");
      return ad.localeCompare(bd);
    }), [tasks]);

  const overdueTasks = useMemo(() =>
    tasks.filter(t => getTaskStatus(t) === "Overdue").sort((a, b) => {
      const ad = (a.dueDate || "") + "T" + (a.dueTime || "00:00");
      const bd = (b.dueDate || "") + "T" + (b.dueTime || "00:00");
      return bd.localeCompare(ad);
    }), [tasks]);

  const completedTasks = useMemo(() =>
    tasks.filter(t => getTaskStatus(t) === "Completed").sort((a, b) => {
      const at = a.completedAt || a.completedDate || "0";
      const bt = b.completedAt || b.completedDate || "0";
      return bt.localeCompare(at);
    }), [tasks]);

  const currentHour = new Date().getHours();
  const greeting = currentHour < 12 ? "Good morning" : currentHour < 17 ? "Good afternoon" : "Good evening";

  const renderWidget = (id) => {
    switch (id) {
      case 'pending': return (
        <TaskPreviewSection title="Pending Tasks" icon={<IcoClock />} tasks={pendingTasks} emptyMsg="No pending tasks. Great job!" viewAllLabel="View All Pending" onViewAll={() => navigate("/tasks", { state: { filterStatus: "Pending" } })} onSelect={setSelectedTask} />
      );
      case 'overdue': return (
        <TaskPreviewSection title="Overdue Tasks" icon={<IcoAlert />} tasks={overdueTasks} emptyMsg="No overdue tasks. You're all caught up! 🎉" viewAllLabel="View All Overdue" onViewAll={() => navigate("/tasks", { state: { filterStatus: "Overdue" } })} onSelect={setSelectedTask} />
      );
      case 'completed': return (
        <TaskPreviewSection title="Completed Tasks" icon={<IcoCheck />} tasks={completedTasks} emptyMsg="No completed tasks yet." viewAllLabel="View All Completed" onViewAll={() => navigate("/tasks", { state: { filterStatus: "Completed" } })} onSelect={setSelectedTask} />
      );
      case 'activity': return (
        <div className="glass-card" style={{ padding: '0', height: '100%' }}>
          <TaskActivityCenter />
        </div>
      );
      case 'orbital': return (
        <GlassOrbitalWidget tasks={tasks} onAction={(action, task) => {
          const taskToEdit = { ...task };
          if (action === 'subtask') {
             navigate("/tasks", { state: { editTask: taskToEdit, openSubtasks: true } });
          } else if (action === 'reschedule') {
             navigate("/tasks", { state: { editTask: taskToEdit, focusDate: true } });
          } else {
             navigate("/tasks", { state: { editTask: taskToEdit } });
          }
        }} />
      );
      case 'analytics': return (
        <div className="glass-card" style={{ padding: '0', height: '100%' }}>
          <ProductivityAnalytics />
        </div>
      );
      default: return null;
    }
  };

  return (
    <div className="glass-dashboard-container">
      <div className="glass-shape glass-shape-1"></div>
      <div className="glass-shape glass-shape-2"></div>

      <div className="glass-content" style={{ display: 'flex', flexDirection: 'column', gap: '16px', height: '100%', padding: '60px' }}>
        
        {/* Row 1: Hero Banner */}
        <section className="glass-hero" style={{ margin: 0, minHeight: '90px', padding: '16px 24px' }}>
          <div className="glass-hero-left">
            <p className="glass-hero-eyebrow">{todayLabel} • {timeLabel}</p>
            <h1 style={{ fontSize: '1.8rem' }}>{greeting}, {userName} 👋</h1>
            <p style={{ fontSize: '0.9rem', opacity: 0.9 }}>
              You have <strong>{todayCount} tasks</strong> today — {todayCompleted} done, {pendingCount} remaining.
            </p>
            <div style={{ marginTop: '8px' }}>
              <span className="glass-tag"><IcoFire /> {streak} day streak</span>
              <span className="glass-tag"><IcoCheck /> {completionRate}% complete</span>
              {overdueCount > 0 && <span className="glass-tag"><IcoAlert /> {overdueCount} overdue</span>}
            </div>
          </div>
          <div className="glass-hero-right">
            <svg width="80" height="80" viewBox="0 0 110 110">
              <circle cx="55" cy="55" r="46" fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="8" />
              <circle
                cx="55" cy="55" r="46" fill="none"
                stroke="#fff" strokeWidth="8"
                strokeLinecap="round"
                strokeDasharray={`${(completionRate / 100) * 289.0} 289.0`}
                transform="rotate(-90 55 55)"
              />
              <text x="55" y="49" textAnchor="middle" fill="#fff" fontSize="22" fontWeight="800" fontFamily="Outfit,sans-serif">{completionRate}%</text>
              <text x="55" y="66" textAnchor="middle" fill="rgba(255,255,255,0.8)" fontSize="12" fontFamily="Inter,sans-serif">Today</text>
            </svg>
          </div>
        </section>

        {/* Row 2: Previews (3 cols) */}
        <section style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px', minHeight: '160px' }}>
          {renderWidget('completed')}
          {renderWidget('overdue')}
          {renderWidget('pending')}
        </section>

        {/* Row 3: Analytics, Orbital, Activity (3 cols) */}
        <section style={{ display: 'grid', gridTemplateColumns: '1fr 1.5fr 1fr', gap: '24px', minHeight: '560px' }}>
          {renderWidget('analytics')}
          {renderWidget('orbital')}
          {renderWidget('activity')}
        </section>

        {/* Row 4: New Bottom Insights (3 cols) */}
        <section style={{ display: 'grid', gridTemplateColumns: '1.2fr 1.5fr 1fr', gap: '24px', minHeight: '240px', flex: 1, marginTop: '8px' }}>
          <GlassWeeklyProgress tasks={tasks} />
          <GlassReportTracker tasks={tasks} />
          <GlassPerformanceInsights tasks={tasks} />
        </section>

        {selectedTask && (
          <TaskDetailsModal
            task={selectedTask}
            onClose={() => setSelectedTask(null)}
            onEdit={(taskToEdit) => {
              const target = taskToEdit || selectedTask;
              setSelectedTask(null);
              navigate("/tasks", { state: { editTask: target } });
            }}
            onDelete={(id) => {
              deleteTask(id);
              setSelectedTask(null);
            }}
          />
        )}
      </div>
    </div>
  );
}
