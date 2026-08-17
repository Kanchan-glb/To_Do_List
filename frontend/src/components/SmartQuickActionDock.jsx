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
}