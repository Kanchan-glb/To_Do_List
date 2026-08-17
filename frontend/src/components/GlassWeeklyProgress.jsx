import React from 'react';
import { format, subDays } from 'date-fns';

const IcoTrend = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="22 7 13.5 15.5 8.5 10.5 2 17"></polyline>
    <polyline points="16 7 22 7 22 13"></polyline>
  </svg>
);

const IcoBar = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <line x1="18" y1="20" x2="18" y2="10"></line>
    <line x1="12" y1="20" x2="12" y2="4"></line>
    <line x1="6" y1="20" x2="6" y2="14"></line>
  </svg>
);

export default function GlassWeeklyProgress({ tasks = [] }) {
  // Mock data to match the screenshot for structural integrity, 
  // but let's wire it to realistic calculations if possible.
  
  // Calculate completion for the last 7 days including today
  const last7Days = Array.from({ length: 7 }).map((_, i) => {
    const d = subDays(new Date(), 6 - i);
    return format(d, 'yyyy-MM-dd');
  });

  const dayData = last7Days.map(dateStr => {
    const dateObj = new Date(dateStr);
    const dayLabel = format(dateObj, 'EEE').toUpperCase();
    
    // Total tasks due this day or completed this day
    const dayTasks = tasks.filter(t => {
      const isDue = (t.dueDate === dateStr);
      const isCompleted = (t.completedAt && t.completedAt.startsWith(dateStr));
      return isDue || isCompleted;
    });

    const total = dayTasks.length;
    const completed = dayTasks.filter(t => t.status === "Completed" || t.completed).length;
    const percent = total === 0 ? 0 : Math.round((completed / total) * 100);

    return {
      dayLabel,
      completed,
      total,
      percent
    };
  });

  // Since we want to perfectly match the mockup's data structure, we'll force render the boxes
  return (
    <div className="force-glass" style={{ width: '100%', height: '100%' }}>
      <div className="glass-card" style={{ padding: '20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <div style={{ padding: '6px', background: 'rgba(168, 85, 247, 0.2)', borderRadius: '8px', color: '#c084fc' }}>
               <IcoBar />
            </div>
            <div>
              <h2 style={{ fontSize: '1rem', fontWeight: '800', margin: 0, color: '#fff' }}>Last 7 Days Progress</h2>
              <p style={{ fontSize: '0.75rem', color: '#cbd5e1', margin: 0 }}>Daily task completion breakdown and progress tracks</p>
            </div>
          </div>
          <button style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'rgba(168, 85, 247, 0.2)', border: '1px solid rgba(168, 85, 247, 0.5)', padding: '6px 12px', borderRadius: '20px', color: '#c084fc', fontSize: '0.75rem', fontWeight: '700', cursor: 'pointer' }}>
            <IcoTrend /> Weekly Trend
          </button>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', gap: '10px' }}>
          {dayData.map((d, i) => (
            <div key={i} style={{ 
              flex: 1, 
              display: 'flex', 
              flexDirection: 'column', 
              alignItems: 'center', 
              background: 'rgba(0,0,0,0.3)', 
              borderRadius: '16px', 
              padding: '12px 0',
              border: '1px solid rgba(255,255,255,0.05)',
              position: 'relative',
              overflow: 'hidden'
            }}>
              <span style={{ fontSize: '0.75rem', fontWeight: '700', color: '#cbd5e1', marginBottom: '8px' }}>{d.dayLabel}</span>
              <span style={{ fontSize: '1.1rem', fontWeight: '800', color: '#fff', marginBottom: '8px' }}>{d.completed}/{d.total}</span>
              
              <div style={{ 
                width: '70%', 
                height: '4px', 
                background: 'rgba(255,255,255,0.1)', 
                borderRadius: '4px', 
                marginBottom: '10px',
                position: 'relative'
              }}>
                <div style={{ 
                  position: 'absolute', left: 0, top: 0, bottom: 0, 
                  width: `${d.percent}%`, 
                  background: '#d946ef',
                  borderRadius: '4px',
                  boxShadow: '0 0 10px #d946ef'
                }} />
              </div>

              <span style={{ fontSize: '0.8rem', fontWeight: '800', color: '#d946ef' }}>{d.percent}%</span>
              
              {/* If it's a good day, show a glowing background highlight */}
              {d.percent >= 50 && (
                <div style={{ position: 'absolute', bottom: '-20px', left: '50%', transform: 'translateX(-50%)', width: '40px', height: '40px', background: '#d946ef', filter: 'blur(20px)', opacity: 0.3, borderRadius: '50%' }} />
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
