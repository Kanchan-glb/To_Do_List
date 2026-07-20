import { useState, useMemo } from 'react';
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

export default function ProductivityAnalytics() {
  const { tasks, history } = useTasks();

  // Modes:
  // Weekly       = Last 7 Days
  // ThisMonth    = Current month only
  // PreviousMonth = Previous and older months with arrow navigation
  const [mode, setMode] = useState('Weekly');
  const [anchorDate, setAnchorDate] = useState(new Date());

  const latestAllowedPreviousMonth = useMemo(
    () => subMonths(startOfMonth(new Date()), 1),
    []
  );

  const dateRange = useMemo(() => {
    let start;
    let end;

    if (mode === 'ThisMonth') {
      start = startOfMonth(new Date());
      end = new Date();
    } else if (mode === 'PreviousMonth') {
      start = startOfMonth(anchorDate);
      end = endOfMonth(anchorDate);
    } else {
      start = subDays(anchorDate, 6);
      end = anchorDate;
    }

    try {
      return eachDayOfInterval({ start, end });
    } catch (error) {
      console.error('Unable to generate productivity date range:', error);
      return [new Date()];
    }
  }, [mode, anchorDate]);

  const getStatsForDate = (dateObj) => {
    const dateStr = format(dateObj, 'yyyy-MM-dd');
    const isTodayFlag = isToday(dateObj);

    if (!isTodayFlag) {
      const snapshot = history.find(
        (item) => item.type === 'daily' && item.date === dateStr
      );

      if (snapshot) {
        return {
          date: format(
            dateObj,
            mode === 'Weekly' ? 'EEE, MMM d' : 'MMM d'
          ),
          fullDate: dateStr,
          completed: snapshot.completedCount || 0,
          pending: snapshot.pendingCount || 0,
          overdue: snapshot.overdueCount || 0,
          rescheduled: snapshot.rescheduledCount || 0,
          total: snapshot.totalTasks || 0
        };
      }
    }

    let completedCount = 0;
    let pendingCount = 0;
    let overdueCount = 0;
    let totalCount = 0;
    let rescheduledCount = 0;

    tasks.forEach((task) => {
      const taskDue =
        task.dueDate || task.createdDate || '2099-01-01';

      const isCompletedOnOrBefore =
        Boolean(task.completed) &&
        Boolean(task.completedDate) &&
        task.completedDate <= dateStr;

      const isCompletedOnDay =
        Boolean(task.completed) &&
        task.completedDate === dateStr;

      const isDueOnDay = taskDue === dateStr;

      const todayStr = format(new Date(), "yyyy-MM-dd");

      const isPendingOnDay =
        !task.completed &&
        task.dueDate === dateStr &&
        dateStr >= todayStr;

      const isOverdueOnDay =
        !task.completed &&
        task.dueDate < dateStr;

      if (
        task.completed &&
        task.completedDate === dateStr
      ) {
        completedCount++;
      }
      else if (isOverdueOnDay) {
        overdueCount++;
      }
      else if (isPendingOnDay) {
        pendingCount++;
      }

      if (
        task.createdDate <= dateStr &&
        (!task.completed || task.completedDate >= dateStr)
      ) {
        totalCount++;
      }

      const wasRescheduledOnDate = task.rescheduleHistory?.some(
        (item) => item.rescheduledAtDate === dateStr
      );

      if (wasRescheduledOnDate) {
        rescheduledCount += 1;
      }
    });

    return {
      date: format(
        dateObj,
        mode === 'Weekly' ? 'EEE, MMM d' : 'MMM d'
      ),
      fullDate: dateStr,
      completed: completedCount,
      pending: pendingCount,
      overdue: overdueCount,
      rescheduled: rescheduledCount,
      total: totalCount
    };
  };

  const chartData = useMemo(() => {
    const rawData = dateRange.map((date) => getStatsForDate(date));

    if (mode === 'Weekly') {
      return rawData;
    }

    const weeklyAggregate = [];

    let currentWeek = {
      date: '',
      total: 0,
      completed: 0,
      pending: 0,
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
          overdue: 0,
          rescheduled: 0,
          count: 0
        };
      }

      currentWeek.total += day.total;
      currentWeek.completed += day.completed;
      currentWeek.pending += day.pending;
      currentWeek.overdue += day.overdue;
      currentWeek.rescheduled += day.rescheduled;
      currentWeek.count += 1;
    });

    if (currentWeek.count > 0) {
      currentWeek.date = `Week ${weeklyAggregate.length + 1}`;
      weeklyAggregate.push(currentWeek);
    }

    return weeklyAggregate;
  }, [dateRange, tasks, history, mode]);

  const aggregateStats = useMemo(() => {
    const today = format(new Date(), "yyyy-MM-dd");

    const uniqueTasks = new Map();

    tasks.forEach(task => {
      uniqueTasks.set(task.id, task);
    });

    let total = 0;
    let completed = 0;
    let pending = 0;
    let overdue = 0;
    let rescheduled = 0;

    uniqueTasks.forEach(task => {
      total++;

      if (task.completed) {
        completed++;
        return;
      }

      if (task.dueDate < today) {
        overdue++;
      } else {
        pending++;
      }

      if (
        task.rescheduleHistory &&
        task.rescheduleHistory.length > 0
      ) {
        rescheduled++;
      }
    });

    return {
      total,
      completed,
      pending,
      overdue,
      rescheduled
    };
  }, [tasks]);

  const aggregateCompPct =
    aggregateStats.total > 0
      ? Math.round(
        (aggregateStats.completed / aggregateStats.total) * 100
      )
      : 0;

  const maxStat = useMemo(() => {
    if (!chartData || chartData.length === 0) return 0;

    return Math.max(
      ...chartData.map(
        (item) =>
          (item.completed || 0) +
          (item.pending || 0) +
          (item.overdue || 0) +
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
    <div className="pa-container">
      <div className="pa-header">
        <h2>Productivity Analytics</h2>
        <p>
          Deep dive into your historical performance and task trends.
        </p>
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
                >
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                  >
                    <polyline points="15 18 9 12 15 6" />
                  </svg>
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
                >
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                  >
                    <polyline points="9 18 15 12 9 6" />
                  </svg>
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
              {aggregateStats.total}
            </span>
            <span className="pa-stat-label">
              Total Work
            </span>
          </div>

          <div className="pa-stat-card completed">
            <span className="pa-stat-val">
              {aggregateStats.completed}
            </span>
            <span className="pa-stat-label">
              Completed
            </span>
          </div>

          <div className="pa-stat-card pending">
            <span className="pa-stat-val">
              {aggregateStats.pending}
            </span>
            <span className="pa-stat-label">
              Pending
            </span>
          </div>

          <div className="pa-stat-card overdue">
            <span className="pa-stat-val">
              {aggregateStats.overdue}
            </span>
            <span className="pa-stat-label">
              Overdue
            </span>
          </div>

          <div className="pa-stat-card rescheduled">
            <span className="pa-stat-val">
              {aggregateStats.rescheduled}
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

      {/* CHART SECTION */}
      <div
        className="pa-card"
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          minHeight: 0
        }}
      >
        <div className="pa-chart-wrapper">
          {aggregateStats.total === 0 &&
            aggregateStats.rescheduled === 0 && (
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
                top: 10,
                right: 10,
                left: -20,
                bottom: 0
              }}
            >
              <CartesianGrid
                strokeDasharray="3 3"
                vertical={false}
                stroke="#e5e7eb"
              />

              <XAxis
                dataKey="date"
                tick={{
                  fontSize: 12,
                  fill: '#6b7280'
                }}
                tickMargin={10}
                axisLine={false}
                tickLine={false}
              />

              <YAxis
                tick={{
                  fontSize: 12,
                  fill: '#6b7280'
                }}
                axisLine={false}
                tickLine={false}
                allowDecimals={false}
                domain={yDomain}
              />

              <Tooltip
                cursor={{
                  fill: 'rgba(0,0,0,0.04)'
                }}
                contentStyle={{
                  borderRadius: '8px',
                  border: 'none',
                  boxShadow:
                    '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                }}
              />

              <Legend
                wrapperStyle={{
                  fontSize: '12px',
                  paddingTop: '20px'
                }}
              />

              <Bar
                dataKey="overdue"
                name="Overdue"
                stackId="a"
                fill="#ef4444"
              >
                <LabelList
                  dataKey="overdue"
                  content={renderCustomizedLabel}
                />
              </Bar>

              <Bar
                dataKey="pending"
                name="Pending"
                stackId="a"
                fill="#f59e0b"
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
                fill="#10b981"
              >
                <LabelList
                  dataKey="completed"
                  content={renderCustomizedLabel}
                />
              </Bar>

              <Bar
                dataKey="rescheduled"
                name="Rescheduled"
                fill="#3b82f6"
                radius={4}
              >
                <LabelList
                  dataKey="rescheduled"
                  content={renderCustomizedLabel}
                />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
