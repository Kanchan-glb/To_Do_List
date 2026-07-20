import React from "react";
import { format } from "date-fns";
import { useTasks } from "../context/TaskContext";
import { toast } from "react-hot-toast";

export default function TaskDetailsModal({ task, onClose, onEdit, onDelete }) {
  const { updateTask } = useTasks();
  if (!task) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '500px', display: 'flex', flexDirection: 'column', gap: '16px', maxHeight: '85vh', overflowY: 'auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 style={{ margin: 0, fontSize: '1.4rem', color: 'var(--text-primary)' }}>Task Details</h2>
          <button
            onClick={onClose}
            style={{ background: 'transparent', border: 'none', fontSize: '1.2rem', cursor: 'pointer', color: '#64748b' }}
          >
            ✕
          </button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', fontSize: '0.95rem', color: 'var(--text-secondary)' }}>
          <div>
            <strong style={{ color: 'var(--text-primary)' }}>Title:</strong> {task.title}
          </div>

          {task.description && (
            <div>
              <strong style={{ color: 'var(--text-primary)' }}>Description:</strong> {task.description}
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div><strong style={{ color: 'var(--text-primary)' }}>Category:</strong> {task.category}</div>
            <div>
              <strong style={{ color: 'var(--text-primary)' }}>Priority:</strong>
              <span className={`badge priority-${task.priority}`} style={{ marginLeft: '8px' }}>{task.priority}</span>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div>
              <strong style={{ color: 'var(--text-primary)' }}>Created At:</strong>
              <div style={{ marginTop: '2px' }}>{task.createdDate || 'Unknown'} {task.createdTime ? `• ${task.createdTime}` : ''}</div>
            </div>
            <div>
              <strong style={{ color: 'var(--text-primary)' }}>Status:</strong>
              <div style={{ marginTop: '4px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <input
                  type="checkbox"
                  checked={task.completed}
                  disabled={task.completed}
                  title={task.completed ? "This task has already been completed." : "Mark as Completed"}
                  onChange={async (e) => {
                    if (task.completed) return;

                    // Subtasks validation check
                    const hasIncompleteSubtasks = task.subtasks && task.subtasks.length > 0 && task.subtasks.some(s => !s.completed);
                    if (hasIncompleteSubtasks) {
                      const completedCount = task.subtasks.filter(s => s.completed).length;
                      toast.error(`Complete all subtasks before marking this task as completed. (${completedCount} of ${task.subtasks.length} completed)`);
                      return;
                    }

                    try {
                      await updateTask(task.id, { completed: true, status: "completed" });
                    } catch (err) {}
                  }}
                  style={{
                    width: "16px",
                    height: "16px",
                    accentColor: "#10b981",
                    cursor: task.completed ? "not-allowed" : "pointer"
                  }}
                />
                <span style={{ fontSize: "0.85rem", fontWeight: "700", color: task.completed ? "#10b981" : "var(--text-muted)" }}>
                  {task.completed ? "Completed ✓" : "Mark Complete"}
                </span>
              </div>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div><strong style={{ color: 'var(--text-primary)' }}>Due Date:</strong> <div style={{ marginTop: '2px' }}>{task.dueDate}</div></div>
            <div>
              <strong style={{ color: 'var(--text-primary)' }}>Due/Start Time:</strong>
              <div style={{ marginTop: '2px' }}>{task.dueTime || 'N/A'}</div>
            </div>
          </div>

          {/* Time Span & Duration */}
          {(task.startTime || task.endTime) && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              {task.startTime && <div><strong style={{ color: 'var(--text-primary)' }}>Start Time:</strong> <div style={{ marginTop: '2px' }}>{task.startTime}</div></div>}
              {task.endTime && <div><strong style={{ color: 'var(--text-primary)' }}>End Time:</strong> <div style={{ marginTop: '2px' }}>{task.endTime}</div></div>}
            </div>
          )}

          {/* Related Person & Location */}
          {(task.person || task.location) && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              {task.person && <div><strong style={{ color: 'var(--text-primary)' }}>Related Person:</strong> <div style={{ marginTop: '2px' }}>{task.person}</div></div>}
              {task.location && <div><strong style={{ color: 'var(--text-primary)' }}>Location:</strong> <div style={{ marginTop: '2px' }}>{task.location}</div></div>}
            </div>
          )}

          {/* Reminder & Recurrence */}
          {(task.reminder || task.recurrence) && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              {task.reminder && <div><strong style={{ color: 'var(--text-primary)' }}>Reminder:</strong> <div style={{ marginTop: '2px' }}>{task.reminder}</div></div>}
              {task.recurrence && <div><strong style={{ color: 'var(--text-primary)' }}>Recurrence:</strong> <div style={{ marginTop: '2px' }}>{task.recurrence}</div></div>}
            </div>
          )}

          {/* Tags */}
          {task.tags && task.tags.length > 0 && (
            <div>
              <strong style={{ color: 'var(--text-primary)' }}>Tags:</strong>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '6px' }}>
                {task.tags.map((t, idx) => (
                  <span key={idx} style={{ background: '#f1f5f9', color: '#475569', fontSize: '0.75rem', padding: '4px 8px', borderRadius: '6px', fontWeight: '500' }}>
                    #{t}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Notes */}
          {task.notes && (
            <div>
              <strong style={{ color: 'var(--text-primary)' }}>Notes:</strong>
              <div style={{ marginTop: '2px', background: '#f8fafc', padding: '8px 12px', borderRadius: '8px', border: '1px solid #e2e8f0', fontStyle: 'italic' }}>
                {task.notes}
              </div>
            </div>
          )}

          {/* Voice Transcripts */}
          {task.originalTranscript && (
            <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: '12px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div>
                <strong style={{ color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  🎤 Spoken Transcript:
                </strong>
                <div style={{ marginTop: '4px', background: '#f8fafc', padding: '8px 12px', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '0.85rem' }}>
                  "{task.originalTranscript}"
                </div>
              </div>
              {task.translatedTranscript && task.translatedTranscript !== task.originalTranscript && (
                <div>
                  <strong style={{ color: 'var(--text-primary)', fontSize: '0.85rem' }}>Translated Transcript (English):</strong>
                  <div style={{ marginTop: '4px', background: '#f0fdf4', padding: '8px 12px', borderRadius: '8px', border: '1px solid #bbf7d0', fontSize: '0.85rem', color: '#166534' }}>
                    "{task.translatedTranscript}"
                  </div>
                </div>
              )}
            </div>
          )}

          {task.rescheduleCount > 0 && (
            <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: '12px' }}>
              <strong style={{ color: 'var(--text-primary)' }}>Reschedule History ({task.rescheduleCount}):</strong>
              {task.rescheduleHistory && task.rescheduleHistory.length > 0 ? (
                <ul style={{ paddingLeft: '0', listStyle: 'none', margin: '8px 0 0', display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '0.85rem' }}>
                  {task.rescheduleHistory.map((h, i) => (
                    <li key={i} style={{ background: '#f8fafc', padding: '8px 12px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                      <div style={{ marginBottom: '4px', fontWeight: '600', color: '#475569' }}>
                        Rescheduled on: {h.rescheduledAtDate} at {h.rescheduledAtTime}
                      </div>
                      <div style={{ color: '#64748b' }}>
                        From: <span style={{ textDecoration: 'line-through' }}>{h.previousDate} {h.previousTime}</span>
                      </div>
                      <div style={{ color: '#0f172a' }}>
                        To: {h.newDate} {h.newTime}
                      </div>
                    </li>
                  ))}
                </ul>
              ) : (
                <div style={{ fontSize: '0.85rem', color: '#64748b', marginTop: '4px' }}>Details not available for past reschedules.</div>
              )}
            </div>
          )}

          {(task.completedAt || task.completedDate) && (
            <div>
              <strong style={{ color: 'var(--text-primary)' }}>Completed At:</strong>
              <div style={{ marginTop: '2px' }}>
                {task.completedAt ? format(new Date(task.completedAt), "dd MMMM yyyy '•' hh:mm:ss a") : task.completedDate}
              </div>
            </div>
          )}

          {task.subtasks && task.subtasks.length > 0 && (
            <div>
              <strong style={{ color: 'var(--text-primary)' }}>Subtasks:</strong>
              <ul style={{ paddingLeft: '0', listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '6px', marginTop: '8px' }}>
                {task.subtasks.map(st => (
                  <li key={st.id} style={{ display: 'flex', alignItems: 'center', gap: '8px', opacity: st.completed ? 0.6 : 1 }}>
                    {st.completed ? '✅' : '⬜'}
                    <span style={{ textDecoration: st.completed ? 'line-through' : 'none' }}>{st.title}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Action Buttons */}
          <div style={{ display: "flex", gap: "8px", borderTop: "1px solid #e2e8f0", paddingTop: "16px", marginTop: "8px" }}>
            <button
              onClick={() => onEdit(task)}
              style={{
                flex: 1,
                background: "#e2e8f0",
                color: "#334155",
                border: "none",
                borderRadius: "8px",
                padding: "8px 16px",
                fontSize: "0.85rem",
                fontWeight: "600",
                cursor: "pointer"
              }}
            >
              ✏️ Edit Task
            </button>
            <button
              onClick={() => {
                if (window.confirm("Are you sure you want to delete this task?")) {
                  onDelete(task.id);
                }
              }}
              style={{
                flex: 1,
                background: "#fee2e2",
                color: "#ef4444",
                border: "none",
                borderRadius: "8px",
                padding: "8px 16px",
                fontSize: "0.85rem",
                fontWeight: "600",
                cursor: "pointer"
              }}
            >
              🗑️ Delete Task
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
