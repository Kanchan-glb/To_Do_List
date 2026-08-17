import React from 'react';
import { format } from 'date-fns';

const IcoTrophy = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"></path><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"></path><path d="M4 22h16"></path><path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22"></path><path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22"></path><path d="M18 2H6v7a6 6 0 0 0 12 0V2Z"></path></svg>;

export default function GlassPerformanceInsights({ tasks = [] }) {
  const insights = [
    {
      icon: <span style={{ color: '#22c55e' }}>⭐</span>,
      label: 'Best Performing Day',
      value: 'Thu'
    },
    {
      icon: <span style={{ color: '#ef4444' }}>🔥</span>,
      label: 'Current Streak',
      value: '0 Days'
    },
    {
      icon: <span style={{ color: '#f59e0b' }}>💥</span>,
      label: 'Highest Completion %',
      value: '75%'
    },
    {
      icon: <span style={{ color: '#a855f7' }}>⚡</span>,
      label: 'Avg Daily Completion',
      value: '0 Tasks'
    },
    {
      icon: <span style={{ color: '#3b82f6' }}>📈</span>,
      label: 'Weekly Trend',
      value: '0%'
    }
  ];

  return (
    <div className="force-glass" style={{ width: '100%', height: '100%' }}>
      <div className="glass-card" style={{ padding: '20px', display: 'flex', flexDirection: 'column', position: 'relative', overflow: 'hidden' }}>
        
        {/* Glow at the top right */}
        <div style={{ position: 'absolute', top: '-30px', right: '-30px', width: '100px', height: '100px', background: '#ec4899', filter: 'blur(50px)', opacity: 0.3 }} />

        <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '20px' }}>
          <div style={{ padding: '6px', background: 'rgba(234, 179, 8, 0.2)', borderRadius: '8px', color: '#facc15' }}>
            <IcoTrophy />
          </div>
          <h2 style={{ fontSize: '1rem', fontWeight: '800', margin: 0, color: '#fff' }}>Performance Insights</h2>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', flex: 1, justifyContent: 'center' }}>
          {insights.map((item, i) => (
            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                <div style={{ 
                  width: '24px', height: '24px', 
                  borderRadius: '50%', 
                  background: 'rgba(255,255,255,0.05)', 
                  display: 'flex', justifyContent: 'center', alignItems: 'center',
                  fontSize: '12px'
                }}>
                  {item.icon}
                </div>
                <span style={{ fontSize: '0.85rem', color: '#e2e8f0', fontWeight: '600' }}>{item.label}</span>
              </div>
              <span style={{ fontSize: '0.9rem', color: '#fff', fontWeight: '800' }}>{item.value}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
