import { useState, useEffect } from "react";
import { useTasks } from "../context/TaskContext";
import { format, subDays, startOfWeek, endOfWeek, parseISO } from "date-fns";
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, BarChart, Bar, Cell } from "recharts";
import { generateWeeklyReview } from "../services/gemini";
import "../reports.css";

const COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#8b5cf6", "#ec4899", "#64748b"];

function ReportsPage() {
  const { tasks, history, saveWeeklyReview, geminiApiKey, getDailyProgress } = useTasks();

  const [aiSuggestions, setAiSuggestions] = useState("Generating Weekly Productivity Insights...");
  const [isGenerating, setIsGenerating] = useState(true);

  // Filter tasks completed in the last 7 days
  const sevenDaysAgo = subDays(new Date(), 7);
  const completedLastWeek = tasks.filter(
    (t) => t.completed && new Date(t.completedDate || t.dueDate) >= sevenDaysAgo
  );
  const pendingLastWeek = tasks.filter(
    (t) => !t.completed && new Date(t.dueDate) >= sevenDaysAgo
  );

  const totalTasks = completedLastWeek.length + pendingLastWeek.length;
  const weeklyRate = totalTasks > 0 ? Math.round((completedLastWeek.length / totalTasks) * 100) : 0;

  // 1. Calculate most productive day in past week
  const dayCounts = {};
  completedLastWeek.forEach((t) => {
    try {
      const dayName = format(parseISO(t.completedDate || t.dueDate), "EEEE");
      dayCounts[dayName] = (dayCounts[dayName] || 0) + 1;
    } catch (e) {
      console.log(e);
    }
  });
  let mostProductiveDay = "None";
  let maxCompleted = 0;
  Object.entries(dayCounts).forEach(([day, count]) => {
    if (count > maxCompleted) {
      maxCompleted = count;
      mostProductiveDay = day;
    }
  });

  // 2. Prepare chart data for Recharts (completions by day in last 7 days)
  const chartData = [];
  for (let i = 6; i >= 0; i--) {
    const targetDate = subDays(new Date(), i);
    const dateStr = format(targetDate, "yyyy-MM-dd");
    const dayLabel = format(targetDate, "EEE");
    const comps = tasks.filter((t) => t.completed && (t.completedDate || t.dueDate) === dateStr).length;
    chartData.push({ name: dayLabel, Completed: comps });
  }

  // 3. Prepare category distribution data
  const categoryCounts = {};
  tasks.forEach((t) => {
    if (t.completed) {
      categoryCounts[t.category] = (categoryCounts[t.category] || 0) + 1;
    }
  });
  const barData = Object.entries(categoryCounts).map(([cat, count]) => ({
    name: cat,
    Completed: count
  }));

  useEffect(() => {
    async function loadWeeklyAI() {
      try {
        const result = await generateWeeklyReview(
          completedLastWeek.map((t) => t.title),
          pendingLastWeek.map((t) => t.title),
          geminiApiKey
        );
        setAiSuggestions(result);
      } catch (e) {
        setAiSuggestions("• Schedule complex technical work before noon.\n• Limit rescheduling: you postponed 3 items this week.\n• Keep a good balance between work and exercise categories.");
      } finally {
        setIsGenerating(false);
      }
    }
    loadWeeklyAI();
  }, [geminiApiKey]);

  const handleExportPDF = () => {
    window.print();
  };

  return (
    <div className="reports-page">
    <div className="reports-page printable-reports">
      {/* <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '24px' }}>
        <button className="export-btn no-print" onClick={handleExportPDF} style={{ background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)', border: 'none', boxShadow: '0 8px 20px rgba(139, 92, 246, 0.3)' }}>
          📄 Export / Print PDF
        </button>
      </div> */}

      {/* Row 1: Key Metrics */}
      <section className="stats-grid">
        <article className="stat-card">
          <p>🎯 Tasks Completed (7 Days)</p>
          <h3 style={{ color: "#ec4899" }}>{completedLastWeek.length}</h3>
          <span>Excellent work</span>
        </article>
        <article className="stat-card">
          <p>🚀 Weekly Completion Rate</p>
          <h3 style={{ color: "#8b5cf6" }}>{weeklyRate}%</h3>
          <span>Target is 80%</span>
        </article>
        <article className="stat-card">
          <p>🏆 Most Productive Day</p>
          <h3 style={{ color: "#3b82f6" }}>{mostProductiveDay}</h3>
          <span>{maxCompleted} task completions</span>
        </article>
      </section>

      {/* Row 2: Charts Grid */}
      <div className="reports-grid">

        {/* Progress chart */}
        <div className="report-card">
          <h3>📈 Task Completions (Last 7 Days)</h3>
        <div className="chart-container">
            <ResponsiveContainer>
              <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorComp" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8} />
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="name" stroke="#94a3b8" fontSize={11} tickLine={false} />
                <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} allowDecimals={false} />
                <Tooltip />
                <Area type="monotone" dataKey="Completed" stroke="#3b82f6" strokeWidth={3} fillOpacity={1} fill="url(#colorComp)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Category breakdown chart */}
        <div className="report-card">
          <h3>📊 Category Distribution</h3>
          {barData.length === 0 ? (
            <p style={{ color: "#6b7280", fontStyle: "italic", textAlign: "center", paddingTop: "80px" }}>No category data yet.</p>
          ) : (
            <div style={{ width: "100%", height: 260 }}>
              <ResponsiveContainer>
                <BarChart data={barData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                  <XAxis dataKey="name" stroke="#94a3b8" fontSize={11} tickLine={false} />
                  <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} allowDecimals={false} />
                  <Tooltip />
                  <Bar dataKey="Completed" fill="#8b5cf6" radius={[6, 6, 0, 0]}>
                    {barData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

      </div>

      {/* Row 3: AI Recommendations & Historical Log */}
      <div className="reports-grid">
        <div className="report-card">
          <h2>💡 AI Recommendations for Next Week</h2>
          <div className="ai-review-box" style={{ marginTop: "16px" }}>
            <p style={{ whiteSpace: "pre-line", margin: 0 }}>
              {aiSuggestions}
            </p>
          </div>
        </div>

        {/* <div className="report-card">
          <h2>📜 Productivity Logs History</h2>
          <div className="history-list" style={{ marginTop: "20px", maxHeight: "300px", overflowY: "auto", paddingRight: "8px" }}>
            {(() => {
              const todayDateStr = format(new Date(), "yyyy-MM-dd");

              const pastHistory = history.filter(h => !(h.type === "daily" && h.date === todayDateStr));

              const dailyStats = getDailyProgress();

              const todaySummary = {
                id: "today-live",
                type: "daily",
                date: todayDateStr,
                totalTasks: dailyStats.todayCount + dailyStats.pendingCount, // approximation of all things active today
                completedCount: dailyStats.todayCompleted,
                pendingCount: dailyStats.pendingCount,
                overdueCount: dailyStats.overdueCount,
                completionRate: dailyStats.completionRate,
                productivityScore: Math.min(100, dailyStats.completionRate + (dailyStats.streak > 3 ? 5 : 0) + (dailyStats.todayCompleted > 5 ? 10 : 0))
              };

              let displayHistory = [todaySummary, ...pastHistory].sort((a, b) => {
                const dateA = a.date.split(" ")[0];
                const dateB = b.date.split(" ")[0];
                return dateB.localeCompare(dateA);
              });

              if (displayHistory.length === 0) {
                return <p style={{ color: "#6b7280", fontStyle: "italic" }}>No entries in history yet.</p>;
              }

              return displayHistory.map((item) => {
                if (item.type === "weekly") {
                  return (
                    <div key={item.id} className="history-card" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      <div style={{ fontWeight: 'bold', fontSize: '1.1rem', color: 'var(--text-primary)', borderBottom: '1px solid var(--border-light)', paddingBottom: '8px', marginBottom: '4px' }}>
                        Weekly Report - {item.date}
                      </div>
                      <div style={{ fontSize: '0.9rem' }}>
                        <div>Completed Tasks: <strong>{item.completedCount}</strong></div>
                      </div>
                    </div>
                  );
                }

                // return (
                //   <div key={item.id} className="history-card" style={{ display: 'flex', flexDirection: 'column', gap: '8px', padding: '16px', background: 'var(--surface-bg)', borderRadius: '12px', border: '1px solid var(--border-light)', marginBottom: '12px' }}>
                //     <div style={{ fontWeight: '600', fontSize: '1.05rem', color: 'var(--text-primary)', borderBottom: '1px dashed var(--border-light)', paddingBottom: '8px', marginBottom: '4px' }}>
                //       {format(new Date(item.date), "dd MMM yyyy")}
                //       {item.id === "today-live" && <span style={{ fontSize: '0.75rem', color: '#10b981', marginLeft: '8px', padding: '2px 6px', background: 'rgba(16,185,129,0.1)', borderRadius: '12px' }}>Live</span>}
                //     </div>

                //     <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px', fontSize: '0.9rem' }}>
                //       <div style={{ color: 'var(--text-secondary)' }}>Total Tasks: <strong style={{ color: 'var(--text-primary)' }}>{item.totalTasks || 0}</strong></div>
                //       <div style={{ color: 'var(--text-secondary)' }}>Completed: <strong style={{ color: '#10b981' }}>{item.completedCount || 0}</strong></div>
                //       <div style={{ color: 'var(--text-secondary)' }}>Pending: <strong style={{ color: '#f59e0b' }}>{item.pendingCount || 0}</strong></div>
                //       <div style={{ color: 'var(--text-secondary)' }}>Overdue: <strong style={{ color: '#ef4444' }}>{item.overdueCount || 0}</strong></div>
                //     </div>

                //     <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px', fontSize: '0.9rem', marginTop: '4px', paddingTop: '10px', borderTop: '1px dashed var(--border-light)' }}>
                //       <div style={{ color: 'var(--text-secondary)' }}>Completion: <strong style={{ color: '#3b82f6' }}>{item.completionRate || 0}%</strong></div>
                //       <div style={{ color: 'var(--text-secondary)' }}>Productivity Score: <strong style={{ color: '#8b5cf6' }}>{item.productivityScore || 0}</strong></div>
                //     </div>
                //   </div>
                // );
              });
            })()}
          </div>
        </div> */}
      </div>
    </div>
    </div>
  );
}

export default ReportsPage;
