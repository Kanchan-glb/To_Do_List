import { useState, useMemo, useEffect } from "react";

import DraggableGrid from "./dnd/DraggableGrid";
import DraggableCard from "./dnd/DraggableCard";
import NeumorphicCircleProgress from "./NeumorphicCircleProgress";
import NeumorphicLinearProgress from "./NeumorphicLinearProgress";
import { clearLayout } from "../utils/layoutStorage";

import { useTasks } from "../context/TaskContext";
import { format, subDays, addDays, isThisMonth, parseISO, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, isThisWeek, startOfWeek, endOfWeek, differenceInDays } from "date-fns";
import { AreaChart, Area, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell } from "recharts";
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

const IcoReset = () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 12a9 9 0 1 0 3-6.7" /><polyline points="3 3 3 9 9 9" /></svg>;

/* Custom Floating Tooltip (Matching Reference Image) */
const CustomChartTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    const pctData = payload.find(p => p.dataKey === "completionPct") || payload[0];
    const countData = payload.find(p => p.dataKey === "completed") || payload[1];

    return (
      <div className="custom-chart-tooltip">
        <div className="tooltip-badge-pill">
          <span className="tooltip-icon">⚡</span>
          <div className="tooltip-info">
            <span className="tooltip-title">{label} Analytics</span>
            <span className="tooltip-val">{pctData?.value}% Rate ({countData?.value || 0} Tasks)</span>
          </div>
        </div>
        <div className="tooltip-arrow-pointer" />
      </div>
    );
  }
  return null;
};

function StackedCardsDeck({ summaryStats }) {
  const [topIndex, setTopIndex] = useState(0);
  const [animating, setAnimating] = useState(false);

  const cards = [
    {
      id: "sum-total",
      title: "Total Tasks",
      value: summaryStats.total,
      color: "#6366f1",
      bannerClass: "banner-total",
      bannerText: "TOTAL CREATED"
    },
    {
      id: "sum-completed",
      title: "Completed",
      value: summaryStats.completed,
      color: "#10b981",
      bannerClass: "banner-completed",
      bannerText: "FINISHED TASK"
    },
    {
      id: "sum-pending",
      title: "Pending",
      value: summaryStats.pending,
      color: "#f59e0b",
      bannerClass: "banner-pending",
      bannerText: "IN PROGRESS"
    },
    {
      id: "sum-overdue",
      title: "Overdue",
      value: summaryStats.overdue,
      color: "#ef4444",
      bannerClass: "banner-overdue",
      bannerText: "ACTION REQUIRED"
    },
    {
      id: "sum-completion",
      title: "Completion %",
      value: `${summaryStats.completionPct}%`,
      color: "#a855f7",
      bannerClass: "banner-completion",
      bannerText: "SUCCESS RATE"
    },
    {
      id: "sum-rescheduled",
      title: "Rescheduled",
      value: summaryStats.rescheduled,
      color: "#3b82f6",
      bannerClass: "banner-rescheduled",
      bannerText: "RE-ASSIGNED"
    }
  ];

  const handleCardClick = () => {
    if (animating) return;
    setAnimating(true);
    setTimeout(() => {
      setTopIndex((prev) => (prev + 1) % cards.length);
      setAnimating(false);
    }, 280);
  };

  return (
    <div className="stacked-deck-wrapper">
      <div className="stacked-deck-container">
        {cards.map((card, idx) => {
          const total = cards.length;
          const relIndex = (idx - topIndex + total) % total;
          const isTop = relIndex === 0;
          const isAnimatingThis = isTop && animating;

          const rotateAngle = isTop ? -2 : (idx % 2 === 0 ? 3 + relIndex * 2 : -3 - relIndex * 2);
          const offsetX = (relIndex % 3) * 14;
          const offsetY = relIndex * 8;
          const scale = 1 - relIndex * 0.035;
          const zIndex = total - relIndex;

          return (
            <div
              key={card.id}
              className={`stacked-card-item ${isTop ? "is-top-card" : ""} ${isAnimatingThis ? "is-swiping-out" : ""}`}
              onClick={isTop ? handleCardClick : undefined}
              style={{
                zIndex: zIndex,
                transform: isAnimatingThis
                  ? `translate(140%, -20px) rotate(20deg) scale(0.9)`
                  : `translate(${offsetX}px, ${offsetY}px) rotate(${rotateAngle}deg) scale(${scale})`,
                opacity: isAnimatingThis ? 0 : (relIndex > 4 ? 0.3 : 1 - relIndex * 0.1),
                pointerEvents: isTop ? "auto" : "none"
              }}
              title={isTop ? "Touch / Click to reveal next card" : ""}
            >
              <div className="wpt-sum-card">
                <div className="wpt-sum-card-body">
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span className="wpt-sum-title">{card.title}</span>
                    <span style={{ fontSize: "0.72rem", background: "rgba(99, 102, 241, 0.12)", color: card.color, padding: "2px 8px", borderRadius: "99px", fontWeight: 800 }}>
                      {relIndex === 0 ? "TOUCH TOP ➔" : `#${relIndex + 1}`}
                    </span>
                  </div>
                  <span className="wpt-sum-value" style={{ color: card.color }}>{card.value}</span>
                </div>
                <div className={`wpt-sum-banner ${card.bannerClass}`}>
                  <span>{card.bannerText}</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
     
        <button
          type="button"
          className="stacked-deck-controls"
          onClick={handleCardClick}
        >
          Next Card ➔
        </button>
      
    </div>
  );
}

export default function WorkProgressTracker() {
  const { tasks, streak, longestStreak, fetchTasks, loading } = useTasks();
  const [activeFilter, setActiveFilter] = useState("Today");
  const [summaryViewMode, setSummaryViewMode] = useState("stacked"); // "stacked" or "grid"
  const [customDate, setCustomDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [historicalDate, setHistoricalDate] = useState(format(subDays(new Date(), 1), "yyyy-MM-dd"));
  const [calendarMonth, setCalendarMonth] = useState(new Date());

  // Auto-fetch fresh data from MongoDB backend API on component mount
  useEffect(() => {
    if (fetchTasks) {
      fetchTasks();
    }
  }, []);

  // Helper: Unified Task Status Evaluation
  const getTaskStatus = (task) => {
    if (task.completed || task.status === "Completed") return "Completed";
    const todayStr = format(new Date(), "yyyy-MM-dd");
    const nowTimeStr = format(new Date(), "HH:mm");
    const taskDue = task.dueDate || "2099-01-01";
    const taskTime = task.dueTime || "23:59";

    if (taskDue < todayStr) return "Overdue";
    if (taskDue > todayStr) return "Incoming";
    if (taskTime < nowTimeStr) return "Overdue";
    return "Pending";
  };

  // Helper: Get tasks for a specific exact date string
  const getStatsForDate = (dateStr) => {
    let total = 0, completed = 0, pending = 0, incoming = 0, overdue = 0, rescheduled = 0;
    const todayStr = format(new Date(), "yyyy-MM-dd");

    tasks.forEach(t => {
      const taskDue = t.dueDate || t.createdDate || todayStr;
      const isComp = t.completed || t.status === "Completed";
      const isDueOnDate = taskDue === dateStr;
      const isCompletedOnDate = (t.completedDate && t.completedDate === dateStr) || (isComp && taskDue === dateStr);
      const isRescheduledOnDate = t.rescheduleHistory?.some(h => h.rescheduledAtDate === dateStr);

      if (isDueOnDate || isCompletedOnDate || isRescheduledOnDate) {
        total++;
        const st = getTaskStatus(t);
        if (st === "Completed") completed++;
        else if (st === "Overdue") overdue++;
        else {
          // For reporting analytics: Pending Report Count = Pending + Incoming
          pending++;
          if (st === "Incoming") incoming++;
        }
      }

      if (isRescheduledOnDate || (t.rescheduleCount > 0 && isDueOnDate)) {
        rescheduled++;
      }
    });

    const completionPct = total === 0 ? 0 : Math.round((completed / total) * 100);
    return { total, completed, pending, incoming, overdue, rescheduled, completionPct };
  };

  // Main Summary Stats based on Filter
  const summaryStats = useMemo(() => {
    let total = 0, completed = 0, pending = 0, incoming = 0, overdue = 0, rescheduled = 0;
    const todayStr = format(new Date(), "yyyy-MM-dd");

    if (activeFilter === "Today") return getStatsForDate(todayStr);
    if (activeFilter === "Yesterday") return getStatsForDate(format(subDays(new Date(), 1), "yyyy-MM-dd"));
    if (activeFilter === "Tomorrow") return getStatsForDate(format(addDays(new Date(), 1), "yyyy-MM-dd"));
    if (activeFilter === "Custom Date") return getStatsForDate(customDate);

    // Aggregate over period for "Last 7 Days" or "This Month"
    tasks.forEach(t => {
      let taskDateObj;
      try { taskDateObj = parseISO(t.dueDate || t.createdDate || todayStr); } catch (e) { taskDateObj = new Date(); }

      let include = false;
      if (activeFilter === "Last 7 Days" || activeFilter === "This Week") {
        const diff = differenceInDays(new Date(), taskDateObj);
        include = diff <= 7 && diff >= 0;
      } else if (activeFilter === "This Month") {
        include = isThisMonth(taskDateObj);
      }

      if (include) {
        total++;
        const st = getTaskStatus(t);
        if (st === "Completed") completed++;
        else if (st === "Overdue") overdue++;
        else {
          // For reporting analytics: Pending Report Count = Pending + Incoming
          pending++;
          if (st === "Incoming") incoming++;
        }
      }

      let hasRescheduled = false;
      if (activeFilter === "Last 7 Days" || activeFilter === "This Week") {
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
      if (hasRescheduled || (t.rescheduleCount > 0 && include)) rescheduled++;
    });

    const completionPct = total === 0 ? 0 : Math.round((completed / total) * 100);
    return { total, completed, pending, incoming, overdue, rescheduled, completionPct };
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
        </div>
        <div className="wpt-filters" style={{ display: 'flex', gap: '16px', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap' }}>
          <div className="wpt-filter-group" style={{ width: 'auto', margin: 0 }}>
            {["Today", "Yesterday", "Tomorrow", "Last 7 Days", "This Month"].map(f => (
              <button
                key={f}
                className={`wpt-filter-btn ${activeFilter === f ? "active" : ""}`}
                onClick={() => setActiveFilter(f)}
              >
                {f}
              </button>
            ))}
          </div>


        </div>
      </div>

      <DraggableGrid page="reports" defaultLayout={['sum-total', 'sum-completed', 'sum-pending', 'sum-overdue', 'sum-rescheduled', 'sum-completion', 'left-daily', 'left-weekly', 'chart-weekly', 'chart-status', 'right-previous', 'right-insights']}>
        {({ layout }) => {
          const renderWidget = (id) => {
            switch (id) {
              case 'sum-total': return <DraggableCard id="sum-total" key="sum-total">
                <div className="wpt-sum-card theme-total">
                  <div className="wpt-sum-card-body">
                    <span className="wpt-sum-title">Total Tasks</span>
                    <span className="wpt-sum-value" style={{ color: "#6366f1" }}>{summaryStats.total}</span>
                  </div>
                  <div className="wpt-sum-banner banner-total">
                    <span>TOTAL CREATED</span>
                  </div>
                </div>
              </DraggableCard>;
              case 'sum-completed': return <DraggableCard id="sum-completed" key="sum-completed">
                <div className="wpt-sum-card theme-completed">
                  <div className="wpt-sum-card-body">
                    <span className="wpt-sum-title">Completed</span>
                    <span className="wpt-sum-value" style={{ color: "#10b981" }}>{summaryStats.completed}</span>
                  </div>
                  <div className="wpt-sum-banner banner-completed">
                    <span>FINISHED TASK</span>
                  </div>
                </div>
              </DraggableCard>;
              case 'sum-pending': return <DraggableCard id="sum-pending" key="sum-pending">
                <div className="wpt-sum-card theme-pending">
                  <div className="wpt-sum-card-body">
                    <span className="wpt-sum-title">Pending</span>
                    <span className="wpt-sum-value" style={{ color: "#f59e0b" }}>{summaryStats.pending}</span>
                  </div>
                  <div className="wpt-sum-banner banner-pending">
                    <span>IN PROGRESS</span>
                  </div>
                </div>
              </DraggableCard>;
              case 'sum-overdue': return <DraggableCard id="sum-overdue" key="sum-overdue">
                <div className="wpt-sum-card theme-overdue">
                  <div className="wpt-sum-card-body">
                    <span className="wpt-sum-title">Overdue</span>
                    <span className="wpt-sum-value" style={{ color: "#ef4444" }}>{summaryStats.overdue}</span>
                  </div>
                  <div className="wpt-sum-banner banner-overdue">
                    <span>ACTION REQUIRED</span>
                  </div>
                </div>
              </DraggableCard>;
              case 'sum-completion': return <DraggableCard id="sum-completion" key="sum-completion">
                <div className="wpt-sum-card theme-completion">
                  <div className="wpt-sum-card-body">
                    <span className="wpt-sum-title">Completion %</span>
                    <span className="wpt-sum-value" style={{ color: "#a855f7" }}>{summaryStats.completionPct}%</span>
                  </div>
                  <div className="wpt-sum-banner banner-completion">
                    <span>SUCCESS RATE</span>
                  </div>
                </div>
              </DraggableCard>;
              case 'sum-rescheduled': return <DraggableCard id="sum-rescheduled" key="sum-rescheduled">
                <div className="wpt-sum-card theme-rescheduled">
                  <div className="wpt-sum-card-body">
                    <span className="wpt-sum-title">Rescheduled</span>
                    <span className="wpt-sum-value" style={{ color: "#3b82f6" }}>{summaryStats.rescheduled}</span>
                  </div>
                  <div className="wpt-sum-banner banner-rescheduled">
                    <span>RE-ASSIGNED</span>
                  </div>
                </div>
              </DraggableCard>;
              case 'left-daily': return <DraggableCard id="left-daily" key="left-daily">
                <NeumorphicLinearProgress
                  title={`${activeFilter} Progress`}
                  completionPct={summaryStats.completionPct}
                  completedCount={summaryStats.completed}
                  totalCount={summaryStats.total}
                />
              </DraggableCard>;
              case 'left-weekly': return <DraggableCard id="left-weekly" key="left-weekly">{/* Weekly Progress (Last 7 Days) - Neumorphic 3D Upgrade */}
                <div className="wpt-card" style={{
                  padding: "20px 24px",
                  borderRadius: "24px",
                  background: "#edf2f8",
                  border: "1px solid rgba(255, 255, 255, 0.85)",
                  boxShadow: "-8px -8px 20px #ffffff, 8px 8px 22px #b8c6d9"
                }}>
                  <div style={{ marginBottom: "16px" }}>
                    <h3 style={{ fontSize: "1.1rem", fontWeight: 900, color: "#1e293b", margin: 0 }}>📊 Last 7 Days Progress</h3>
                    <p style={{ fontSize: "0.78rem", color: "#64748b", margin: "3px 0 0 0", fontWeight: 500 }}>Daily task completion breakdown and progress tracks</p>
                  </div>
                  <div className="wpt-weekly-row" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(80px, 1fr))", gap: "12px" }}>
                    {last7DaysData.map(d => (
                      <div
                        key={d.dateStr}
                        className="wpt-day-card"
                        style={{
                          background: "#edf2f8",
                          borderRadius: "16px",
                          border: "1px solid rgba(255, 255, 255, 0.9)",
                          boxShadow: "-4px -4px 10px #ffffff, 4px 4px 10px #b8c6d9",
                          padding: "14px 10px",
                          display: "flex",
                          flexDirection: "column",
                          alignItems: "center",
                          justifyContent: "center",
                          gap: "4px",
                          textAlign: "center",
                          transition: "all 0.25s cubic-bezier(0.4, 0, 0.2, 1)"
                        }}
                      >
                        <span className="wpt-day-name" style={{ fontSize: "0.72rem", fontWeight: 900, letterSpacing: "0.08em", textTransform: "uppercase", color: "#64748b" }}>{d.displayDay}</span>
                        <span className="wpt-day-stats" style={{ fontSize: "1.1rem", fontWeight: 900, color: "#1e293b" }}>
                          {d.completed} <span style={{ fontSize: "0.78rem", color: "#94a3b8", fontWeight: 600 }}>/ {d.total}</span>
                        </span>
                        <span className="wpt-day-pct" style={{ fontSize: "0.85rem", fontWeight: 900, color: d.completionPct === 100 ? "#10b981" : "#7c3aed" }}>{d.completionPct}%</span>
                        <div style={{
                          width: "100%",
                          height: "6px",
                          background: "#edf2f8",
                          borderRadius: "999px",
                          overflow: "hidden",
                          marginTop: "4px",
                          boxShadow: "inset -1.5px -1.5px 3px #ffffff, inset 1.5px 1.5px 3px #b8c6d9",
                          border: "1px solid rgba(255, 255, 255, 0.7)"
                        }}>
                          <div style={{
                            width: `${d.completionPct}%`,
                            height: "100%",
                            background: d.completionPct === 100 ? "linear-gradient(90deg, #10b981 0%, #059669 100%)" : "linear-gradient(90deg, #d946ef 0%, #6366f1 100%)",
                            borderRadius: "999px",
                            boxShadow: "0 2px 6px rgba(99, 102, 241, 0.3)",
                            transition: "width 0.4s ease"
                          }} />
                        </div>
                      </div>
                    ))}
                  </div>
                </div></DraggableCard>;
              case 'chart-weekly': return <DraggableCard id="chart-weekly" key="chart-weekly">
                <div className="wpt-card chart-card-styled" style={{ padding: "20px 24px", borderRadius: "24px", background: "#edf2f8", boxShadow: "-8px -8px 20px #ffffff, 8px 8px 22px #b8c6d9" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px", flexWrap: "wrap", gap: "8px" }}>
                    <div>
                      <h3 style={{ fontSize: "1.1rem", fontWeight: 800, color: "#1e293b", margin: 0 }}>Weekly Performance Trend</h3>
                      <p style={{ fontSize: "0.78rem", color: "#64748b", margin: "2px 0 0 0", fontWeight: 500 }}>Real-time completion & task activity curves</p>
                    </div>
                    <div style={{ display: "flex", gap: "6px" }}>
                      <span style={{ fontSize: "0.72rem", background: "rgba(79, 70, 229, 0.12)", color: "#4f46e5", padding: "4px 10px", borderRadius: "99px", fontWeight: 700 }}>● Completion %</span>
                      <span style={{ fontSize: "0.72rem", background: "rgba(244, 63, 94, 0.12)", color: "#f43f5e", padding: "4px 10px", borderRadius: "99px", fontWeight: 700 }}>● Completed</span>
                    </div>
                  </div>

                  <div style={{ height: "200px", width: "100%" }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={last7DaysData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                        <defs>
                          <linearGradient id="colorCompletion" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#6366f1" stopOpacity={0.45} />
                            <stop offset="95%" stopColor="#6366f1" stopOpacity={0.0} />
                          </linearGradient>
                          <linearGradient id="colorCompleted" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.3} />
                            <stop offset="95%" stopColor="#f43f5e" stopOpacity={0.0} />
                          </linearGradient>
                        </defs>

                        <CartesianGrid strokeDasharray="4 4" vertical={false} stroke="rgba(203, 213, 225, 0.45)" />
                        <XAxis dataKey="displayDay" tick={{ fontSize: 11, fill: "#64748b", fontWeight: 700 }} axisLine={false} tickLine={false} dy={6} />
                        <YAxis tick={{ fontSize: 11, fill: "#64748b", fontWeight: 600 }} axisLine={false} tickLine={false} domain={[0, 100]} unit="%" />
                        <RechartsTooltip content={<CustomChartTooltip />} />

                        {/* Secondary Rose/Pink Area Curve */}
                        <Area
                          type="monotone"
                          dataKey="completed"
                          stroke="#f43f5e"
                          strokeWidth={2.5}
                          fillOpacity={1}
                          fill="url(#colorCompleted)"
                          activeDot={{ r: 6, fill: "#f43f5e", stroke: "#ffffff", strokeWidth: 2 }}
                        />

                        {/* Main Indigo Area Curve */}
                        <Area
                          type="monotone"
                          dataKey="completionPct"
                          stroke="#6366f1"
                          strokeWidth={3.5}
                          fillOpacity={1}
                          fill="url(#colorCompletion)"
                          activeDot={{ r: 7, fill: "#4f46e5", stroke: "#ffffff", strokeWidth: 3 }}
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </DraggableCard>;
              case 'chart-status': return <DraggableCard id="chart-status" key="chart-status"><div className="wpt-card" style={{ padding: "16px" }}>
                <div className="wpt-card-header" style={{ marginBottom: "4px", fontSize: "1rem" }}>Status Distribution</div>
                <div style={{ height: "185px", width: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <NeumorphicCircleProgress summaryStats={summaryStats} pieData={pieData} size={165} />
                </div>
              </div></DraggableCard>;
              case 'right-previous': return <DraggableCard id="right-previous" key="right-previous">{/* Historical Progress Date Picker - Neumorphic 3D Upgrade */}
                <div className="wpt-card" style={{
                  background: "#edf2f8",
                  borderRadius: "24px",
                  border: "1px solid rgba(255, 255, 255, 0.85)",
                  boxShadow: "-8px -8px 20px #ffffff, 8px 8px 22px #b8c6d9",
                  padding: "20px 22px"
                }}>
                  <div className="wpt-card-header" style={{
                    fontSize: "1.05rem",
                    fontWeight: 900,
                    color: "#1e293b",
                    marginBottom: "14px",
                    display: "flex",
                    alignItems: "center",
                    gap: "8px"
                  }}>
                    📅 View Previous Progress
                  </div>

                  {/* Inset Recessed Date Picker */}
                  <input
                    type="date"
                    className="wpt-date-picker"
                    style={{
                      width: "100%",
                      marginBottom: "16px",
                      padding: "10px 14px",
                      background: "#edf2f8",
                      border: "1px solid rgba(255, 255, 255, 0.9)",
                      borderRadius: "14px",
                      boxShadow: "inset -3px -3px 7px #ffffff, inset 3px 3px 7px #b8c6d9",
                      fontWeight: 800,
                      color: "#1e293b",
                      outline: "none",
                      fontSize: "0.88rem",
                      boxSizing: "border-box"
                    }}
                    value={historicalDate}
                    max={new Date().toISOString().split("T")[0]}
                    onChange={(e) => setHistoricalDate(e.target.value)}
                  />

                  {histStats.total === 0 ? (
                    <div style={{
                      textAlign: "center",
                      padding: "20px 14px",
                      color: "#64748b",
                      background: "#edf2f8",
                      borderRadius: "14px",
                      boxShadow: "inset -3px -3px 6px #ffffff, inset 3px 3px 6px #b8c6d9",
                      fontSize: "0.85rem",
                      fontWeight: 600
                    }}>
                      No task history available for this date.
                    </div>
                  ) : (
                    <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                      {/* Total Tasks Pill */}
                      <div style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        padding: "10px 14px",
                        background: "#edf2f8",
                        borderRadius: "14px",
                        boxShadow: "-3px -3px 8px #ffffff, 3px 3px 8px #b8c6d9",
                        border: "1px solid rgba(255, 255, 255, 0.85)"
                      }}>
                        <span style={{ fontWeight: 700, color: "#64748b", fontSize: "0.85rem" }}>Total Tasks</span>
                        <span style={{
                          fontWeight: 900,
                          color: "#4f46e5",
                          background: "rgba(99, 102, 241, 0.12)",
                          padding: "3px 10px",
                          borderRadius: "8px",
                          fontSize: "0.9rem"
                        }}>{histStats.total}</span>
                      </div>

                      {/* Completed Pill */}
                      <div style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        padding: "10px 14px",
                        background: "#edf2f8",
                        borderRadius: "14px",
                        boxShadow: "-3px -3px 8px #ffffff, 3px 3px 8px #b8c6d9",
                        border: "1px solid rgba(255, 255, 255, 0.85)"
                      }}>
                        <span style={{ fontWeight: 700, color: "#059669", fontSize: "0.85rem" }}>Completed</span>
                        <span style={{
                          fontWeight: 900,
                          color: "#10b981",
                          background: "rgba(16, 185, 129, 0.12)",
                          padding: "3px 10px",
                          borderRadius: "8px",
                          fontSize: "0.9rem"
                        }}>{histStats.completed}</span>
                      </div>

                      {/* Pending Pill */}
                      <div style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        padding: "10px 14px",
                        background: "#edf2f8",
                        borderRadius: "14px",
                        boxShadow: "-3px -3px 8px #ffffff, 3px 3px 8px #b8c6d9",
                        border: "1px solid rgba(255, 255, 255, 0.85)"
                      }}>
                        <span style={{ fontWeight: 700, color: "#d97706", fontSize: "0.85rem" }}>Pending</span>
                        <span style={{
                          fontWeight: 900,
                          color: "#f59e0b",
                          background: "rgba(245, 158, 11, 0.12)",
                          padding: "3px 10px",
                          borderRadius: "8px",
                          fontSize: "0.9rem"
                        }}>{histStats.pending}</span>
                      </div>

                      {/* Overdue Pill */}
                      <div style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        padding: "10px 14px",
                        background: "#edf2f8",
                        borderRadius: "14px",
                        boxShadow: "-3px -3px 8px #ffffff, 3px 3px 8px #b8c6d9",
                        border: "1px solid rgba(255, 255, 255, 0.85)"
                      }}>
                        <span style={{ fontWeight: 700, color: "#dc2626", fontSize: "0.85rem" }}>Overdue</span>
                        <span style={{
                          fontWeight: 900,
                          color: "#ef4444",
                          background: "rgba(239, 68, 68, 0.12)",
                          padding: "3px 10px",
                          borderRadius: "8px",
                          fontSize: "0.9rem"
                        }}>{histStats.overdue}</span>
                      </div>

                      {/* Recessed Bottom Completion Banner */}
                      <div style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        marginTop: "4px",
                        padding: "12px 16px",
                        background: "#edf2f8",
                        borderRadius: "16px",
                        boxShadow: "inset -3px -3px 7px #ffffff, inset 3px 3px 7px #b8c6d9",
                        border: "1px solid rgba(255, 255, 255, 0.7)"
                      }}>
                        <span style={{ fontWeight: 800, color: "#1e293b", fontSize: "0.9rem" }}>Completion</span>
                        <span style={{
                          fontWeight: 900,
                          background: "linear-gradient(135deg, #d946ef 0%, #6366f1 100%)",
                          WebkitBackgroundClip: "text",
                          WebkitTextFillColor: "transparent",
                          fontSize: "1.3rem"
                        }}>{histStats.completionPct}%</span>
                      </div>
                    </div>
                  )}
                </div></DraggableCard>;
              case 'right-insights': return <DraggableCard id="right-insights" key="right-insights">{/* 2-Layer 3D Stacked Glass Card (Matching Image 100%) */}
                <div className="purple-stats-3d-wrapper">
                  {/* Base 3D Extruded Container */}
                  <div className="purple-stats-base">
                    <span className="purple-stats-time">{format(new Date(), "HH:mm")}</span>
                  </div>

                  {/* Floating 3D Translucent Glass Top Card */}
                  <div className="purple-stats-glass-card">
                    <div className="purple-stats-header">
                      <span className="purple-stats-title">Performance Insights</span>
                    </div>

                    <div className="purple-stats-body">
                      {/* Row 1: Best Performing Day */}
                      <div className="purple-stat-row">
                        <div className="purple-icon-badge badge-lime">
                          <IcoStar size={16} />
                        </div>
                        <span className="purple-stat-label">Best Performing Day</span>
                        <span className="purple-stat-val">{insights.bestDay}</span>
                      </div>

                      {/* Row 2: Current Streak */}
                      <div className="purple-stat-row">
                        <div className="purple-icon-badge badge-pink">
                          <IcoFire size={16} />
                        </div>
                        <span className="purple-stat-label">Current Streak</span>
                        <span className="purple-stat-val">{insights.streak} Days</span>
                      </div>

                      {/* Row 3: Highest Completion % */}
                      <div className="purple-stat-row">
                        <div className="purple-icon-badge badge-orange">
                          <IcoTarget size={16} />
                        </div>
                        <span className="purple-stat-label">Highest Completion %</span>
                        <span className="purple-stat-val">{insights.highestPct}%</span>
                      </div>

                      {/* Row 4: Avg Daily Completion */}
                      <div className="purple-stat-row">
                        <div className="purple-icon-badge badge-violet">
                          <IcoZap size={16} />
                        </div>
                        <span className="purple-stat-label">Avg Daily Completion</span>
                        <span className="purple-stat-val">{insights.avgDaily} Tasks</span>
                      </div>

                      {/* Row 5: Weekly Trend */}
                      <div className="purple-stat-row">
                        <div className="purple-icon-badge badge-cyan">
                          {insights.trendDiff >= 0 ? <IcoTrendingUp size={16} /> : <IcoTrendingDown size={16} />}
                        </div>
                        <span className="purple-stat-label">Weekly Trend</span>
                        <span className="purple-stat-val" style={{ color: insights.trendDiff >= 0 ? "#4ade80" : "#f87171" }}>
                          {insights.trendDiff > 0 ? "+" : ""}{insights.trendDiff}%
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </DraggableCard>;
              default: return null;
            }
          };

          return (
            <div className="wpt-main-grid-container">
              {/* ── Top Summary Cards Grid (Shown only in grid mode) ── */}
              {summaryViewMode === "grid" && (
                <div className="wpt-summary-grid" style={{ gridColumn: "1 / -1", width: "100%" }}>
                  {layout.filter(id => id.startsWith('sum-')).map(renderWidget)}
                </div>
              )}

              {/* ══════════════ LEFT MAIN COLUMN (Wide ~70%) ══════════════ */}
              <div className="wpt-left-column">
                {/* 1. Top Hero Row: Stacked Cards Deck + Today Progress */}
                <div className="wpt-top-hero-row">
                  {summaryViewMode === "stacked" && (
                    <div style={{ width: "290px", flexShrink: 0 }}>
                      <StackedCardsDeck summaryStats={summaryStats} />
                    </div>
                  )}
                  <div style={{ minWidth: 0 }}>
                    {renderWidget('left-daily')}
                  </div>
                </div>

                {/* 2. Middle Card: Last 7 Days Progress */}
                <div style={{ width: "100%" }}>
                  {renderWidget('left-weekly')}
                </div>

                {/* 3. Bottom Row: Weekly Performance Trend + Status Distribution */}
                <div className="wpt-bottom-charts-row">
                  <div style={{ minWidth: 0 }}>
                    {renderWidget('chart-weekly')}
                  </div>
                  <div style={{ minWidth: 0 }}>
                    {renderWidget('chart-status')}
                  </div>
                </div>
              </div>

              {/* ══════════════ RIGHT MAIN COLUMN (Narrow ~30%) ══════════════ */}
              <div className="wpt-right-column">
                {/* 1. Performance Insights (Purple Glass Card) */}
                <div style={{ width: "100%" }}>
                  {renderWidget('right-insights')}
                </div>

                {/* 2. View Previous Progress */}
                <div style={{ width: "100%" }}>
                  {renderWidget('right-previous')}
                </div>
              </div>
            </div>
          );
        }}
      </DraggableGrid>
    </div>
  );
}
