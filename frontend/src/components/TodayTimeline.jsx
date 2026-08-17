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
}