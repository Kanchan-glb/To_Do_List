import { useState, useMemo } from "react";
import { useTasks } from "../context/TaskContext";
import { format, subDays, addDays, isThisMonth, parseISO, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, isThisWeek, startOfWeek, endOfWeek, differenceInDays } from "date-fns";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell } from "recharts";
import "./WorkProgressTracker.css";

/* ── Micro SVG Icons ── */
const Ico = ({ children, size = 18 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor"
    strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{children}</svg>
);
const IcoCheck = () => <Ico><polyline points="20 6 9 17 4 12" /></Ico>;
const IcoClock = () => <Ico><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></Ico>;
const IcoAlert = () => <Ico><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" /><line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" /></Ico>;
const IcoTarget = () => <Ico><circle cx="12" cy="12" r="10" /><circle cx="12" cy="12" r="6" /><circle cx="12" cy="12" r="2" /></Ico>;
const IcoTasks = () => <Ico><path d="M9 11l3 3L22 4" /><path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11" /></Ico>;
const IcoRepeat = () => <Ico><polyline points="1 4 1 10 7 10" /><path d="M3.51 15a9 9 0 102.13-9.36L1 10" /></Ico>;
const IcoFire = () => <Ico><path d="M12 2c0 0-5.5 4-5.5 9a5.5 5.5 0 0011 0C17.5 6 12 2 12 2z" /><path d="M12 12c0 0-2 1.5-2 3a2 2 0 004 0c0-1.5-2-3-2-3z" /></Ico>;
const IcoTrendingUp = () => <Ico><polyline points="23 6 13.5 15.5 8.5 10.5 1 18" /><polyline points="17 6 23 6 23 12" /></Ico>;
const IcoTrendingDown = () => <Ico><polyline points="23 18 13.5 8.5 8.5 13.5 1 6" /><polyline points="17 18 23 18 23 12" /></Ico>;
const IcoStar = () => <Ico><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" /></Ico>;
const IcoZap = () => <Ico><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" /></Ico>;

export default function WorkProgressTracker() {
  const { tasks, streak, longestStreak } = useTasks();
  const [activeFilter, setActiveFilter] = useState("Today");
  const [customDate, setCustomDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [historicalDate, setHistoricalDate] = useState(format(subDays(new Date(), 1), "yyyy-MM-dd"));
  const [calendarMonth, setCalendarMonth] = useState(new Date());

  // Helper: Get tasks for a specific exact date string
  const getStatsForDate = (dateStr) => {
    let total = 0;
    let completed = 0;
    let pending = 0;
    let overdue = 0;
    let rescheduled = 0;

    tasks.forEach(t => {
      const taskDue = t.dueDate || t.createdDate || "2099-01-01";
      const wasCompletedBeforeDate = t.completed && t.completedDate && t.completedDate < dateStr;
      const wasCompletedOnOrBeforeDate = t.completed && t.completedDate && t.completedDate <= dateStr;

      const isDueToday = taskDue === dateStr;
      const isCarryForward = taskDue < dateStr && !wasCompletedBeforeDate;

      if (isDueToday || isCarryForward) {
        total++;
        if (wasCompletedOnOrBeforeDate) {
          completed++;
        } else if (taskDue < dateStr) {
          overdue++;
        } else {
          pending++;
        }
      }

      if (t.rescheduleHistory?.some(h => h.rescheduledAtDate === dateStr)) {
        rescheduled++;
      }
    });

    const completionPct = total === 0 ? 0 : Math.round((completed / total) * 100);
    return { total, completed, pending, overdue, rescheduled, completionPct };
  };

  // Main Summary Stats based on Filter
  const summaryStats = useMemo(() => {
    let total = 0, completed = 0, pending = 0, overdue = 0, rescheduled = 0;
    const todayStr = format(new Date(), "yyyy-MM-dd");

    if (activeFilter === "Today") return getStatsForDate(todayStr);
    if (activeFilter === "Yesterday") return getStatsForDate(format(subDays(new Date(), 1), "yyyy-MM-dd"));
    if (activeFilter === "Custom Date") return getStatsForDate(customDate);

    // For Week / Month, aggregate over the period
    tasks.forEach(t => {
      let taskDateObj;
      try { taskDateObj = parseISO(t.dueDate || t.createdDate || "2099-01-01"); } catch (e) { taskDateObj = new Date(); }

      let include = false;
      if (activeFilter === "Last 7 Days") {
        include = differenceInDays(new Date(), taskDateObj) <= 7 && differenceInDays(new Date(), taskDateObj) >= 0;
      } else if (activeFilter === "This Month") {
        include = isThisMonth(taskDateObj);
      }

      if (include) {
        total++;
        if (t.completed) completed++;
        else if ((t.dueDate || "2099-01-01") < todayStr) overdue++;
        else pending++;
      }

      // Check reschedule history for the period
      let hasRescheduled = false;
      if (activeFilter === "Last 7 Days") {
        hasRescheduled = t.rescheduleHistory?.some(h => {
          try {
            const d = differenceInDays(new Date(), parseISO(h.rescheduledAtDate));
            return d <= 7 && d >= 0;
          } catch (e) { return false; }
        });
      } else if (activeFilter === "This Month") {
        hasRescheduled = t.rescheduleHistory?.some(h => {
          try { return isThisMonth(parseISO(h.rescheduledAtDate)); } catch (e) { return false; }
        });
      }
      if (hasRescheduled) rescheduled++;
    });

    return { total, completed, pending, overdue, rescheduled, completionPct: total === 0 ? 0 : Math.round((completed / total) * 100) };
  }, [tasks, activeFilter, customDate]);

  // Last 7 Days Array
  const last7DaysData = useMemo(() => {
    const days = [];
    for (let i = 6; i >= 0; i--) {
      const d = subDays(new Date(), i);
      const str = format(d, "yyyy-MM-dd");
      const st = getStatsForDate(str);
      days.push({
        dateStr: str,
        displayDay: format(d, "EEE"),
        ...st
      });
    }
    return days;
  }, [tasks]);

  const histStats = getStatsForDate(historicalDate);

  // Calendar Logic
  const calendarDays = useMemo(() => {
    const start = startOfMonth(calendarMonth);
    const end = endOfMonth(calendarMonth);
    const daysInMonth = eachDayOfInterval({ start, end });

    // pad start
    const startPadding = start.getDay();
    const paddedDays = Array(startPadding).fill(null).concat(daysInMonth);

    return paddedDays.map(date => {
      if (!date) return null;
      const dStr = format(date, "yyyy-MM-dd");
      const st = getStatsForDate(dStr);
      let status = "status-none";
      if (st.total > 0) {
        if (st.completionPct >= 80) status = "status-good";
        else if (st.completionPct >= 50) status = "status-ok";
        else status = "status-bad";
      }
      return { date, dateStr: dStr, stats: st, status };
    });
  }, [tasks, calendarMonth]);

  // Performance Insights
  const insights = useMemo(() => {
    let bestDay = { day: "None", pct: 0, total: 0 };
    let highestPct = 0;
    let totalComp = 0;
    let totalWork = 0;

    last7DaysData.forEach(d => {
      totalComp += d.completed;
      totalWork += d.total;
      if (d.completionPct > highestPct) highestPct = d.completionPct;
      if (d.completed > bestDay.total || (d.completed === bestDay.total && d.completionPct > bestDay.pct)) {
        bestDay = { day: d.displayDay, pct: d.completionPct, total: d.completed };
      }
    });

    const avgDaily = totalWork > 0 ? Math.round(totalComp / 7) : 0;

    // Improvement / Decline (Last 7 days vs Prev 7 days)
    let prev7Comp = 0, prev7Work = 0;
    for (let i = 13; i >= 7; i--) {
      const st = getStatsForDate(format(subDays(new Date(), i), "yyyy-MM-dd"));
      prev7Comp += st.completed;
      prev7Work += st.total;
    }
    const currPct = totalWork > 0 ? (totalComp / totalWork) * 100 : 0;
    const prevPct = prev7Work > 0 ? (prev7Comp / prev7Work) * 100 : 0;
    const trendDiff = Math.round(currPct - prevPct);

    return {
      bestDay: bestDay.day,
      streak,
      highestPct,
      avgDaily,
      trendDiff
    };
  }, [tasks, last7DaysData, streak]);

  // Charts Data
  const pieData = [
    { name: "Completed", value: summaryStats.completed, color: "#10b981" },
    { name: "Pending", value: summaryStats.pending, color: "#f59e0b" },
    { name: "Overdue", value: summaryStats.overdue, color: "#ef4444" }
  ].filter(d => d.value > 0);
  if (pieData.length === 0) pieData.push({ name: "No Tasks", value: 1, color: "#e2e8f0" });

  return (
    <div className="page-fade-in wpt-container">

      {/* ── Header & Filters ── */}
      <div className="wpt-header">
        <div>
          <h2 className="wpt-title">Report Tracker</h2>
          {/* <p className="wpt-subtitle">Monitor productivity, track work, and review historical performance.</p> */}
        </div>
        <div className="wpt-filters">

          <div className="wpt-filter-group">

            {["Today", "Yesterday", "Tomorrow","Last 7 Days", "This Month"].map(f => (
              <button
                key={f}
                className={`wpt-filter-btn ${activeFilter === f ? "active" : ""}`}
                onClick={() => setActiveFilter(f)}
              >
                {f}
              </button>
            ))}

          </div>

          {/* <input
            type="date"
            className="wpt-date-picker"
            value={customDate}
            onChange={(e) => {
              setCustomDate(e.target.value);
              setActiveFilter("Custom Date");
            }}
          /> */}

        </div>
      </div>

      {/* ── Top Summary Cards ── */}
      <div className="wpt-summary-grid">
        <div className="wpt-sum-card">
          <span className="wpt-sum-title">Total Tasks</span>
          <span className="wpt-sum-value" style={{ color: "#6366f1" }}>{summaryStats.total}</span>
        </div>
        <div className="wpt-sum-card">
          <span className="wpt-sum-title">Completed</span>
          <span className="wpt-sum-value" style={{ color: "#10b981" }}>{summaryStats.completed}</span>
        </div>
        <div className="wpt-sum-card">
          <span className="wpt-sum-title">Pending</span>
          <span className="wpt-sum-value" style={{ color: "#f59e0b" }}>{summaryStats.pending}</span>
        </div>
        <div className="wpt-sum-card">
          <span className="wpt-sum-title">Overdue</span>
          <span className="wpt-sum-value" style={{ color: "#ef4444" }}>{summaryStats.overdue}</span>
        </div>
        <div className="wpt-sum-card">
          <span className="wpt-sum-title">Rescheduled</span>
          <span className="wpt-sum-value" style={{ color: "#3b82f6" }}>{summaryStats.rescheduled}</span>
        </div>
        <div className="wpt-sum-card">
          <span className="wpt-sum-title">Completion %</span>
          <span className="wpt-sum-value" style={{ color: "#a855f7" }}>{summaryStats.completionPct}%</span>
        </div>
      </div>

      <div className="wpt-main-grid">
        {/* LEFT COLUMN */}
        <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>

          {/* Daily Progress */}
          <div className="wpt-card">
            <div className="wpt-card-header">
              <span>{activeFilter} Progress</span>
              <span style={{ color: "var(--color-primary)" }}>{summaryStats.completed} / {summaryStats.total} Tasks Completed</span>
            </div>
            <div className="wpt-progress-wrapper">
              <div className="wpt-progress-fill" style={{ width: `${summaryStats.completionPct}%` }}>
                {summaryStats.completionPct > 5 && <span className="wpt-progress-text">{summaryStats.completionPct}%</span>}
              </div>
            </div>
          </div>

          {/* Weekly Progress (Last 7 Days) */}
          <div className="wpt-card">
            <div className="wpt-card-header">Last 7 Days Progress</div>
            <div className="wpt-weekly-row">
              {last7DaysData.map(d => (
                <div key={d.dateStr} className="wpt-day-card">
                  <span className="wpt-day-name">{d.displayDay}</span>
                  <span className="wpt-day-stats">{d.completed} <span style={{ fontSize: "0.8rem", color: "var(--text-muted)", fontWeight: 500 }}>/ {d.total}</span></span>
                  <span className="wpt-day-pct">{d.completionPct}%</span>
                  <div style={{ width: "100%", height: "4px", background: "var(--border-light)", borderRadius: "4px", overflow: "hidden", marginTop: "4px" }}>
                    <div style={{ width: `${d.completionPct}%`, height: "100%", background: "var(--color-primary)", borderRadius: "4px" }} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Charts Row */}
          <div className="wpt-chart-grid">
            <div className="wpt-card" style={{ padding: "16px" }}>
              <div className="wpt-card-header" style={{ marginBottom: "8px", fontSize: "1rem" }}>Weekly Completion </div>
              <div style={{ height: "180px", width: "100%" }}>
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={last7DaysData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                    <XAxis dataKey="displayDay" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 10 }} axisLine={false} tickLine={false} width={30} />
                    <RechartsTooltip contentStyle={{ borderRadius: "8px", border: "none", boxShadow: "0 4px 12px rgba(0,0,0,0.1)" }} />
                    <Line type="monotone" dataKey="completionPct" stroke="#4f46e5" strokeWidth={3} dot={{ r: 4, fill: "#4f46e5" }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="wpt-card" style={{ padding: "16px" }}>
              <div className="wpt-card-header" style={{ marginBottom: "8px", fontSize: "1rem" }}>Status Distribution</div>
              <div style={{ height: "180px", width: "100%", position: "relative" }}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={pieData} innerRadius={50} outerRadius={70} paddingAngle={2} dataKey="value" stroke="none">
                      {pieData.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color} />)}
                    </Pie>
                    <RechartsTooltip />
                  </PieChart>
                </ResponsiveContainer>
                <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", pointerEvents: "none" }}>
                  <span style={{ fontSize: "1.2rem", fontWeight: 800, color: "var(--text-primary)" }}>{summaryStats.completionPct}%</span>
                </div>
              </div>
            </div>
          </div>

        </div>

        {/* RIGHT COLUMN */}
        <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>

          {/* Historical Progress Date Picker */}
          <div className="wpt-card">
            <div className="wpt-card-header">View Previous Progress</div>
           <input
  type="date"
  className="wpt-date-picker"
  style={{ width: "100%", marginBottom: "16px" }}
  value={historicalDate}
  max={new Date().toISOString().split("T")[0]}
  onChange={(e) => setHistoricalDate(e.target.value)}
/>
            {histStats.total === 0 ? (
              <div style={{ textAlign: "center", padding: "24px", color: "var(--text-muted)", background: "var(--bg-body)", borderRadius: "12px" }}>
                No task history available for this date.
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontWeight: 600, color: "var(--text-secondary)" }}>Total Tasks</span>
                  <span style={{ fontWeight: 800 }}>{histStats.total}</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontWeight: 600, color: "#10b981" }}>Completed</span>
                  <span style={{ fontWeight: 800, color: "#10b981" }}>{histStats.completed}</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontWeight: 600, color: "#f59e0b" }}>Pending</span>
                  <span style={{ fontWeight: 800, color: "#f59e0b" }}>{histStats.pending}</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontWeight: 600, color: "#ef4444" }}>Overdue</span>
                  <span style={{ fontWeight: 800, color: "#ef4444" }}>{histStats.overdue}</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderTop: "1px solid var(--border-light)", paddingTop: "12px" }}>
                  <span style={{ fontWeight: 800, color: "var(--text-primary)" }}>Completion</span>
                  <span style={{ fontWeight: 800, color: "#a855f7", fontSize: "1.2rem" }}>{histStats.completionPct}%</span>
                </div>
              </div>
            )}
          </div>

          {/* Calendar View */}
          {/* <div className="wpt-card">
            <div className="wpt-card-header" style={{ marginBottom: "12px" }}>
              <span>Calendar View</span>
              <span style={{ fontSize: "0.9rem", color: "var(--text-muted)", fontWeight: 600 }}>{format(calendarMonth, "MMMM yyyy")}</span>
            </div>
            <div className="wpt-calendar">
              <div className="wpt-cal-header">
                {["Su","Mo","Tu","We","Th","Fr","Sa"].map(d => <span key={d}>{d}</span>)}
              </div>
              <div className="wpt-cal-grid">
                {calendarDays.map((d, i) => (
                  d ? (
                    <div 
                      key={d.dateStr} 
                      className={`wpt-cal-cell ${d.status}`}
                      title={`${format(d.date, "MMM d")}: ${d.stats.completionPct}% (${d.stats.completed}/${d.stats.total})`}
                      onClick={() => setHistoricalDate(d.dateStr)}
                    >
                      {d.date.getDate()}
                    </div>
                  ) : <div key={`empty-${i}`} className="wpt-cal-cell disabled" />
                ))}
              </div>
            </div>
          </div> */}

          {/* Performance Insights */}
          <div className="wpt-card">
            <div className="wpt-card-header" style={{ marginBottom: "16px" }}>Performance Insights</div>
            <div className="wpt-insights">
              <div className="wpt-insight-row">
                <span className="wpt-insight-label"><IcoStar size={16} /> Best Performing Day</span>
                <span className="wpt-insight-value">{insights.bestDay}</span>
              </div>
              <div className="wpt-insight-row">
                <span className="wpt-insight-label"><IcoFire size={16} /> Current Streak</span>
                <span className="wpt-insight-value">{insights.streak} Days</span>
              </div>
              <div className="wpt-insight-row">
                <span className="wpt-insight-label"><IcoTarget size={16} /> Highest Completion %</span>
                <span className="wpt-insight-value">{insights.highestPct}%</span>
              </div>
              <div className="wpt-insight-row">
                <span className="wpt-insight-label"><IcoZap size={16} /> Avg Daily Completion</span>
                <span className="wpt-insight-value">{insights.avgDaily} Tasks</span>
              </div>
              <div className="wpt-insight-row">
                <span className="wpt-insight-label">
                  {insights.trendDiff >= 0 ? <IcoTrendingUp size={16} /> : <IcoTrendingDown size={16} />}
                  Weekly Trend
                </span>
                <span className="wpt-insight-value" style={{ color: insights.trendDiff >= 0 ? "#10b981" : "#ef4444" }}>
                  {insights.trendDiff > 0 ? "+" : ""}{insights.trendDiff}%
                </span>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
