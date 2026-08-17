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
}