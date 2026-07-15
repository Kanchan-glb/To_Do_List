import { useState, useEffect } from "react";
import { useTasks } from "../context/TaskContext";
import { format } from "date-fns";
import { useNavigate } from "react-router-dom";

export default function MorningPopup() {
  const { tasks, updateTask, completeMorningPlanning, morningPlannerCompleted } = useTasks();
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
    window.addEventListener('openMorningPlanner', handleOpen);

    return () => window.removeEventListener('openMorningPlanner', handleOpen);
  }, []);

  if (!show) return null;

  // For the planner we show pending tasks that are due today, overdue, or rescheduled
  const relevantTasks = tasks.filter(t => !t.completed && (t.dueDate <= todayStr || t.rescheduleCount > 0));

  const handleFinish = () => {
    completeMorningPlanning();
    setShow(false);
  };
  
  const openAddTask = () => {
    setShow(false);
    navigate("/tasks", { state: { openAddTaskModal: true } });
  };
  
  const openDashboard = () => {
    setShow(false);
    navigate("/dashboard");
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

  return (
    <div className="reminder-modal-overlay" style={{ zIndex: 9999 }}>
      <div className="reminder-modal-card scale-in" style={{ width: "95%", maxWidth: "600px", padding: "28px", maxHeight: "85vh", display: "flex", flexDirection: "column" }}>
        
        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "16px" }}>
          <div>
            <h2 style={{ fontSize: "1.6rem", color: "var(--text-primary)", margin: "0 0 6px 0" }}>☀️ Good Morning!</h2>
            <p style={{ color: "var(--text-secondary)", margin: 0, fontSize: "0.95rem" }}>
              Take a moment to review and plan your day. 
            </p>
          </div>
          <button onClick={() => setShow(false)} style={{ background: "none", border: "none", fontSize: "1.5rem", cursor: "pointer", color: "var(--text-muted)" }}>&times;</button>
        </div>

        {/* Task List (Scrollable) */}
        <div style={{ flex: 1, overflowY: "auto", paddingRight: "8px", marginBottom: "20px" }}>
          {relevantTasks.length === 0 ? (
            <div style={{ textAlign: "center", padding: "30px 20px", background: "var(--bg-app)", borderRadius: "12px", border: "1px dashed var(--border-light)" }}>
              <span style={{ fontSize: "2rem" }}>🎉</span>
              <p style={{ fontWeight: "600", marginTop: "12px" }}>All caught up!</p>
              <p style={{ color: "var(--text-muted)", fontSize: "0.9rem" }}>You have no pending or overdue tasks for today.</p>
            </div>
          ) : (
            <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: "12px" }}>
              {relevantTasks.map(task => {
                const isOverdue = task.dueDate < todayStr;
                return (
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
                        <div style={{ display: "flex", gap: "8px", justifyContent: "flex-end", marginTop: "4px" }}>
                          <button onClick={() => setEditingTaskId(null)} style={{ background: "transparent", border: "1px solid var(--border-light)", color: "var(--text-secondary)", borderRadius: "8px", padding: "8px 16px", cursor: "pointer", fontWeight: "600" }}>Cancel</button>
                          <button onClick={() => saveEdit(task.id)} style={{ background: "var(--color-primary)", color: "white", border: "none", borderRadius: "8px", padding: "8px 20px", cursor: "pointer", fontWeight: "600", boxShadow: "0 4px 10px rgba(79,70,229,0.3)" }}>Save Update</button>
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
                                {isOverdue ? "⚠️ Overdue" : "📅 Today"}
                              </span>
                              <span style={{ color: "var(--text-muted)", background: "var(--bg-card)", padding: "2px 8px", borderRadius: "12px" }}>
                                ⏰ {task.dueTime}
                              </span>
                              <span style={{ color: task.priority === "High" ? "#ef4444" : task.priority === "Medium" ? "#f59e0b" : "#3b82f6", background: "var(--bg-card)", padding: "2px 8px", borderRadius: "12px" }}>
                                🚩 {task.priority}
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
              })}
            </ul>
          )}
        </div>

        {/* Global Actions */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", marginBottom: "16px" }}>
          <button onClick={openAddTask} style={{ padding: "12px", background: "var(--bg-app)", color: "var(--text-primary)", border: "1px solid var(--border-light)", borderRadius: "10px", fontSize: "0.95rem", fontWeight: "600", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: "6px" }}>
            ➕ Add New Task
          </button>
          <button onClick={openDashboard} style={{ padding: "12px", background: "var(--bg-app)", color: "var(--text-primary)", border: "1px solid var(--border-light)", borderRadius: "10px", fontSize: "0.95rem", fontWeight: "600", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: "6px" }}>
            📋 View Dashboard
          </button>
        </div>

        <button onClick={handleFinish} style={{ width: "100%", padding: "16px", background: "var(--color-primary)", color: "white", border: "none", borderRadius: "12px", fontSize: "1.05rem", fontWeight: "700", cursor: "pointer", boxShadow: "0 8px 20px rgba(79,70,229,0.3)", transition: "transform 0.2s" }} onMouseOver={e => e.currentTarget.style.transform="translateY(-2px)"} onMouseOut={e => e.currentTarget.style.transform="none"}>
          Looks Good, Let's Start! 🚀
        </button>
      </div>
    </div>
  );
}
