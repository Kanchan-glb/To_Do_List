import React from "react";
import { format } from "date-fns";
export default function TaskDetailsModal({ task, onClose }) {
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
              <div style={{ color: task.completed ? '#10b981' : '#d97706', fontWeight: 'bold', marginTop: '2px' }}>
                {task.completed ? 'Completed' : 'Pending'}
              </div>
            </div>
          </div>
          
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div><strong style={{ color: 'var(--text-primary)' }}>Due Date:</strong> <div style={{ marginTop: '2px' }}>{task.dueDate}</div></div>
            <div><strong style={{ color: 'var(--text-primary)' }}>Due Time:</strong> <div style={{ marginTop: '2px' }}>{task.dueTime || 'N/A'}</div></div>
          </div>
          
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
        </div>
      </div>
    </div>
  );
}
