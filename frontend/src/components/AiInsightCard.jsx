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
}