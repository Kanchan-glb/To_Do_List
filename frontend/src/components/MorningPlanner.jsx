import { useState, useEffect } from "react";
import { useTasks } from "../context/TaskContext";
import { format, isToday, parseISO } from "date-fns";
import { generateSuggestions } from "../services/gemini";
import { getSpeechRecognizer, parseSpeechToTask } from "../services/speech";
import "../planner.css";
import "../tasks.css";

function MorningPlanner({ onClose }) {
  const { tasks, addTask, completeMorningPlanning, geminiApiKey } = useTasks();
  const userName = localStorage.getItem("smartName") || "there";

  // Voice recognition states
  const [isRecording, setIsRecording] = useState(false);
  const [transcribedText, setTranscribedText] = useState("");
  const [voiceError, setVoiceError] = useState("");

  // Manual input states
  const [showManualForm, setShowManualForm] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newCategory, setNewCategory] = useState("Work");
  const [newPriority, setNewPriority] = useState("Medium");
  const [newTime, setNewTime] = useState("12:00");
  
  const todayStr = format(new Date(), "yyyy-MM-dd");
  const [newDate, setNewDate] = useState(todayStr);

  // Filter tasks
  const overdueOrRescheduledTasks = tasks.filter((t) => !t.completed && (t.dueDate < todayStr || t.rescheduleCount > 0));
  const todayTasks = tasks.filter((t) => !t.completed && t.dueDate === todayStr && t.rescheduleCount === 0);
  const futureTasks = tasks.filter((t) => !t.completed && t.dueDate > todayStr && t.rescheduleCount === 0);

  // Voice Handler
  const handleVoiceInput = () => {
    setVoiceError("");
    setTranscribedText("");

    const recognizer = getSpeechRecognizer(
      (result) => {
        setTranscribedText(result);
        setIsRecording(false);
        // Parse task automatically but let user review it
        const parsed = parseSpeechToTask(result);
        setNewTitle(parsed.title);
        setNewTime(parsed.dueTime || "12:00");
        setNewDate(todayStr);
        setShowManualForm(true);
      },
      (err) => {
        setVoiceError(`Voice Error: ${err}`);
        setIsRecording(false);
      },
      () => {
        setIsRecording(false);
      }
    );

    if (!recognizer) {
      setVoiceError("Your browser doesn't support Voice Input, or microphone is blocked. Please try Chrome/Edge and ensure microphone permission is allowed.");
      return;
    }

    setIsRecording(true);
    recognizer.start();
  };

  // Manual Add Handler
  const handleManualAdd = (e) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    addTask({
      title: newTitle.trim(),
      description: transcribedText ? `From Voice: "${transcribedText}"` : "Added during Morning Planning",
      category: newCategory,
      priority: newPriority,
      dueDate: newDate,
      dueTime: newTime,
      subtasks: []
    });

    setNewTitle("");
    setTranscribedText("");
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
                <li key={task.id} className="planner-task-item">
                  <span className="planner-task-title">{task.title}</span>
                  <span className="planner-task-time">{task.dueTime}</span>
                </li>
              ))}
            </ul>
          )}

          {overdueOrRescheduledTasks.length > 0 && (
            <div style={{ marginTop: "32px" }}>
              <h3 style={{ color: "#dc2626", fontSize: "1rem", margin: "0 0 12px", fontWeight: "700" }}>⚠️ Previous / Rescheduled Tasks</h3>
              <ul className="planner-task-list">
                {overdueOrRescheduledTasks.map((task) => (
                  <li key={task.id} className="planner-task-item overdue">
                    <span className="planner-task-title">{task.title}</span>
                    <span className="planner-task-time">{task.dueDate < todayStr ? "Overdue" : "Rescheduled"}</span>
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
                  <li key={task.id} className="planner-task-item" style={{ opacity: 0.8 }}>
                    <span className="planner-task-title">{task.title}</span>
                    <span className="planner-task-time">{task.dueDate}</span>
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
                onClick={() => setShowManualForm(!showManualForm)}
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

            {voiceError && <p style={{ color: "#ef4444", fontSize: "0.85rem", margin: "8px 0" }}>{voiceError}</p>}
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
                  <select
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value)}
                    className="form-input-styled"
                    style={{ flex: 1, padding: "10px 14px" }}
                  >
                    <option value="Work">Work</option>
                    <option value="Personal">Personal</option>
                    <option value="Health">Health</option>
                    <option value="Learning">Learning</option>
                    <option value="Shopping">Shopping</option>
                  </select>
                  <select
                    value={newPriority}
                    onChange={(e) => setNewPriority(e.target.value)}
                    className="form-input-styled"
                    style={{ flex: 1, padding: "10px 14px" }}
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
                      onChange={(e) => setNewDate(e.target.value)}
                      className="form-input-styled"
                      style={{ width: "100%", padding: "10px 14px" }}
                      required
                    />
                  </div>
                  <div style={{ flex: 1 }}>
                    <label style={{ fontSize: "0.85rem", color: "#64748b", fontWeight: "600", marginBottom: "4px", display: "block" }}>Time</label>
                    <input
                      type="time"
                      value={newTime}
                      onChange={(e) => setNewTime(e.target.value)}
                      className="form-input-styled"
                      style={{ width: "100%", padding: "10px 14px" }}
                    />
                  </div>
                </div>

                <button type="submit" className="primary-btn" style={{ padding: "12px", borderRadius: "12px", marginTop: "4px" }}>
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
