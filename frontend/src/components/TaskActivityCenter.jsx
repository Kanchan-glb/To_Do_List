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
    const defaultCategories = [
      "Work", "Personal", "Study", "Health",
      "Meeting", "Shopping", "Other"
    ];

    const taskCategories = tasks
      .map((task) => task.category?.trim())
      .filter(Boolean);

    return [
      "All",
      ...Array.from(new Set([...defaultCategories, ...taskCategories]))
    ];
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

    filteredTasks.forEach((t) => {
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
  }, [filteredTasks, quickFilter, customDate]);

  return (
    <div className="tac-container">
      <style>{`
/* =================================================
   TASK ACTIVITY CENTER — COMPLETE RESPONSIVE CSS
================================================= */

.tac-container {
  width: 100%;
  max-width: 100%;
  min-width: 0;
  height: 100%;
  min-height: 0;
  box-sizing: border-box;

  display: flex;
  flex-direction: column;
}

/* Prevent children from causing horizontal overflow */
.tac-container,
.tac-container *,
.tac-container *::before,
.tac-container *::after {
  box-sizing: border-box;
}

/* =================================================
   HEADER
================================================= */

.tac-header {
  width: 100%;
  min-width: 0;
  margin-bottom: clamp(12px, 1.5vw, 20px);
}

.tac-header > div {
  width: 100%;
  min-width: 0;
}

.tac-title {
  margin: 0 0 4px;
  font-size: clamp(1rem, 1.15vw, 1.35rem);
  line-height: 1.3;
  overflow-wrap: anywhere;
}

.tac-sub {
  margin: 0;
  max-width: 100%;
  font-size: clamp(0.75rem, 0.8vw, 0.88rem);
  line-height: 1.5;
  overflow-wrap: anywhere;
}

/* =================================================
   FILTERS + PRODUCTIVITY SCORE
================================================= */

.task-activity-top {
  width: 100%;
  min-width: 0;

  display: grid;
  grid-template-columns:
    minmax(260px, 1fr)
    minmax(260px, 1fr);

  gap: clamp(12px, 1.4vw, 22px);
  align-items: stretch;
}

/* Both columns always take equal available height */
.task-activity-top .tac-left,
.task-activity-top .tac-right {
  width: 100%;
  min-width: 0;
  height: 100%;
  min-height: 0;

  flex: none;
  display: flex;
  flex-direction: column;
}

/* Remove old spacing conflicts */
.task-activity-top .tac-left,
.task-activity-top .tac-right {
  gap: 0;
}

/* Left filter container */
.task-activity-top .tac-left .tac-filters {
  width: 100%;
  min-width: 0;
  height: 100%;
  min-height: 0;

  flex: 1;
  display: flex;
  flex-direction: column;
}

/* Filters fill the complete left-side height */
.task-activity-top .tac-filter-row {
  width: 100%;
  min-width: 0;
  height: 100%;
  min-height: 0;

  flex: 1;
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  grid-template-rows: repeat(5, minmax(44px, 1fr));
  gap: clamp(8px, 0.8vw, 11px);
}

/* Six rows when Custom Date is visible */
.task-activity-top .tac-filter-row:has(.tac-date-picker) {
  grid-template-rows: repeat(6, minmax(44px, 1fr));
}

/* Form controls */
.task-activity-top .tac-filter-row select,
.task-activity-top .tac-date-picker {
  display: block;

  width: 100%;
  max-width: 100%;
  min-width: 0;

  height: 100%;
  min-height: 44px;

  padding: 10px 36px 10px 12px;

  border-radius: 10px;
  box-sizing: border-box;

  font-family: inherit;
  font-size: clamp(0.78rem, 0.72vw, 0.88rem);
  line-height: 1.3;

  text-overflow: ellipsis;
  white-space: nowrap;
  overflow: hidden;
}

/* Date input does not need large right padding */
.task-activity-top .tac-date-picker {
  padding-right: 10px;
}

/* Right productivity score card */
.task-activity-top .tac-right .tac-side-card {
  width: 100%;
  max-width: 100%;
  min-width: 0;

  height: 100%;
  min-height: 100%;

  flex: 1;
  margin: 0 !important;

  padding: clamp(16px, 2vw, 30px);

  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;

  text-align: center;
  overflow: hidden;
}

/* Productivity heading */
.tac-side-card h4 {
  width: 100%;
  margin: 0 0 clamp(10px, 1vw, 16px);

  font-size: clamp(0.9rem, 0.95vw, 1.1rem);
  line-height: 1.35;

  text-align: center;
  overflow-wrap: anywhere;
}

/* Score circle */
.tac-score-circle {
  position: relative;

  width: clamp(88px, 7.5vw, 120px);
  height: clamp(88px, 7.5vw, 120px);

  flex: 0 0 auto;

  display: flex;
  align-items: center;
  justify-content: center;
}

.tac-score-circle svg {
  display: block;
  width: 100%;
  height: 100%;
  max-width: none;
}

.score-val {
  position: absolute;
  inset: 0;

  display: flex;
  align-items: center;
  justify-content: center;

  font-size: clamp(1rem, 1.2vw, 1.35rem);
  font-weight: 800;
  line-height: 1;
}

.score-desc {
  width: 100%;
  max-width: 280px;

  margin: clamp(10px, 1vw, 15px) 0 0;

  font-size: clamp(0.72rem, 0.75vw, 0.86rem);
  line-height: 1.45;
  text-align: center;

  overflow-wrap: anywhere;
}

/* =================================================
   SUMMARY CARDS
================================================= */

.task-summary-wrapper {
  width: 100%;
  min-width: 0;

  margin-top: clamp(12px, 1.4vw, 18px);

  display: flex;
  flex-direction: column;
  gap: clamp(9px, 0.9vw, 14px);
}

.task-summary-row {
  width: 100%;
  min-width: 0;

  display: grid;
  gap: clamp(9px, 1vw, 16px);
}

.task-summary-row.row-top {
  grid-template-columns: repeat(3, minmax(0, 1fr));
}

.task-summary-row.row-bottom {
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

/* Summary card */
.tac-sum-card {
  width: 100%;
  min-width: 0;
  min-height: clamp(58px, 5vw, 76px);

  padding: clamp(8px, 1vw, 14px);

  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: center;

  gap: clamp(4px, 0.5vw, 7px);

  text-align: center;
  overflow: hidden;
}

.tac-sum-card .val {
  display: inline-block;

  font-size: clamp(0.95rem, 1.15vw, 1.25rem);
  line-height: 1.2;
  white-space: nowrap;
}

.tac-sum-card .lbl {
  display: inline-block;

  min-width: 0;

  font-size: clamp(0.68rem, 0.72vw, 0.85rem);
  line-height: 1.25;

  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* =================================================
   VIEW ALL BUTTON
================================================= */

.view-all-tasks-button {
  width: 100% !important;
  max-width: 100% !important;
  min-width: 0;

  min-height: clamp(46px, 4vw, 54px);

  margin-top: clamp(11px, 1.2vw, 16px) !important;
  padding: clamp(11px, 1.2vw, 16px) !important;

  box-sizing: border-box;

  font-size: clamp(0.76rem, 0.85vw, 1rem) !important;
  line-height: 1.4;

  white-space: normal;
  overflow-wrap: anywhere;
}

/* =================================================
   EXTRA LARGE DESKTOP — 1800px+
================================================= */

@media (min-width: 1800px) {
  .task-activity-top {
    grid-template-columns:
      minmax(360px, 1fr)
      minmax(360px, 1fr);

    gap: 24px;
  }

  .task-activity-top .tac-filter-row {
    gap: 12px;
  }

  .task-activity-top .tac-filter-row select,
  .task-activity-top .tac-date-picker {
    min-height: 50px;
    padding-top: 12px;
    padding-bottom: 12px;
  }

  .task-activity-top .tac-right .tac-side-card {
    padding: 34px;
  }

  .tac-score-circle {
    width: 124px;
    height: 124px;
  }

  .tac-sum-card {
    min-height: 80px;
  }
}

/* =================================================
   LARGE DESKTOP — 1400px to 1799px
================================================= */

@media (min-width: 1400px) and (max-width: 1799px) {
  .task-activity-top {
    gap: 20px;
  }

  .task-activity-top .tac-filter-row select,
  .task-activity-top .tac-date-picker {
    min-height: 46px;
  }
}

/* =================================================
   LAPTOP — 1100px to 1399px
================================================= */

@media (min-width: 1100px) and (max-width: 1399px) {
  .task-activity-top {
    grid-template-columns:
      minmax(240px, 1fr)
      minmax(240px, 1fr);

    gap: 16px;
  }

  .task-activity-top .tac-right .tac-side-card {
    padding: 18px;
  }

  .tac-score-circle {
    width: 100px;
    height: 100px;
  }

  .tac-sum-card {
    min-height: 64px;
  }
}

/* =================================================
   SMALL LAPTOP / TABLET LANDSCAPE
   901px to 1099px
================================================= */

@media (min-width: 901px) and (max-width: 1099px) {
  .task-activity-top {
    grid-template-columns:
      minmax(210px, 1fr)
      minmax(210px, 1fr);

    gap: 14px;
  }

  .task-activity-top .tac-filter-row select,
  .task-activity-top .tac-date-picker {
    min-height: 42px;
    padding: 8px 30px 8px 10px;
    font-size: 0.76rem;
  }

  .task-activity-top .tac-date-picker {
    padding-right: 8px;
  }

  .task-activity-top .tac-right .tac-side-card {
    padding: 14px;
  }

  .tac-score-circle {
    width: 90px;
    height: 90px;
  }

  .score-desc {
    max-width: 210px;
  }

  .tac-sum-card {
    min-height: 60px;
  }
}

/* =================================================
   TABLET AND SMALL COMPONENT WIDTH
================================================= */

@media (max-width: 900px) {
  .tac-container {
    height: auto;
  }

  .task-activity-top {
    grid-template-columns: minmax(0, 1fr);
    gap: 14px;
  }

  .task-activity-top .tac-left,
  .task-activity-top .tac-right,
  .task-activity-top .tac-left .tac-filters {
    height: auto;
    min-height: 0;
  }

  .task-activity-top .tac-filter-row,
  .task-activity-top .tac-filter-row:has(.tac-date-picker) {
    height: auto;
    display: flex;
    flex-direction: column;
  }

  .task-activity-top .tac-filter-row select,
  .task-activity-top .tac-date-picker {
    flex: none;
    height: 46px;
    min-height: 46px;
  }

  .task-activity-top .tac-right .tac-side-card {
    height: auto;
    min-height: 240px;
  }

  .task-summary-row.row-top {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }

  .task-summary-row.row-bottom {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

/* =================================================
   TABLET PORTRAIT / LARGE MOBILE
================================================= */

@media (max-width: 700px) {
  .task-summary-row.row-top {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .task-summary-row.row-bottom {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  /* Last card of first row can span full width */
  .task-summary-row.row-top .tac-sum-card:last-child {
    grid-column: 1 / -1;
  }

  .task-activity-top .tac-right .tac-side-card {
    min-height: 220px;
  }
}

/* =================================================
   MOBILE — 481px to 600px
================================================= */

@media (min-width: 481px) and (max-width: 600px) {
  .task-activity-top {
    gap: 12px;
  }

  .task-activity-top .tac-filter-row {
    gap: 8px;
  }

  .task-activity-top .tac-filter-row select,
  .task-activity-top .tac-date-picker {
    height: 44px;
    min-height: 44px;
    padding: 9px 32px 9px 10px;
    font-size: 0.8rem;
  }

  .task-activity-top .tac-date-picker {
    padding-right: 9px;
  }

  .tac-sum-card {
    min-height: 62px;
  }
}

/* =================================================
   SMALL MOBILE — up to 480px
================================================= */

@media (max-width: 480px) {
  .tac-header {
    margin-bottom: 12px;
  }

  .tac-title {
    font-size: 1rem;
  }

  .tac-sub {
    font-size: 0.74rem;
  }

  .task-activity-top {
    gap: 12px;
  }

  .task-activity-top .tac-filter-row {
    gap: 8px;
  }

  .task-activity-top .tac-filter-row select,
  .task-activity-top .tac-date-picker {
    height: 43px;
    min-height: 43px;

    padding: 8px 30px 8px 10px;

    font-size: 0.78rem;
  }

  .task-activity-top .tac-date-picker {
    padding-right: 8px;
  }

  .task-activity-top .tac-right .tac-side-card {
    min-height: 205px;
    padding: 16px 12px;
  }

  .tac-score-circle {
    width: 86px;
    height: 86px;
  }

  .task-summary-wrapper {
    gap: 9px;
  }

  .task-summary-row {
    gap: 9px;
  }

  .task-summary-row.row-top,
  .task-summary-row.row-bottom {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .task-summary-row.row-top .tac-sum-card:last-child {
    grid-column: 1 / -1;
  }

  .tac-sum-card {
    min-height: 58px;
    padding: 8px 6px;

    flex-direction: column;
    gap: 2px;
  }

  .tac-sum-card .val {
    font-size: 1rem;
  }

  .tac-sum-card .lbl {
    max-width: 100%;
    font-size: 0.7rem;
  }

  .view-all-tasks-button {
    min-height: 46px;
    font-size: 0.78rem !important;
    padding: 11px 8px !important;
  }
}

/* =================================================
   VERY SMALL MOBILE — up to 360px
================================================= */

@media (max-width: 360px) {
  .task-summary-row.row-top,
  .task-summary-row.row-bottom {
    grid-template-columns: minmax(0, 1fr);
  }

  .task-summary-row.row-top .tac-sum-card:last-child {
    grid-column: auto;
  }

  .task-activity-top .tac-right .tac-side-card {
    min-height: 190px;
  }

  .tac-score-circle {
    width: 80px;
    height: 80px;
  }

  .tac-sum-card {
    min-height: 54px;
  }

  .view-all-tasks-button {
    font-size: 0.74rem !important;
  }
}

/* =================================================
   SHORT HEIGHT SCREENS / LANDSCAPE MOBILE
================================================= */

@media (max-height: 600px) and (orientation: landscape) {
  .task-activity-top {
    grid-template-columns:
      minmax(0, 1fr)
      minmax(0, 1fr);
  }

  .task-activity-top .tac-filter-row select,
  .task-activity-top .tac-date-picker {
    min-height: 38px;
    height: 38px;
    padding-top: 6px;
    padding-bottom: 6px;
  }

  .task-activity-top .tac-right .tac-side-card {
    min-height: 0;
    padding: 12px;
  }

  .tac-score-circle {
    width: 76px;
    height: 76px;
  }

  .score-desc {
    margin-top: 7px;
  }

  .tac-sum-card {
    min-height: 50px;
  }
}

/* =================================================
   CONTAINER-BASED RESPONSIVENESS
================================================= */

@container (max-width: 650px) {
  .task-activity-top {
    grid-template-columns: minmax(0, 1fr);
  }
}

/* =================================================
   FINAL OVERFLOW PROTECTION
================================================= */

.task-activity-top select,
.task-activity-top input,
.task-summary-wrapper,
.task-summary-row,
.tac-sum-card,
.view-all-tasks-button {
  max-width: 100%;
}

.tac-title,
.tac-sub,
.score-desc,
.view-all-tasks-button {
  overflow-wrap: anywhere;
}

img,
svg,
canvas {
  max-width: 100%;
}
`}</style>
      {/* ── HEADER ── */}
      <div className="tac-header">
        <div>
          <h2 className="tac-title">Task Activity Center</h2>
          <p className="tac-sub">View today's, previous, upcoming and completed tasks.</p>
        </div>
      </div>

      {/* ── MAIN LAYOUT SPLIT ── */}
      <div className="task-activity-top">

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
                {allCategories.map(c => <option key={c} value={c}>{c === 'All' ? 'All Categories' : c}</option>)}
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



        </div>

        {/* RIGHT COLUMN: Productivity & Action Button */}
        <div className="tac-right">
          <div className="tac-side-card">
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


        </div>
      </div>
      {/* Summary Cards - Two Levels */}
      <div className="task-summary-wrapper">
        <div className="task-summary-row row-top">
          <div className="tac-sum-card"><span className="val" style={{ color: '#6366f1' }}>{stats.total}</span> <span className="lbl">Total</span></div>
          <div className="tac-sum-card"><span className="val" style={{ color: '#10b981' }}>{stats.completed}</span> <span className="lbl">Completed</span></div>
          <div className="tac-sum-card"><span className="val" style={{ color: '#f59e0b' }}>{stats.pending}</span> <span className="lbl">Pending</span></div>
        </div>
        <div className="task-summary-row row-bottom">
          <div className="tac-sum-card"><span className="val" style={{ color: '#ef4444' }}>{stats.overdue}</span> <span className="lbl">Overdue</span></div>
          <div className="tac-sum-card"><span className="val" style={{ color: '#3b82f6' }}>{stats.rescheduled}</span> <span className="lbl">Rescheduled</span></div>
        </div>
      </div>
      {/* View All Tasks Button */}
      <button
        type="button"
        className="view-all-tasks-button"
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