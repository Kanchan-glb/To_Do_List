import { useState, useEffect, useMemo } from "react";
import { useTasks } from "../context/TaskContext";
import { format, isToday, parseISO, addHours } from "date-fns";
import { generateSuggestions } from "../services/gemini";
import { getSpeechRecognizer, parseSpeechToTask } from "../services/speech";
import { calculateDefaultDueTime, CATEGORY_DEFAULT_DURATION } from "../utils/taskUtils";
import toast from "react-hot-toast";
import "../planner.css";
import "../tasks.css";

const TaskStatusDropdown = ({ task }) => {
  const { updateTask } = useTasks();
  const isCompleted = task.completed || task.status === "completed";

  return (
    <div style={{ display: "flex", alignItems: "center", gap: "6px" }} onClick={(e) => e.stopPropagation()}>
      <input
        type="checkbox"
        checked={isCompleted}
        disabled={isCompleted}
        title={isCompleted ? "This task has already been completed." : "Mark as Completed"}
        onChange={async (e) => {
          if (isCompleted) return;

          // Subtasks validation
          const hasIncompleteSubtasks = task.subtasks && task.subtasks.length > 0 && task.subtasks.some(s => !s.completed);
          if (hasIncompleteSubtasks) {
            const completedCount = task.subtasks.filter(s => s.completed).length;
            toast.error(`Complete all subtasks before marking this task as completed. (${completedCount} of ${task.subtasks.length} completed)`);
            return;
          }

          try {
            await updateTask(task.id, { completed: true, status: "completed" });
          } catch (err) { }
        }}
        style={{
          width: "16px",
          height: "16px",
          accentColor: "#10b981",
          cursor: isCompleted ? "not-allowed" : "pointer"
        }}
      />
      <span style={{ fontSize: "0.82rem", fontWeight: "700", color: isCompleted ? "#10b981" : "var(--text-muted)" }}>
        {isCompleted ? "Completed ✓" : "Mark Complete"}
      </span>
    </div>
  );
};

function MorningPlanner({ onClose }) {
  const { tasks, addTask, updateTask, completeMorningPlanning, geminiApiKey } = useTasks();
  const userName = localStorage.getItem("smartName") || "there";

  // Voice recognition states
  const [isRecording, setIsRecording] = useState(false);
  const [transcribedText, setTranscribedText] = useState("");
  const [voiceError, setVoiceError] = useState("");

  // Edit states
  const [editingTaskId, setEditingTaskId] = useState(null);
  const [editTitle, setEditTitle] = useState("");
  const [editTime, setEditTime] = useState("");

  // Manual input states
  const [showManualForm, setShowManualForm] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newCategory, setNewCategory] = useState("Work");
  const [newCustomCategory, setNewCustomCategory] = useState("");
  const [isAddingCategory, setIsAddingCategory] = useState(false);
  const [newPriority, setNewPriority] = useState("Medium");

  const presetCategories = ["Work", "Personal", "Health", "Learning", "Shopping"];
  const dynamicCategories = [...new Set([...tasks.map(t => t.category), newCategory].filter(Boolean))];
  const allCategories = [...new Set([...presetCategories, ...dynamicCategories])].filter(cat => cat !== "Custom");

  const [isTimeManuallySet, setIsTimeManuallySet] = useState(false);
  const [newTime, setNewTime] = useState(() => calculateDefaultDueTime("Work"));

  // Recalculate time on category change if not manually set
  useEffect(() => {
    if (!isTimeManuallySet) {
      const activeCat = isAddingCategory ? newCustomCategory : newCategory;
      setNewTime(calculateDefaultDueTime(activeCat));
    }
  }, [newCategory, newCustomCategory, isAddingCategory, isTimeManuallySet]);

  const todayStr = format(new Date(), "yyyy-MM-dd");
  const currentTimeStr = format(new Date(), "HH:mm");
  const [newDate, setNewDate] = useState(todayStr);
  const [timeError, setTimeError] = useState("");

  // Filter tasks
  const overdueOrRescheduledTasks = tasks.filter((t) => !t.completed && (t.dueDate < todayStr || t.rescheduleCount > 0));
  const todayTasks = tasks.filter((t) => !t.completed && t.dueDate === todayStr && t.rescheduleCount === 0);
  const futureTasks = tasks.filter((t) => !t.completed && t.dueDate > todayStr && t.rescheduleCount === 0);

  const resetForm = () => {
    setNewTitle("");
    setNewCategory("Work");
    setNewCustomCategory("");
    setIsAddingCategory(false);
    setNewPriority("Medium");
    setIsTimeManuallySet(false);
    setNewTime(calculateDefaultDueTime("Work"));
    setNewDate(todayStr);
    setTimeError("");
    setVoiceError("");
    setTranscribedText("");
  };

  // Voice Handler
  const handleVoiceInput = () => {
    resetForm();
    setShowManualForm(false);

    const recognizer = getSpeechRecognizer(
      (result) => {
        setTranscribedText(result);
        setIsRecording(false);
        // Parse task automatically but let user review it
        const parsed = parseSpeechToTask(result);
        setNewTitle(parsed.title);
        // Use parsed date ("tomorrow" etc.) — not always today
        if (parsed.dueDate) setNewDate(parsed.dueDate);
        // Use parsed time; mark as manually set to prevent category-based override
        if (parsed.dueTime) {
          setNewTime(parsed.dueTime);
          setIsTimeManuallySet(true);
        }
        // Apply detected priority and category
        if (parsed.priority) setNewPriority(parsed.priority);
        if (parsed.category && parsed.category !== "General") setNewCategory(parsed.category);
        setShowManualForm(true);
      },
      (err) => {
        setVoiceError(err);
        setIsRecording(false);
      },
      () => {
        setIsRecording(false);
      }
    );

    if (!recognizer) {
      setVoiceError("Your browser doesn't support Voice Input. Please try Chrome/Edge.");
      return;
    }

    setIsRecording(true);
    try {
      recognizer.start();
    } catch (e) {
      setIsRecording(false);
      setVoiceError("Microphone access is blocked. Please allow microphone permission in your browser settings and try again.");
    }
  };

  const handleWriteTaskClick = () => {
    if (!showManualForm) {
      resetForm();
      setShowManualForm(true);
      setIsRecording(false);
    } else {
      setShowManualForm(false);
    }
  };

  // Manual Add Handler
  const handleManualAdd = (e) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    const taskObj = {
      title: newTitle.trim(),
      description: transcribedText ? `From Voice: "${transcribedText}"` : "Added during Morning Planning",
      category: isAddingCategory ? (newCustomCategory.trim() || "General") : newCategory,
      priority: newPriority,
      dueDate: newDate,
      dueTime: newTime,
      subtasks: []
    };

    addTask(taskObj);

    resetForm();
    setShowManualForm(false);
  };

  return (
    <div className="planner-page">
      <div className="planner-grid">
        {/* Left Side: Schedule */}
        <div className="planner-card">
          <h2>📅 Your Schedule Today</h2>
          {todayTasks.length === 0 ? (
            <p style={{ color: "#6b7280", fontStyle: "italic", margin: 0 }}>No tasks scheduled for today yet.</p>
          ) : (
            <ul className="planner-task-list">
              {todayTasks.map((task) => (
                <li key={task.id} className="planner-task-item" style={{ flexDirection: "column", alignItems: "flex-start", gap: "8px" }}>
                  {editingTaskId === task.id ? (
                    <div style={{ display: "flex", gap: "8px", width: "100%", alignItems: "center" }}>
                      <input type="text" value={editTitle} onChange={e => setEditTitle(e.target.value)} className="form-input-styled" style={{ padding: "6px 10px" }} />
                      <input type="time" value={editTime} onChange={e => setEditTime(e.target.value)} className="form-input-styled" style={{ width: "120px", padding: "6px 10px" }} />
                      <button onClick={() => { updateTask(task.id, { title: editTitle, dueTime: editTime }); setEditingTaskId(null); }} style={{ background: "var(--color-primary)", color: "white", border: "none", padding: "6px 12px", borderRadius: "8px", cursor: "pointer" }}>Save</button>
                      <button onClick={() => setEditingTaskId(null)} style={{ background: "transparent", border: "1px solid var(--border-light)", color: "var(--text-secondary)", padding: "6px 12px", borderRadius: "8px", cursor: "pointer" }}>Cancel</button>
                    </div>
                  ) : (
                    <div style={{ display: "flex", flexDirection: "column", gap: "6px", width: "100%" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", width: "100%", alignItems: "center" }}>
                        <span className="planner-task-title">{task.title}</span>
                        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                          <span className="planner-task-time">Due Date: {task.dueDate}{task.dueTime ? ` • Due Time: ${task.dueTime}` : ''}</span>
                          <button onClick={() => { setEditingTaskId(task.id); setEditTitle(task.title); setEditTime(task.dueTime || "12:00"); }} style={{ background: "none", border: "none", cursor: "pointer", fontSize: "1.1rem" }} title="Edit Task">✏️</button>
                        </div>
                      </div>
                      <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
                        <TaskStatusDropdown task={task} />
                      </div>
                    </div>
                  )}
                </li>
              ))}
            </ul>
          )}

          {overdueOrRescheduledTasks.length > 0 && (
            <div style={{ marginTop: "32px" }}>
              <h3 style={{ color: "#dc2626", fontSize: "1rem", margin: "0 0 12px", fontWeight: "700" }}>⚠️ Previous / Rescheduled Tasks</h3>
              <ul className="planner-task-list">
                {overdueOrRescheduledTasks.map((task) => (
                  <li key={task.id} className="planner-task-item overdue" style={{ flexDirection: "column", alignItems: "flex-start", gap: "8px" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", width: "100%", alignItems: "center" }}>
                      <span className="planner-task-title">{task.title}</span>
                      <span className="planner-task-time">{task.dueDate < todayStr ? "Overdue" : "Rescheduled"}</span>
                    </div>
                    <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
                      <TaskStatusDropdown task={task} />
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {futureTasks.length > 0 && (
            <div style={{ marginTop: "32px" }}>
              <h3 style={{ color: "#3b82f6", fontSize: "1rem", margin: "0 0 12px", fontWeight: "700" }}>⏭️ Future Tasks</h3>
              <ul className="planner-task-list">
                {futureTasks.map((task) => (
                  <li key={task.id} className="planner-task-item" style={{ opacity: 0.8, flexDirection: "column", alignItems: "flex-start", gap: "8px" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", width: "100%", alignItems: "center" }}>
                      <span className="planner-task-title">{task.title}</span>
                      <span className="planner-task-time">{task.dueDate}</span>
                    </div>
                    <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
                      <TaskStatusDropdown task={task} />
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* Right Side: Quick Input */}
        <div className="planner-card">
          <div className="planner-quick-input" style={{ marginTop: 0, paddingTop: 0, borderTop: "none" }}>
            <h2 style={{ marginTop: 0, marginBottom: "24px", color: "#1e293b", fontSize: "1.4rem" }}>Add Tasks</h2>

            <div className="planner-quick-actions">
              <button
                type="button"
                className={`secondary-button ${isRecording ? "active" : ""}`}
                onClick={handleVoiceInput}
                style={{ flex: 1, padding: "12px", display: "flex", alignItems: "center", justifyContent: "center", gap: "8px", borderRadius: "12px" }}
              >
                🎤 {isRecording ? "Listening..." : "Speak Task"}
              </button>
              <button
                type="button"
                className="secondary-button"
                onClick={handleWriteTaskClick}
                style={{ flex: 1, padding: "12px", borderRadius: "12px" }}
              >
                ✍️ Write Task
              </button>
            </div>

            {isRecording && (
              <div className="voice-wave-container" style={{ margin: "16px 0" }}>
                <div className="voice-wave-bar"></div>
                <div className="voice-wave-bar"></div>
                <div className="voice-wave-bar"></div>
                <div className="voice-wave-bar"></div>
                <div className="voice-wave-bar"></div>
                <div className="voice-wave-bar"></div>
                <div className="voice-wave-bar"></div>
                <div className="voice-wave-bar"></div>
              </div>
            )}

            {voiceError && (
              <div style={{ margin: "8px 0", padding: "12px", background: "#fef2f2", border: "1px solid #f87171", borderRadius: "8px", display: "flex", flexDirection: "column", gap: "8px" }}>
                <p style={{ color: "#ef4444", fontSize: "0.85rem", margin: 0 }}>{voiceError}</p>
                {voiceError.includes("Microphone access is blocked") && (
                  <button
                    type="button"
                    onClick={handleVoiceInput}
                    style={{ background: "#ef4444", color: "white", border: "none", padding: "6px 12px", borderRadius: "6px", cursor: "pointer", fontSize: "0.85rem", fontWeight: "bold", width: "fit-content" }}
                  >
                    Retry
                  </button>
                )}
              </div>
            )}
            {transcribedText && <p style={{ fontSize: "0.95rem", margin: "8px 0", fontStyle: "italic", color: "#4f46e5", fontWeight: "500" }}>"{transcribedText}"</p>}

            {showManualForm && (
              <form onSubmit={handleManualAdd} style={{ marginTop: "16px", display: "flex", flexDirection: "column", gap: "12px" }}>
                <input
                  type="text"
                  placeholder="Task title..."
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="form-input-styled"
                  style={{ padding: "12px 16px" }}
                  required
                  autoFocus
                />

                <div style={{ display: "flex", gap: "12px" }}>
                  <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "8px" }}>
                    {!isAddingCategory ? (
                      <select
                        value={newCategory}
                        onChange={(e) => {
                          if (e.target.value === "Custom") {
                            setIsAddingCategory(true);
                          } else {
                            setNewCategory(e.target.value);
                          }
                        }}
                        className="form-input-styled"
                        style={{ padding: "10px 14px" }}
                      >
                        {allCategories.map(cat => (
                          <option key={`opt-${cat}`} value={cat}>{cat}</option>
                        ))}
                        <option value="Custom" style={{ fontWeight: 'bold' }}>+ Add New Category</option>
                      </select>
                    ) : (
                      <div style={{ display: "flex", flexDirection: "column", gap: "8px", width: "100%" }}>
                        <div style={{ display: "flex", gap: "8px" }}>
                          <input
                            type="text"
                            placeholder="New category..."
                            value={newCustomCategory}
                            onChange={(e) => setNewCustomCategory(e.target.value)}
                            className="form-input-styled"
                            style={{ flex: 1, padding: "10px 14px" }}
                            autoFocus
                          />
                          <button
                            type="button"
                            onClick={() => { setIsAddingCategory(false); setNewCustomCategory(""); setNewCategory("Work"); }}
                            style={{ background: "#e2e8f0", color: "#475569", border: "none", borderRadius: "8px", width: "36px", height: "36px", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", fontWeight: "bold", flexShrink: 0 }}
                            title="Cancel"
                          >
                            ✕
                          </button>
                        </div>
                        <div style={{
                          display: "flex",
                          alignItems: "flex-start",
                          gap: "8px",
                          background: "#eff6ff",
                          border: "1px solid #bfdbfe",
                          borderRadius: "8px",
                          padding: "10px 12px",
                          color: "#1e3a8a",
                          fontSize: "0.75rem",
                          lineHeight: "1.4",
                          marginTop: "4px"
                        }}>
                          <span style={{ fontSize: "0.95rem", lineHeight: "1", flexShrink: 0 }}>ℹ️</span>
                          <span>Once you create this category, it will be saved and automatically appear in the category list the next time you add a task.</span>
                        </div>
                      </div>
                    )}
                  </div>
                  <select
                    value={newPriority}
                    onChange={(e) => setNewPriority(e.target.value)}
                    className="form-input-styled"
                    style={{ flex: 1, padding: "10px 14px", height: "fit-content" }}
                  >
                    <option value="High">High Priority</option>
                    <option value="Medium">Medium Priority</option>
                    <option value="Low">Low Priority</option>
                  </select>
                </div>

                <div style={{ display: "flex", gap: "12px", marginTop: "4px" }}>
                  <div style={{ flex: 1 }}>
                    <label style={{ fontSize: "0.85rem", color: "#64748b", fontWeight: "600", marginBottom: "4px", display: "block" }}>Complete By Date</label>
                    <input
                      type="date"
                      value={newDate}
                      min={todayStr}
                      onChange={(e) => {
                        const selectedDate = e.target.value;
                        setNewDate(selectedDate);
                        if (selectedDate === todayStr) {
                          const nowTime = format(new Date(), "HH:mm");
                          if (newTime < nowTime) {
                            setTimeError("You can't select a previous time for today.");
                          } else {
                            setTimeError("");
                          }
                        } else {
                          setTimeError("");
                        }
                      }}
                      onClick={(e) => {
                        try {
                          e.target.showPicker();
                        } catch (err) {
                          // ignore
                        }
                      }}
                      className="form-input-styled"
                      style={{ width: "100%", padding: "10px 14px" }}
                      required
                    />
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "4px" }}>
                      <label style={{ fontSize: "0.85rem", color: "#64748b", fontWeight: "600" }}>Time</label>
                      {/* {!isTimeManuallySet && (
                        <span style={{
                          fontSize: "0.7rem",
                          background: "#eff6ff",
                          color: "#3b82f6",
                          border: "1px solid #bfdbfe",
                          borderRadius: "20px",
                          padding: "2px 8px",
                          fontWeight: "600",
                          letterSpacing: "0.02em"
                        }}>⏱ Auto-suggested</span>
                      )} */}
                    </div>
                    <input
                      type="time"
                      value={newTime}
                      min={newDate === todayStr ? currentTimeStr : undefined}
                      onChange={(e) => {
                        const selectedTime = e.target.value;
                        setIsTimeManuallySet(true);
                        if (newDate === todayStr) {
                          const nowTime = format(new Date(), "HH:mm");
                          if (selectedTime < nowTime) {
                            setTimeError("You can't select a previous time for today.");
                            setNewTime(selectedTime);
                            return;
                          }
                        }
                        setTimeError("");
                        setNewTime(selectedTime);
                      }}
                      onClick={(e) => {
                        try {
                          e.target.showPicker();
                        } catch (err) {
                          // ignore
                        }
                      }}
                      className="form-input-styled"
                      style={{ width: "100%", padding: "10px 14px" }}
                      required
                    />
                    {/* {!isTimeManuallySet && (() => {
                      const activeCat = isAddingCategory ? (newCustomCategory || "Other") : newCategory;
                      const duration = CATEGORY_DEFAULT_DURATION[activeCat] || CATEGORY_DEFAULT_DURATION.Other;
                      return (
                        <div style={{ marginTop: "5px", fontSize: "0.75rem", color: "#64748b", display: "flex", alignItems: "center", gap: "4px" }}>
                          <span>💡</span>
                          <span>
                            <strong>{activeCat}</strong> task ke liye <strong>{duration} min</strong> suggest kiya gaya hai (abhi se)
                          </span>
                        </div>
                      );
                    })()} */}
                    {timeError && (
                      <div style={{ color: "#ef4444", fontSize: "0.8rem", marginTop: "4px" }}>
                        {timeError}
                      </div>
                    )}
                  </div>
                </div>

                <button type="submit" className="primary-btn" style={{ padding: "12px", borderRadius: "12px", marginTop: "4px", color: "black", fontWeight: "bold", opacity: timeError ? 0.5 : 1 }} disabled={!!timeError}>
                  Add Task
                </button>
              </form>
            )}
          </div>
        </div>
      </div>

      <div style={{ display: "flex", justifyContent: "center", gap: "16px", marginTop: "40px" }}>
        {/* <button
          type="button"
          onClick={() => {
            if (onClose) onClose();
          }}
          className="secondary-button"
          style={{ padding: "12px 24px", borderRadius: "12px" }}
        >
          Back to Dashboard
        </button> */}
        {/* <button
          type="button"
          onClick={() => {
            completeMorningPlanning();
            if (onClose) onClose();
          }}
          className="planner-start-btn"
        >
          🚀 Start My Productive Day
        </button> */}
      </div>
    </div>
  );
}

export default MorningPlanner;

