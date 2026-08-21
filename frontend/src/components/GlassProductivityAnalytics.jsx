import { useState, useMemo, useEffect } from 'react';
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
} from 'recharts';
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
} from 'date-fns';
import { useTasks } from '../context/TaskContext';
import { getAnalytics } from "../api/authApi";
import "../dashboard.css";
import "./glassOverrides.css";
import ProductivityHeatmap from "./ProductivityHeatmap";

const renderCustomizedLabel = (props) => {
  const { x, y, width, height, value } = props;

  if (!value || value === 0 || height < 12) return null;

  return (
    <text
      x={x + width / 2}
      y={y + height / 2}
      fill="#ffffff"
      textAnchor="middle"
      dominantBaseline="central"
      fontSize={11}
      fontWeight="bold"
    >
      {value}
    </text>
  );
};

// Custom Floating Neumorphic Tooltip (Matching Image 1 Neumorphic aesthetic)
const CustomNeumorphicTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div style={{
        background: 'rgba(255, 255, 255, 0.1)',
        borderRadius: '16px',
        padding: '12px 18px',
        boxShadow: 'none',
        border: '1px solid rgba(255, 255, 255, 0.9)',
        color: '#fff',
        minWidth: '170px'
      }}>
        <div style={{ fontSize: '0.82rem', fontWeight: 800, color: '#fff', borderBottom: '1px solid rgba(203, 213, 225, 0.6)', paddingBottom: '6px', marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span>⚡</span> {label}
        </div>
        {payload.map((entry, index) => {
          if (entry.value === undefined || entry.value === null) return null;
          return (
            <div key={`item-${index}`} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.76rem', fontWeight: 700, margin: '3px 0' }}>
              <span style={{ color: entry.fill === 'url(#purpleGradient)' ? '#a855f7' : (entry.color || '#64748b'), display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: entry.fill === 'url(#purpleGradient)' ? '#d946ef' : (entry.color || '#6366f1'), display: 'inline-block' }} />
                {entry.name || 'Total Tasks'}:
              </span>
              <span style={{ color: '#0f172a', fontWeight: 900, background: 'rgba(255, 255, 255, 0.6)', padding: '1px 6px', borderRadius: '6px' }}>{entry.value}</span>
            </div>
          );
        })}
      </div>
    );
  }
  return null;
};

export default function GlassProductivityAnalytics() {
  // Glass styling applied via wrapper
  const [mode, setMode] = useState('Weekly');
  const [anchorDate, setAnchorDate] = useState(new Date());
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

    return due < new Date();
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


    const today = new Date();

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);


    const tomorrowStart = new Date(todayStart);
    tomorrowStart.setDate(todayStart.getDate() + 1);


    // future date (tomorrow or later)
    return due >= tomorrowStart;
  };
  const getSelectedRange = () => {
    if (mode === "Weekly") {
      return {
        start: subDays(anchorDate, 6),
        end: anchorDate,
      };
    }

    if (mode === "ThisMonth") {
      return {
        start: startOfMonth(new Date()),
        end: new Date(),
      };
    }

    return {
      start: startOfMonth(anchorDate),
      end: endOfMonth(anchorDate),
    };
  };
  const { start, end } = getSelectedRange();
  const isDateBetween = (date, start, end) => {
    const d = new Date(date);

    d.setHours(0, 0, 0, 0);

    const s = new Date(start);
    s.setHours(0, 0, 0, 0);

    const e = new Date(end);
    e.setHours(23, 59, 59, 999);

    return d >= s && d <= e;
  };

  const { tasks, history } = useTasks();
  const [analytics, setAnalytics] = useState([]);
  const [chartStyle, setChartStyle] = useState('gradient'); // 'gradient' (Image 1 Style) or 'stacked'

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

  // Modes:
  // Weekly       = Last 7 Days
  // ThisMonth    = Current month only
  // PreviousMonth = Previous and older months with arrow navigation

  const latestAllowedPreviousMonth = useMemo(
    () => subMonths(startOfMonth(new Date()), 1),
    []
  );


  const dateRange = useMemo(() => {
    return eachDayOfInterval({
      start,
      end,
    });
  }, [start, end]);


  const getStatsForDate = (dateObj) => {
    const dateStr = format(dateObj, 'yyyy-MM-dd');

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
      const isCompletedOnDay =
        task.status === "Completed" &&
        compDate &&
        format(new Date(compDate), "yyyy-MM-dd") === dateStr;

      const isPendingOnDay =
        !isTaskOverdue(task) &&
        !isTaskIncoming(task) &&
        task.status !== "Completed" &&
        taskDueStr === dateStr;

      const isIncomingOnDay =
        isTaskIncoming(task) &&
        taskDueStr === dateStr;

      const isOverdueOnDay =
        isTaskOverdue(task) &&
        taskDueStr === dateStr;

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

      const wasRescheduledOnDate =
        task.rescheduleHistory?.some(item =>
          item.rescheduledAt &&
          format(
            new Date(item.rescheduledAt),
            "yyyy-MM-dd"
          ) === dateStr
        );

      if (wasRescheduledOnDate) {
        rescheduledCount += 1;
      }
    });

    const totalCount =
      completedCount +
      pendingCount +
      incomingCount +
      overdueCount;

    return {
      date: format(
        dateObj,
        mode === 'Weekly' ? 'EEE, MMM d' : 'MMM d'
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

      const start = dateRange[0];
      const end = dateRange[dateRange.length - 1];

      let completed = 0;
      let pending = 0;
      let incoming = 0;
      let overdue = 0;
      let rescheduled = 0;

      analytics.forEach(task => {

        if (
          task.status === "Completed" &&
          task.completedAt &&
          isDateBetween(task.completedAt, start, end)
        ) {
          completed++;
        }

        if (
          task.status === "Pending" &&
          isDateBetween(task.dueDate, start, end)
        ) {
          pending++;
        }

        if (
          isTaskIncoming(task) &&
          isDateBetween(task.dueDate, start, end)
        ) {
          incoming++;
        }

        if (
          isTaskOverdue(task) &&
          isDateBetween(task.dueDate, start, end)
        ) {
          overdue++;
        }

        if (
          task.rescheduleHistory?.some(r =>
            isDateBetween(r.rescheduledAt, start, end)
          )
        ) {
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
        total:
          completed +
          pending +
          incoming +
          overdue
      }];
    }

    const weeklyAggregate = [];

    let currentWeek = {
      date: '',
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
      const startsNewWeek =
        index === 0 || currentDate.getDay() === 1;

      if (startsNewWeek && currentWeek.count > 0) {
        currentWeek.date = `Week ${weeklyAggregate.length + 1}`;
        weeklyAggregate.push(currentWeek);

        currentWeek = {
          date: '',
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

    let start;
    let end;

    if (mode === "Weekly") {
      start = subDays(anchorDate, 6);
      end = anchorDate;
    }
    else if (mode === "ThisMonth") {
      start = startOfMonth(new Date());
      end = new Date();
    } else if (mode === "PreviousMonth") {

      start = startOfMonth(anchorDate);
      end = endOfMonth(anchorDate);

    } else {
      start = startOfMonth(anchorDate);
      end = endOfMonth(anchorDate);
    }

    let completed = 0;
    let pending = 0;
    let incoming = 0;
    let overdue = 0;
    let rescheduled = 0;

    analytics.forEach(task => {

      if (
        task.status === "Completed" &&
        task.completedAt &&
        isDateBetween(task.completedAt, start, end)
      ) {
        completed++;
      }

      if (
        task.status === "Pending" &&
        isDateBetween(task.dueDate, start, end)
      ) {
        pending++;
      }

      if (
        isTaskIncoming(task) &&
        isDateBetween(task.dueDate, start, end)
      ) {
        incoming++;
      }

      if (
        isTaskOverdue(task) &&
        (isDateBetween(task.dueDate, start, end) || (new Date(task.dueDate) < start && isDateBetween(new Date(), start, end)))
      ) {
        overdue++;
      }

      if (
        task.rescheduleHistory?.some(item =>
          isDateBetween(item.rescheduledAt, start, end)
        )
      ) {
        rescheduled++;
      }

    });
    return {

      completed,
      pending,
      incoming,
      overdue,
      rescheduled,

      total:
        completed +
        pending +
        incoming +
        overdue

    };

  }, [analytics, mode, anchorDate]);

  const aggregateCompPct =
    summary.total > 0
      ? Math.round((summary.completed / summary.total) * 100)
      : 0;

  const maxStat = useMemo(() => {
    if (!chartData || chartData.length === 0) return 0;

    return Math.max(
      ...chartData.map(
        (item) =>
          (item.completed || 0) +
          (item.pending || 0) +
          (item.overdue || 0) +
          item.incoming +
          (item.rescheduled || 0)
      )
    );
  }, [chartData]);

  const yDomain = maxStat === 0 ? [0, 5] : [0, 'auto'];

  const handlePrev = () => {
    if (mode === 'Weekly') {
      setAnchorDate((previousDate) =>
        subDays(previousDate, 7)
      );
      return;
    }

    if (mode === 'PreviousMonth') {
      setAnchorDate((previousDate) =>
        subMonths(previousDate, 1)
      );
    }
  };

  const handleNext = () => {
    if (mode === 'Weekly') {
      const nextDate = addDays(anchorDate, 7);

      if (!isAfter(nextDate, new Date())) {
        setAnchorDate(nextDate);
      } else {
        setAnchorDate(new Date());
      }

      return;
    }

    if (mode === 'PreviousMonth') {
      const nextMonth = addMonths(anchorDate, 1);

      // Do not allow navigation into the current month.
      if (
        !isAfter(
          startOfMonth(nextMonth),
          startOfMonth(latestAllowedPreviousMonth)
        )
      ) {
        setAnchorDate(nextMonth);
      }
    }
  };

  const isNextDisabled = () => {
    if (mode === 'Weekly') {
      return (
        isToday(anchorDate) ||
        isAfter(anchorDate, new Date())
      );
    }

    if (mode === 'PreviousMonth') {
      return isSameMonth(
        anchorDate,
        latestAllowedPreviousMonth
      );
    }

    return true;
  };

  const applyFilter = (filterName) => {
    if (filterName === 'Last 7 Days') {
      setMode('Weekly');
      setAnchorDate(new Date());
      return;
    }

    if (filterName === 'This Month') {
      setMode('ThisMonth');
      setAnchorDate(new Date());
      return;
    }

    if (filterName === 'Previous Month') {
      setMode('PreviousMonth');
      setAnchorDate(latestAllowedPreviousMonth);
    }
  };

  const selectedRangeLabel = useMemo(() => {
    if (mode === 'ThisMonth') {
      return `${format(
        startOfMonth(new Date()),
        'MMM d, yyyy'
      )} - ${format(new Date(), 'MMM d, yyyy')}`;
    }

    if (mode === 'PreviousMonth') {
      return `${format(
        startOfMonth(anchorDate),
        'MMM d, yyyy'
      )} - ${format(
        endOfMonth(anchorDate),
        'MMM d, yyyy'
      )}`;
    }

    return `${format(
      dateRange[0],
      'MMM d, yyyy'
    )} - ${format(
      dateRange[dateRange.length - 1],
      'MMM d, yyyy'
    )}`;
  }, [mode, anchorDate, dateRange]);

  return (
    <div className="force-glass left-panel-content" style={{ width: "100%", height: "100%" }}>
      <div className="pa-container">
        <div className="pa-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <h2>Productivity Analytics</h2>
            <p>
              Deep dive into your historical performance and task trends.
            </p>
          </div>

          {/* View Style Switcher: Image 1 Vibrant Gradient vs Status Stacked */}
          <div style={{ display: 'flex', background: 'rgba(255, 255, 255, 0.1)', padding: '4px', borderRadius: '12px', boxShadow: 'none' }}>
            <button
              type="button"
              onClick={() => setChartStyle('gradient')}
              style={{
                padding: '5px 12px',
                fontSize: '0.72rem',
                fontWeight: 800,
                borderRadius: '8px',
                border: 'none',
                cursor: 'pointer',
                background: chartStyle === 'gradient' ? 'linear-gradient(135deg, #d946ef 0%, #3b82f6 100%)' : 'transparent',
                color: chartStyle === 'gradient' ? '#ffffff' : '#64748b',
                boxShadow: chartStyle === 'gradient' ? '0 2px 8px rgba(217,70,239,0.3)' : 'none',
                transition: 'all 0.2s ease'
              }}
            >
              ✨ Vibrant Pill Bars
            </button>
            <button
              type="button"
              onClick={() => setChartStyle('stacked')}
              style={{
                padding: '5px 12px',
                fontSize: '0.72rem',
                fontWeight: 800,
                borderRadius: '8px',
                border: 'none',
                cursor: 'pointer',
                background: chartStyle === 'stacked' ? 'linear-gradient(135deg, #d946ef 0%, #3b82f6 100%)' : 'transparent',
                color: chartStyle === 'stacked' ? '#ffffff' : '#64748b',
                boxShadow: chartStyle === 'stacked' ? '0 2px 8px rgba(217,70,239,0.3)' : 'none',
                transition: 'all 0.2s ease'
              }}
            >
              📊 Status Breakdown
            </button>
          </div>
        </div>


        {/* FILTER SECTION */}
        <div className="pa-card">
          <div className="pa-filters-stack">
            <div className="pa-quick-filters">
              <button
                type="button"
                onClick={() => applyFilter('Last 7 Days')}
                className={mode === 'Weekly' ? 'active' : ''}
              >
                Last 7 Days
              </button>

              <button
                type="button"
                onClick={() => applyFilter('This Month')}
                className={mode === 'ThisMonth' ? 'active' : ''}
              >
                This Month
              </button>

              <button
                type="button"
                onClick={() => applyFilter('Previous Month')}
                className={mode === 'PreviousMonth' ? 'active' : ''}
              >
                Previous Month
              </button>
            </div>

            <div className="pa-nav-group">
              {mode === 'ThisMonth' ? (
                <span className="pa-date-range">
                  {selectedRangeLabel}
                </span>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={handlePrev}
                    className="pa-nav-btn"
                    aria-label={
                      mode === 'Weekly'
                        ? 'View previous seven days'
                        : 'View previous month'
                    }
                    title="Previous Period"
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      width: '36px',
                      height: '36px',
                      borderRadius: '12px',
                      border: '1px solid rgba(0, 0, 0, 0.12)',
                      background: 'rgba(255, 255, 255, 0.1)',
                      boxShadow: 'none',
                      color: '#000000',
                      fontSize: '1.5rem',
                      fontWeight: '900',
                      lineHeight: '1',
                      cursor: 'pointer',
                      userSelect: 'none'
                    }}
                  >
                    ‹
                  </button>

                  <span className="pa-date-range">
                    {selectedRangeLabel}
                  </span>

                  <button
                    type="button"
                    onClick={handleNext}
                    disabled={isNextDisabled()}
                    className="pa-nav-btn"
                    aria-label={
                      mode === 'Weekly'
                        ? 'View next seven days'
                        : 'View next month'
                    }
                    title="Next Period"
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      width: '36px',
                      height: '36px',
                      borderRadius: '12px',
                      border: '1px solid rgba(0, 0, 0, 0.12)',
                      background: 'rgba(255, 255, 255, 0.1)',
                      boxShadow: isNextDisabled() ? 'none' : '-4px -4px 10px #ffffff, 4px 4px 10px #b8c6d9',
                      color: isNextDisabled() ? '#94a3b8' : '#000000',
                      fontSize: '1.5rem',
                      fontWeight: '900',
                      lineHeight: '1',
                      cursor: isNextDisabled() ? 'not-allowed' : 'pointer',
                      opacity: isNextDisabled() ? 0.35 : 1,
                      userSelect: 'none'
                    }}
                  >
                    ›
                  </button>
                </>
              )}
            </div>
          </div>
        </div>

        {/* AGGREGATE SUMMARY SECTION */}
        <div className="pa-card">
          <div className="pa-stats-grid">
            <div className="pa-stat-card total">
              <span className="pa-stat-val">
                {summary.total}
              </span>
              <span className="pa-stat-label">
                Total Work
              </span>
            </div>

            <div className="pa-stat-card completed">
              <span className="pa-stat-val">
                {summary.completed}
              </span>
              <span className="pa-stat-label">
                Completed
              </span>
            </div>

            <div className="pa-stat-card pending">
              <span className="pa-stat-val">
                {summary.pending}
              </span>
              <span className="pa-stat-label">
                Pending
              </span>
            </div>
            {mode === "ThisMonth" && (
              <div
                className="pa-stat-card incoming"
                style={{
                  background: "rgba(255, 255, 255, 0.1)",
                  boxShadow: 'none',
                  border: "1px solid rgba(255, 255, 255, 0.8)"
                }}
              >
                <span
                  className="pa-stat-val"
                  style={{ color: "#2563eb" }}
                >
                  {summary.incoming}
                </span>

                <span
                  className="pa-stat-label"
                  style={{ color: "#1d4ed8" }}
                >
                  Incoming
                </span>
              </div>
            )}
            <div className="pa-stat-card overdue">
              <span className="pa-stat-val">
                {summary.overdue}
              </span>
              <span className="pa-stat-label">
                Overdue
              </span>
            </div>

            <div className="pa-stat-card rescheduled">
              <span className="pa-stat-val">
                {summary.rescheduled}
              </span>
              <span className="pa-stat-label">
                Rescheduled
              </span>
            </div>

            <div className="pa-stat-card done">
              <span className="pa-stat-val">
                {aggregateCompPct}%
              </span>
              <span className="pa-stat-label">
                Done Rate
              </span>
            </div>
          </div>
        </div>

        {/* CHART SECTION - RECESSED NEUMORPHIC INSET CONTAINER (IMAGE 1 EXACT DESIGN) */}
        <div
          className="pa-card"
          style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            minHeight: 0
          }}
        >
          <div className="pa-chart-inset-container">
            <div className="pa-chart-wrapper">
              {summary.total === 0 &&
                summary.rescheduled === 0 && (
                  <div className="pa-empty-overlay">
                    <div className="pa-empty-msg">
                      No productivity data available for the selected period.
                    </div>
                  </div>
                )}

              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={chartData}
                  margin={{
                    top: 15,
                    right: 15,
                    left: -20,
                    bottom: 0
                  }}
                  barGap={8}
                >
                  <defs>
                    {/* Image 1 Signature Gradient: Magenta/Pink to Deep Royal Blue */}
                    <linearGradient id="purpleGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#e040fb" stopOpacity={1} />
                      <stop offset="45%" stopColor="#d946ef" stopOpacity={1} />
                      <stop offset="100%" stopColor="#3b82f6" stopOpacity={1} />
                    </linearGradient>

                    {/* Status Specific Gradients with Pill Glow */}
                    <linearGradient id="completedGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#34d399" stopOpacity={1} />
                      <stop offset="100%" stopColor="#059669" stopOpacity={1} />
                    </linearGradient>

                    <linearGradient id="overdueGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#f87171" stopOpacity={1} />
                      <stop offset="100%" stopColor="#dc2626" stopOpacity={1} />
                    </linearGradient>

                    <linearGradient id="pendingGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#fbbf24" stopOpacity={1} />
                      <stop offset="100%" stopColor="#d97706" stopOpacity={1} />
                    </linearGradient>

                    <linearGradient id="rescheduledGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#60a5fa" stopOpacity={1} />
                      <stop offset="100%" stopColor="#2563eb" stopOpacity={1} />
                    </linearGradient>

                    <linearGradient id="incomingGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#c084fc" stopOpacity={1} />
                      <stop offset="100%" stopColor="#7e22ce" stopOpacity={1} />
                    </linearGradient>
                  </defs>

                  <CartesianGrid
                    strokeDasharray="4 4"
                    vertical={false}
                    stroke="#cbd5e1"
                    strokeOpacity={0.6}
                  />

                  <XAxis
                    dataKey="date"
                    tick={{
                      fontSize: 11,
                      fill: '#64748b',
                      fontWeight: 700
                    }}
                    tickMargin={10}
                    axisLine={false}
                    tickLine={false}
                  />

                  <YAxis
                    tick={{
                      fontSize: 11,
                      fill: '#64748b',
                      fontWeight: 700
                    }}
                    axisLine={false}
                    tickLine={false}
                    allowDecimals={false}
                    domain={yDomain}
                  />

                  <Tooltip
                    cursor={{ fill: 'rgba(217, 70, 239, 0.05)', rx: 12 }}
                    content={<CustomNeumorphicTooltip />}
                  />

                  <Legend
                    wrapperStyle={{
                      fontSize: '12px',
                      fontWeight: 700,
                      paddingTop: '16px'
                    }}
                  />

                  {chartStyle === 'gradient' ? (
                    /* IMAGE 1 VIBRANT GRADIENT PILL BARS (EXACT LOOK OF IMAGE 1) */
                    <Bar
                      dataKey="total"
                      name="Activity Level"
                      fill="url(#purpleGradient)"
                      radius={[16, 16, 16, 16]}
                      maxBarSize={28}
                      style={{ filter: "drop-shadow(0px 4px 8px rgba(217, 70, 239, 0.35))" }}
                    >
                      <LabelList
                        dataKey="total"
                        content={renderCustomizedLabel}
                      />
                    </Bar>
                  ) : (
                    /* STACKED STATUS BREAKDOWN BARS */
                    <>
                      <Bar
                        dataKey="overdue"
                        name="Overdue"
                        stackId="a"
                        fill="url(#overdueGradient)"
                        radius={[10, 10, 10, 10]}
                        maxBarSize={24}
                      >
                        <LabelList
                          dataKey="overdue"
                          content={renderCustomizedLabel}
                        />
                      </Bar>
                      {mode === "ThisMonth" && (
                        <Bar
                          dataKey="incoming"
                          name="Incoming"
                          stackId="a"
                          fill="url(#incomingGradient)"
                          radius={[10, 10, 10, 10]}
                          maxBarSize={24}
                        >
                          <LabelList
                            dataKey="incoming"
                            content={renderCustomizedLabel}
                          />
                        </Bar>
                      )}
                      <Bar
                        dataKey="pending"
                        name="Pending"
                        stackId="a"
                        fill="url(#pendingGradient)"
                        radius={[10, 10, 10, 10]}
                        maxBarSize={24}
                      >
                        <LabelList
                          dataKey="pending"
                          content={renderCustomizedLabel}
                        />
                      </Bar>

                      <Bar
                        dataKey="completed"
                        name="Completed"
                        stackId="a"
                        fill="url(#completedGradient)"
                        radius={[10, 10, 10, 10]}
                        maxBarSize={24}
                      >
                        <LabelList
                          dataKey="completed"
                          content={renderCustomizedLabel}
                        />
                      </Bar>

                      <Bar
                        dataKey="rescheduled"
                        name="Rescheduled"
                        fill="url(#rescheduledGradient)"
                        radius={[10, 10, 10, 10]}
                        maxBarSize={24}
                      >
                        <LabelList
                          dataKey="rescheduled"
                          content={renderCustomizedLabel}
                        />
                      </Bar>
                    </>
                  )}
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
        <div style={{ marginTop: '16px' }}>
          <ProductivityHeatmap tasks={tasks} />
        </div>
      </div>
    </div>
  );
}