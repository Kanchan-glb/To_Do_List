import { useState, useMemo } from "react";
import { useTasks } from "../context/TaskContext";
import { format, parseISO, subDays, addDays, isThisWeek, isThisMonth, isToday, isYesterday, isTomorrow } from "date-fns";
import TaskDetailsModal from "./TaskDetailsModal";
import NeumorphicFilterPill from "./NeumorphicFilterPill";
/* ── Micro SVG Icons ── */
const Ico = ({ children, size = 15, className = "" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor"
    strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">{children}</svg>
);
const IcoSearch = () => <Ico><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></Ico>;
const IcoCalendar = () => <Ico><rect x="3" y="4" width="18" height="18" rx="2" ry="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="3" y1="10" x2="21" y2="10" /></Ico>;
const IcoClock = () => <Ico><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></Ico>;
const IcoEdit = () => <Ico><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" /></Ico>;
const IcoTrash = () => <Ico><polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" /></Ico>;
const IcoCheck = () => <Ico><polyline points="20 6 9 17 4 12" /></Ico>;
const IcoEye = () => <Ico><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" /></Ico>;
const IcoClose = () => <Ico size={18}><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></Ico>;

const formatDisplayDate = (dStr) => {
  if (!dStr) return "N/A";
  try {
    const d = parseISO(dStr);
    if (isNaN(d.getTime())) return dStr;
    return format(d, "dd MMM yyyy");
  } catch (e) {
    return dStr;
  }
};

const formatDisplayTime = (tStr) => {
  if (!tStr) return "N/A";
  try {
    const parts = tStr.split(":");
    if (parts.length < 2) return tStr;
    const hourNum = parseInt(parts[0], 10);
    const minStr = parts[1];
    const ampm = hourNum >= 12 ? "PM" : "AM";
    const formattedHour = String(hourNum % 12 || 12).padStart(2, '0');
    return `${formattedHour}:${minStr} ${ampm}`;
  } catch (e) {
    return tStr;
  }
};

export default function DateHistoryModal({ dateStr, onClose }) {
  const { tasks, updateTask, deleteTask } = useTasks();

  const [selectedTask, setSelectedTask] = useState(null);

  // Filters State
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [priorityFilter, setPriorityFilter] = useState("All");
  const [categoryFilter, setCategoryFilter] = useState("All");
  const [sortBy, setSortBy] = useState("Due Time");

  const allCategories = useMemo(() => {
    const cats = new Set(tasks.map((t) => t.category));
    return ["All", ...Array.from(cats).filter(Boolean)];
  }, [tasks]);

  const displayDate = useMemo(() => {
    try {
      if (["All Tasks", "This Week", "This Month", "Today", "Yesterday", "Tomorrow"].includes(dateStr)) {
        return dateStr;
      }
      const parsed = parseISO(dateStr);
      if (isToday(parsed)) return "Today";
      if (isYesterday(parsed)) return "Yesterday";
      if (isTomorrow(parsed)) return "Tomorrow";
      return format(parsed, "MMMM d, yyyy");
    } catch (e) {
      return dateStr;
    }
  }, [dateStr]);

  // Derived Data for the selected date ONLY
  const dateOnlyTasks = useMemo(() => {
    return tasks.filter((task) => {
      if (dateStr !== "All Tasks") {
        const taskDue = task.dueDate || task.createdDate || "2099-01-01";
        const taskCompletedDate = task.completedDate;
        const todayStr = format(new Date(), "yyyy-MM-dd");

        let taskDateObj;
        try {
          taskDateObj = parseISO(taskDue);
        } catch (e) {
          taskDateObj = new Date();
        }

        const isMatchDate = (targetDateStr) => {
          return taskDue === targetDateStr ||
            taskCompletedDate === targetDateStr ||
            (task.rescheduleHistory && task.rescheduleHistory.some(h => h.rescheduledAtDate === targetDateStr));
        };

        if (dateStr === "Today") {
          const isDueToday = taskDue === todayStr;
          const isCompletedToday = taskCompletedDate === todayStr;
          const isOverdue = !task.completed && taskDue < todayStr;
          const isRescheduledToday = task.rescheduleHistory?.some(h => h.rescheduledAtDate === todayStr);
          if (!isDueToday && !isCompletedToday && !isOverdue && !isRescheduledToday) return false;
        } else if (dateStr === "Yesterday" && !isMatchDate(format(subDays(new Date(), 1), "yyyy-MM-dd"))) return false;
        else if (dateStr === "Tomorrow" && !isMatchDate(format(addDays(new Date(), 1), "yyyy-MM-dd"))) return false;
        else if (dateStr === "This Week") {
          if (!isThisWeek(taskDateObj)) return false;
        } else if (dateStr === "This Month") {
          if (!isThisMonth(taskDateObj)) return false;
        } else if (dateStr !== "Today" && dateStr !== "Yesterday" && dateStr !== "Tomorrow") {
          if (!isMatchDate(dateStr)) return false;
        }
      }
      return true;
    });
  }, [tasks, dateStr]);

  // Filtered tasks for the list view
  const filteredTasks = useMemo(() => {
    return dateOnlyTasks.filter((task) => {
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const matchTitle = task.title?.toLowerCase().includes(query);
        const matchDesc = task.description?.toLowerCase().includes(query);
        const matchCat = task.category?.toLowerCase().includes(query);
        if (!matchTitle && !matchDesc && !matchCat) return false;
      }

      if (statusFilter !== "All") {
        const currentStatus = task.status || (task.completed ? "Completed" : "Pending");
        if (statusFilter === "Rescheduled") {
          if (!(task.rescheduleCount > 0 || (task.rescheduleHistory && task.rescheduleHistory.length > 0))) return false;
        } else if (currentStatus.toLowerCase() !== statusFilter.toLowerCase()) {
          return false;
        }
      }

      if (priorityFilter !== "All" && task.priority !== priorityFilter) return false;
      if (categoryFilter !== "All" && task.category !== categoryFilter) return false;

      return true;
    }).sort((a, b) => {
      if (sortBy === "Alphabetical") return a.title.localeCompare(b.title);
      if (sortBy === "Due Time") {
        const timeA = a.dueTime || "23:59";
        const timeB = b.dueTime || "23:59";
        return timeA.localeCompare(timeB);
      }
      if (sortBy === "Priority") {
        const pMap = { High: 3, Medium: 2, Low: 1 };
        return (pMap[b.priority] || 0) - (pMap[a.priority] || 0);
      }
      if (sortBy === "Newest") return new Date(b.createdAt || 0) - new Date(a.createdAt || 0);
      if (sortBy === "Oldest") return new Date(a.createdAt || 0) - new Date(b.createdAt || 0);
      return 0;
    });
  }, [dateOnlyTasks, searchQuery, statusFilter, priorityFilter, categoryFilter, sortBy]);

  // Summaries
  const stats = useMemo(() => {
    let completed = 0, pending = 0, incoming = 0, overdue = 0, rescheduled = 0;
    const todayStr = format(new Date(), "yyyy-MM-dd");

    dateOnlyTasks.forEach((t) => {
      const isComp = t.completed || t.status === "Completed";
      if (isComp) {
        completed++;
      } else if (t.status === "Overdue" || (t.dueDate && t.dueDate < todayStr)) {
        overdue++;
      } else if (t.status === "Incoming") {
        incoming++;
      } else {
        pending++;
      }

      if (t.rescheduleCount > 0 || (t.rescheduleHistory && t.rescheduleHistory.length > 0)) {
        rescheduled++;
      }
    });

    const total = dateOnlyTasks.length;
    const compPercent = total === 0 ? 0 : Math.round((completed / total) * 100);
    return { total, completed, pending, incoming, overdue, rescheduled, compPercent };
  }, [dateOnlyTasks]);

  const handleToggleComplete = async (task) => {
    const nextCompleted = !task.completed;
    await updateTask(task.id || task._id, {
      completed: nextCompleted,
      status: nextCompleted ? "Completed" : "Pending",
      completedAt: nextCompleted ? new Date().toISOString() : null,
    });
  };

  const handleDelete = async (id) => {
    await deleteTask(id);
  };
  const [selectedCategories, setSelectedCategories] = useState([]);

  return (
    /* Dimmed Backdrop Blur Overlay */
    <div
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9999,
        background: "rgba(15, 23, 42, 0.55)",
        backdropFilter: "blur(5px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "24px",
      }}
    >
      {/* Centered Compact Modal Container (62vw width, max 880px, 72vh height) */}
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: "#ffffff",
          width: "62vw",
          maxWidth: "880px",
          height: "72vh",
          maxHeight: "74vh",
          borderRadius: "16px",
          boxShadow: "0 20px 40px -12px rgba(0, 0, 0, 0.22)",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
          position: "relative",
          border: "1px solid #e2e8f0"
        }}
      >
        {/* ── COMPACT HEADER ── */}
        <div
          style={{
            padding: "16px 20px",
            borderBottom: "1px solid #f1f5f9",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            background: "#ffffff"
          }}
        >
          <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <h2 style={{ margin: 0, fontSize: "1.1rem", fontWeight: "800", color: "#0f172a" }}>
                📋 View All Tasks
              </h2>
              <span
                style={{
                  background: "#4f46e5",
                  color: "#ffffff",
                  fontSize: "0.7rem",
                  fontWeight: "700",
                  padding: "2px 8px",
                  borderRadius: "10px"
                }}
              >
                {stats.total} {stats.total === 1 ? "Task" : "Tasks"}
              </span>
            </div>
            <p style={{ margin: 0, fontSize: "0.76rem", color: "#64748b" }}>
              Manage all your tasks in one place ({displayDate}).
            </p>
          </div>

          <button
            onClick={onClose}
            style={{
              // background: "linear-gradient(135deg, #4f46e5, #7c3aed)",
              border: "none",
              borderRadius: "50%",
              width: "36px",
              height: "36px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "black",
              cursor: "pointer",
              // boxShadow: "0 4px 12px rgba(79, 70, 229, 0.35)",
              transition: "transform 0.2s ease, box-shadow 0.2s ease",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = "scale(1.08)";
              e.currentTarget.style.boxShadow = "0 6px 16px rgba(79, 70, 229, 0.45)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = "scale(1)";
              e.currentTarget.style.boxShadow = "0 4px 12px rgba(79, 70, 229, 0.35)";
            }}
            title="Close"
          >
            X
          </button>
        </div>

        {/* ── DENSER COMPACT STATS CARDS ROW ── */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(78px, 1fr))",
            gap: "6px",
            padding: "8px 18px",
            background: "#f8fafc",
            borderBottom: "1px solid #f1f5f9"
          }}
        >
          <div style={{ background: "#ffffff", border: "1px solid #e2e8f0", borderRadius: "6px", padding: "6px 4px", textAlign: "center" }}>
            <span style={{ fontSize: "0.98rem", fontWeight: "800", color: "#6366f1", display: "block", lineHeight: 1.1 }}>{stats.total}</span>
            <span style={{ fontSize: "0.64rem", fontWeight: "700", color: "#64748b", textTransform: "uppercase" }}>Total</span>
          </div>

          <div style={{ background: "#ffffff", border: "1px solid #e2e8f0", borderRadius: "6px", padding: "6px 4px", textAlign: "center" }}>
            <span style={{ fontSize: "0.98rem", fontWeight: "800", color: "#10b981", display: "block", lineHeight: 1.1 }}>{stats.completed}</span>
            <span style={{ fontSize: "0.64rem", fontWeight: "700", color: "#64748b", textTransform: "uppercase" }}>Completed</span>
          </div>

          <div style={{ background: "#ffffff", border: "1px solid #e2e8f0", borderRadius: "6px", padding: "6px 4px", textAlign: "center" }}>
            <span style={{ fontSize: "0.98rem", fontWeight: "800", color: "#f59e0b", display: "block", lineHeight: 1.1 }}>{stats.pending}</span>
            <span style={{ fontSize: "0.64rem", fontWeight: "700", color: "#64748b", textTransform: "uppercase" }}>Pending</span>
          </div>

          <div style={{ background: "#ffffff", border: "1px solid #e2e8f0", borderRadius: "6px", padding: "6px 4px", textAlign: "center" }}>
            <span style={{ fontSize: "0.98rem", fontWeight: "800", color: "#06b6d4", display: "block", lineHeight: 1.1 }}>{stats.incoming}</span>
            <span style={{ fontSize: "0.64rem", fontWeight: "700", color: "#64748b", textTransform: "uppercase" }}>Incoming</span>
          </div>

          <div style={{ background: "#ffffff", border: "1px solid #e2e8f0", borderRadius: "6px", padding: "6px 4px", textAlign: "center" }}>
            <span style={{ fontSize: "0.98rem", fontWeight: "800", color: "#ef4444", display: "block", lineHeight: 1.1 }}>{stats.overdue}</span>
            <span style={{ fontSize: "0.64rem", fontWeight: "700", color: "#64748b", textTransform: "uppercase" }}>Overdue</span>
          </div>

          <div style={{ background: "#ffffff", border: "1px solid #e2e8f0", borderRadius: "6px", padding: "6px 4px", textAlign: "center" }}>
            <span style={{ fontSize: "0.98rem", fontWeight: "800", color: "#3b82f6", display: "block", lineHeight: 1.1 }}>{stats.rescheduled}</span>
            <span style={{ fontSize: "0.64rem", fontWeight: "700", color: "#64748b", textTransform: "uppercase" }}>Rescheduled</span>
          </div>

          <div style={{ background: "#ffffff", border: "1px solid #e2e8f0", borderRadius: "6px", padding: "6px 4px", textAlign: "center" }}>
            <span style={{ fontSize: "0.98rem", fontWeight: "800", color: "#8b5cf6", display: "block", lineHeight: 1.1 }}>{stats.compPercent}%</span>
            <span style={{ fontSize: "0.64rem", fontWeight: "700", color: "#64748b", textTransform: "uppercase" }}>Done %</span>
          </div>
        </div>

        {/* ── COMPACT FILTERS BAR ── */}
        <div
          style={{
            padding: "8px 18px",
            background: "#ffffff",
            borderBottom: "1px solid #f1f5f9",
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(105px, 1fr))",
            gap: "6px",
            alignItems: "center"
          }}
        >
          <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
            <span style={{ position: "absolute", left: "8px", color: "#94a3b8" }}><IcoSearch /></span>
            <input
              type="text"
              placeholder="Search tasks..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                width: "100%",
                height: "30px",
                paddingLeft: "28px",
                paddingRight: "6px",
                borderRadius: "5px",
                border: "1px solid #cbd5e1",
                fontSize: "0.76rem",
                outline: "none"
              }}
            />
          </div>

          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} style={{ height: "30px", padding: "0 4px", borderRadius: "5px", border: "1px solid #cbd5e1", fontSize: "0.76rem", background: "#fff" }}>
            <option value="All">All Status</option>
            <option value="Pending">Pending</option>
            <option value="Completed">Completed</option>
            <option value="Overdue">Overdue</option>
            <option value="Incoming">Incoming</option>
            <option value="Rescheduled">Rescheduled</option>
          </select>

          <select value={priorityFilter} onChange={(e) => setPriorityFilter(e.target.value)} style={{ height: "30px", padding: "0 4px", borderRadius: "5px", border: "1px solid #cbd5e1", fontSize: "0.76rem", background: "#fff" }}>
            <option value="All">All Priorities</option>
            <option value="High">High</option>
            <option value="Medium">Medium</option>
            <option value="Low">Low</option>
          </select>

          <NeumorphicFilterPill
            label="Category"
            selectedValues={selectedCategories}
            onSelectionChange={(vals) => setSelectedCategories(vals)}
            options={allCategories.filter(c => c !== "All")}
          />

          <select value={sortBy} onChange={(e) => setSortBy(e.target.value)} style={{ height: "30px", padding: "0 4px", borderRadius: "5px", border: "1px solid #cbd5e1", fontSize: "0.76rem", background: "#fff" }}>
            <option value="Due Time">Sort: Due Time</option>
            <option value="Priority">Sort: Priority</option>
            <option value="Newest">Sort: Newest</option>
            <option value="Oldest">Sort: Oldest</option>
            <option value="Alphabetical">Sort: Alphabetical</option>
          </select>

          <button
            onClick={() => {
              setSearchQuery("");
              setStatusFilter("All");
              setPriorityFilter("All");
              setCategoryFilter("All");
              setSortBy("Due Time");
            }}
            style={{ height: "30px", padding: "0 8px", borderRadius: "5px", border: "1px solid #cbd5e1", background: "#f8fafc", color: "#475569", fontSize: "0.76rem", fontWeight: "600", cursor: "pointer" }}
          >
            Reset Filters
          </button>
        </div>

        {/* ── INTERNAL SCROLLABLE TASK LIST ── */}
        <div
          style={{
            flex: 1,
            overflowY: "auto",
            padding: "10px 18px",
            display: "flex",
            flexDirection: "column",
            gap: "8px",
            background: "#f8fafc"
          }}
        >
          {filteredTasks.length === 0 ? (
            <div style={{ textAlign: "center", padding: "32px 16px", color: "#64748b" }}>
              <div style={{ fontSize: "2rem", marginBottom: "4px" }}>📋</div>
              <h3 style={{ margin: 0, fontSize: "0.98rem", fontWeight: "700", color: "#1e293b" }}>No tasks found</h3>
              <p style={{ margin: "3px 0 0", fontSize: "0.76rem", color: "#64748b" }}>Try changing filters or create a new task.</p>
            </div>
          ) : (
            filteredTasks.map((task) => {
              const taskId = task.id || task._id;
              const currentStatus = task.status || (task.completed ? "Completed" : "Pending");
              const isCompletedTask = task.completed || currentStatus === "Completed";

              let statusBg = "#f8fafc", statusColor = "#64748b", statusBorder = "#e2e8f0";
              if (currentStatus === "Completed") { statusBg = "#ecfdf5"; statusColor = "#059669"; statusBorder = "#a7f3d0"; }
              else if (currentStatus === "Overdue") { statusBg = "#fef2f2"; statusColor = "#dc2626"; statusBorder = "#fecaca"; }
              else if (currentStatus === "Pending") { statusBg = "#fffbeb"; statusColor = "#d97706"; statusBorder = "#fde68a"; }
              else if (currentStatus === "Incoming") { statusBg = "#ecfeff"; statusColor = "#0891b2"; statusBorder = "#a5f3fc"; }

              let priorityBg = "#f8fafc", priorityColor = "#64748b";
              if (task.priority === "High") { priorityBg = "#fef2f2"; priorityColor = "#dc2626"; }
              else if (task.priority === "Medium") { priorityBg = "#fffbeb"; priorityColor = "#d97706"; }
              else if (task.priority === "Low") { priorityBg = "#f0fdf4"; priorityColor = "#16a34a"; }

              return (
                <div
                  key={taskId}
                  style={{
                    background: "#ffffff",
                    border: "1px solid #e2e8f0",
                    borderRadius: "10px",
                    padding: "10px 12px",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    gap: "10px",
                    boxShadow: "0 1px 3px rgba(0,0,0,0.02)",
                    flexWrap: "wrap"
                  }}
                >
                  {/* Left Side: Title, Category, Due Date & Time, Description */}
                  <div style={{ flex: 1, minWidth: "200px", display: "flex", flexDirection: "column", gap: "3px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "6px", flexWrap: "wrap" }}>
                      <h3 style={{ margin: 0, fontSize: "0.9rem", fontWeight: "700", color: "#0f172a", textDecoration: task.completed ? "line-through" : "none" }}>
                        {task.title}
                      </h3>
                      <span style={{ fontSize: "0.68rem", padding: "1px 5px", borderRadius: "6px", background: "#f1f5f9", color: "#475569", fontWeight: "600" }}>
                        {task.category || "General"}
                      </span>
                    </div>

                    <div style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "0.75rem", color: "#64748b" }}>
                      <span style={{ display: "flex", alignItems: "center", gap: "3px" }}>
                        <IcoCalendar /> Due: {formatDisplayDate(task.dueDate)}
                      </span>
                      <span style={{ display: "flex", alignItems: "center", gap: "3px" }}>
                        <IcoClock /> Time: {formatDisplayTime(task.dueTime)}
                      </span>
                    </div>

                    {task.description && (
                      <p style={{ margin: "1px 0 0", fontSize: "0.74rem", color: "#64748b", overflow: "hidden", textOverflow: "ellipsis", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" }}>
                        {task.description}
                      </p>
                    )}
                  </div>

                  {/* Right Side: Badges & Action Buttons */}
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "5px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "5px" }}>
                      <span style={{ fontSize: "0.68rem", padding: "1px 6px", borderRadius: "6px", background: priorityBg, color: priorityColor, fontWeight: "700" }}>
                        {task.priority || "Medium"}
                      </span>

                      <span style={{ fontSize: "0.68rem", padding: "1px 6px", borderRadius: "6px", background: statusBg, color: statusColor, border: `1px solid ${statusBorder}`, fontWeight: "700" }}>
                        {currentStatus}
                      </span>
                    </div>

                    <div style={{ display: "flex", alignItems: "center", gap: "3px" }}>
                      <button
                        onClick={() => setSelectedTask(task)}
                        style={{ padding: "3px 7px", borderRadius: "5px", border: "1px solid #cbd5e1", background: "#fff", color: "#334155", fontSize: "0.72rem", fontWeight: "600", cursor: "pointer", display: "flex", alignItems: "center", gap: "2px" }}
                      >
                        <IcoEye /> View
                      </button>

                      {/* <button
                        onClick={() => { onClose(); }}
                        style={{ padding: "3px 7px", borderRadius: "5px", border: "1px solid #cbd5e1", background: "#fff", color: "#4f46e5", fontSize: "0.72rem", fontWeight: "600", cursor: "pointer", display: "flex", alignItems: "center", gap: "2px" }}
                      >
                        <IcoEdit /> Edit
                      </button> */}

                      {!isCompletedTask && (
                        <button
                          onClick={() => handleToggleComplete(task)}
                          style={{
                            padding: "3px 7px",
                            borderRadius: "5px",
                            border: "none",
                            background: "#10b981",
                            color: "#ffffff",
                            fontSize: "0.72rem",
                            fontWeight: "700",
                            cursor: "pointer",
                            display: "flex",
                            alignItems: "center",
                            gap: "2px"
                          }}
                        >
                          <IcoCheck /> Complete
                        </button>
                      )}

                      <button
                        onClick={() => handleDelete(taskId)}
                        style={{ padding: "3px 7px", borderRadius: "5px", border: "1px solid #fca5a5", background: "#fff1f2", color: "#dc2626", fontSize: "0.72rem", fontWeight: "600", cursor: "pointer", display: "flex", alignItems: "center", gap: "2px" }}
                      >
                        <IcoTrash /> Delete
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {selectedTask && (
        <TaskDetailsModal
          task={selectedTask}
          onClose={() => setSelectedTask(null)}
          onDelete={(id) => {
            deleteTask(id);
            setSelectedTask(null);
          }}
        />
      )}
    </div>
  );
}
