import React from 'react';

export default function TaskDetailsDrawer({ task, isOpen, onClose, onEdit, onReschedule, onComplete }) {
  if (!isOpen || !task) return null;
  
  return (
    <div style={{ position: 'fixed', right: 0, top: 0, bottom: 0, width: '350px', background: 'rgba(15, 23, 42, 0.95)', backdropFilter: 'blur(20px)', borderLeft: '1px solid rgba(255,255,255,0.1)', padding: '24px', zIndex: 1000, color: 'white', display: 'flex', flexDirection: 'column', boxShadow: '-5px 0 25px rgba(0,0,0,0.5)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <h2 style={{ margin: 0, fontSize: '1.2rem' }}>Task Details</h2>
        <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#cbd5e1', cursor: 'pointer', fontSize: '1.5rem' }}>&times;</button>
      </div>
      <div style={{ flex: 1 }}>
        <h3 style={{ margin: '0 0 8px 0', fontSize: '1.5rem' }}>{task.title}</h3>
        <p style={{ opacity: 0.7 }}>{task.description || "No description provided."}</p>
      </div>
      <div style={{ display: 'flex', gap: '12px' }}>
        <button onClick={() => onComplete(task.id)} style={{ flex: 1, padding: '12px', background: '#3b82f6', border: 'none', borderRadius: '8px', color: 'white', cursor: 'pointer', fontWeight: 'bold' }}>Complete</button>
        <button onClick={() => onEdit(task)} style={{ flex: 1, padding: '12px', background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: '8px', color: 'white', cursor: 'pointer' }}>Edit</button>
      </div>
    </div>
  );
}