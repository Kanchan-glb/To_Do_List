import { useState, useEffect } from "react";
import { useTasks } from "../context/TaskContext";
import { format } from "date-fns";
import { generateNightReview } from "../services/gemini";
import { useNavigate } from "react-router-dom";

export default function NightPopup() {
  const { tasks, updateTask, deleteTask, completeNightReview, nightReviewCompleted, geminiApiKey } = useTasks();
  const [show, setShow] = useState(false);
  const navigate = useNavigate();
  
  const [editingTaskId, setEditingTaskId] = useState(null);
  
  // Edit states
  const [editTitle, setEditTitle] = useState("");
  const [editDate, setEditDate] = useState("");
  const [editTime, setEditTime] = useState("");
  const [editPriority, setEditPriority] = useState("");

  const todayStr = format(new Date(), "yyyy-MM-dd");

  useEffect(() => {
    const handleOpen = () => setShow(true);
    window.addEventListener('openNightReview', handleOpen);

    return () => window.removeEventListener('openNightReview', handleOpen);
  }, []);

  // Derived tasks logic
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

  if (!show) return null;

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

  const startEdit = (task) => {
    setEditingTaskId(task.id);
    setEditTitle(task.title);
    setEditDate(task.dueDate);
    setEditTime(task.dueTime || "12:00");
    setEditPriority(task.priority || "Medium");
  };

  const saveEdit = (id) => {
    updateTask(id, {
      title: editTitle,
      dueDate: editDate,
      dueTime: editTime,
      priority: editPriority
    });
    setEditingTaskId(null);
  };
  
  const handleDelete = (id) => {
    if (confirm("Are you sure you want to delete this task?")) {
      deleteTask(id);
      setEditingTaskId(null);
    }
  };

  const renderTaskRow = (task, isOverdue) => (
    <li key={task.id} style={{ background: "var(--bg-app)", padding: "14px", borderRadius: "12px", border: `1px solid ${isOverdue ? 'rgba(239, 68, 68, 0.3)' : 'var(--border-light)'}`, transition: "all 0.2s" }}>
      {editingTaskId === task.id ? (
        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          <input type="text" value={editTitle} onChange={e => setEditTitle(e.target.value)} className="form-input-styled" style={{ padding: "10px" }} />
          <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
            <div style={{ flex: 1, minWidth: "120px" }}>
              <label style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginBottom: "4px", display: "block" }}>Due Date 📅</label>
              <input type="date" value={editDate} onChange={e => setEditDate(e.target.value)} className="form-input-styled" style={{ width: "100%", padding: "8px" }} />
            </div>
            <div style={{ flex: 1, minWidth: "100px" }}>
              <label style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginBottom: "4px", display: "block" }}>Time ⏰</label>
              <input type="time" value={editTime} onChange={e => setEditTime(e.target.value)} className="form-input-styled" style={{ width: "100%", padding: "8px" }} />
            </div>
            <div style={{ flex: 1, minWidth: "100px" }}>
              <label style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginBottom: "4px", display: "block" }}>Priority 🚩</label>
              <select value={editPriority} onChange={e => setEditPriority(e.target.value)} className="form-input-styled" style={{ width: "100%", padding: "8px" }}>
                <option value="High">High</option>
                <option value="Medium">Medium</option>
                <option value="Low">Low</option>
              </select>
            </div>
          </div>
          <div style={{ display: "flex", gap: "8px", justifyContent: "space-between", marginTop: "4px" }}>
            <button onClick={() => handleDelete(task.id)} style={{ background: "#fee2e2", border: "none", color: "#ef4444", borderRadius: "8px", padding: "8px 12px", cursor: "pointer", fontWeight: "600" }}>🗑 Delete</button>
            <div style={{ display: "flex", gap: "8px" }}>
              <button onClick={() => setEditingTaskId(null)} style={{ background: "transparent", border: "1px solid var(--border-light)", color: "var(--text-secondary)", borderRadius: "8px", padding: "8px 16px", cursor: "pointer", fontWeight: "600" }}>Cancel</button>
              <button onClick={() => saveEdit(task.id)} style={{ background: "var(--color-primary)", color: "white", border: "none", borderRadius: "8px", padding: "8px 20px", cursor: "pointer", fontWeight: "600", boxShadow: "0 4px 10px rgba(79,70,229,0.3)" }}>Save Update</button>
            </div>
          </div>
        </div>
      ) : (
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "12px" }}>
          <div style={{ display: "flex", alignItems: "flex-start", gap: "12px", flex: 1 }}>
            <button 
              onClick={() => updateTask(task.id, { completed: true })} 
              title="Mark Task Complete ✅"
              style={{ 
                width: "22px", height: "22px", borderRadius: "5px", border: "2px solid #cbd5e1", 
                background: "white", cursor: "pointer", flexShrink: 0, marginTop: "2px",
                transition: "all 0.2s"
              }} 
              onMouseOver={(e) => { e.currentTarget.style.borderColor = "#10b981"; e.currentTarget.style.background = "#d1fae5"; }}
              onMouseOut={(e) => { e.currentTarget.style.borderColor = "#cbd5e1"; e.currentTarget.style.background = "white"; }}
            />
            <div>
              <div style={{ fontWeight: "600", color: "var(--text-primary)", fontSize: "1rem", lineHeight: 1.3 }}>{task.title}</div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", marginTop: "6px", fontSize: "0.75rem", fontWeight: "600" }}>
                <span style={{ color: isOverdue ? "#ef4444" : "var(--text-muted)", background: isOverdue ? "#fee2e2" : "var(--bg-card)", padding: "2px 8px", borderRadius: "12px" }}>
                  {isOverdue ? `⚠️ Overdue (${task.dueDate})` : "📅 Today"}
                </span>
                <span style={{ color: "var(--text-muted)", background: "var(--bg-card)", padding: "2px 8px", borderRadius: "12px" }}>
                  ⏰ {task.dueTime || "No time"}
                </span>
                <span style={{ color: task.priority === "High" ? "#ef4444" : task.priority === "Medium" ? "#f59e0b" : "#3b82f6", background: "var(--bg-card)", padding: "2px 8px", borderRadius: "12px" }}>
                  🚩 {task.priority || "Medium"}
                </span>
              </div>
            </div>
          </div>
          <button onClick={() => startEdit(task)} style={{ background: "none", border: "none", cursor: "pointer", fontSize: "1.1rem", padding: "4px", borderRadius: "6px" }} title="Update Existing Task ✏️">
            ✏️
          </button>
        </div>
      )}
    </li>
  );

  return (
    <div className="reminder-modal-overlay" style={{ zIndex: 9999 }}>
      <div className="reminder-modal-card scale-in" style={{ width: "95%", maxWidth: "600px", padding: "28px", maxHeight: "90vh", display: "flex", flexDirection: "column" }}>
        
        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "16px" }}>
          <div>
            <h2 style={{ fontSize: "1.6rem", color: "var(--text-primary)", margin: "0 0 6px 0" }}>🌙 Night Review</h2>
            <p style={{ color: "var(--text-secondary)", margin: 0, fontSize: "0.95rem" }}>
              Review your remaining tasks before ending the day.
            </p>
          </div>
          <button onClick={() => setShow(false)} style={{ background: "none", border: "none", fontSize: "1.5rem", cursor: "pointer", color: "var(--text-muted)" }}>&times;</button>
        </div>

        {/* Top Stats Dashboard */}
        <div style={{ background: "var(--bg-app)", padding: "16px", borderRadius: "12px", marginBottom: "16px", display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "12px", border: "1px solid var(--border-light)" }}>
          <div style={{ background: "rgba(16, 185, 129, 0.1)", padding: "12px", borderRadius: "8px", textAlign: "center" }}>
            <div style={{ fontSize: "1.5rem", fontWeight: "800", color: "#10b981" }}>{completionRate}%</div>
            <div style={{ fontSize: "0.85rem", color: "var(--text-secondary)", fontWeight: "600" }}>Completion Rate</div>
          </div>
          <div style={{ background: "rgba(245, 158, 11, 0.1)", padding: "12px", borderRadius: "8px", textAlign: "center" }}>
            <div style={{ fontSize: "1.5rem", fontWeight: "800", color: "#f59e0b" }}>{pendingTasks.length}</div>
            <div style={{ fontSize: "0.85rem", color: "var(--text-secondary)", fontWeight: "600" }}>Pending Tasks</div>
          </div>
          <div style={{ background: "rgba(239, 68, 68, 0.1)", padding: "12px", borderRadius: "8px", textAlign: "center" }}>
            <div style={{ fontSize: "1.5rem", fontWeight: "800", color: "#ef4444" }}>{overdueTasks.length}</div>
            <div style={{ fontSize: "0.85rem", color: "var(--text-secondary)", fontWeight: "600" }}>Overdue Tasks</div>
          </div>
        </div>

        {/* Motivational Message */}
        <div style={{ background: "var(--bg-app)", padding: "16px", borderRadius: "12px", marginBottom: "20px", border: "1px solid var(--border-light)" }}>
          <h3 style={{ fontSize: "1rem", color: "var(--text-primary)", marginBottom: "8px" }}>💡 Progress Insights</h3>
          <p style={{ color: "var(--text-secondary)", fontSize: "0.95rem", lineHeight: "1.5", margin: 0 }}>{aiSuggestions}</p>
        </div>

        {/* Task Lists (Scrollable) */}
        <div style={{ flex: 1, overflowY: "auto", paddingRight: "8px", marginBottom: "20px" }}>
          {(pendingTasks.length === 0 && overdueTasks.length === 0) ? (
            <div style={{ textAlign: "center", padding: "30px 20px", background: "var(--bg-app)", borderRadius: "12px", border: "1px dashed var(--border-light)" }}>
              <span style={{ fontSize: "2.5rem" }}>🎉</span>
              <p style={{ fontWeight: "700", marginTop: "12px", fontSize: "1.1rem", color: "var(--color-success)" }}>Congratulations!</p>
              <p style={{ color: "var(--text-muted)", fontSize: "0.95rem", marginTop: "4px" }}>You've completed all your tasks for today.</p>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
              {/* Overdue Tasks Section */}
              {overdueTasks.length > 0 && (
                <div>
                  <h3 style={{ fontSize: "1.05rem", color: "#ef4444", marginBottom: "12px", borderBottom: "1px solid var(--border-light)", paddingBottom: "8px" }}>
                    ⚠️ Overdue Tasks
                  </h3>
                  <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: "12px" }}>
                    {overdueTasks.map(task => renderTaskRow(task, true))}
                  </ul>
                </div>
              )}

              {/* Today's Pending Tasks Section */}
              {pendingTasks.length > 0 && (
                <div>
                  <h3 style={{ fontSize: "1.05rem", color: "var(--text-primary)", marginBottom: "12px", borderBottom: "1px solid var(--border-light)", paddingBottom: "8px" }}>
                    📅 Today's Pending Tasks
                  </h3>
                  <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: "12px" }}>
                    {pendingTasks.map(task => renderTaskRow(task, false))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>

        <button onClick={handleFinish} style={{ width: "100%", padding: "16px", background: "#7c3aed", color: "white", border: "none", borderRadius: "12px", fontSize: "1.05rem", fontWeight: "700", cursor: "pointer", boxShadow: "0 8px 20px rgba(124,58,237,0.3)", transition: "transform 0.2s" }} onMouseOver={e => e.currentTarget.style.transform="translateY(-2px)"} onMouseOut={e => e.currentTarget.style.transform="none"}>
          Close & Good Night 🌙
        </button>
      </div>
    </div>
  );
}
