import { useState, useMemo } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LabelList
} from 'recharts';
import {
  format, subDays, addDays, startOfWeek, endOfWeek, eachDayOfInterval,
  startOfMonth, endOfMonth, isAfter, isToday, parseISO
} from 'date-fns';
import { useTasks } from '../context/TaskContext';

const renderCustomizedLabel = (props) => {
  const { x, y, width, height, value } = props;
  if (!value || value === 0 || height < 12) return null;
  return (
    <text x={x + width / 2} y={y + height / 2} fill="#ffffff" textAnchor="middle" dominantBaseline="central" fontSize={11} fontWeight="bold">
      {value}
    </text>
  );
};

export default function ProductivityAnalytics() {
  const { tasks, history } = useTasks();

  const [mode, setMode] = useState('Weekly'); // 'Weekly', 'Monthly', 'Custom'
  const [anchorDate, setAnchorDate] = useState(new Date());
  const [customStart, setCustomStart] = useState(format(subDays(new Date(), 6), "yyyy-MM-dd"));
  const [customEnd, setCustomEnd] = useState(format(new Date(), "yyyy-MM-dd"));

  // Generate Date Range Array
  const dateRange = useMemo(() => {
    let start, end;

    if (mode === 'Weekly') {
      start = subDays(anchorDate, 6);
      end = anchorDate;
    } else if (mode === 'Monthly') {
      start = startOfMonth(anchorDate);
      end = endOfMonth(anchorDate);
      if (isAfter(end, new Date())) {
        end = new Date();
      }
    } else {
      start = parseISO(customStart);
      end = parseISO(customEnd);
      // Failsafe
      if (isNaN(start.getTime())) start = new Date();
      if (isNaN(end.getTime())) end = new Date();
    }

    try {
      return eachDayOfInterval({ start, end });
    } catch (e) {
      return [new Date()];
    }
  }, [mode, anchorDate, customStart, customEnd]);

  // Compute stats for a specific date (combines immutable history & retro-calculation fallback)
  const getStatsForDate = (dateObj) => {
    const dateStr = format(dateObj, "yyyy-MM-dd");
    const isTodayFlag = isToday(dateObj);

    if (!isTodayFlag) {
      const snapshot = history.find(h => h.type === 'daily' && h.date === dateStr);
      if (snapshot) {
        return {
          date: format(dateObj, mode === 'Monthly' ? "MMM d" : "EEE, MMM d"),
          fullDate: dateStr,
          completed: snapshot.completedCount || 0,
          pending: snapshot.pendingCount || 0,
          overdue: snapshot.overdueCount || 0,
          rescheduled: snapshot.rescheduledCount || 0,
          total: snapshot.totalTasks || 0,
        };
      }
    }

    let completedCount = 0, pendingCount = 0, overdueCount = 0, totalCount = 0, rescheduledCount = 0;

    tasks.forEach(t => {
      const taskDue = t.dueDate || t.createdDate || "2099-01-01";
      const isCompletedOnOrBefore = t.completed && t.completedDate && t.completedDate <= dateStr;
      const isCompletedOnDay = t.completed && t.completedDate === dateStr;
      const isDueOnDay = taskDue === dateStr;
      const isCarryForward = taskDue < dateStr && (!isCompletedOnOrBefore || isCompletedOnDay);

      if (isDueOnDay || isCarryForward) {
        totalCount++;
        if (isCompletedOnDay) {
          completedCount++;
        } else if (taskDue < dateStr) {
          overdueCount++;
        } else {
          pendingCount++;
        }
      }

      if (t.rescheduleHistory?.some(h => h.rescheduledAtDate === dateStr)) {
        rescheduledCount++;
      }
    });

    return {
      date: format(dateObj, mode === 'Monthly' ? "MMM d" : "EEE, MMM d"),
      fullDate: dateStr,
      completed: completedCount,
      pending: pendingCount,
      overdue: overdueCount,
      rescheduled: rescheduledCount,
      total: totalCount
    };
  };

  const chartData = useMemo(() => {
    const rawData = dateRange.map(d => getStatsForDate(d));

    if (mode === 'Monthly') {
      const weeklyAgg = [];
      let currentWeek = { weekStr: "", total: 0, completed: 0, pending: 0, overdue: 0, rescheduled: 0, count: 0 };

      rawData.forEach((day, index) => {
        if (index === 0 || parseISO(day.fullDate).getDay() === 1) { // 1 = Monday
          if (currentWeek.count > 0) {
            currentWeek.date = `Week ${weeklyAgg.length + 1}`;
            weeklyAgg.push(currentWeek);
          }
          currentWeek = { weekStr: "", total: 0, completed: 0, pending: 0, overdue: 0, rescheduled: 0, count: 0 };
        }
        currentWeek.total += day.total;
        currentWeek.completed += day.completed;
        currentWeek.pending += day.pending;
        currentWeek.overdue += day.overdue;
        currentWeek.rescheduled += day.rescheduled;
        currentWeek.count++;
      });
      if (currentWeek.count > 0) {
        currentWeek.date = `Week ${weeklyAgg.length + 1}`;
        weeklyAgg.push(currentWeek);
      }
      return weeklyAgg;
    }

    return rawData;
  }, [dateRange, tasks, history, mode]);

  const aggregateStats = useMemo(() => {
    const rawData = dateRange.map(d => getStatsForDate(d));
    return rawData.reduce((acc, curr) => {
      acc.total += curr.total;
      acc.completed += curr.completed;
      acc.pending += curr.pending;
      acc.overdue += curr.overdue;
      acc.rescheduled += curr.rescheduled;
      return acc;
    }, { total: 0, completed: 0, pending: 0, overdue: 0, rescheduled: 0 });
  }, [dateRange, tasks, history]);

  const aggregateCompPct = aggregateStats.total > 0
    ? Math.round((aggregateStats.completed / aggregateStats.total) * 100)
    : 0;

  const maxStat = useMemo(() => {
    if (!chartData || chartData.length === 0) return 0;
    return Math.max(...chartData.map(d => (d.completed || 0) + (d.pending || 0) + (d.overdue || 0) + (d.rescheduled || 0)));
  }, [chartData]);
  const yDomain = maxStat === 0 ? [0, 5] : [0, 'auto'];

  const handlePrev = () => {
    if (mode === 'Weekly') {
      setAnchorDate(prev => subDays(prev, 7));
    } else if (mode === 'Monthly') {
      setAnchorDate(prev => subDays(startOfMonth(prev), 1));
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
    } else if (mode === 'Monthly') {
      const nextDate = addDays(endOfMonth(anchorDate), 1);
      if (!isAfter(startOfMonth(nextDate), new Date())) {
        setAnchorDate(nextDate);
      }
    }
  };

  const isNextDisabled = () => {
    if (mode === 'Custom') return true;
    if (mode === 'Weekly') {
      return isToday(anchorDate) || isAfter(anchorDate, new Date());
    }
    if (mode === 'Monthly') {
      return isToday(anchorDate) || isAfter(anchorDate, new Date()) || (anchorDate.getMonth() === new Date().getMonth() && anchorDate.getFullYear() === new Date().getFullYear());
    }
    return false;
  };

  const applyFilter = (filterName) => {
    if (filterName === 'Last 7 Days') {
      setMode('Weekly');
      setAnchorDate(new Date());
    } else if (filterName === 'Last 30 Days') {
      setMode('Custom');
      setCustomStart(format(subDays(new Date(), 29), "yyyy-MM-dd"));
      setCustomEnd(format(new Date(), "yyyy-MM-dd"));
    } else if (filterName === 'This Month') {
      setMode('Monthly');
      setAnchorDate(new Date());
    } else if (filterName === 'Previous Month') {
      setMode('Monthly');
      setAnchorDate(subDays(startOfMonth(new Date()), 1));
    }
  };

  return (
    <div className="pa-container">
      <div className="pa-header">
        <h2>Productivity Analytics</h2>
        <p>Deep dive into your historical performance and task trends.</p>
      </div>

      {/* ── FILTER SECTION ── */}
      <div className="pa-card">
        <div className="pa-filters-stack">
          {/* 1. Time Filter Buttons */}
          <div className="pa-quick-filters">
            <button
              onClick={() => applyFilter('Last 7 Days')}
              className={mode === 'Weekly' && isToday(anchorDate) ? 'active' : ''}
            >Last 7 Days</button>
            <button
              onClick={() => applyFilter('Last 30 Days')}
              className={mode === 'Custom' && customStart === format(subDays(new Date(), 29), "yyyy-MM-dd") ? 'active' : ''}
            >Last 30 Days</button>
            <button
              onClick={() => applyFilter('This Month')}
              className={mode === 'Monthly' && anchorDate.getMonth() === new Date().getMonth() ? 'active' : ''}
            >This Month</button>
            <button
              onClick={() => applyFilter('Previous Month')}
              className={mode === 'Monthly' && anchorDate.getMonth() !== new Date().getMonth() ? 'active' : ''}
            >Prev Month</button>
          </div>

          {/* Removed View Selector to simplify interface and match user's numbered list */}

          {/* 3. Date Range */}
          <div className="pa-nav-group">
            {mode !== 'Custom' ? (
              <>
                <button onClick={handlePrev} className="pa-nav-btn">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"></polyline></svg>
                </button>
                <span className="pa-date-range">
                  {format(dateRange[0], "MMM d, yyyy")} - {format(dateRange[dateRange.length - 1], "MMM d, yyyy")}
                </span>
                <button onClick={handleNext} disabled={isNextDisabled()} className="pa-nav-btn">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"></polyline></svg>
                </button>
              </>
            ) : (
              <div className="pa-custom-dates">
                <input type="date" value={customStart} onChange={e => setCustomStart(e.target.value)} max={customEnd} className="pa-date-input" />
                <span>to</span>
                <input type="date" value={customEnd} onChange={e => setCustomEnd(e.target.value)} min={customStart} max={format(new Date(), "yyyy-MM-dd")} className="pa-date-input" />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── AGGREGATE SUMMARY SECTION ── */}
      <div className="pa-card">
        <div className="pa-stats-grid">
          <div className="pa-stat-card total">
            <span className="pa-stat-val">{aggregateStats.total}</span>
            <span className="pa-stat-label">Total Work</span>
          </div>
          <div className="pa-stat-card completed">
            <span className="pa-stat-val">{aggregateStats.completed}</span>
            <span className="pa-stat-label">Completed</span>
          </div>
          <div className="pa-stat-card pending">
            <span className="pa-stat-val">{aggregateStats.pending}</span>
            <span className="pa-stat-label">Pending</span>
          </div>
          <div className="pa-stat-card overdue">
            <span className="pa-stat-val">{aggregateStats.overdue}</span>
            <span className="pa-stat-label">Overdue</span>
          </div>
          <div className="pa-stat-card rescheduled">
            <span className="pa-stat-val">{aggregateStats.rescheduled}</span>
            <span className="pa-stat-label">Rescheduled</span>
          </div>
          <div className="pa-stat-card done">
            <span className="pa-stat-val">{aggregateCompPct}%</span>
            <span className="pa-stat-label">Done Rate</span>
          </div>
        </div>
      </div>

      {/* ── CHART SECTION ── */}
      <div className="pa-card" style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
        <div className="pa-chart-wrapper">
          {aggregateStats.total === 0 && aggregateStats.rescheduled === 0 && (
            <div className="pa-empty-overlay">
              <div className="pa-empty-msg">
                No productivity data available for the selected period.
              </div>
            </div>
          )}
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
              <XAxis dataKey="date" tick={{ fontSize: 12, fill: '#6b7280' }} tickMargin={10} axisLine={false} tickLine={false} />
              <YAxis
                tick={{ fontSize: 12, fill: '#6b7280' }}
                axisLine={false}
                tickLine={false}
                allowDecimals={false}
                domain={yDomain}
              />
              <Tooltip
                cursor={{ fill: 'rgba(0,0,0,0.04)' }}
                contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}
              />
              <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '20px' }} />

              <Bar dataKey="overdue" name="Overdue" stackId="a" fill="#ef4444">
                <LabelList dataKey="overdue" content={renderCustomizedLabel} />
              </Bar>
              <Bar dataKey="pending" name="Pending" stackId="a" fill="#f59e0b">
                <LabelList dataKey="pending" content={renderCustomizedLabel} />
              </Bar>
              <Bar dataKey="completed" name="Completed" stackId="a" fill="#10b981">
                <LabelList dataKey="completed" content={renderCustomizedLabel} />
              </Bar>

              <Bar dataKey="rescheduled" name="Rescheduled" fill="#3b82f6" radius={4}>
                <LabelList dataKey="rescheduled" content={renderCustomizedLabel} />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
