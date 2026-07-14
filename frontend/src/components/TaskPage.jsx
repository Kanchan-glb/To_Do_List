import { useState } from "react";
import { useTasks } from "../context/TaskContext";
import { format, isAfter, parseISO } from "date-fns";
import { generateSubtasks } from "../services/gemini";
import { getSpeechRecognizer, parseSpeechToTask } from "../services/speech";
import "../tasks.css";

function TaskPage() {
  const { tasks, addTask, updateTask, deleteTask, toggleSubtask, geminiApiKey } = useTasks();

  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState("");
  const [filterCategory, setFilterCategory] = useState("All");
  const [filterPriority, setFilterPriority] = useState("All");
  const [filterStatus, setFilterStatus] = useState("All"); // All, Pending, Completed, Overdue

  // Modal / Add Form State
  const [showAddModal, setShowAddModal] = useState(false);
  const [editTaskId, setEditTaskId] = useState(null);
  
  // Task form inputs
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("Work");
  const [priority, setPriority] = useState("Medium");
  const [dueDate, setDueDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [dueTime, setDueTime] = useState(format(new Date(Date.now() + 3600000), "HH:mm"));
  const [isLargeTask, setIsLargeTask] = useState(false);
  
  // Subtasks building state
  const [subtasksList, setSubtasksList] = useState([]);
  const [newSubtaskTitle, setNewSubtaskTitle] = useState("");
  const [loadingAI, setLoadingAI] = useState(false);

  // Voice recognition states inside Modal
  const [isRecording, setIsRecording] = useState(false);
  const [voiceError, setVoiceError] = useState("");

  // Speech Helper
  const handleVoiceDictation = () => {
    setVoiceError("");
    const recognizer = getSpeechRecognizer(
      (result) => {
        setIsRecording(false);
        const parsed = parseSpeechToTask(result);
        setTitle(parsed.title);
        setDueDate(parsed.dueDate);
        setDueTime(parsed.dueTime);
        setCategory(parsed.category);
        setPriority(parsed.priority);
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
      setVoiceError("Voice recognition not supported in this browser.");
      return;
    }

    setIsRecording(true);
    recognizer.start();
  };

  // AI Breakdown trigger
  const handleAIBreakdown = async () => {
    if (!title.trim()) {
      alert("Please enter a task title first so AI can break it down.");
      return;
    }
    setLoadingAI(true);
    try {
      const generated = await generateSubtasks(title, geminiApiKey);
      const subtaskObjects = generated.map((t, index) => ({
        id: `gen-${Date.now()}-${index}`,
        title: t,
        completed: false
      }));
      setSubtasksList(subtaskObjects);
    } catch (e) {
      alert("Failed to generate subtasks. Using local fallback.");
      setSubtasksList([
        { id: "f1", title: "Plan structure", completed: false },
        { id: "f2", title: "Build core items", completed: false },
        { id: "f3", title: "Review and verify", completed: false }
      ]);
    } finally {
      setLoadingAI(false);
    }
  };

  // Subtask editor handlers
  const addSubtaskItem = () => {
    if (!newSubtaskTitle.trim()) return;
    setSubtasksList([
      ...subtasksList,
      { id: Date.now().toString(), title: newSubtaskTitle.trim(), completed: false }
    ]);
    setNewSubtaskTitle("");
  };

  const removeSubtaskItem = (id) => {
    setSubtasksList(subtasksList.filter((s) => s.id !== id));
  };

  // Submit form handler
  const handleSubmit = (e) => {
    e.preventDefault();
    if (!title.trim()) return;

    const taskObj = {
      title: title.trim(),
      category,
      priority,
      dueDate,
      dueTime,
      subtasks: subtasksList
    };

    if (editTaskId) {
      updateTask(editTaskId, taskObj);
    } else {
      addTask(taskObj);
    }

    resetForm();
  };

  const resetForm = () => {
    setTitle("");
    setCategory("Work");
    setPriority("Medium");
    setDueDate(format(new Date(), "yyyy-MM-dd"));
    setDueTime(format(new Date(Date.now() + 3600000), "HH:mm"));
    setIsLargeTask(false);
    setSubtasksList([]);
    setEditTaskId(null);
    setShowAddModal(false);
  };

  const handleEditClick = (task) => {
    setTitle(task.title);
    setCategory(task.category);
    setPriority(task.priority);
    setDueDate(task.dueDate);
    setDueTime(task.dueTime);
    setSubtasksList(task.subtasks || []);
    setIsLargeTask(task.subtasks?.length > 0);
    setEditTaskId(task.id);
    setShowAddModal(true);
  };

  // Filter and search tasks logic
  const filteredTasks = tasks.filter((task) => {
    // Search Query matching
    const matchesSearch =
      task.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      task.description.toLowerCase().includes(searchQuery.toLowerCase());

    // Category filter
    const matchesCategory = filterCategory === "All" || task.category === filterCategory;

    // Priority filter
    const matchesPriority = filterPriority === "All" || task.priority === filterPriority;

    // Status filter
    let matchesStatus = true;
    if (filterStatus === "Completed") {
      matchesStatus = task.completed;
    } else if (filterStatus === "Pending") {
      matchesStatus = !task.completed;
    } else if (filterStatus === "Overdue") {
      if (task.completed) {
        matchesStatus = false;
      } else {
        const tDate = new Date(`${task.dueDate}T${task.dueTime || "23:59"}`);
        matchesStatus = tDate < new Date();
      }
    }

    return matchesSearch && matchesCategory && matchesPriority && matchesStatus;
  });

  return (
    <div className="tasks-page">
      <section className="tasks-hero">
        <div className="tasks-hero-content">
          <p className="tasks-eyebrow">Task Management</p>
          <h1 className="tasks-title">Keep your work moving</h1>
          <p className="tasks-sub">Organize priorities, break down large tasks, and stay on track with interactive check-offs.</p>
        </div>
        <button
          type="button"
          className="tasks-new-btn"
          onClick={() => setShowAddModal(true)}
        >
          + New Task
        </button>
      </section>

      {/* Filter and Search Bar */}
      <section className="tasks-filter-bar">
        <div className="tasks-search-wrapper">
          <span className="tasks-search-icon">🔍</span>
          <input
            type="text"
            placeholder="Search tasks..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="tasks-search-input"
          />
        </div>
        
        <div className="tasks-filters-group">
          <select
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
            className="tasks-select"
          >
            <option value="All">All Categories</option>
            <option value="Work">Work</option>
            <option value="Personal">Personal</option>
            <option value="Health">Health</option>
            <option value="Learning">Learning</option>
            <option value="Shopping">Shopping</option>
          </select>
          <select
            value={filterPriority}
            onChange={(e) => setFilterPriority(e.target.value)}
            className="tasks-select"
          >
            <option value="All">All Priorities</option>
            <option value="High">High</option>
            <option value="Medium">Medium</option>
            <option value="Low">Low</option>
          </select>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="tasks-select"
          >
            <option value="All">All Tasks</option>
            <option value="Pending">Pending Only</option>
            <option value="Completed">Completed Only</option>
            <option value="Overdue">Overdue Only</option>
          </select>
        </div>
      </section>

      {/* Tasks List */}
      <section className="tasks-list">
        {filteredTasks.length === 0 ? (
          <div className="tasks-empty">
            <h3>No tasks found</h3>
            <p>Try refining your filters or add a new task to get started.</p>
          </div>
        ) : (
          filteredTasks.map((task) => {
            const hasSubtasks = task.subtasks && task.subtasks.length > 0;
            const completedSubs = hasSubtasks ? task.subtasks.filter((s) => s.completed).length : 0;
            const subPercent = hasSubtasks ? Math.round((completedSubs / task.subtasks.length) * 100) : 0;
            
            // Check if overdue
            const isOverdue = !task.completed && new Date(`${task.dueDate}T${task.dueTime || "23:59"}`) < new Date();

            return (
              <article key={task.id} className={`task-card ${task.completed ? "completed" : ""}`}>
                <div className="task-header">
                  <div className="task-title-area">
                    <button
                      type="button"
                      className={`task-check ${task.completed ? "checked" : ""}`}
                      onClick={() => updateTask(task.id, { completed: !task.completed })}
                    >
                      {task.completed && "✓"}
                    </button>
                    <div className="task-info">
                      <h2>{task.title}</h2>
                      {task.description && <p className="task-desc">{task.description}</p>}
                    </div>
                  </div>
                  <div className="task-actions">
                    <button
                      type="button"
                      className="task-action-btn task-edit-btn"
                      onClick={() => handleEditClick(task)}
                    >
                      ✏️ Edit
                    </button>
                    <button
                      type="button"
                      className="task-action-btn task-delete-btn"
                      onClick={() => deleteTask(task.id)}
                    >
                      🗑️ Delete
                    </button>
                  </div>
                </div>

                {/* Subtasks Progress */}
                {hasSubtasks && (
                  <div className="task-subtasks">
                    <div className="subtasks-header">
                      <span>Subtasks progress</span>
                      <span>{completedSubs}/{task.subtasks.length} ({subPercent}%)</span>
                    </div>
                    <div className="subtasks-progress">
                      <div className="subtasks-progress-fill" style={{ width: `${subPercent}%` }} />
                    </div>
                    <div className="subtasks-list">
                      {task.subtasks.map((sub) => (
                        <label key={sub.id} className={`subtask-item ${sub.completed ? "completed" : ""}`}>
                          <input
                            type="checkbox"
                            className="subtask-checkbox"
                            checked={sub.completed}
                            onChange={() => toggleSubtask(task.id, sub.id)}
                          />
                          <span>{sub.title}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                )}

                <div className="task-meta">
                  <div className="task-badges">
                    <span className={`badge priority-${task.priority}`}>{task.priority}</span>
                    <span className="badge category">{task.category}</span>
                    {isOverdue && <span className="badge overdue">Overdue</span>}
                  </div>
                  <div className="task-date">
                    {task.completed ? (
                      `✅ Completed on: ${task.completedDate || task.dueDate}`
                    ) : (
                      <>📅 {task.dueDate} at {task.dueTime}</>
                    )}
                    {task.rescheduleCount > 0 && !task.completed && (
                      <span style={{ marginLeft: "8px", color: "#d97706" }}>({task.rescheduleCount}x rescheduled)</span>
                    )}
                  </div>
                </div>
              </article>
            );
          })
        )}
      </section>

      {/* Add / Edit Task Modal Overlay */}
      {showAddModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h2 style={{ margin: "0 0 16px" }}>{editTaskId ? "Edit Task" : "Create New Task"}</h2>
            
            <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              <div className="form-group">
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px" }}>
                  <label htmlFor="modal-task-title">Task Title</label>
                  <button
                    type="button"
                    onClick={handleVoiceDictation}
                    className={`secondary-button ${isRecording ? "active" : ""}`}
                    style={{ padding: "4px 10px", fontSize: "0.8rem", display: "flex", gap: "4px", alignItems: "center" }}
                  >
                    🎤 {isRecording ? "Dictating..." : "Voice Auto-fill"}
                  </button>
                </div>
                <input
                  type="text"
                  id="modal-task-title"
                  placeholder="What needs to be done?"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="form-input-styled"
                  required
                />
                {voiceError && <p style={{ color: "#ef4444", fontSize: "0.8rem", margin: "4px 0 0" }}>{voiceError}</p>}
              </div>

              <div className="form-row">
                <div className="form-group" style={{ flex: 1 }}>
                  <label htmlFor="modal-task-cat">Category</label>
                  <select
                    id="modal-task-cat"
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="form-input-styled"
                  >
                    <option value="Work">Work</option>
                    <option value="Personal">Personal</option>
                    <option value="Health">Health</option>
                    <option value="Learning">Learning</option>
                    <option value="Shopping">Shopping</option>
                  </select>
                </div>
                <div className="form-group" style={{ flex: 1 }}>
                  <label htmlFor="modal-task-priority">Priority</label>
                  <select
                    id="modal-task-priority"
                    value={priority}
                    onChange={(e) => setPriority(e.target.value)}
                    className="form-input-styled"
                  >
                    <option value="High">High</option>
                    <option value="Medium">Medium</option>
                    <option value="Low">Low</option>
                  </select>
                </div>
              </div>

              <div className="form-row">
                <div className="form-group" style={{ flex: 1 }}>
                  <label htmlFor="modal-task-date">Due Date</label>
                  <input
                    type="date"
                    id="modal-task-date"
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                    className="form-input-styled"
                    required
                  />
                </div>
                <div className="form-group" style={{ flex: 1 }}>
                  <label htmlFor="modal-task-time">Due Time</label>
                  <input
                    type="time"
                    id="modal-task-time"
                    value={dueTime}
                    onChange={(e) => setDueTime(e.target.value)}
                    className="form-input-styled"
                    required
                  />
                </div>
              </div>

              {/* Subtask Section */}
              <div style={{ borderTop: "1px solid #eee", paddingTop: "24px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
                  <label style={{ display: "flex", alignItems: "center", gap: "10px", fontWeight: "700", fontSize: "0.95rem", cursor: "pointer", color: "#1e293b" }}>
                    <input
                      type="checkbox"
                      checked={isLargeTask}
                      onChange={(e) => setIsLargeTask(e.target.checked)}
                      style={{ width: "18px", height: "18px", accentColor: "#4f46e5", cursor: "pointer" }}
                    />
                    Enable Subtasks
                  </label>
                  {isLargeTask && (
                    <button
                      type="button"
                      onClick={handleAIBreakdown}
                      disabled={loadingAI}
                      style={{ padding: "6px 14px", fontSize: "0.85rem", background: "#eef2ff", color: "#4f46e5", border: "1px solid #c7d2fe", borderRadius: "10px", fontWeight: "700", cursor: "pointer", transition: "all 0.2s" }}
                    >
                      {loadingAI ? "⏳ Processing..." : "✨ Auto-Generate with AI"}
                    </button>
                  )}
                </div>

                {isLargeTask && (
                  <div style={{ background: "#f8fafc", padding: "20px", borderRadius: "16px", border: "1px solid #e2e8f0", display: "flex", flexDirection: "column", gap: "16px", marginTop: "8px" }}>
                    
                    {/* Manual Subtask Input */}
                    <div style={{ display: "flex", gap: "10px" }}>
                      <input
                        type="text"
                        placeholder="Add subtask manually..."
                        value={newSubtaskTitle}
                        onChange={(e) => setNewSubtaskTitle(e.target.value)}
                        className="form-input-styled"
                        style={{ padding: "12px 16px", flex: 1 }}
                      />
                      <button
                        type="button"
                        onClick={addSubtaskItem}
                        style={{ border: "none", background: "#4f46e5", color: "white", padding: "0 20px", borderRadius: "12px", fontSize: "1.25rem", fontWeight: "800", cursor: "pointer", boxShadow: "0 4px 12px rgba(79, 70, 229, 0.2)" }}
                      >
                        +
                      </button>
                    </div>

                    {/* Subtasks List */}
                    {subtasksList.length > 0 && (
                      <ul style={{ padding: "0", margin: "0", listStyle: "none", display: "flex", flexDirection: "column", gap: "10px" }}>
                        {subtasksList.map((sub) => (
                          <li key={sub.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: "white", padding: "12px 16px", borderRadius: "12px", border: "1px solid #cbd5e1", boxShadow: "0 2px 6px rgba(0,0,0,0.02)" }}>
                            <span style={{ fontWeight: 600, color: "#1e293b", fontSize: "0.95rem" }}>{sub.title}</span>
                            <button
                              type="button"
                              onClick={() => removeSubtaskItem(sub.id)}
                              style={{ border: "none", background: "#fee2e2", color: "#ef4444", padding: "4px 8px", borderRadius: "8px", cursor: "pointer", fontSize: "1.1rem", lineHeight: 1 }}
                            >
                              ✕
                            </button>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                )}
              </div>

              <div className="btn-group" style={{ borderTop: "1px solid #e2e8f0", paddingTop: "20px", marginTop: "16px" }}>
                <button type="button" className="secondary-button" onClick={resetForm}>Cancel</button>
                <button type="submit" className="primary-btn">{editTaskId ? "Save Changes" : "Create Task"}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default TaskPage;