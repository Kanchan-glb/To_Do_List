import React, { useState, useMemo } from 'react';
import { format, subDays, addDays, isThisMonth, differenceInDays, parseISO } from 'date-fns';

const IcoCalendar = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
    <line x1="16" y1="2" x2="16" y2="6" />
    <line x1="8" y1="2" x2="8" y2="6" />
    <line x1="3" y1="10" x2="21" y2="10" />
  </svg>
);

const GlassStackedCardsDeck = ({ summaryStats }) => {
  const [topIndex, setTopIndex] = useState(0);
  const [animating, setAnimating] = useState(false);

  const cards = [
    {
      id: "sum-pending",
      title: "Pending",
      value: summaryStats.pending,
      color: "#f59e0b",
      bannerText: "IN PROGRESS",
      gradient: "linear-gradient(135deg, rgba(245,158,11,0.2), rgba(217,119,6,0.1))"
    },
    {
      id: "sum-completed",
      title: "Completed",
      value: summaryStats.completed,
      color: "#10b981",
      bannerText: "FINISHED",
      gradient: "linear-gradient(135deg, rgba(16,185,129,0.2), rgba(5,150,105,0.1))"
    },
    {
      id: "sum-total",
      title: "Total Tasks",
      value: summaryStats.total,
      color: "#38bdf8",
      bannerText: "TOTAL CREATED",
      gradient: "linear-gradient(135deg, rgba(56,189,248,0.2), rgba(2,132,199,0.1))"
    }
  ];

  const handleNextCard = () => {
    if (animating) return;
    setAnimating(true);
    setTimeout(() => {
      setTopIndex((prev) => (prev + 1) % cards.length);
      setAnimating(false);
    }, 280);
  };

  const handlePrevCard = () => {
    if (animating) return;
    setAnimating(true);
    setTimeout(() => {
      setTopIndex((prev) => (prev - 1 + cards.length) % cards.length);
      setAnimating(false);
    }, 280);
  };

  return (
    <div style={{ flex: 1, position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      <div style={{ position: 'relative', width: '100%', height: '140px', perspective: '1000px' }}>
        {cards.map((card, idx) => {
          const total = cards.length;
          const relIndex = (idx - topIndex + total) % total;
          const isTop = relIndex === 0;
          const isAnimatingThis = isTop && animating;

          const rotateAngle = isTop ? 0 : (idx % 2 === 0 ? 3 + relIndex * 2 : -3 - relIndex * 2);
          const offsetY = relIndex * 8;
          const scale = 1 - relIndex * 0.05;
          const zIndex = total - relIndex;

          return (
            <div
              key={card.id}
              onClick={isTop ? handleNextCard : undefined}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: '100px',
                zIndex: zIndex,
                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                transform: isAnimatingThis
                  ? `translate(120%, -20px) rotate(20deg) scale(0.9)`
                  : `translateY(${offsetY}px) rotate(${rotateAngle}deg) scale(${scale})`,
                opacity: isAnimatingThis ? 0 : (1 - relIndex * 0.15),
                pointerEvents: isTop ? "auto" : "none",
                background: 'rgba(0,0,0,0.3)',
                borderRadius: '16px',
                padding: '16px',
                border: '1px solid rgba(255,255,255,0.08)',
                boxShadow: '0 8px 32px rgba(0, 0, 0, 0.2)',
                display: 'flex',
                flexDirection: 'column',
                cursor: isTop ? 'pointer' : 'default',
                backdropFilter: 'blur(10px)'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                <span style={{ fontSize: '0.65rem', fontWeight: '800', color: '#cbd5e1', letterSpacing: '0.5px', textTransform: 'uppercase' }}>{card.title}</span>
                {isTop && (
                  <span style={{ fontSize: '0.6rem', fontWeight: '800', background: 'linear-gradient(90deg, #a855f7, #d946ef)', padding: '2px 6px', borderRadius: '4px', color: '#fff' }}>TOUCH TOP &rarr;</span>
                )}
              </div>
              <span style={{ fontSize: '2rem', fontWeight: '800', color: card.color, lineHeight: 1 }}>{card.value}</span>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 'auto' }}>
                <span style={{ fontSize: '0.65rem', fontWeight: '700', color: '#94a3b8' }}>{card.bannerText}</span>
              </div>
              <div style={{ height: '4px', width: '100%', background: card.gradient, borderRadius: '4px', marginTop: '6px' }}>
                <div style={{ height: '100%', width: '100%', background: card.color, borderRadius: '4px', opacity: 0.8 }} />
              </div>
            </div>
          );
        })}
      </div>
      
      <div style={{ display: 'flex', gap: '8px', marginTop: '4px', zIndex: 10 }}>
        <button
          onClick={handlePrevCard}
          style={{
            padding: '4px 10px',
            borderRadius: '20px',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            background: 'rgba(255, 255, 255, 0.05)',
            color: '#cbd5e1',
            fontSize: '0.7rem',
            fontWeight: '700',
            cursor: 'pointer',
            transition: 'all 0.2s',
            backdropFilter: 'blur(4px)'
          }}
        >
          &larr; Prev
        </button>
        <button
          onClick={handleNextCard}
          style={{
            padding: '4px 10px',
            borderRadius: '20px',
            border: '1px solid rgba(168, 85, 247, 0.3)',
            background: 'rgba(168, 85, 247, 0.1)',
            color: '#d946ef',
            fontSize: '0.7rem',
            fontWeight: '700',
            cursor: 'pointer',
            transition: 'all 0.2s',
            backdropFilter: 'blur(4px)'
          }}
        >
          Next &rarr;
        </button>
      </div>
    </div>
  );
};

export default function GlassReportTracker({ tasks = [] }) {
  const [activeTab, setActiveTab] = useState('Today');

  const summaryStats = useMemo(() => {
    let total = 0, completed = 0, pending = 0;
    const todayStr = format(new Date(), "yyyy-MM-dd");

    const getStatsForDate = (dateStr) => {
      let dTotal = 0, dComp = 0, dPend = 0;
      tasks.forEach(t => {
        const taskDue = t.dueDate || t.createdDate || todayStr;
        const isComp = t.completed || t.status === "Completed";
        const actualCompDate = (t.completedAt && format(new Date(t.completedAt), "yyyy-MM-dd")) || t.completedDate || (isComp ? (t.updatedAt ? format(new Date(t.updatedAt), "yyyy-MM-dd") : taskDue) : null);
        const isCompletedOnDate = isComp && actualCompDate === dateStr;
        const isDueOnDate = taskDue === dateStr;
        const isPastOverdueCarriedOver = !isComp && taskDue < dateStr && dateStr === todayStr;
        
        if (isDueOnDate || isCompletedOnDate || isPastOverdueCarriedOver) {
          dTotal++;
          if (isCompletedOnDate) dComp++;
          else dPend++;
        }
      });
      return { total: dTotal, completed: dComp, pending: dPend };
    };

    if (activeTab === "Today") return getStatsForDate(todayStr);
    if (activeTab === "Yesterday") return getStatsForDate(format(subDays(new Date(), 1), "yyyy-MM-dd"));
    if (activeTab === "Tomorrow") return getStatsForDate(format(addDays(new Date(), 1), "yyyy-MM-dd"));

    tasks.forEach(t => {
      let taskDateObj;
      try { taskDateObj = parseISO(t.dueDate || t.createdDate || todayStr); } catch (e) { taskDateObj = new Date(); }

      const isComp = t.completed || t.status === "Completed";
      const taskDue = t.dueDate || t.createdDate || todayStr;
      const isPastOverdue = !isComp && taskDue < todayStr;

      let include = false;
      if (activeTab === "Last 7 Days") {
        const diff = differenceInDays(new Date(), taskDateObj);
        include = (diff <= 7 && diff >= 0) || isPastOverdue;
      } else if (activeTab === "This Month") {
        include = isThisMonth(taskDateObj) || isPastOverdue;
      }

      if (include) {
        total++;
        if (isComp) completed++;
        else pending++;
      }
    });
    
    return { total, completed, pending };
  }, [tasks, activeTab]);

  const completionPct = summaryStats.total === 0 ? 0 : Math.round((summaryStats.completed / summaryStats.total) * 100);
  const dashLength = 251.2;
  const dashOffset = dashLength - (completionPct / 100) * dashLength;
  
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
          {/* Glass Stacked Cards Deck */}
          <GlassStackedCardsDeck summaryStats={summaryStats} />

          {/* Progress Box */}
          <div style={{ flex: 2, background: 'rgba(0,0,0,0.3)', borderRadius: '16px', padding: '16px', border: '1px solid rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', gap: '16px', position: 'relative', overflow: 'hidden' }}>
             <div style={{ flex: 1, zIndex: 1 }}>
               <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
                 <span style={{ fontSize: '0.75rem', fontWeight: '700', color: '#fff' }}>{activeTab} Progress</span>
                 <span style={{ fontSize: '0.7rem', fontWeight: '700', color: '#cbd5e1' }}>{summaryStats.completed}/{summaryStats.total} Tasks Completed</span>
               </div>
               <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                  <svg width="60" height="60" viewBox="0 0 100 100">
                    <circle cx="50" cy="50" r="40" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="10" />
                    <circle cx="50" cy="50" r="40" fill="none" stroke="#a855f7" strokeWidth="10" strokeDasharray={`${dashLength} ${dashLength}`} strokeDashoffset={dashOffset} strokeLinecap="round" transform="rotate(-90 50 50)" style={{ transition: 'stroke-dashoffset 0.8s ease' }} />
                    <text x="50" y="55" textAnchor="middle" fill="#fff" fontSize="18" fontWeight="800">{completionPct}%</text>
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
