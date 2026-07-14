import { useState, useEffect } from "react";
import { useTasks } from "../context/TaskContext";
import { format } from "date-fns";
import { generateNightReview } from "../services/gemini";
import "../dashboard.css";

function NightReview({ onClose }) {
  const { tasks, completeNightReview, geminiApiKey } = useTasks();
  const todayStr = format(new Date(), "yyyy-MM-dd");

  const [notes, setNotes] = useState("");
  const [aiSuggestions, setAiSuggestions] = useState("Loading AI analysis...");
  const [loadingSuggestions, setLoadingSuggestions] = useState(true);

  // Filter tasks
  const completed = tasks.filter((t) => t.completed && (t.completedDate || t.dueDate) === todayStr);
  const pending = tasks.filter((t) => !t.completed && t.dueDate <= todayStr);
  const todayTasks = [...completed, ...pending];
  const rate = todayTasks.length > 0 ? Math.round((completed.length / todayTasks.length) * 100) : 0;

  useEffect(() => {
    async function loadSummary() {
      try {
        const summary = await generateNightReview(
          completed.map((t) => t.title),
          pending.map((t) => t.title),
          geminiApiKey
        );
        setAiSuggestions(summary);
      } catch (e) {
        setAiSuggestions("You worked consistently today. Take some time off to reset, and schedule high-priority tasks earlier tomorrow.");
      } finally {
        setLoadingSuggestions(false);
      }
    }
    loadSummary();
  }, [geminiApiKey]);

  const handleComplete = () => {
    completeNightReview({
      completedCount: completed.length,
      pendingCount: pending.length,
      completionRate: rate,
      suggestions: aiSuggestions,
      notes: notes.trim()
    });
    alert("Day completed! Great job. Enjoy your rest.");
  };

  return (
    <div className="db-page">
      <section className="db-hero" style={{ background: "linear-gradient(135deg, #1e293b 0%, #0f172a 100%)", color: "white" }}>
        <div className="db-hero-left">
          <p className="db-hero-eyebrow" style={{ color: "#94a3b8" }}>Night Review</p>
          <h1 className="db-hero-title" style={{ color: "white" }}>🌙 Review your day</h1>
          <p className="db-hero-sub" style={{ color: "#cbd5e1" }}>Great work! Reflecting on achievements builds consistent habits and clear focus.</p>
        </div>
        {/* <div className="db-hero-right">
          <span className="db-tag" style={{ background: "rgba(255, 255, 255, 0.1)", color: "#38bdf8" }}>Review Mode</span>
        </div> */}
      </section>

      <div className="db-main-grid" style={{ gridTemplateColumns: "1fr 1fr", alignItems: "stretch" }}>
        {/* Left Side: Stats */}
        <div className="db-card" style={{ height: "100%" }}>
          <div className="db-card-header">
            <h2 className="db-card-title">Today's Summary</h2>
          </div>
          <div className="review-summary-stats" style={{ marginTop: "16px" }}>
            <div className="review-stat-item">
              <strong>{todayTasks.length}</strong>
              <span>Today's Tasks</span>
            </div>
            <div className="review-stat-item" style={{ borderLeft: "4px solid #10b981" }}>
              <strong style={{ color: "#10b981" }}>{completed.length}</strong>
              <span>Completed</span>
            </div>
            <div className="review-stat-item" style={{ borderLeft: "4px solid #f59e0b" }}>
              <strong style={{ color: "#f59e0b" }}>{pending.length}</strong>
              <span>Pending</span>
            </div>
            <div className="review-stat-item" style={{ background: "linear-gradient(135deg, #ecfdf5 0%, #d1fae5 100%)" }}>
              <strong style={{ color: "#065f46" }}>{rate}%</strong>
              <span>Completion</span>
            </div>
          </div>

          <div style={{ marginTop: "24px" }}>
            <h3>Tasks Completed</h3>
            {completed.length === 0 ? (
              <p style={{ color: "#6b7280", fontStyle: "italic" }}>No tasks completed today.</p>
            ) : (
              <ul className="plan-list" style={{ paddingLeft: 0, listStyle: "none" }}>
                {completed.map((t) => (
                  <li key={t.id} style={{ padding: "8px 12px", background: "#f0fdf4", borderRadius: "8px", marginBottom: "6px", color: "#166534" }}>
                    ✓ {t.title}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        {/* Right Side: AI Suggestions & Journaling */}
        <div className="db-card" style={{ display: "flex", flexDirection: "column", gap: "18px", height: "100%" }}>
          <div className="db-card-header">
            <h2 className="db-card-title">AI Performance Insights</h2>
          </div>
          <div className="suggestion-box" style={{ background: "#eff6ff", borderLeft: "4px solid #3b82f6", padding: "24px", borderRadius: "12px", flex: 1, display: "flex", alignItems: "center" }}>
            <p style={{ whiteSpace: "pre-line", margin: 0, fontSize: "1rem", color: "#1e3a8a", lineHeight: 1.6 }}>
              {aiSuggestions}
            </p>
          </div>

          {/* <div className="form-group" style={{ marginTop: "10px" }}>
            <label htmlFor="night-notes">Daily Journal / Notes</label>
            <textarea
              id="night-notes"
              placeholder="What went well today? What can be improved?"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              style={{
                width: "100%",
                height: "110px",
                padding: "12px",
                borderRadius: "10px",
                border: "1px solid #cbd5e1",
                fontFamily: "inherit",
                fontSize: "0.95rem"
              }}
            />
          </div> */}
        </div>
      </div>

      <div style={{ display: "flex", justifyContent: "center", gap: "16px", marginTop: "24px" }}>
        <button
          type="button"
          onClick={() => {
            if (onClose) onClose();
          }}
          className="secondary-button"
          style={{ padding: "14px 24px", fontSize: "1.1rem", borderRadius: "10px" }}
        >
          Back to Dashboard
        </button>
        <button
          type="button"
          onClick={() => {
            handleComplete();
            if (onClose) onClose();
          }}
          className="login-button"
          style={{ padding: "14px 40px", fontSize: "1.1rem", background: "#1e293b" }}
        >
          🌙 Complete Today & Rest
        </button>
      </div>
    </div>
  );
}

export default NightReview;
