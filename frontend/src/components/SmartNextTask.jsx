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
}