import { useState, useEffect } from "react";
import { useTasks } from "../context/TaskContext";
import { format, addHours } from "date-fns";

export default function MorningPopup() {
  const { tasks, addTask, updateTask, completeMorningPlanning, morningPlannerCompleted } = useTasks();
  const [show, setShow] = useState(false);
  
  const [editingTaskId, setEditingTaskId] = useState(null);
  const [editTitle, setEditTitle] = useState("");
  const [editTime, setEditTime] = useState("");
  
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const defaultTime = format(addHours(new Date(), 1), "HH:mm");
  const [newTaskTime, setNewTaskTime] = useState(defaultTime);

  const todayStr = format(new Date(), "yyyy-MM-dd");

  useEffect(() => {
    const currentHour = new Date().getHours();
    const isMorning = currentHour >= 5 && currentHour < 12;
    if (isMorning && !morningPlannerCompleted) {
      setShow(true);
    } else {
      setShow(false);
    }
  }, [morningPlannerCompleted]);

  if (!show) return null;

  const relevantTasks = tasks.filter(t => !t.completed && (t.dueDate <= todayStr || t.rescheduleCount > 0));

  const handleAddNewTask = (e) => {
    e.preventDefault();
    if (!newTaskTitle.trim()) return;
    addTask({
      title: newTaskTitle.trim(),
      description: "Added from Morning Popup",
      category: "Work",
      priority: "Medium",
      dueDate: todayStr,
      dueTime: newTaskTime,
      subtasks: []
    });
    setNewTaskTitle("");
  };

  const handleFinish = () => {
    completeMorningPlanning();
    setShow(false);
  };

  return (
    <div className="reminder-modal-overlay" style={{ zIndex: 9999 }}>
      <div className="reminder-modal-card scale-in" style={{ width: "90%", maxWidth: "500px", padding: "24px", maxHeight: "85vh", overflowY: "auto" }}>
        <h2 style={{ fontSize: "1.4rem", color: "var(--text-primary)", marginBottom: "8px" }}>☀️ Good Morning!</h2>
        <p style={{ color: "var(--text-secondary)", marginBottom: "20px", fontSize: "0.95rem" }}>Here are your pending tasks. Update them or add new ones for today.</p>
        
        <div style={{ marginBottom: "24px" }}>
          {relevantTasks.length === 0 ? (
            <p style={{ fontStyle: "italic", color: "var(--text-muted)" }}>No pending tasks for today.</p>
          ) : (
            <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: "12px" }}>
              {relevantTasks.map(task => (
                <li key={task.id} style={{ background: "var(--bg-app)", padding: "12px", borderRadius: "12px", border: "1px solid var(--border-light)" }}>
                  {editingTaskId === task.id ? (
                    <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
                      <input type="text" value={editTitle} onChange={e => setEditTitle(e.target.value)} className="form-input-styled" style={{ flex: "1 1 100%", padding: "8px" }} />
                      <input type="time" value={editTime} onChange={e => setEditTime(e.target.value)} className="form-input-styled" style={{ flex: 1, padding: "8px" }} />
                      <button onClick={() => { updateTask(task.id, { title: editTitle, dueTime: editTime }); setEditingTaskId(null); }} style={{ background: "var(--color-primary)", color: "white", border: "none", borderRadius: "8px", padding: "0 12px", cursor: "pointer" }}>Save</button>
                      <button onClick={() => setEditingTaskId(null)} style={{ background: "transparent", border: "1px solid var(--border-light)", color: "var(--text-secondary)", borderRadius: "8px", padding: "0 12px", cursor: "pointer" }}>Cancel</button>
                    </div>
                  ) : (
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <div>
                        <div style={{ fontWeight: "600", color: "var(--text-primary)", fontSize: "0.95rem" }}>{task.title}</div>
                        <div style={{ fontSize: "0.8rem", color: task.dueDate < todayStr ? "var(--color-danger)" : "var(--text-muted)" }}>
                          {task.dueDate < todayStr ? "Overdue" : task.dueTime}
                        </div>
                      </div>
                      <button onClick={() => { setEditingTaskId(task.id); setEditTitle(task.title); setEditTime(task.dueTime || "12:00"); }} style={{ background: "none", border: "none", cursor: "pointer", fontSize: "1.1rem" }} title="Edit Task">✏️</button>
                    </div>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>

        <div style={{ borderTop: "1px solid var(--border-light)", paddingTop: "20px", marginBottom: "24px" }}>
          <h3 style={{ fontSize: "1rem", color: "var(--text-primary)", marginBottom: "12px" }}>➕ Add New Task</h3>
          <form onSubmit={handleAddNewTask} style={{ display: "flex", gap: "8px" }}>
            <input type="text" placeholder="Task name..." value={newTaskTitle} onChange={e => setNewTaskTitle(e.target.value)} className="form-input-styled" style={{ flex: 2, padding: "10px" }} />
            <input type="time" value={newTaskTime} onChange={e => setNewTaskTime(e.target.value)} className="form-input-styled" style={{ flex: 1, padding: "10px" }} />
            <button type="submit" style={{ background: "var(--color-success)", color: "white", border: "none", borderRadius: "8px", padding: "0 16px", cursor: "pointer", fontWeight: "bold" }}>Add</button>
          </form>
        </div>

        <button onClick={handleFinish} style={{ width: "100%", padding: "14px", background: "var(--color-primary)", color: "white", border: "none", borderRadius: "12px", fontSize: "1rem", fontWeight: "600", cursor: "pointer" }}>
          Looks Good, Let's Start!
        </button>
      </div>
    </div>
  );
}
