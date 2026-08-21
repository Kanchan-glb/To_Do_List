import { useState, useMemo, useEffect } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  LabelList
} from "recharts";
import {
  format,
  subDays,
  addDays,
  subMonths,
  addMonths,
  eachDayOfInterval,
  startOfMonth,
  endOfMonth,
  isAfter,
  isToday,
  isSameMonth,
  parseISO
} from "date-fns";
import { useTasks } from "../context/TaskContext";
import { getAnalytics } from "../api/authApi";
import "../dashboard.css";
import "./glassOverrides.css";
import ProductivityHeatmap from "./ProductivityHeatmap";
const renderCustomizedLabel = (props) => {
  const { x, y, width, height, value } = props;
  if (!value || value === 0 || height < 12) return null;
  return /* @__PURE__ */ React.createElement(
    "text",
    {
      x: x + width / 2,
      y: y + height / 2,
      fill: "#ffffff",
      textAnchor: "middle",
      dominantBaseline: "central",
      fontSize: 11,
      fontWeight: "bold"
    },
    value
  );
};
const CustomNeumorphicTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return /* @__PURE__ */ React.createElement("div", { style: {
      background: "rgba(255, 255, 255, 0.1)",
      borderRadius: "16px",
      padding: "12px 18px",
      boxShadow: "none",
      border: "1px solid rgba(255, 255, 255, 0.9)",
      color: "#fff",
      minWidth: "170px"
    } }, /* @__PURE__ */ React.createElement("div", { style: { fontSize: "0.82rem", fontWeight: 800, color: "#fff", borderBottom: "1px solid rgba(203, 213, 225, 0.6)", paddingBottom: "6px", marginBottom: "6px", display: "flex", alignItems: "center", gap: "6px" } }, /* @__PURE__ */ React.createElement("span", null, "\u26A1"), " ", label), payload.map((entry, index) => {
      if (entry.value === void 0 || entry.value === null) return null;
      return /* @__PURE__ */ React.createElement("div", { key: `item-${index}`, style: { display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "0.76rem", fontWeight: 700, margin: "3px 0" } }, /* @__PURE__ */ React.createElement("span", { style: { color: entry.fill === "url(#purpleGradient)" ? "#a855f7" : entry.color || "#64748b", display: "flex", alignItems: "center", gap: "6px" } }, /* @__PURE__ */ React.createElement("span", { style: { width: "8px", height: "8px", borderRadius: "50%", background: entry.fill === "url(#purpleGradient)" ? "#d946ef" : entry.color || "#6366f1", display: "inline-block" } }), entry.name || "Total Tasks", ":"), /* @__PURE__ */ React.createElement("span", { style: { color: "#0f172a", fontWeight: 900, background: "rgba(255, 255, 255, 0.6)", padding: "1px 6px", borderRadius: "6px" } }, entry.value));
    }));
  }
  return null;
};
export default function GlassProductivityAnalytics() {
  const [mode, setMode] = useState("Weekly");
  const [anchorDate, setAnchorDate] = useState(/* @__PURE__ */ new Date());
  const isTaskOverdue = (task) => {
    if (task.status === "Completed") {
      return false;
    }
    if (!task.dueDate) {
      return false;
    }
    const due = new Date(task.dueDate);
    if (task.dueTime) {
      const [hours, minutes] = task.dueTime.split(":");
      due.setHours(
        Number(hours),
        Number(minutes),
        0,
        0
      );
    } else {
      due.setHours(
        23,
        59,
        59,
        999
      );
    }
    return due < /* @__PURE__ */ new Date();
  };
  const isTaskIncoming = (task) => {
    if (task.status === "Completed") {
      return false;
    }
    if (!task.dueDate) {
      return false;
    }
    const due = new Date(task.dueDate);
    if (task.dueTime) {
      const [hours, minutes] = task.dueTime.split(":");
      due.setHours(
        Number(hours),
        Number(minutes),
        0,
        0
      );
    } else {
      due.setHours(
        23,
        59,
        59,
        999
      );
    }
    const today = /* @__PURE__ */ new Date();
    const todayStart = /* @__PURE__ */ new Date();
    todayStart.setHours(0, 0, 0, 0);
    const tomorrowStart = new Date(todayStart);
    tomorrowStart.setDate(todayStart.getDate() + 1);
    return due >= tomorrowStart;
  };
  const getSelectedRange = () => {
    if (mode === "Weekly") {
      return {
        start: subDays(anchorDate, 6),
        end: anchorDate
      };
    }
    if (mode === "ThisMonth") {
      return {
        start: startOfMonth(/* @__PURE__ */ new Date()),
        end: /* @__PURE__ */ new Date()
      };
    }
    return {
      start: startOfMonth(anchorDate),
      end: endOfMonth(anchorDate)
    };
  };
  const { start, end } = getSelectedRange();
  const isDateBetween = (date, start2, end2) => {
    const d = new Date(date);
    d.setHours(0, 0, 0, 0);
    const s = new Date(start2);
    s.setHours(0, 0, 0, 0);
    const e = new Date(end2);
    e.setHours(23, 59, 59, 999);
    return d >= s && d <= e;
  };
  const { tasks, history } = useTasks();
  const [analytics, setAnalytics] = useState([]);
  const [chartStyle, setChartStyle] = useState("gradient");
  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        const res = await getAnalytics();
        if (res.data && res.data.tasks) {
          setAnalytics(res.data.tasks);
        } else {
          setAnalytics(tasks);
        }
      } catch (err) {
        console.error("Error fetching analytics:", err);
        setAnalytics(tasks);
      }
    };
    fetchAnalytics();
  }, [mode, anchorDate]);
  const latestAllowedPreviousMonth = useMemo(
    () => subMonths(startOfMonth(/* @__PURE__ */ new Date()), 1),
    []
  );
  const dateRange = useMemo(() => {
    return eachDayOfInterval({
      start,
      end
    });
  }, [start, end]);
  const getStatsForDate = (dateObj) => {
    const dateStr = format(dateObj, "yyyy-MM-dd");
    let completedCount = 0;
    let pendingCount = 0;
    let overdueCount = 0;
    let rescheduledCount = 0;
    let incomingCount = 0;
    analytics.forEach((task) => {
      if (!task.dueDate) return;
      const taskDueStr = format(
        new Date(task.dueDate),
        "yyyy-MM-dd"
      );
      const compDate = task.completedAt || task.updatedAt;
      const isCompletedOnDay = task.status === "Completed" && compDate && format(new Date(compDate), "yyyy-MM-dd") === dateStr;
      const isPendingOnDay = !isTaskOverdue(task) && !isTaskIncoming(task) && task.status !== "Completed" && taskDueStr === dateStr;
      const isIncomingOnDay = isTaskIncoming(task) && taskDueStr === dateStr;
      const isOverdueOnDay = isTaskOverdue(task) && taskDueStr === dateStr;
      if (isCompletedOnDay) {
        completedCount++;
      }
      if (isPendingOnDay) {
        pendingCount++;
      }
      if (isIncomingOnDay) {
        incomingCount++;
      }
      if (isOverdueOnDay) {
        overdueCount++;
      }
      const wasRescheduledOnDate = task.rescheduleHistory?.some(
        (item) => item.rescheduledAt && format(
          new Date(item.rescheduledAt),
          "yyyy-MM-dd"
        ) === dateStr
      );
      if (wasRescheduledOnDate) {
        rescheduledCount += 1;
      }
    });
    const totalCount = completedCount + pendingCount + incomingCount + overdueCount;
    return {
      date: format(
        dateObj,
        mode === "Weekly" ? "EEE, MMM d" : "MMM d"
      ),
      fullDate: dateStr,
      completed: completedCount,
      incoming: incomingCount,
      pending: pendingCount,
      overdue: overdueCount,
      rescheduled: rescheduledCount,
      total: totalCount
    };
  };
  const chartData = useMemo(() => {
    const rawData = dateRange.map((date) => getStatsForDate(date));
    if (mode === "Weekly") {
      const start2 = dateRange[0];
      const end2 = dateRange[dateRange.length - 1];
      let completed = 0;
      let pending = 0;
      let incoming = 0;
      let overdue = 0;
      let rescheduled = 0;
      analytics.forEach((task) => {
        if (task.status === "Completed" && task.completedAt && isDateBetween(task.completedAt, start2, end2)) {
          completed++;
        }
        if (task.status === "Pending" && isDateBetween(task.dueDate, start2, end2)) {
          pending++;
        }
        if (isTaskIncoming(task) && isDateBetween(task.dueDate, start2, end2)) {
          incoming++;
        }
        if (isTaskOverdue(task) && isDateBetween(task.dueDate, start2, end2)) {
          overdue++;
        }
        if (task.rescheduleHistory?.some(
          (r) => isDateBetween(r.rescheduledAt, start2, end2)
        )) {
          rescheduled++;
        }
      });
      return [{
        date: "Last 7 Days",
        completed,
        pending,
        incoming,
        overdue,
        rescheduled,
        total: completed + pending + incoming + overdue
      }];
    }
    const weeklyAggregate = [];
    let currentWeek = {
      date: "",
      total: 0,
      completed: 0,
      pending: 0,
      incoming: 0,
      overdue: 0,
      rescheduled: 0,
      count: 0
    };
    rawData.forEach((day, index) => {
      const currentDate = parseISO(day.fullDate);
      const startsNewWeek = index === 0 || currentDate.getDay() === 1;
      if (startsNewWeek && currentWeek.count > 0) {
        currentWeek.date = `Week ${weeklyAggregate.length + 1}`;
        weeklyAggregate.push(currentWeek);
        currentWeek = {
          date: "",
          total: 0,
          completed: 0,
          pending: 0,
          incoming: 0,
          overdue: 0,
          rescheduled: 0,
          count: 0
        };
      }
      currentWeek.total += day.total;
      currentWeek.completed += day.completed;
      currentWeek.pending += day.pending;
      currentWeek.overdue += day.overdue;
      currentWeek.incoming += day.incoming;
      currentWeek.rescheduled += day.rescheduled;
      currentWeek.count += 1;
    });
    if (currentWeek.count > 0) {
      currentWeek.date = `Week ${weeklyAggregate.length + 1}`;
      weeklyAggregate.push(currentWeek);
    }
    return weeklyAggregate;
  }, [dateRange, analytics, history, mode]);
  const summary = useMemo(() => {
    let start2;
    let end2;
    if (mode === "Weekly") {
      start2 = subDays(anchorDate, 6);
      end2 = anchorDate;
    } else if (mode === "ThisMonth") {
      start2 = startOfMonth(/* @__PURE__ */ new Date());
      end2 = /* @__PURE__ */ new Date();
    } else if (mode === "PreviousMonth") {
      start2 = startOfMonth(anchorDate);
      end2 = endOfMonth(anchorDate);
    } else {
      start2 = startOfMonth(anchorDate);
      end2 = endOfMonth(anchorDate);
    }
    let completed = 0;
    let pending = 0;
    let incoming = 0;
    let overdue = 0;
    let rescheduled = 0;
    analytics.forEach((task) => {
      if (task.status === "Completed" && task.completedAt && isDateBetween(task.completedAt, start2, end2)) {
        completed++;
      }
      if (task.status === "Pending" && isDateBetween(task.dueDate, start2, end2)) {
        pending++;
      }
      if (isTaskIncoming(task) && isDateBetween(task.dueDate, start2, end2)) {
        incoming++;
      }
      if (isTaskOverdue(task) && (isDateBetween(task.dueDate, start2, end2) || new Date(task.dueDate) < start2 && isDateBetween(/* @__PURE__ */ new Date(), start2, end2))) {
        overdue++;
      }
      if (task.rescheduleHistory?.some(
        (item) => isDateBetween(item.rescheduledAt, start2, end2)
      )) {
        rescheduled++;
      }
    });
    return {
      completed,
      pending,
      incoming,
      overdue,
      rescheduled,
      total: completed + pending + incoming + overdue
    };
  }, [analytics, mode, anchorDate]);
  const aggregateCompPct = summary.total > 0 ? Math.round(summary.completed / summary.total * 100) : 0;
  const maxStat = useMemo(() => {
    if (!chartData || chartData.length === 0) return 0;
    return Math.max(
      ...chartData.map(
        (item) => (item.completed || 0) + (item.pending || 0) + (item.overdue || 0) + item.incoming + (item.rescheduled || 0)
      )
    );
  }, [chartData]);
  const yDomain = maxStat === 0 ? [0, 5] : [0, "auto"];
  const handlePrev = () => {
    if (mode === "Weekly") {
      setAnchorDate(
        (previousDate) => subDays(previousDate, 7)
      );
      return;
    }
    if (mode === "PreviousMonth") {
      setAnchorDate(
        (previousDate) => subMonths(previousDate, 1)
      );
    }
  };
  const handleNext = () => {
    if (mode === "Weekly") {
      const nextDate = addDays(anchorDate, 7);
      if (!isAfter(nextDate, /* @__PURE__ */ new Date())) {
        setAnchorDate(nextDate);
      } else {
        setAnchorDate(/* @__PURE__ */ new Date());
      }
      return;
    }
    if (mode === "PreviousMonth") {
      const nextMonth = addMonths(anchorDate, 1);
      if (!isAfter(
        startOfMonth(nextMonth),
        startOfMonth(latestAllowedPreviousMonth)
      )) {
        setAnchorDate(nextMonth);
      }
    }
  };
  const isNextDisabled = () => {
    if (mode === "Weekly") {
      return isToday(anchorDate) || isAfter(anchorDate, /* @__PURE__ */ new Date());
    }
    if (mode === "PreviousMonth") {
      return isSameMonth(
        anchorDate,
        latestAllowedPreviousMonth
      );
    }
    return true;
  };
  const applyFilter = (filterName) => {
    if (filterName === "Last 7 Days") {
      setMode("Weekly");
      setAnchorDate(/* @__PURE__ */ new Date());
      return;
    }
    if (filterName === "This Month") {
      setMode("ThisMonth");
      setAnchorDate(/* @__PURE__ */ new Date());
      return;
    }
    if (filterName === "Previous Month") {
      setMode("PreviousMonth");
      setAnchorDate(latestAllowedPreviousMonth);
    }
  };
  const selectedRangeLabel = useMemo(() => {
    if (mode === "ThisMonth") {
      return `${format(
        startOfMonth(/* @__PURE__ */ new Date()),
        "MMM d, yyyy"
      )} - ${format(/* @__PURE__ */ new Date(), "MMM d, yyyy")}`;
    }
    if (mode === "PreviousMonth") {
      return `${format(
        startOfMonth(anchorDate),
        "MMM d, yyyy"
      )} - ${format(
        endOfMonth(anchorDate),
        "MMM d, yyyy"
      )}`;
    }
    return `${format(
      dateRange[0],
      "MMM d, yyyy"
    )} - ${format(
      dateRange[dateRange.length - 1],
      "MMM d, yyyy"
    )}`;
  }, [mode, anchorDate, dateRange]);
  return /* @__PURE__ */ React.createElement("div", { className: "force-glass left-panel-content", style: { width: "100%", height: "100%" } }, /* @__PURE__ */ React.createElement("div", { className: "pa-container" }, /* @__PURE__ */ React.createElement("div", { className: "pa-header", style: { display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "12px" } }, /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("h2", null, "Productivity Analytics"), /* @__PURE__ */ React.createElement("p", null, "Deep dive into your historical performance and task trends.")), /* @__PURE__ */ React.createElement("div", { style: { display: "flex", background: "rgba(255, 255, 255, 0.1)", padding: "4px", borderRadius: "12px", boxShadow: "none" } }, /* @__PURE__ */ React.createElement(
    "button",
    {
      type: "button",
      onClick: () => setChartStyle("gradient"),
      style: {
        padding: "5px 12px",
        fontSize: "0.72rem",
        fontWeight: 800,
        borderRadius: "8px",
        border: "none",
        cursor: "pointer",
        background: chartStyle === "gradient" ? "linear-gradient(135deg, #d946ef 0%, #3b82f6 100%)" : "transparent",
        color: chartStyle === "gradient" ? "#ffffff" : "#64748b",
        boxShadow: chartStyle === "gradient" ? "0 2px 8px rgba(217,70,239,0.3)" : "none",
        transition: "all 0.2s ease"
      }
    },
    "\u2728 Vibrant Pill Bars"
  ), /* @__PURE__ */ React.createElement(
    "button",
    {
      type: "button",
      onClick: () => setChartStyle("stacked"),
      style: {
        padding: "5px 12px",
        fontSize: "0.72rem",
        fontWeight: 800,
        borderRadius: "8px",
        border: "none",
        cursor: "pointer",
        background: chartStyle === "stacked" ? "linear-gradient(135deg, #d946ef 0%, #3b82f6 100%)" : "transparent",
        color: chartStyle === "stacked" ? "#ffffff" : "#64748b",
        boxShadow: chartStyle === "stacked" ? "0 2px 8px rgba(217,70,239,0.3)" : "none",
        transition: "all 0.2s ease"
      }
    },
    "\u{1F4CA} Status Breakdown"
  ))), /* @__PURE__ */ React.createElement("div", { className: "pa-card" }, /* @__PURE__ */ React.createElement("div", { className: "pa-filters-stack" }, /* @__PURE__ */ React.createElement("div", { className: "pa-quick-filters" }, /* @__PURE__ */ React.createElement(
    "button",
    {
      type: "button",
      onClick: () => applyFilter("Last 7 Days"),
      className: mode === "Weekly" ? "active" : ""
    },
    "Last 7 Days"
  ), /* @__PURE__ */ React.createElement(
    "button",
    {
      type: "button",
      onClick: () => applyFilter("This Month"),
      className: mode === "ThisMonth" ? "active" : ""
    },
    "This Month"
  ), /* @__PURE__ */ React.createElement(
    "button",
    {
      type: "button",
      onClick: () => applyFilter("Previous Month"),
      className: mode === "PreviousMonth" ? "active" : ""
    },
    "Previous Month"
  )), /* @__PURE__ */ React.createElement("div", { className: "pa-nav-group" }, mode === "ThisMonth" ? /* @__PURE__ */ React.createElement("span", { className: "pa-date-range" }, selectedRangeLabel) : /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement(
    "button",
    {
      type: "button",
      onClick: handlePrev,
      className: "pa-nav-btn",
      "aria-label": mode === "Weekly" ? "View previous seven days" : "View previous month",
      title: "Previous Period",
      style: {
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        width: "36px",
        height: "36px",
        borderRadius: "12px",
        border: "1px solid rgba(0, 0, 0, 0.12)",
        background: "rgba(255, 255, 255, 0.1)",
        boxShadow: "none",
        color: "#000000",
        fontSize: "1.5rem",
        fontWeight: "900",
        lineHeight: "1",
        cursor: "pointer",
        userSelect: "none"
      }
    },
    "\u2039"
  ), /* @__PURE__ */ React.createElement("span", { className: "pa-date-range" }, selectedRangeLabel), /* @__PURE__ */ React.createElement(
    "button",
    {
      type: "button",
      onClick: handleNext,
      disabled: isNextDisabled(),
      className: "pa-nav-btn",
      "aria-label": mode === "Weekly" ? "View next seven days" : "View next month",
      title: "Next Period",
      style: {
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        width: "36px",
        height: "36px",
        borderRadius: "12px",
        border: "1px solid rgba(0, 0, 0, 0.12)",
        background: "rgba(255, 255, 255, 0.1)",
        boxShadow: isNextDisabled() ? "none" : "-4px -4px 10px #ffffff, 4px 4px 10px #b8c6d9",
        color: isNextDisabled() ? "#94a3b8" : "#000000",
        fontSize: "1.5rem",
        fontWeight: "900",
        lineHeight: "1",
        cursor: isNextDisabled() ? "not-allowed" : "pointer",
        opacity: isNextDisabled() ? 0.35 : 1,
        userSelect: "none"
      }
    },
    "\u203A"
  ))))), /* @__PURE__ */ React.createElement("div", { className: "pa-card" }, /* @__PURE__ */ React.createElement("div", { className: "pa-stats-grid" }, /* @__PURE__ */ React.createElement("div", { className: "pa-stat-card total" }, /* @__PURE__ */ React.createElement("span", { className: "pa-stat-val" }, summary.total), /* @__PURE__ */ React.createElement("span", { className: "pa-stat-label" }, "Total Work")), /* @__PURE__ */ React.createElement("div", { className: "pa-stat-card completed" }, /* @__PURE__ */ React.createElement("span", { className: "pa-stat-val" }, summary.completed), /* @__PURE__ */ React.createElement("span", { className: "pa-stat-label" }, "Completed")), /* @__PURE__ */ React.createElement("div", { className: "pa-stat-card pending" }, /* @__PURE__ */ React.createElement("span", { className: "pa-stat-val" }, summary.pending), /* @__PURE__ */ React.createElement("span", { className: "pa-stat-label" }, "Pending")), mode === "ThisMonth" && /* @__PURE__ */ React.createElement(
    "div",
    {
      className: "pa-stat-card incoming",
      style: {
        background: "rgba(255, 255, 255, 0.1)",
        boxShadow: "none",
        border: "1px solid rgba(255, 255, 255, 0.8)"
      }
    },
    /* @__PURE__ */ React.createElement(
      "span",
      {
        className: "pa-stat-val",
        style: { color: "#2563eb" }
      },
      summary.incoming
    ),
    /* @__PURE__ */ React.createElement(
      "span",
      {
        className: "pa-stat-label",
        style: { color: "#1d4ed8" }
      },
      "Incoming"
    )
  ), /* @__PURE__ */ React.createElement("div", { className: "pa-stat-card overdue" }, /* @__PURE__ */ React.createElement("span", { className: "pa-stat-val" }, summary.overdue), /* @__PURE__ */ React.createElement("span", { className: "pa-stat-label" }, "Overdue")), /* @__PURE__ */ React.createElement("div", { className: "pa-stat-card rescheduled" }, /* @__PURE__ */ React.createElement("span", { className: "pa-stat-val" }, summary.rescheduled), /* @__PURE__ */ React.createElement("span", { className: "pa-stat-label" }, "Rescheduled")), /* @__PURE__ */ React.createElement("div", { className: "pa-stat-card done" }, /* @__PURE__ */ React.createElement("span", { className: "pa-stat-val" }, aggregateCompPct, "%"), /* @__PURE__ */ React.createElement("span", { className: "pa-stat-label" }, "Done Rate")))), /* @__PURE__ */ React.createElement(
    "div",
    {
      className: "pa-card",
      style: {
        flex: 1,
        display: "flex",
        flexDirection: "column",
        minHeight: 0
      }
    },
    /* @__PURE__ */ React.createElement("div", { className: "pa-chart-inset-container" }, /* @__PURE__ */ React.createElement("div", { className: "pa-chart-wrapper" }, summary.total === 0 && summary.rescheduled === 0 && /* @__PURE__ */ React.createElement("div", { className: "pa-empty-overlay" }, /* @__PURE__ */ React.createElement("div", { className: "pa-empty-msg" }, "No productivity data available for the selected period.")), /* @__PURE__ */ React.createElement(ResponsiveContainer, { width: "100%", height: "100%" }, /* @__PURE__ */ React.createElement(
      BarChart,
      {
        data: chartData,
        margin: {
          top: 15,
          right: 15,
          left: -20,
          bottom: 0
        },
        barGap: 8
      },
      /* @__PURE__ */ React.createElement("defs", null, /* @__PURE__ */ React.createElement("linearGradient", { id: "purpleGradient", x1: "0", y1: "0", x2: "0", y2: "1" }, /* @__PURE__ */ React.createElement("stop", { offset: "0%", stopColor: "#e040fb", stopOpacity: 1 }), /* @__PURE__ */ React.createElement("stop", { offset: "45%", stopColor: "#d946ef", stopOpacity: 1 }), /* @__PURE__ */ React.createElement("stop", { offset: "100%", stopColor: "#3b82f6", stopOpacity: 1 })), /* @__PURE__ */ React.createElement("linearGradient", { id: "completedGradient", x1: "0", y1: "0", x2: "0", y2: "1" }, /* @__PURE__ */ React.createElement("stop", { offset: "0%", stopColor: "#34d399", stopOpacity: 1 }), /* @__PURE__ */ React.createElement("stop", { offset: "100%", stopColor: "#059669", stopOpacity: 1 })), /* @__PURE__ */ React.createElement("linearGradient", { id: "overdueGradient", x1: "0", y1: "0", x2: "0", y2: "1" }, /* @__PURE__ */ React.createElement("stop", { offset: "0%", stopColor: "#f87171", stopOpacity: 1 }), /* @__PURE__ */ React.createElement("stop", { offset: "100%", stopColor: "#dc2626", stopOpacity: 1 })), /* @__PURE__ */ React.createElement("linearGradient", { id: "pendingGradient", x1: "0", y1: "0", x2: "0", y2: "1" }, /* @__PURE__ */ React.createElement("stop", { offset: "0%", stopColor: "#fbbf24", stopOpacity: 1 }), /* @__PURE__ */ React.createElement("stop", { offset: "100%", stopColor: "#d97706", stopOpacity: 1 })), /* @__PURE__ */ React.createElement("linearGradient", { id: "rescheduledGradient", x1: "0", y1: "0", x2: "0", y2: "1" }, /* @__PURE__ */ React.createElement("stop", { offset: "0%", stopColor: "#60a5fa", stopOpacity: 1 }), /* @__PURE__ */ React.createElement("stop", { offset: "100%", stopColor: "#2563eb", stopOpacity: 1 })), /* @__PURE__ */ React.createElement("linearGradient", { id: "incomingGradient", x1: "0", y1: "0", x2: "0", y2: "1" }, /* @__PURE__ */ React.createElement("stop", { offset: "0%", stopColor: "#c084fc", stopOpacity: 1 }), /* @__PURE__ */ React.createElement("stop", { offset: "100%", stopColor: "#7e22ce", stopOpacity: 1 }))),
      /* @__PURE__ */ React.createElement(
        CartesianGrid,
        {
          strokeDasharray: "4 4",
          vertical: false,
          stroke: "#cbd5e1",
          strokeOpacity: 0.6
        }
      ),
      /* @__PURE__ */ React.createElement(
        XAxis,
        {
          dataKey: "date",
          tick: {
            fontSize: 11,
            fill: "#64748b",
            fontWeight: 700
          },
          tickMargin: 10,
          axisLine: false,
          tickLine: false
        }
      ),
      /* @__PURE__ */ React.createElement(
        YAxis,
        {
          tick: {
            fontSize: 11,
            fill: "#64748b",
            fontWeight: 700
          },
          axisLine: false,
          tickLine: false,
          allowDecimals: false,
          domain: yDomain
        }
      ),
      /* @__PURE__ */ React.createElement(
        Tooltip,
        {
          cursor: { fill: "rgba(217, 70, 239, 0.05)", rx: 12 },
          content: /* @__PURE__ */ React.createElement(CustomNeumorphicTooltip, null)
        }
      ),
      /* @__PURE__ */ React.createElement(
        Legend,
        {
          wrapperStyle: {
            fontSize: "12px",
            fontWeight: 700,
            paddingTop: "16px"
          }
        }
      ),
      chartStyle === "gradient" ? (
        /* IMAGE 1 VIBRANT GRADIENT PILL BARS (EXACT LOOK OF IMAGE 1) */
        /* @__PURE__ */ React.createElement(
          Bar,
          {
            dataKey: "total",
            name: "Activity Level",
            fill: "url(#purpleGradient)",
            radius: [16, 16, 16, 16],
            maxBarSize: 28,
            style: { filter: "drop-shadow(0px 4px 8px rgba(217, 70, 239, 0.35))" }
          },
          /* @__PURE__ */ React.createElement(
            LabelList,
            {
              dataKey: "total",
              content: renderCustomizedLabel
            }
          )
        )
      ) : (
        /* STACKED STATUS BREAKDOWN BARS */
        /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement(
          Bar,
          {
            dataKey: "overdue",
            name: "Overdue",
            stackId: "a",
            fill: "url(#overdueGradient)",
            radius: [10, 10, 10, 10],
            maxBarSize: 24
          },
          /* @__PURE__ */ React.createElement(
            LabelList,
            {
              dataKey: "overdue",
              content: renderCustomizedLabel
            }
          )
        ), mode === "ThisMonth" && /* @__PURE__ */ React.createElement(
          Bar,
          {
            dataKey: "incoming",
            name: "Incoming",
            stackId: "a",
            fill: "url(#incomingGradient)",
            radius: [10, 10, 10, 10],
            maxBarSize: 24
          },
          /* @__PURE__ */ React.createElement(
            LabelList,
            {
              dataKey: "incoming",
              content: renderCustomizedLabel
            }
          )
        ), /* @__PURE__ */ React.createElement(
          Bar,
          {
            dataKey: "pending",
            name: "Pending",
            stackId: "a",
            fill: "url(#pendingGradient)",
            radius: [10, 10, 10, 10],
            maxBarSize: 24
          },
          /* @__PURE__ */ React.createElement(
            LabelList,
            {
              dataKey: "pending",
              content: renderCustomizedLabel
            }
          )
        ), /* @__PURE__ */ React.createElement(
          Bar,
          {
            dataKey: "completed",
            name: "Completed",
            stackId: "a",
            fill: "url(#completedGradient)",
            radius: [10, 10, 10, 10],
            maxBarSize: 24
          },
          /* @__PURE__ */ React.createElement(
            LabelList,
            {
              dataKey: "completed",
              content: renderCustomizedLabel
            }
          )
        ), /* @__PURE__ */ React.createElement(
          Bar,
          {
            dataKey: "rescheduled",
            name: "Rescheduled",
            fill: "url(#rescheduledGradient)",
            radius: [10, 10, 10, 10],
            maxBarSize: 24
          },
          /* @__PURE__ */ React.createElement(
            LabelList,
            {
              dataKey: "rescheduled",
              content: renderCustomizedLabel
            }
          )
        ))
      )
    ))))
  ), /* @__PURE__ */ React.createElement("div", { style: { marginTop: "16px" } }, /* @__PURE__ */ React.createElement(ProductivityHeatmap, { tasks }))));
}
