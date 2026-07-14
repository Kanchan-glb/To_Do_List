import { useState, useEffect } from "react";
import { useTasks } from "../context/TaskContext";
import { format, addDays } from "date-fns";
import { generateNightReview } from "../services/gemini";

export default function NightPopup() {
  const { tasks, updateTask, rescheduleTask, completeNightReview, nightReviewCompleted, geminiApiKey } = useTasks();
  const [show, setShow] = useState(false);
  
  const todayStr = format(new Date(), "yyyy-MM-dd");
  const tomorrowStr = format(addDays(new Date(), 1), "yyyy-MM-dd");

  useEffect(() => {
    const currentHour = new Date().getHours();
    const isNight = currentHour >= 20 || currentHour <= 2; // 8 PM to 2 AM
    if (isNight && !nightReviewCompleted) {
      setShow(true);
    } else {
      setShow(false);
    }
  }, [nightReviewCompleted]);

  if (!show) return null;

  const pendingTasks = tasks.filter(t => !t.completed && t.dueDate === todayStr);
  const overdueTasks = tasks.filter(t => !t.completed && t.dueDate < todayStr);
  const completedTasks = tasks.filter(t => t.completed && (t.completedDate === todayStr || t.dueDate === todayStr));
  
  const totalTasks = completedTasks.length + pendingTasks.length + overdueTasks.length;
  const completionRate = totalTasks > 0 ? Math.round((completedTasks.length / totalTasks) * 100) : 0;

  const [aiSuggestions, setAiSuggestions] = useState("Loading suggestions...");

  useEffect(() => {
    if (!show) return;
    async function loadSummary() {
      try {
        const summary = await generateNightReview(
          completedTasks.map(t => t.title),
          [...pendingTasks, ...overdueTasks].map(t => t.title),
          geminiApiKey
        );
        setAiSuggestions(summary);
      } catch (e) {
        setAiSuggestions("You worked consistently today. Take some time off to reset, and schedule high-priority tasks earlier tomorrow.");
      }
    }
    loadSummary();
  }, [show, geminiApiKey]);

  const handleFinish = () => {
    completeNightReview({
      completedCount: completedTasks.length,
      pendingCount: pendingTasks.length,
      completionRate: (completedTasks.length + pendingTasks.length) > 0 ? Math.round((completedTasks.length / (completedTasks.length + pendingTasks.length)) * 100) : 0,
      suggestions: "You reviewed your tasks from the quick popup.",
      notes: ""
    });
    setShow(false);
  };

  return (
    <div className="reminder-modal-overlay" style={{ zIndex: 9999 }}>
      <div className="reminder-modal-card scale-in" style={{ width: "90%", maxWidth: "600px", padding: "24px", maxHeight: "90vh", overflowY: "auto", background: "var(--bg-card)" }}>
        <h2 style={{ fontSize: "1.6rem", color: "var(--text-primary)", marginBottom: "16px", textAlign: "center" }}>🌙 Today's Summary</h2>
        
        <div style={{ background: "var(--bg-app)", padding: "16px", borderRadius: "12px", marginBottom: "20px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", border: "1px solid var(--border-light)" }}>
          <div style={{ background: "rgba(16, 185, 129, 0.1)", padding: "12px", borderRadius: "8px", textAlign: "center" }}>
            <div style={{ fontSize: "1.5rem", fontWeight: "800", color: "#10b981" }}>{completedTasks.length}</div>
            <div style={{ fontSize: "0.85rem", color: "var(--text-secondary)", fontWeight: "600" }}>Completed Tasks</div>
          </div>
          <div style={{ background: "rgba(245, 158, 11, 0.1)", padding: "12px", borderRadius: "8px", textAlign: "center" }}>
            <div style={{ fontSize: "1.5rem", fontWeight: "800", color: "#f59e0b" }}>{pendingTasks.length}</div>
            <div style={{ fontSize: "0.85rem", color: "var(--text-secondary)", fontWeight: "600" }}>Pending Tasks</div>
          </div>
          <div style={{ background: "rgba(239, 68, 68, 0.1)", padding: "12px", borderRadius: "8px", textAlign: "center" }}>
            <div style={{ fontSize: "1.5rem", fontWeight: "800", color: "#ef4444" }}>{overdueTasks.length}</div>
            <div style={{ fontSize: "0.85rem", color: "var(--text-secondary)", fontWeight: "600" }}>Overdue Tasks</div>
          </div>
          <div style={{ background: "rgba(59, 130, 246, 0.1)", padding: "12px", borderRadius: "8px", textAlign: "center" }}>
            <div style={{ fontSize: "1.5rem", fontWeight: "800", color: "#3b82f6" }}>{completionRate}%</div>
            <div style={{ fontSize: "0.85rem", color: "var(--text-secondary)", fontWeight: "600" }}>Completion Rate</div>
          </div>
        </div>

        <div style={{ background: "var(--bg-app)", padding: "16px", borderRadius: "12px", marginBottom: "20px", border: "1px solid var(--border-light)" }}>
          <h3 style={{ fontSize: "1rem", color: "var(--text-primary)", marginBottom: "8px" }}>💡 Suggestions For Tomorrow</h3>
          <p style={{ color: "var(--text-secondary)", fontSize: "0.95rem", lineHeight: "1.5" }}>{aiSuggestions}</p>
        </div>
        
        <div style={{ marginBottom: "24px" }}>
          <h3 style={{ fontSize: "1rem", color: "var(--text-primary)", marginBottom: "12px" }}>Unfinished Tasks</h3>
          {(pendingTasks.length === 0 && overdueTasks.length === 0) ? (
            <p style={{ fontStyle: "italic", color: "var(--color-success)" }}>Awesome! You have no pending tasks left for today. Time to relax!</p>
          ) : (
            <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: "12px" }}>
              {[...overdueTasks, ...pendingTasks].map(task => (
                <li key={task.id} style={{ background: "var(--bg-app)", padding: "12px", borderRadius: "12px", border: "1px solid var(--border-light)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div>
                    <div style={{ fontWeight: "600", color: "var(--text-primary)", fontSize: "0.95rem" }}>
                      {task.dueDate < todayStr && <span style={{ color: "#ef4444", marginRight: "6px", fontSize: "0.8rem" }}>[Overdue]</span>}
                      {task.title}
                    </div>
                    <div style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>{task.dueTime || "No time set"}</div>
                  </div>
                  <div style={{ display: "flex", gap: "8px" }}>
                    <button onClick={() => updateTask(task.id, { completed: true })} style={{ background: "var(--color-success)", color: "white", border: "none", borderRadius: "8px", padding: "6px 12px", cursor: "pointer", fontSize: "0.85rem" }}>✔ Done</button>
                    <button onClick={() => rescheduleTask(task.id, tomorrowStr, task.dueTime)} style={{ background: "transparent", color: "var(--text-secondary)", border: "1px solid var(--border-light)", borderRadius: "8px", padding: "6px 12px", cursor: "pointer", fontSize: "0.85rem" }}>Tomorrow</button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        <button onClick={handleFinish} style={{ width: "100%", padding: "14px", background: "#7c3aed", color: "white", border: "none", borderRadius: "12px", fontSize: "1rem", fontWeight: "600", cursor: "pointer" }}>
          Close & Good Night
        </button>
      </div>
    </div>
  );
}
