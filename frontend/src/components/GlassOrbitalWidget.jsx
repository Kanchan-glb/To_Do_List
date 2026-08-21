import React, { useState, useMemo, useEffect, useRef } from 'react';
import { format } from 'date-fns';
import './glassDashboard.css';

// --- Icons ---
const IcoUpdate = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>;
const IcoReschedule = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line><path d="M12 14v4"></path><path d="M12 18l2-2"></path><path d="M12 18l-2-2"></path></svg>;
const IcoCheck = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>;
const IcoPrev = () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="19" y1="12" x2="5" y2="12"></line><polyline points="12 19 5 12 12 5"></polyline></svg>;
const IcoNext = () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="12" x2="19" y2="12"></line><polyline points="12 5 19 12 12 19"></polyline></svg>;
const IcoActivity = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline></svg>;
const IcoPlus = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>;
const IcoClock = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg>;

// Specific hierarchy shapes
const IcoTargetCenter = () => <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><circle cx="12" cy="12" r="6" /><circle cx="12" cy="12" r="2" /></svg>;
const IcoTargetOuter = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /></svg>;
const IcoSubtaskList = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 10 4 15 9 20"></polyline><path d="M20 4v7a4 4 0 0 1-4 4H4"></path></svg>;
const IcoSubtaskCompleted = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="9 10 4 15 9 20"></polyline>
    <path d="M20 4v7a4 4 0 0 1-4 4H4"></path>
  </svg>
);
const IcoChevronDown = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>;
const IcoChevronRight = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"></polyline></svg>;

export default function GlassOrbitalWidget({ tasks, onAction }) {
  const [selectedTaskId, setSelectedTaskId] = useState(null);
  const [selectedSubtaskId, setSelectedSubtaskId] = useState(null);
  const [historyFilter, setHistoryFilter] = useState("Main Tasks");
  const [expandedHistoryIds, setExpandedHistoryIds] = useState([]);
  const [focusMode, setFocusMode] = useState(false);

  // Responsive stage state
  const stageRef = useRef(null);
  const [stageDims, setStageDims] = useState({ width: 400, height: 400 });

  // Orbit layout/dragging state
  const [orbitRotation, setOrbitRotation] = useState(0);
  const isDragging = useRef(false);
  const startX = useRef(0);
  const currentRotation = useRef(0);

  // Initialize selected task on mount
  useEffect(() => {
    if (!selectedTaskId && tasks && tasks.length > 0) {
      const pending = tasks.find(t => !t.completed && t.status !== 'Completed');
      const firstId = pending ? (pending._id || pending.id) : (tasks[0]._id || tasks[0].id);
      setSelectedTaskId(firstId);
    }
  }, [tasks, selectedTaskId]);

  // Derived state
  const selectedTask = useMemo(() => tasks?.find(t => (t.id || t._id) === selectedTaskId), [tasks, selectedTaskId]);
  const selectedSubtask = useMemo(() => selectedTask?.subtasks?.find(s => (s.id || s._id) === selectedSubtaskId), [selectedTask, selectedSubtaskId]);
  const subtasks = selectedTask?.subtasks || [];

  const totalSubtasksCount = tasks?.reduce((acc, t) => acc + (t.subtasks?.length || 0), 0) || 0;
  const pendingCount = tasks?.filter(t => !t.completed && t.status !== 'Completed').length || 0;
  const completedCount = tasks?.filter(t => t.completed || t.status === 'Completed').length || 0;

  // The other tasks for the outer orbit
  const orbitTasks = useMemo(() => tasks?.filter(t => (t.id || t._id) !== selectedTaskId) || [], [tasks, selectedTaskId]);

  // ----------------------------------------------------
  // Interaction Handlers
  // ----------------------------------------------------

  const handleActionClick = (action, e) => {
    e.stopPropagation();
    if (selectedTask && onAction) onAction(action, selectedTask);
  };

  const handleTaskSelect = (taskId) => {
    setSelectedTaskId(taskId);
    setSelectedSubtaskId(null);
    setOrbitRotation(0);
    currentRotation.current = 0;
  };

  const handleSubtaskSelect = (subId, e) => {
    e.stopPropagation();
    setSelectedSubtaskId(prev => prev === subId ? null : subId); // toggle selection
  };

  const selectPreviousTask = () => {
    if (!tasks || tasks.length <= 1) return;
    const idx = tasks.findIndex(t => (t.id || t._id) === selectedTaskId);
    const prevIdx = idx > 0 ? idx - 1 : tasks.length - 1;
    handleTaskSelect(tasks[prevIdx].id || tasks[prevIdx]._id);
  };

  const selectNextTask = () => {
    if (!tasks || tasks.length <= 1) return;
    const idx = tasks.findIndex(t => (t.id || t._id) === selectedTaskId);
    const nextIdx = idx < tasks.length - 1 ? idx + 1 : 0;
    handleTaskSelect(tasks[nextIdx].id || tasks[nextIdx]._id);
  };

  const toggleHistoryExpand = (taskId) => {
    setExpandedHistoryIds(prev =>
      prev.includes(taskId) ? prev.filter(id => id !== taskId) : [...prev, taskId]
    );
  };

  // ----------------------------------------------------
  // Dragging Logic
  // ----------------------------------------------------

  const onPointerDown = (e) => {
    isDragging.current = true;
    startX.current = e.clientX;
    document.body.style.cursor = 'grabbing';
  };

  const onPointerMove = (e) => {
    if (!isDragging.current) return;
    // For smooth orbital rotation we map pixel drag to angle in radians
    const deltaX = e.clientX - startX.current;
    // We adjust rotation state (which we'll treat as radians added to base angle)
    const newRotation = currentRotation.current + (deltaX * 0.005);
    setOrbitRotation(newRotation);
  };

  const onPointerUp = (e) => {
    if (!isDragging.current) return;
    isDragging.current = false;
    document.body.style.cursor = 'default';
    currentRotation.current = orbitRotation;
  };

  useEffect(() => {
    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
    return () => {
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
    };
  });

  useEffect(() => {
    if (!stageRef.current) return;
    const observer = new ResizeObserver((entries) => {
      for (let entry of entries) {
        setStageDims({
          width: entry.contentRect.width,
          height: entry.contentRect.height
        });
      }
    });
    observer.observe(stageRef.current);
    return () => observer.disconnect();
  }, []);

  // Calculate dynamic radii based on container size
  const getRadii = () => {
    // 60px buffer ensures nodes never touch the canvas borders
    const availableWidth = Math.max(stageDims.width - 60, 200);
    const availableHeight = Math.max(stageDims.height - 60, 200);
    const maxRadius = Math.min(availableWidth, availableHeight) / 2;

    // Ensure outer radius doesn't overflow, keep roughly 220px on desktop
    const outer = Math.min(maxRadius - 25, 230);
    // Inner must be > center radius (75px) + 25px gap
    const inner = Math.min(outer * 0.6, 130);
    return { inner: Math.max(inner, 100), outer };
  };

  // ----------------------------------------------------
  // History Compilation
  // ----------------------------------------------------

  const historyFeed = useMemo(() => {
    let feed = [];

    const processTaskForHistory = (task) => {
      if (!task) return;
      const tid = task.id || task._id;
      let latestDate = task.updatedAt ? new Date(task.updatedAt) : new Date(task.createdAt || Date.now());
      let recentEvent = "Created task";
      let eventType = "created";

      // Find the most recent event to represent this task's main history card
      if (task.completedAt || task.completed || task.status === 'Completed') {
        latestDate = new Date(task.completedAt || task.updatedAt || Date.now());
        recentEvent = "Task completed";
        eventType = "completed";
      } else if (task.updateHistory && task.updateHistory.length > 0) {
        const lastUpd = task.updateHistory[task.updateHistory.length - 1];
        latestDate = new Date(lastUpd.updatedAt);
        recentEvent = "Updated task details";
        eventType = "update";
      } else if (task.rescheduleHistory && task.rescheduleHistory.length > 0) {
        const lastResc = task.rescheduleHistory[task.rescheduleHistory.length - 1];
        latestDate = new Date(lastResc.rescheduledAt);
        recentEvent = `Task rescheduled${lastResc.reason ? ': ' + lastResc.reason : ''}`;
        eventType = "reschedule";
      }

      feed.push({
        id: tid,
        task: task,
        title: task.title,
        date: latestDate,
        details: recentEvent,
        type: eventType,
        subtasks: task.subtasks || []
      });
    };

    if (historyFilter === "Main Tasks") {
      processTaskForHistory(selectedTask);
    } else if (historyFilter === "All Activity") {
      tasks?.forEach(processTaskForHistory);
    } else if (historyFilter === "Pending") {
      tasks?.filter(t => !t.completed && t.status !== 'Completed').forEach(processTaskForHistory);
    } else if (historyFilter === "Completed") {
      tasks?.filter(t => t.completed || t.status === 'Completed').forEach(processTaskForHistory);
    }

    return feed.sort((a, b) => b.date - a.date);
  }, [tasks, selectedTask, historyFilter]);

  // ----------------------------------------------------
  // Render Helpers
  // ----------------------------------------------------

  const renderHistoryIcon = (type) => {
    switch (type) {
      case 'completed': return <IcoCheck />;
      case 'reschedule': return <IcoReschedule />;
      case 'update': return <IcoUpdate />;
      case 'created': return <IcoActivity />;
      default: return <IcoActivity />;
    }
  };

  return (
    <div className="glass-card orbital-workspace">

      {/* HEADER & SUMMARY */}
      <div className="orbital-header">
        <div style={{ display: "flex", alignItems: "center", gap: "8px", fontWeight: "700" }}>
          <IcoTargetCenter />
          <h3>Smart Workspace</h3>
        </div>
        <div className="orbital-summary">
          <span className="summary-pill total" title={`${totalSubtasksCount} Total Subtasks`}>{tasks?.length || 0} Main Tasks</span>
          <span className="summary-pill pending">{pendingCount} Pending</span>
          <span className="summary-pill completed">{completedCount} ✓</span>
        </div>
      </div>

      {/* MAIN ORBITAL VIEW */}
      <div
        className={`orbital-stage-wrapper ${focusMode ? 'focus-mode-active' : ''}`}
        ref={stageRef}
        style={{
          '--inner-orbit-radius': `${getRadii().inner}px`,
          '--outer-orbit-radius': `${getRadii().outer}px`,
        }}
      >
        {focusMode && <div style={{ position: 'absolute', inset: -1000, background: 'rgba(10,5,20,0.85)', zIndex: 5, backdropFilter: 'blur(8px)', pointerEvents: 'none' }} />}



        <div className="orbital-nav-btn prev" onClick={selectPreviousTask} title="Previous Main Task" style={{ zIndex: 10 }}><IcoPrev /></div>

        <div className="orbital-stage" onPointerDown={onPointerDown} style={{ cursor: isDragging.current ? 'grabbing' : 'grab' }}>

          {/* Guide Rings and Lines */}
          <div className="orbit-ring outer-ring" />
          {subtasks.length > 0 && (
            <>
              <div className="orbit-ring inner-ring" />
              <div className="orbital-connectors">
                <svg width="100%" height="100%" style={{ overflow: 'visible' }}>
                  {subtasks.map((sub, idx) => {
                    const total = subtasks.length;
                    const baseAngle = (idx / total) * Math.PI * 2 - (Math.PI / 2);
                    const angle = baseAngle - (orbitRotation * 1.5);
                    const radius = getRadii().inner;
                    const x = Math.cos(angle) * radius;
                    const y = Math.sin(angle) * radius;
                    return (
                      <line
                        key={idx}
                        x1="50%" y1="50%"
                        x2={`calc(50% + ${x}px)`}
                        y2={`calc(50% + ${y}px)`}
                        className="connector-line"
                      />
                    );
                  })}
                </svg>
              </div>
            </>
          )}

          {/* Outer Ring Nodes: Other Main Tasks */}
          {orbitTasks.map((task, idx) => {
            const total = orbitTasks.length;
            // Start at top (-PI/2)
            const baseAngle = (idx / total) * Math.PI * 2 - (Math.PI / 2);
            const angle = baseAngle + orbitRotation;
            const radius = getRadii().outer;
            const x = Math.cos(angle) * radius;
            const y = Math.sin(angle) * radius;
            const isCompleted = task.status === 'Completed' || task.completed;

            return (
              <div
                key={task.id || task._id}
                className="orbit-node-absolute"
                style={{ transform: `translate(${x}px, ${y}px)` }}
              >
                <div
                  className={`orbit-node-interactive main-task ${isCompleted ? 'completed' : 'pending'}`}
                  onClick={(e) => { e.stopPropagation(); handleTaskSelect(task.id || task._id); }}
                  aria-label={`Main task: ${task.title}`}
                >
                  <span className="node-icon">{isCompleted ? <IcoCheck /> : <IcoTargetOuter />}</span>
                  <div className="node-tooltip">
                    {task.title}
                    <div className="node-tooltip-status">{isCompleted ? 'Completed ✓' : 'Pending ○'}</div>
                  </div>
                </div>
              </div>
            );
          })}

          {/* Inner Ring Nodes: Subtasks */}
          {subtasks.map((sub, idx) => {
            const total = subtasks.length;
            // Start at top (-PI/2)
            const baseAngle = (idx / total) * Math.PI * 2 - (Math.PI / 2);
            const angle = baseAngle - (orbitRotation * 1.5); // counter-rotate
            const radius = getRadii().inner;
            const x = Math.cos(angle) * radius;
            const y = Math.sin(angle) * radius;
            const isSubSelected = selectedSubtaskId === (sub.id || sub._id);
            const isCompleted = sub.completed;

            return (
              <div
                key={sub._id || idx}
                className="orbit-node-absolute"
                style={{ transform: `translate(${x}px, ${y}px)` }}
              >
                <div
                  className={`orbit-node-interactive subtask ${isCompleted ? 'completed' : 'pending'} ${isSubSelected ? 'selected' : ''}`}
                  onClick={(e) => handleSubtaskSelect(sub.id || sub._id, e)}
                  aria-label={`${isCompleted ? 'Completed subtask' : 'Pending subtask'}: ${sub.title}`}
                >
                  <span className="node-icon">{isCompleted ? <IcoSubtaskCompleted /> : <IcoSubtaskList />}</span>
                  <div className="node-tooltip">
                    {sub.title}
                    <div className="node-tooltip-status">{isCompleted ? 'Completed Subtask' : 'Pending Subtask'}</div>
                  </div>
                </div>
              </div>
            );
          })}

          {/* Center Hub: Selected Main Task */}
          <div className="orbit-center-hub" onPointerDown={(e) => e.stopPropagation()}>
            {selectedTask ? (
              <div className={`center-hub-core ${selectedTask.completed || selectedTask.status === 'Completed' ? 'completed' : 'pending'}`}>
                <span className="hub-eyebrow">◎ Main Task</span>
                <div className="hub-icon-container">
                  {selectedTask.completed || selectedTask.status === 'Completed' ? <IcoCheck /> : <IcoTargetCenter />}
                </div>
                <span className="hub-title" title={selectedTask.title}>{selectedTask.title}</span>
                <span className="hub-eyebrow" style={{ marginTop: '4px' }}>{subtasks.length} Subtasks</span>
              </div>
            ) : (
              <div className="center-hub-core empty">
                <span className="hub-eyebrow">No tasks</span>
                <span className="hub-title">Create a task</span>
              </div>
            )}
          </div>


          {/* Subtask Details Popover */}
          {selectedSubtask && (
            <div className="subtask-details-popover" role="dialog" aria-label="Subtask Details">
              <div className="popover-header">
                <IcoSubtaskList /> <span>Selected Subtask</span>
              </div>
              <p className="popover-title">{selectedSubtask.title}</p>
              <p className="popover-status">Status: {selectedSubtask.completed ? 'Completed' : 'Pending'}</p>
              <p className="popover-parent">Parent Task: {selectedTask?.title}</p>
            </div>
          )}

        </div>

        <div className="orbital-nav-btn next" onClick={selectNextTask} title="Next Main Task" style={{ zIndex: 10 }}><IcoNext /></div>
      </div>

      {/* Task Position Carousel Indicator */}
      <div style={{ display: 'flex', justifyContent: 'center', gap: '6px', margin: '16px 0 8px 0', zIndex: 10, position: 'relative' }}>
        {tasks?.map((t, idx) => (
          <div key={t.id || t._id} style={{
            width: '6px', height: '6px', borderRadius: '50%',
            background: (t.id || t._id) === selectedTaskId ? '#fff' : 'rgba(255,255,255,0.2)',
            transition: 'all 0.3s',
            boxShadow: (t.id || t._id) === selectedTaskId ? '0 0 8px #fff' : 'none'
          }} />
        ))}
      </div>

      {/* External Action Toolbar */}
      {selectedTask && (
        <div className="orbital-action-toolbar">
          <button className="action-tool-btn" aria-label="Edit Task" onClick={(e) => handleActionClick('update', e)}>
            <IcoUpdate />
          </button>
          <button className="action-tool-btn" aria-label="Reschedule" onClick={(e) => handleActionClick('reschedule', e)}>
            <IcoReschedule />
          </button>
          <button className="action-tool-btn" aria-label="Add Subtask" onClick={(e) => handleActionClick('subtask', e)}>
            <IcoPlus />
          </button>
        </div>
      )}

      {/* Spatial Legend */}
      <div className="orbital-legend">
        <div className="legend-item"><IcoTargetCenter /> Main Task</div>
        <div className="legend-item"><IcoSubtaskList /> Subtask</div>
        <div className="legend-item"><IcoCheck /> Completed</div>
        <div className="legend-item"><IcoTargetOuter /> Pending</div>
      </div>

      {/* HISTORY PANEL */}
      <div className="orbital-history-panel">
        <div className="history-filters">
          {[
            { id: 'Main Tasks', icon: '◎', label: 'Main Tasks' },
            { id: 'All Activity', icon: '↻', label: 'All Activity' },
            { id: 'Pending', icon: '○', label: 'Pending' },
            { id: 'Completed', icon: '✓', label: 'Completed' }
          ].map(f => (
            <button
              key={f.id}
              className={`history-filter-btn ${historyFilter === f.id ? 'active' : ''}`}
              onClick={() => setHistoryFilter(f.id)}
            >
              <span className="filter-icon">{f.icon}</span> {f.label}
            </button>
          ))}
        </div>

        <div className="history-feed">
          {historyFeed.length === 0 ? (
            <div className="history-empty">No activity found.</div>
          ) : (
            historyFeed.map(item => {
              const isExpanded = expandedHistoryIds.includes(item.id);
              const hasSubtasks = item.subtasks.length > 0;
              return (
                <div key={item.id} className="history-card-group">
                  {/* Main Task History Header */}
                  <div className="history-item main-history-item" onClick={() => hasSubtasks && toggleHistoryExpand(item.id)}>
                    <div className="history-item-top">
                      <div className="main-history-title-row">
                        <span className="main-history-indicator">◎</span>
                        <span className="history-task">{item.title}</span>
                        {hasSubtasks && (
                          <span className="expand-indicator">
                            {isExpanded ? <IcoChevronDown /> : <IcoChevronRight />}
                          </span>
                        )}
                      </div>
                      <div className="history-details-row">
                        <div className={`history-icon-small type-${item.type}`}>
                          {renderHistoryIcon(item.type)}
                        </div>
                        <div className="history-meta">
                          <span className="history-details">{item.details}</span>
                          <span className="history-time">{format(item.date, 'MMM d, h:mm a')}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Expandable Subtasks List */}
                  {isExpanded && hasSubtasks && (
                    <div className="history-subtasks-list">
                      <div className="subtask-tree-line"></div>
                      <div className="subtask-items-container">
                        {item.subtasks.map(sub => (
                          <div key={sub._id || sub.id} className="history-subtask-item">
                            <span className="subtask-tree-connector">├─</span>
                            <span className={`subtask-status-icon ${sub.completed ? 'completed' : 'pending'}`}>
                              {sub.completed ? '✓' : '○'}
                            </span>
                            <span className="history-subtask-title">{sub.title}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>

    </div>
  );
}
