import { useState, useMemo } from "react";
import { useTasks } from "../context/TaskContext";
import { format, isThisWeek, isThisMonth, parseISO, subDays, addDays } from "date-fns";
import { useNavigate } from "react-router-dom";
import TaskDetailsModal from "./TaskDetailsModal";
import DateHistoryModal from "./DateHistoryModal";

/* ── Micro SVG Icons ── */
const Ico = ({ children, size = 16, className = "" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor"
    strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">{children}</svg>
);
const IcoSearch = () => <Ico><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></Ico>;
const IcoCalendar = () => <Ico><rect x="3" y="4" width="18" height="18" rx="2" ry="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" /></Ico>;
const IcoPlus = () => <Ico><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></Ico>;
const IcoCheck = () => <Ico><polyline points="20 6 9 17 4 12" /></Ico>;
const IcoClock = () => <Ico><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></Ico>;
const IcoEdit = () => <Ico><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" /></Ico>;
const IcoTrash = () => <Ico><polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" /></Ico>;

export default function TaskActivityCenter() {
  const { tasks, updateTask, deleteTask } = useTasks();
  const navigate = useNavigate();

  const [selectedTask, setSelectedTask] = useState(null);

  // Filters State
  const [searchQuery, setSearchQuery] = useState("");
  const [quickFilter, setQuickFilter] = useState("Today"); // Today, Yesterday, Tomorrow, This Week, This Month, All Tasks, Custom Date
  const [customDate, setCustomDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [historyModalDate, setHistoryModalDate] = useState(null); // When set, opens the DateHistoryModal

  const [statusFilter, setStatusFilter] = useState("All"); // All, Pending, Completed, Overdue, Rescheduled, Missed
  const [priorityFilter, setPriorityFilter] = useState("All"); // All, High, Medium, Low
  const [categoryFilter, setCategoryFilter] = useState("All");
  const [sortBy, setSortBy] = useState("Due Time"); // Newest, Oldest, Due Time, Priority, Alphabetical

  const allCategories = useMemo(() => {
    const cats = new Set(tasks.map((t) => t.category));
    return ["All", ...Array.from(cats).filter(Boolean)];
  }, [tasks]);

  // Derived Data
  const dateOnlyTasks = useMemo(() => {
    return tasks.filter((task) => {
      if (quickFilter !== "All Tasks") {
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

        if (quickFilter === "Today") {
          const isDueToday = taskDue === todayStr;
          const isCompletedToday = taskCompletedDate === todayStr;
          const isOverdue = !task.completed && taskDue < todayStr;
          const isRescheduledToday = task.rescheduleHistory?.some(h => h.rescheduledAtDate === todayStr);
          if (!isDueToday && !isCompletedToday && !isOverdue && !isRescheduledToday) return false;
        }
        else if (quickFilter === "Yesterday" && !isMatchDate(format(subDays(new Date(), 1), "yyyy-MM-dd"))) return false;
        else if (quickFilter === "Tomorrow" && !isMatchDate(format(addDays(new Date(), 1), "yyyy-MM-dd"))) return false;
        else if (quickFilter === "Custom Date" && !isMatchDate(customDate)) return false;
        else if (quickFilter === "This Week") {
          if (!isThisWeek(taskDateObj)) return false;
        }
        else if (quickFilter === "This Month") {
          if (!isThisMonth(taskDateObj)) return false;
        }
      }
      return true;
    });
  }, [tasks, quickFilter, customDate]);

  const filteredTasks = useMemo(() => {
    return dateOnlyTasks.filter((task) => {
      // 1. Search
      if (searchQuery && !task.title.toLowerCase().includes(searchQuery.toLowerCase())) return false;

      // 2. Status Filter
      const isCompleted = task.completed;
      const isOverdue = !isCompleted && task.dueDate < format(new Date(), "yyyy-MM-dd");
      const isRescheduled = task.rescheduleCount > 0;

      if (statusFilter === "Pending" && (isCompleted || isOverdue)) return false;
      if (statusFilter === "Completed" && !isCompleted) return false;
      if (statusFilter === "Overdue" && !isOverdue) return false;
      if (statusFilter === "Rescheduled" && !isRescheduled) return false;
      if (statusFilter === "Missed" && !isOverdue) return false; // Treating missed as overdue for now

      // 4. Priority Filter
      if (priorityFilter !== "All" && task.priority !== priorityFilter) return false;

      // 5. Category Filter
      if (categoryFilter !== "All" && task.category !== categoryFilter) return false;

      return true;
    }).sort((a, b) => {
      // 6. Sort By
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
      if (sortBy === "Newest") return (b.id || "").localeCompare(a.id || "");
      if (sortBy === "Oldest") return (a.id || "").localeCompare(b.id || "");
      return 0;
    });
  }, [dateOnlyTasks, searchQuery, statusFilter, priorityFilter, categoryFilter, sortBy]);

  // Summaries (Only based on Date, totally independent of search/status filters)
  const stats = useMemo(() => {
    let completed = 0, pending = 0, overdue = 0, rescheduled = 0;
    let totalWork = 0;
    const todayStr = format(new Date(), "yyyy-MM-dd");

    dateOnlyTasks.forEach((t) => {
      const taskDue = t.dueDate || t.createdDate || "2099-01-01";
      const isCompletedToday = t.completedDate === todayStr;
      const isDueToday = taskDue === todayStr;
      const isCarryForward = taskDue < todayStr && (!t.completed || isCompletedToday);

      if (quickFilter === "Today") {
        if (isDueToday || isCarryForward) {
          totalWork++;
          if (t.completed) completed++;
          else if (taskDue < todayStr) overdue++;
          else pending++;
        }
      } else {
        totalWork++;
        if (t.completed) completed++;
        else if (taskDue < todayStr) overdue++; // This might need refinement for past dates, but matches general logic
        else pending++;
      }

      let isRescheduledInPeriod = false;
      if (quickFilter === "Today") {
        isRescheduledInPeriod = t.rescheduleHistory?.some(h => h.rescheduledAtDate === todayStr);
      } else if (quickFilter === "Yesterday") {
        const yDay = format(subDays(new Date(), 1), "yyyy-MM-dd");
        isRescheduledInPeriod = t.rescheduleHistory?.some(h => h.rescheduledAtDate === yDay);
      } else if (quickFilter === "Tomorrow") {
        const tDay = format(addDays(new Date(), 1), "yyyy-MM-dd");
        isRescheduledInPeriod = t.rescheduleHistory?.some(h => h.rescheduledAtDate === tDay);
      } else if (quickFilter === "Custom Date") {
        isRescheduledInPeriod = t.rescheduleHistory?.some(h => h.rescheduledAtDate === customDate);
      } else if (quickFilter === "This Week") {
        isRescheduledInPeriod = t.rescheduleHistory?.some(h => {
          try { return isThisWeek(parseISO(h.rescheduledAtDate)); } catch (e) { return false; }
        });
      } else if (quickFilter === "This Month") {
        isRescheduledInPeriod = t.rescheduleHistory?.some(h => {
          try { return isThisMonth(parseISO(h.rescheduledAtDate)); } catch (e) { return false; }
        });
      } else if (quickFilter === "All Tasks") {
        isRescheduledInPeriod = t.rescheduleHistory && t.rescheduleHistory.length > 0;
      }

      if (isRescheduledInPeriod) rescheduled++;
    });

    const compPercent = totalWork === 0 ? 0 : Math.round((completed / totalWork) * 100);
    return { total: totalWork, completed, pending, overdue, rescheduled, compPercent };
  }, [dateOnlyTasks, quickFilter]);

  return (
    <div className="tac-container">
      {/* ── HEADER ── */}
      <div className="tac-header">
        <div>
          <h2 className="tac-title">Task Activity Center</h2>
          <p className="tac-sub">View today's, previous, upcoming and completed tasks.</p>
        </div>
      </div>

      {/* ── MAIN LAYOUT SPLIT ── */}
      <div className="tac-body">

        {/* LEFT COLUMN: Filters + Summary */}
        <div className="tac-left">

          {/* Top Filter Bar */}
          <div className="tac-filters">
            {/* <div className="tac-search">
              <IcoSearch />
              <input
                type="text"
                placeholder="Search tasks..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div> */}

            <div className="tac-filter-row">
              <select value={quickFilter} onChange={(e) => {
                setQuickFilter(e.target.value);
                if (e.target.value !== "Custom Date") setCustomDate(format(new Date(), "yyyy-MM-dd"));
              }}>
                <option value="Today">Today</option>
                <option value="Yesterday">Yesterday</option>
                <option value="Tomorrow">Tomorrow</option>
                <option value="This Week">This Week</option>
                <option value="This Month">This Month</option>
                <option value="All Tasks">All Tasks</option>
                <option value="Custom Date">Custom Date...</option>
              </select>

              {quickFilter === "Custom Date" && (
                <input
                  type="date"
                  value={customDate}
                  onChange={(e) => setCustomDate(e.target.value)}
                  className="tac-date-picker"
                />
              )}

              <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
                <option value="All">All Status</option>
                <option value="Pending">Pending</option>
                <option value="Completed">Completed</option>
                <option value="Overdue">Overdue</option>
                <option value="Rescheduled">Rescheduled</option>
                <option value="Missed">Missed</option>
              </select>

              <select value={priorityFilter} onChange={(e) => setPriorityFilter(e.target.value)}>
                <option value="All">All Priorities</option>
                <option value="High">High</option>
                <option value="Medium">Medium</option>
                <option value="Low">Low</option>
              </select>

              <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)}>
                {allCategories.map(c => <option key={c} value={c}>{c}</option>)}
              </select>

              <select value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
                <option value="Due Time">Sort: Due Time</option>
                <option value="Priority">Sort: Priority</option>
                <option value="Newest">Sort: Newest</option>
                <option value="Oldest">Sort: Oldest</option>
                <option value="Alphabetical">Sort: Alphabetical</option>
              </select>
            </div>
          </div>

          {/* Inline Summary */}
          <div className="tac-summary-row">
            <div className="tac-sum-card"><span className="val" style={{ color: '#6366f1' }}>{stats.total}</span> <span className="lbl">Total</span></div>
            <div className="tac-sum-card"><span className="val" style={{ color: '#10b981' }}>{stats.completed}</span> <span className="lbl">Completed</span></div>
            <div className="tac-sum-card"><span className="val" style={{ color: '#f59e0b' }}>{stats.pending}</span> <span className="lbl">Pending</span></div>
            <div className="tac-sum-card"><span className="val" style={{ color: '#ef4444' }}>{stats.overdue}</span> <span className="lbl">Overdue</span></div>
            <div className="tac-sum-card"><span className="val" style={{ color: '#3b82f6' }}>{stats.rescheduled}</span> <span className="lbl">Rescheduled</span></div>
            {/* <div className="tac-sum-card"><span className="val" style={{ color: '#a855f7' }}>{stats.compPercent}%</span> <span className="lbl">Done</span></div> */}
          </div>

        </div>

        {/* RIGHT COLUMN: Productivity & Action Button */}
        <div className="tac-right">
          <div className="tac-side-card" style={{ marginBottom: '16px' }}>
            <h4>Productivity Score</h4>
            <div className="tac-score-circle">
              <svg width="100" height="100" viewBox="0 0 100 100">
                <circle cx="50" cy="50" r="42" fill="none" stroke="#e2e8f0" strokeWidth="8" />
                <circle cx="50" cy="50" r="42" fill="none" stroke="#4f46e5" strokeWidth="8"
                  strokeDasharray="264" strokeDashoffset={264 - (264 * stats.compPercent) / 100}
                  transform="rotate(-90 50 50)" strokeLinecap="round" />
              </svg>
              <div className="score-val">{stats.compPercent}%</div>
            </div>
            <p className="score-desc">Based on filtered tasks completion</p>
          </div>

          <button
            type="button"
            onClick={() => setHistoryModalDate(quickFilter === "Custom Date" ? customDate : quickFilter)}
            style={{
              padding: '16px', background: 'linear-gradient(135deg, #4f46e5, #7c3aed)', border: 'none',
              borderRadius: '16px', fontSize: '1rem', fontWeight: 800, cursor: 'pointer',
              display: 'flex', alignItems: 'center', gap: '8px', color: 'white',
              boxShadow: '0 8px 20px rgba(79, 70, 229, 0.3)', width: '100%', justifyContent: 'center',
              textAlign: 'center'
            }}
          >
            📋 View All Tasks for {quickFilter === "Custom Date" ? format(parseISO(customDate), "MMMM d, yyyy") : quickFilter}
          </button>
        </div>
      </div>

      {selectedTask && <TaskDetailsModal task={selectedTask} onClose={() => setSelectedTask(null)} />}

      {historyModalDate && (
        <DateHistoryModal
          dateStr={historyModalDate}
          onClose={() => setHistoryModalDate(null)}
        />
      )}
    </div>
  );
}
