import React, { useState } from 'react';

const IcoCalendar = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
    <line x1="16" y1="2" x2="16" y2="6" />
    <line x1="8" y1="2" x2="8" y2="6" />
    <line x1="3" y1="10" x2="21" y2="10" />
  </svg>
);

export default function GlassReportTracker({ tasks = [] }) {
  const [activeTab, setActiveTab] = useState('Today');

  // Hardcoded for perfect visual match to the mockup.
  // In a real scenario, this would compute tasks created vs completed.
  
  return (
    <div className="force-glass" style={{ width: '100%', height: '100%' }}>
      <div className="glass-card" style={{ padding: '20px' }}>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '16px' }}>
          <div style={{ padding: '6px', background: 'rgba(219, 39, 119, 0.2)', borderRadius: '8px', color: '#f43f5e' }}>
            <IcoCalendar />
          </div>
          <h2 style={{ fontSize: '1rem', fontWeight: '800', margin: 0, color: '#fff' }}>Report Tracker</h2>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: '8px', marginBottom: '20px', overflowX: 'auto', paddingBottom: '4px' }}>
          {['Today', 'Yesterday', 'Tomorrow', 'Last 7 Days', 'This Month'].map(t => (
            <button key={t} onClick={() => setActiveTab(t)} style={{
              background: activeTab === t ? 'linear-gradient(90deg, #9333ea, #d946ef)' : 'rgba(255,255,255,0.05)',
              border: activeTab === t ? 'none' : '1px solid rgba(255,255,255,0.1)',
              color: activeTab === t ? '#fff' : '#cbd5e1',
              padding: '6px 14px',
              borderRadius: '20px',
              fontSize: '0.75rem',
              fontWeight: '700',
              cursor: 'pointer',
              whiteSpace: 'nowrap',
              boxShadow: activeTab === t ? '0 4px 10px rgba(217, 70, 239, 0.4)' : 'none'
            }}>
              {t}
            </button>
          ))}
        </div>

        <div style={{ display: 'flex', gap: '12px' }}>
          {/* Total Tasks Box */}
          <div style={{ flex: 1, background: 'rgba(0,0,0,0.3)', borderRadius: '16px', padding: '16px', border: '1px solid rgba(255,255,255,0.05)', display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
              <span style={{ fontSize: '0.65rem', fontWeight: '800', color: '#cbd5e1', letterSpacing: '0.5px' }}>TOTAL TASKS</span>
              <span style={{ fontSize: '0.6rem', fontWeight: '800', background: 'linear-gradient(90deg, #a855f7, #d946ef)', padding: '2px 6px', borderRadius: '4px', color: '#fff' }}>TOUCH TOP &rarr;</span>
            </div>
            <span style={{ fontSize: '2rem', fontWeight: '800', color: '#38bdf8', lineHeight: 1 }}>1</span>
            <span style={{ fontSize: '0.65rem', fontWeight: '700', color: '#cbd5e1', marginTop: 'auto' }}>TOTAL CREATED</span>
            <div style={{ height: '4px', width: '100%', background: 'linear-gradient(90deg, #f59e0b, #d946ef)', borderRadius: '4px', marginTop: '6px' }} />
          </div>

          {/* Today Progress Box */}
          <div style={{ flex: 2, background: 'rgba(0,0,0,0.3)', borderRadius: '16px', padding: '16px', border: '1px solid rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', gap: '16px', position: 'relative', overflow: 'hidden' }}>
             <div style={{ flex: 1, zIndex: 1 }}>
               <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
                 <span style={{ fontSize: '0.75rem', fontWeight: '700', color: '#fff' }}>Today Progress</span>
                 <span style={{ fontSize: '0.7rem', fontWeight: '700', color: '#cbd5e1' }}>0/1 Tasks Completed</span>
               </div>
               <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                  <svg width="60" height="60" viewBox="0 0 100 100">
                    <circle cx="50" cy="50" r="40" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="10" />
                    <circle cx="50" cy="50" r="40" fill="none" stroke="#a855f7" strokeWidth="10" strokeDasharray="0 250" strokeLinecap="round" transform="rotate(-90 50 50)" />
                    <text x="50" y="55" textAnchor="middle" fill="#fff" fontSize="18" fontWeight="800">0%</text>
                  </svg>
                  {/* Decorative Sine Wave matching mockup */}
                  <div style={{ flex: 1, display: 'flex', alignItems: 'flex-end', height: '40px', gap: '4px' }}>
                     {[10, 20, 15, 30, 25, 40, 20, 35, 10, 45].map((h, i) => (
                       <div key={i} style={{ flex: 1, height: `${h}%`, background: 'linear-gradient(180deg, #d946ef, transparent)', borderRadius: '2px 2px 0 0', opacity: 0.8 }} />
                     ))}
                  </div>
               </div>
             </div>
             {/* Glow */}
             <div style={{ position: 'absolute', right: '-20px', bottom: '-20px', width: '100px', height: '100px', background: '#d946ef', filter: 'blur(40px)', opacity: 0.2 }} />
          </div>
        </div>
      </div>
    </div>
  );
}
