import { useState, useMemo } from "react";
import { useTasks } from "../context/TaskContext";
import { format, parseISO, subDays, addDays, isThisWeek, isThisMonth } from "date-fns";
import TaskDetailsModal from "./TaskDetailsModal";

/* ── Micro SVG Icons ── */
const Ico = ({ children, size = 16, className = "" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor"
    strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">{children}</svg>
);
const IcoSearch = () => <Ico><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></Ico>;
const IcoCalendar = () => <Ico><rect x="3" y="4" width="18" height="18" rx="2" ry="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" /></Ico>;
const IcoClock = () => <Ico><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></Ico>;
const IcoClose = () => <Ico size={20}><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></Ico>;
const IcoEdit = () => <Ico><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" /></Ico>;
const IcoTrash = () => <Ico><polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" /></Ico>;
const IcoRepeat = () => <Ico><polyline points="1 4 1 10 7 10" /><path d="M3.51 15a9 9 0 102.13-9.36L1 10" /></Ico>;

export default function DateHistoryModal({ dateStr, onClose }) {
  const { tasks, updateTask, deleteTask, rescheduleTask } = useTasks();

  const [selectedTask, setSelectedTask] = useState(null);
  
  // Filters State inside modal
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("All"); // All, Pending, Completed, Overdue, Rescheduled
  const [priorityFilter, setPriorityFilter] = useState("All"); // All, High, Medium, Low
  const [categoryFilter, setCategoryFilter] = useState("All");
  const [sortBy, setSortBy] = useState("Due Time"); // Due Time, Priority, Alphabetical, Newest, Oldest

  const allCategories = useMemo(() => {
    const cats = new Set(tasks.map((t) => t.category));
    return ["All", ...Array.from(cats).filter(Boolean)];
  }, [tasks]);

  const displayDate = useMemo(() => {
    try {
      return format(parseISO(dateStr), "MMMM d, yyyy");
    } catch(e) {
      return dateStr;
    }
  }, [dateStr]);

  // Derived Data for the selected date ONLY (used for Summary Cards)
  const dateOnlyTasks = useMemo(() => {
    return tasks.filter((task) => {
      if (dateStr !== "All Tasks") {
        const taskDue = task.dueDate || task.createdDate || "2099-01-01";
        const taskCompletedDate = task.completedDate;
        const todayStr = format(new Date(), "yyyy-MM-dd");
        
        let taskDateObj;
        try {
          taskDateObj = parseISO(taskDue);
        } catch(e) {
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
        }
        else if (dateStr === "Yesterday" && !isMatchDate(format(subDays(new Date(), 1), "yyyy-MM-dd"))) return false;
        else if (dateStr === "Tomorrow" && !isMatchDate(format(addDays(new Date(), 1), "yyyy-MM-dd"))) return false;
        else if (dateStr === "This Week") {
          if (!isThisWeek(taskDateObj)) return false;
        }
        else if (dateStr === "This Month") {
          if (!isThisMonth(taskDateObj)) return false;
        }
        else if (dateStr !== "Today" && dateStr !== "Yesterday" && dateStr !== "Tomorrow") {
          if (!isMatchDate(dateStr)) return false;
        }
      }
      return true;
    });
  }, [tasks, dateStr]);

  // Filtered tasks for the list view (applies all filters)
  const filteredTasks = useMemo(() => {
    return dateOnlyTasks.filter((task) => {
      // 1. Search
      if (searchQuery && !task.title.toLowerCase().includes(searchQuery.toLowerCase())) return false;
      
      // 3. Status Filter
      const isCompleted = task.completed;
      const isOverdue = !isCompleted && task.dueDate < format(new Date(), "yyyy-MM-dd");
      const isRescheduled = task.rescheduleCount > 0;
      
      if (statusFilter === "Pending" && (isCompleted || isOverdue)) return false;
      if (statusFilter === "Completed" && !isCompleted) return false;
      if (statusFilter === "Overdue" && !isOverdue) return false;
      if (statusFilter === "Rescheduled" && !isRescheduled) return false;

      // 4. Priority Filter
      if (priorityFilter !== "All" && task.priority !== priorityFilter) return false;

      // 5. Category Filter
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
      if (sortBy === "Newest") return (b.id || "").localeCompare(a.id || "");
      if (sortBy === "Oldest") return (a.id || "").localeCompare(b.id || "");
      return 0;
    });
  }, [dateOnlyTasks, searchQuery, statusFilter, priorityFilter, categoryFilter, sortBy]);

  // Summaries (Calculated ONLY on dateOnlyTasks so they don't jump around when users search or filter)
  const stats = useMemo(() => {
    let completed = 0, pending = 0, overdue = 0, rescheduled = 0;
    let totalWork = 0;
    const todayStr = format(new Date(), "yyyy-MM-dd");

    dateOnlyTasks.forEach((t) => {
      const taskDue = t.dueDate || t.createdDate || "2099-01-01";
      const isCompletedToday = t.completedDate === todayStr;
      const isDueToday = taskDue === todayStr;
      const isCarryForward = taskDue < todayStr && (!t.completed || isCompletedToday);

      if (dateStr === "Today") {
        if (isDueToday || isCarryForward) {
          totalWork++;
          if (t.completed) completed++;
          else if (taskDue < todayStr) overdue++;
          else pending++;
        }
      } else {
        totalWork++;
        if (t.completed) completed++;
        else if (taskDue < todayStr) overdue++; // Past dates overdue logic
        else pending++;
      }
      
      let isRescheduledInPeriod = false;
      if (dateStr === "Today") {
        isRescheduledInPeriod = t.rescheduleHistory?.some(h => h.rescheduledAtDate === todayStr);
      } else if (dateStr === "Yesterday") {
        const yDay = format(subDays(new Date(), 1), "yyyy-MM-dd");
        isRescheduledInPeriod = t.rescheduleHistory?.some(h => h.rescheduledAtDate === yDay);
      } else if (dateStr === "Tomorrow") {
        const tDay = format(addDays(new Date(), 1), "yyyy-MM-dd");
        isRescheduledInPeriod = t.rescheduleHistory?.some(h => h.rescheduledAtDate === tDay);
      } else if (dateStr === "This Week") {
        isRescheduledInPeriod = t.rescheduleHistory?.some(h => {
          try { return isThisWeek(parseISO(h.rescheduledAtDate)); } catch(e) { return false; }
        });
      } else if (dateStr === "This Month") {
        isRescheduledInPeriod = t.rescheduleHistory?.some(h => {
          try { return isThisMonth(parseISO(h.rescheduledAtDate)); } catch(e) { return false; }
        });
      } else if (dateStr !== "All Tasks") { // Custom Date String
        isRescheduledInPeriod = t.rescheduleHistory?.some(h => h.rescheduledAtDate === dateStr);
      } else {
        isRescheduledInPeriod = t.rescheduleHistory && t.rescheduleHistory.length > 0;
      }
      
      if (isRescheduledInPeriod) rescheduled++;
    });

    const compPercent = totalWork === 0 ? 0 : Math.round((completed / totalWork) * 100);
    return { total: totalWork, completed, pending, overdue, rescheduled, compPercent };
  }, [dateOnlyTasks, dateStr]);

  return (
    <div className="history-modal-overlay" onClick={onClose}>
      <div className="history-modal-content" onClick={(e) => e.stopPropagation()}>
        
        {/* ── HEADER ── */}
        <div className="history-modal-header">
          <div>
            <h2>Task History - {displayDate}</h2>
            <p>Showing all tasks associated with this date.</p>
          </div>
          <button className="history-close-btn" onClick={onClose}><IcoClose /></button>
        </div>

        {/* ── SUMMARY CARDS ── */}
        <div className="history-summary-row">
          <div className="tac-sum-card"><span className="val" style={{color: '#6366f1'}}>{stats.total}</span> <span className="lbl">Total</span></div>
          <div className="tac-sum-card"><span className="val" style={{color: '#10b981'}}>{stats.completed}</span> <span className="lbl">Completed</span></div>
          <div className="tac-sum-card"><span className="val" style={{color: '#f59e0b'}}>{stats.pending}</span> <span className="lbl">Pending</span></div>
          <div className="tac-sum-card"><span className="val" style={{color: '#ef4444'}}>{stats.overdue}</span> <span className="lbl">Overdue</span></div>
          <div className="tac-sum-card"><span className="val" style={{color: '#3b82f6'}}>{stats.rescheduled}</span> <span className="lbl">Rescheduled</span></div>
          <div className="tac-sum-card"><span className="val" style={{color: '#a855f7'}}>{stats.compPercent}%</span> <span className="lbl">Done</span></div>
        </div>

        {/* ── FILTERS ── */}
        <div className="history-filters">
          <div className="tac-search" style={{ flex: 1, minWidth: '200px' }}>
            <IcoSearch />
            <input 
              type="text" 
              placeholder="Search by task title..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <div className="history-filter-selects">
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
              <option value="All">All Status</option>
              <option value="Pending">Pending</option>
              <option value="Completed">Completed</option>
              <option value="Overdue">Overdue</option>
              <option value="Rescheduled">Rescheduled</option>
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

        {/* ── TASK LIST ── */}
        <div className="history-task-list">
          {filteredTasks.length === 0 ? (
            <div className="history-empty">
              <span className="emoji-huge">📅</span>
              <p>No tasks were found for {displayDate}.</p>
              <button className="history-empty-btn" onClick={() => {
                onClose();
                // Optionally could navigate to tasks here if we pass navigate down
              }}>Close & Return</button>
            </div>
          ) : (
            filteredTasks.map(task => (
              <div key={task.id} className={`history-task-item ${task.completed ? 'completed' : ''}`}>
                <div className="history-task-main">
                  <div className="history-task-row">
                    <span className="history-task-title">
                      {task.completed ? "☑" : "☐"} {task.title}
                    </span>
                    <div className="tac-badges">
                      <span className="tac-badge cat">{task.category}</span>
                      <span className={`tac-badge prio ${task.priority.toLowerCase()}`}>{task.priority}</span>
                      <span className={`tac-badge stat ${task.completed ? 'success' : task.dueDate < format(new Date(), "yyyy-MM-dd") ? 'error' : 'pending'}`}>
                        {task.completed ? 'Completed' : task.dueDate < format(new Date(), "yyyy-MM-dd") ? 'Overdue' : 'Pending'}
                      </span>
                    </div>
                  </div>
                  
                  <div className="history-task-meta">
                    <span><IcoCalendar size={12}/> Date: {task.dueDate}</span>
                    <span><IcoClock size={12}/> Due: {task.dueTime || 'Any time'}</span>
                    {task.completed && <span className="done-time">✓ Completed {task.completedTime || task.completedDate}</span>}
                  </div>
                  
                  {task.description && <p className="history-task-desc">{task.description}</p>}
                  
                  {task.subtasks?.length > 0 && (
                    <div className="tac-subtask-prog" style={{ marginTop: '6px' }}>
                      Subtasks: {task.subtasks.filter(s => s.completed).length}/{task.subtasks.length}
                    </div>
                  )}
                </div>
                
                <div className="history-task-actions">
                  <button className="history-view-btn" onClick={() => setSelectedTask(task)}>
                    View Details
                  </button>
                  <button className="history-action-btn" onClick={() => setSelectedTask(task)} title="Edit">
                    <IcoEdit size={14}/> Edit
                  </button>
                  <button className="history-action-btn" onClick={() => {
                    const newDate = prompt("Enter new date (YYYY-MM-DD):", format(new Date(), "yyyy-MM-dd"));
                    if (newDate) rescheduleTask(task.id, newDate);
                  }} title="Reschedule">
                    <IcoRepeat size={14}/> Reschedule
                  </button>
                  <button className="history-action-btn danger" onClick={() => {
                    if (window.confirm("Are you sure you want to delete this task?")) deleteTask(task.id);
                  }} title="Delete">
                    <IcoTrash size={14}/> Delete
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
      
      {/* If "View Details" is clicked, show the main TaskDetailsModal layered on top */}
      {selectedTask && (
        <div style={{ zIndex: 10001, position: 'relative' }}>
          <TaskDetailsModal task={selectedTask} onClose={() => setSelectedTask(null)} />
        </div>
      )}
    </div>
  );
}
