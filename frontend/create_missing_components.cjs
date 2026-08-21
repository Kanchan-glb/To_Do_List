const fs = require('fs');
const path = require('path');

const componentsDir = path.join(__dirname, 'src', 'components');

const files = {
  'ProductivityHeatmap.jsx': `
import React from 'react';
import './glassOverrides.css';

export default function ProductivityHeatmap({ tasks }) {
  return (
    <div className="glass-card" style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
      <h4 style={{ margin: 0, fontSize: '0.95rem', color: '#e2e8f0' }}>Activity Heatmap</h4>
      <div style={{ height: '80px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(255,255,255,0.05)', borderRadius: '8px' }}>
        <p style={{ opacity: 0.6, fontSize: '0.8rem' }}>Heatmap data visualization</p>
      </div>
    </div>
  );
}`,
  'SmartNextTask.jsx': `
import React from 'react';
import { useTasks } from '../context/TaskContext';

export default function SmartNextTask() {
  const { tasks } = useTasks();
  const nextTask = tasks.find(t => !t.completed) || null;
  return (
    <div className="glass-card" style={{ padding: '20px', background: 'linear-gradient(135deg, rgba(59,130,246,0.2) 0%, rgba(139,92,246,0.2) 100%)' }}>
      <h3 style={{ margin: '0 0 12px 0', fontSize: '0.9rem', color: '#93c5fd', textTransform: 'uppercase' }}>Smart Suggestion</h3>
      {nextTask ? (
        <div>
          <h4 style={{ margin: 0, fontSize: '1.2rem', color: '#fff' }}>{nextTask.title}</h4>
          <p style={{ margin: '4px 0 0 0', opacity: 0.8, fontSize: '0.9rem' }}>Recommended based on priority and time.</p>
        </div>
      ) : (
        <p style={{ margin: 0, opacity: 0.7 }}>No upcoming tasks. You are all caught up!</p>
      )}
    </div>
  );
}`,
  'AiInsightCard.jsx': `
import React from 'react';

export default function AiInsightCard({ tasks }) {
  return (
    <div className="glass-card" style={{ padding: '20px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
        <span style={{ fontSize: '1.2rem' }}>✨</span>
        <h3 style={{ margin: 0, fontSize: '0.9rem', color: '#c4b5fd', textTransform: 'uppercase' }}>AI Insight</h3>
      </div>
      <p style={{ margin: 0, lineHeight: 1.5, opacity: 0.9 }}>
        You've completed most of your tasks in the morning this week. Consider scheduling deep work before 12 PM.
      </p>
    </div>
  );
}`,
  'TodayTimeline.jsx': `
import React from 'react';
import { useTasks } from '../context/TaskContext';

export default function TodayTimeline() {
  return (
    <div className="glass-card" style={{ padding: '20px', height: '100%' }}>
      <h3 style={{ margin: '0 0 16px 0', fontSize: '0.9rem', color: '#cbd5e1', textTransform: 'uppercase' }}>Today's Timeline</h3>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          <span style={{ fontSize: '0.8rem', opacity: 0.7, width: '60px' }}>09:00 AM</span>
          <div style={{ flex: 1, padding: '8px 12px', background: 'rgba(255,255,255,0.05)', borderRadius: '6px', fontSize: '0.9rem' }}>Daily Standup</div>
        </div>
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          <span style={{ fontSize: '0.8rem', opacity: 0.7, width: '60px' }}>12:00 PM</span>
          <div style={{ flex: 1, padding: '8px 12px', background: 'rgba(255,255,255,0.05)', borderRadius: '6px', fontSize: '0.9rem' }}>Deep Work Block</div>
        </div>
      </div>
    </div>
  );
}`,
  'TaskDetailsDrawer.jsx': `
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
}`,
  'SmartQuickActionDock.jsx': `
import React from 'react';

export default function SmartQuickActionDock() {
  return (
    <div style={{ position: 'fixed', bottom: '24px', left: '50%', transform: 'translateX(-50%)', background: 'rgba(30, 41, 59, 0.8)', backdropFilter: 'blur(16px)', padding: '12px 24px', borderRadius: '100px', display: 'flex', gap: '24px', border: '1px solid rgba(255,255,255,0.1)', zIndex: 900, boxShadow: '0 10px 40px rgba(0,0,0,0.3)' }}>
      <button style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
        <span style={{ fontSize: '1.2rem' }}>➕</span>
        <span style={{ fontSize: '0.65rem', opacity: 0.8, textTransform: 'uppercase', letterSpacing: '0.5px' }}>New Task</span>
      </button>
      <button style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
        <span style={{ fontSize: '1.2rem' }}>🔍</span>
        <span style={{ fontSize: '0.65rem', opacity: 0.8, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Search</span>
      </button>
      <button style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
        <span style={{ fontSize: '1.2rem' }}>🎯</span>
        <span style={{ fontSize: '0.65rem', opacity: 0.8, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Focus</span>
      </button>
    </div>
  );
}`
};

Object.entries(files).forEach(([filename, filecontent]) => {
  fs.writeFileSync(path.join(componentsDir, filename), filecontent.trim());
});

console.log("Created 6 missing components.");
