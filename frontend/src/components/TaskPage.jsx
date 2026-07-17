import { useState, useEffect, useMemo } from "react";
import { useLocation } from "react-router-dom";
import { useTasks } from "../context/TaskContext";
import { format, isAfter, parseISO } from "date-fns";
import { generateSubtasks } from "../services/gemini";
import { getSpeechRecognizer, parseSpeechToTask } from "../services/speech";
import { calculateDefaultDueTime, CATEGORY_SUGGESTIONS } from "../utils/taskUtils";
import TaskDetailsModal from "./TaskDetailsModal";
import "../tasks.css";

function TaskPage() {
  const { tasks, addTask, updateTask, deleteTask, toggleSubtask, geminiApiKey } = useTasks();

  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState("");
  const [filterCategory, setFilterCategory] = useState("All");
  const [filterPriority, setFilterPriority] = useState("All");
  const [filterStatus, setFilterStatus] = useState("All"); // All, Pending, Completed, Overdue
  const [filterLimit, setFilterLimit] = useState("5");

  const [selectedTask, setSelectedTask] = useState(null);

  // Modal / Add Form State
  const location = useLocation();
  const [showAddModal, setShowAddModal] = useState(location.state?.openAddTaskModal || false);
  const [editTaskId, setEditTaskId] = useState(null);

  useEffect(() => {
    if (location.state?.openAddTaskModal) {
      setShowAddModal(true);
      // Clear state to prevent reopening on reload
      window.history.replaceState({}, document.title);
    }
  }, [location.state]);

  // Prevent browser body scroll while Task Page is active
  useEffect(() => {
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, []);

  const [title, setTitle] = useState("");
  const [isTitleSuggested, setIsTitleSuggested] = useState(false);
  const [categoryChangeMsg, setCategoryChangeMsg] = useState("");
  const [category, setCategory] = useState("Work");
  const [customCategory, setCustomCategory] = useState("");
  const [isAddingCategory, setIsAddingCategory] = useState(false);
  const [priority, setPriority] = useState("Medium");

  const presetCategories = ["Work", "Personal", "Health", "Learning", "Shopping"];
  const dynamicCategories = [...new Set([...tasks.map(t => t.category), category].filter(Boolean))];
  const allCategories = [...new Set([...presetCategories, ...dynamicCategories])].filter(cat => cat !== "Custom");
  const todayStr = format(new Date(), "yyyy-MM-dd");
  const currentTimeStr = format(new Date(), "HH:mm");

  const [dueDate, setDueDate] = useState(todayStr);
  const [isTimeManuallySet, setIsTimeManuallySet] = useState(false);
  const [dueTime, setDueTime] = useState(() => calculateDefaultDueTime("Work"));
  const [timeError, setTimeError] = useState("");
  const [isLargeTask, setIsLargeTask] = useState(false);

  // Automatically recalculate due time when category changes (if not manually overridden)
  useEffect(() => {
    if (!editTaskId && !isTimeManuallySet) {
      setDueTime(calculateDefaultDueTime(category));
    }
  }, [category, editTaskId, isTimeManuallySet]);

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
      category: isAddingCategory ? (customCategory.trim() || "General") : category,
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
    setIsTitleSuggested(false);
    setCategoryChangeMsg("");
    setCategory("Work");
    setCustomCategory("");
    setIsAddingCategory(false);
    setPriority("Medium");
    setDueDate(format(new Date(), "yyyy-MM-dd"));
    setIsTimeManuallySet(false);
    setDueTime(calculateDefaultDueTime("Work"));
    setIsLargeTask(false);
    setSubtasksList([]);
    setEditTaskId(null);
    setShowAddModal(false);
  };

  const handleEditClick = (task) => {
    setTitle(task.title);
    setIsTitleSuggested(false);
    setCategoryChangeMsg("");
    setCategory(task.category);
    setPriority(task.priority);
    setDueDate(task.dueDate);
    setDueTime(task.dueTime);
    setIsTimeManuallySet(true);
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

  // Helper to determine task status, color, and sort priority
  const getTaskStatusInfo = (task) => {
    if (task.completed) {
      return { label: "Completed", colorClass: "green" };
    }
    
    const taskDateObj = new Date(`${task.dueDate}T${task.dueTime || "23:59"}`);
    if (taskDateObj < new Date()) {
      return { label: "Overdue", colorClass: "red" };
    }
    
    if (task.dueDate === todayStr) {
      return { label: "Pending", colorClass: "yellow" };
    }
    
    return { label: "Upcoming", colorClass: "blue" };
  };

  // Intelligent Chronological Sorting Logic
  const sortedTasks = useMemo(() => {
    const priorityWeight = { High: 3, Medium: 2, Low: 1 };

    return [...filteredTasks].sort((a, b) => {
      // 1. Completed tasks always at the absolute bottom
      if (a.completed && !b.completed) return 1;
      if (!a.completed && b.completed) return -1;

      // 2. Strict chronological sort (earliest deadline always appears first)
      const dateA = new Date(`${a.dueDate}T${a.dueTime || "23:59"}`).getTime();
      const dateB = new Date(`${b.dueDate}T${b.dueTime || "23:59"}`).getTime();

      if (dateA !== dateB) {
        return dateA - dateB; // Ascending order (earliest first)
      }

      // 3. Tiebreaker: Sort by Priority (High > Medium > Low)
      const pA = priorityWeight[a.priority] || 0;
      const pB = priorityWeight[b.priority] || 0;
      
      if (pA !== pB) {
        return pB - pA; // Descending order (highest weight first)
      }

      return 0; // Identical tasks
    });
  }, [filteredTasks, todayStr]);

  const displayedTasks = filterLimit === "All" ? sortedTasks : sortedTasks.slice(0, parseInt(filterLimit, 10));

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
            {allCategories.map(cat => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
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
          <input
            type="number"
            min="1"
            placeholder="Count (e.g. 5)"
            value={filterLimit === "All" ? "" : filterLimit}
            onChange={(e) => setFilterLimit(e.target.value === "" ? "All" : e.target.value)}
            className="tasks-select"
            style={{ width: '130px', background: 'var(--bg-app)' }}
            title="Leave empty to show all tasks"
          />
        </div>
      </section>

      {/* Tasks List */}
      <section className="tasks-list-container">
        <div className="tasks-list">
          {displayedTasks.length === 0 ? (
          <div className="tasks-empty">
            <h3>No tasks found</h3>
            <p>Try refining your filters or add a new task to get started.</p>
          </div>
        ) : (
          displayedTasks.map((task) => {
            const hasSubtasks = task.subtasks && task.subtasks.length > 0;
            const completedSubs = hasSubtasks ? task.subtasks.filter((s) => s.completed).length : 0;
            const subPercent = hasSubtasks ? Math.round((completedSubs / task.subtasks.length) * 100) : 0;

            // Get status info for display
            const statusInfo = getTaskStatusInfo(task);

            return (
              <article key={task.id} className={`task-card status-${statusInfo.colorClass} ${task.completed ? "completed" : ""}`}>
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
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <h2>{task.title}</h2>
                        <span className={`task-badge bg-${statusInfo.colorClass}`}>
                          {statusInfo.label === "Overdue" ? "🔴 " : statusInfo.label === "Pending" ? "🟡 " : statusInfo.label === "Upcoming" ? "🔵 " : statusInfo.label === "Completed" ? "🟢 " : ""}{statusInfo.label}
                        </span>
                      </div>
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

                <div className="task-meta" style={{ marginTop: '12px' }}>
                  <button type="button" className="secondary-button" onClick={() => setSelectedTask(task)} style={{ padding: '6px 12px', fontSize: '0.8rem' }}>
                    View Details
                  </button>
                </div>
              </article>
            );
          })
        )}
        </div>
      </section>

      {/* Task Details Modal */}
      {selectedTask && <TaskDetailsModal task={selectedTask} onClose={() => setSelectedTask(null)} />}

      {/* Add / Edit Task Modal Overlay */}
      {showAddModal && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxHeight: '85vh', overflowY: 'auto' }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", margin: "0 0 16px" }}>
              <h2 style={{ margin: 0 }}>{editTaskId ? "Edit Task" : "Create New Task"}</h2>
              <button
                type="button"
                onClick={resetForm}
                style={{
                  background: "transparent",
                  border: "none",
                  fontSize: "1.2rem",
                  cursor: "pointer",
                  color: "#64748b",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  width: "32px",
                  height: "32px",
                  borderRadius: "50%",
                  padding: 0
                }}
                onMouseOver={(e) => e.target.style.background = "#f1f5f9"}
                onMouseOut={(e) => e.target.style.background = "transparent"}
                title="Close"
              >
                ✕
              </button>
            </div>

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
                  onChange={(e) => {
                    setTitle(e.target.value);
                    setIsTitleSuggested(false);
                    setCategoryChangeMsg("");
                  }}
                  className="form-input-styled"
                  required
                />
                {categoryChangeMsg && <p style={{ color: "#3b82f6", fontSize: "0.8rem", margin: "4px 0 0", fontStyle: "italic" }}>{categoryChangeMsg}</p>}
                
                {/* Intelligent Task Title Suggestions */}
                {(() => {
                  const activeCategory = isAddingCategory ? "Default" : (category || "Default");
                  const suggestionsList = CATEGORY_SUGGESTIONS[activeCategory] || CATEGORY_SUGGESTIONS["Default"];
                  
                  // Filter suggestions based on typed title (case-insensitive)
                  const filteredSuggestions = suggestionsList.filter(s => 
                    s.toLowerCase().includes(title.toLowerCase()) && s.toLowerCase() !== title.toLowerCase()
                  );

                  if (filteredSuggestions.length === 0) return null;

                  return (
                    <div style={{ marginTop: "10px" }}>
                      <p style={{ fontSize: "0.8rem", color: "#64748b", margin: "0 0 6px", fontWeight: "600" }}>Suggested Titles</p>
                      <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
                        {filteredSuggestions.map((suggestion, idx) => (
                          <button
                            key={idx}
                            type="button"
                            className="suggestion-chip"
                            onClick={() => {
                              setTitle(suggestion);
                              setIsTitleSuggested(true);
                              setCategoryChangeMsg("");
                            }}
                          >
                            {suggestion}
                          </button>
                        ))}
                      </div>
                    </div>
                  );
                })()}

                {voiceError && <p style={{ color: "#ef4444", fontSize: "0.8rem", margin: "4px 0 0" }}>{voiceError}</p>}
              </div>

              <div className="form-row">
                <div className="form-group" style={{ flex: 1 }}>
                  <label htmlFor="modal-task-cat">Category</label>
                  {!isAddingCategory ? (
                    <select
                      id="modal-task-cat"
                      value={category}
                      onChange={(e) => {
                        const newCat = e.target.value;
                        if (title.trim() !== "") {
                          if (!isTitleSuggested) {
                            const confirmed = window.confirm("Changing the category will clear your current title. Do you want to continue?");
                            if (!confirmed) return;
                          }
                          setTitle("");
                          setIsTitleSuggested(false);
                          setCategoryChangeMsg("Category changed. Please select a title for the selected category.");
                        }

                        if (newCat === "Custom") {
                          setIsAddingCategory(true);
                        } else {
                          setCategory(newCat);
                        }
                      }}
                      className="form-input-styled"
                      style={{ width: "100%" }}
                    >
                      {allCategories.map(cat => (
                        <option key={`opt-${cat}`} value={cat}>{cat}</option>
                      ))}
                      <option value="Custom" style={{ fontWeight: 'bold' }}>+ Add New Category</option>
                    </select>
                  ) : (
                    <div style={{ display: "flex", gap: "8px" }}>
                      <input
                        type="text"
                        placeholder="New category..."
                        value={customCategory}
                        onChange={(e) => setCustomCategory(e.target.value)}
                        className="form-input-styled"
                        style={{ flex: 1 }}
                        autoFocus
                      />
                      <button
                        type="button"
                        onClick={() => { setIsAddingCategory(false); setCustomCategory(""); setCategory("Work"); }}
                        style={{ background: "#e2e8f0", color: "#475569", border: "none", borderRadius: "8px", width: "36px", height: "36px", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", fontWeight: "bold", flexShrink: 0 }}
                        title="Cancel"
                      >
                        ✕
                      </button>
                    </div>
                  )}
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
                    min={todayStr}
                    onChange={(e) => {
                      const selectedDate = e.target.value;
                      setDueDate(selectedDate);
                      if (selectedDate === todayStr) {
                        const nowTime = format(new Date(), "HH:mm");
                        if (dueTime < nowTime) {
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
                        // ignore if browser doesn't support or blocks it
                      }
                    }}
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
                    min={dueDate === todayStr ? currentTimeStr : undefined}
                    onChange={(e) => {
                      const selectedTime = e.target.value;
                      setIsTimeManuallySet(true);
                      if (dueDate === todayStr) {
                        const nowTime = format(new Date(), "HH:mm");
                        if (selectedTime < nowTime) {
                          setTimeError("You can't select a previous time for today.");
                          setDueTime(selectedTime);
                          return;
                        }
                      }
                      setTimeError("");
                      setDueTime(selectedTime);
                    }}
                    onClick={(e) => {
                      try {
                        e.target.showPicker();
                      } catch (err) {
                        // ignore
                      }
                    }}
                    className="form-input-styled"
                    required
                  />
                  {timeError && (
                    <div style={{ color: "#ef4444", fontSize: "0.8rem", marginTop: "4px" }}>
                      {timeError}
                    </div>
                  )}
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
                <button type="submit" className="primary-btn" style={{ color: "black", fontWeight: "bold", opacity: timeError ? 0.5 : 1 }} disabled={!!timeError}>
                  {editTaskId ? "Save Changes" : "Create Task"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default TaskPage;