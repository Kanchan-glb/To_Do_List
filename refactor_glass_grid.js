const fs = require('fs');
const path = require('path');

const srcDir = path.join(__dirname, 'frontend', 'src', 'components');
const dashPath = path.join(srcDir, 'GlassDashboard.jsx');
const cssPath = path.join(srcDir, 'glassDashboard.css');

// 1. Update GlassDashboard.jsx
let dashContent = fs.readFileSync(dashPath, 'utf8');

// Add new imports
const newImports = `
const GlassWeeklyProgress = lazy(() => import("./GlassWeeklyProgress"));
const GlassReportTracker = lazy(() => import("./GlassReportTracker"));
const GlassPerformanceInsights = lazy(() => import("./GlassPerformanceInsights"));
`;
dashContent = dashContent.replace('const DraggableCard = lazy(() => import("./dnd/DraggableCard"));', 'const DraggableCard = lazy(() => import("./dnd/DraggableCard"));\n' + newImports);

// Replace the return block entirely to remove DraggableGrid and use rigid grid layout
const oldReturnStart = dashContent.indexOf('  return (');
const newReturnBlock = `  return (
    <div className="glass-dashboard-container">
      <div className="glass-shape glass-shape-1"></div>
      <div className="glass-shape glass-shape-2"></div>

      <div className="glass-content" style={{ display: 'flex', flexDirection: 'column', gap: '16px', height: '100%', padding: '20px' }}>
        
        {/* Row 1: Hero Banner */}
        <section className="glass-hero" style={{ margin: 0, minHeight: '90px', padding: '16px 24px' }}>
          <div className="glass-hero-left">
            <p className="glass-hero-eyebrow">{todayLabel} • {timeLabel}</p>
            <h1 style={{ fontSize: '1.8rem' }}>{greeting}, {userName} 👋</h1>
            <p style={{ fontSize: '0.9rem', opacity: 0.9 }}>
              You have <strong>{todayCount} tasks</strong> today — {todayCompleted} done, {pendingCount} remaining.
            </p>
            <div style={{ marginTop: '8px' }}>
              <span className="glass-tag"><IcoFire /> {streak} day streak</span>
              <span className="glass-tag"><IcoCheck /> {completionRate}% complete</span>
              {overdueCount > 0 && <span className="glass-tag"><IcoAlert /> {overdueCount} overdue</span>}
            </div>
          </div>
          <div className="glass-hero-right">
            <svg width="80" height="80" viewBox="0 0 110 110">
              <circle cx="55" cy="55" r="46" fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="8" />
              <circle
                cx="55" cy="55" r="46" fill="none"
                stroke="#fff" strokeWidth="8"
                strokeLinecap="round"
                strokeDasharray={\`\${(completionRate / 100) * 289.0} 289.0\`}
                transform="rotate(-90 55 55)"
              />
              <text x="55" y="49" textAnchor="middle" fill="#fff" fontSize="22" fontWeight="800" fontFamily="Outfit,sans-serif">{completionRate}%</text>
              <text x="55" y="66" textAnchor="middle" fill="rgba(255,255,255,0.8)" fontSize="12" fontFamily="Inter,sans-serif">Today</text>
            </svg>
          </div>
        </section>

        {/* Row 2: Previews (3 cols) */}
        <section style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px', minHeight: '160px' }}>
          {renderWidget('completed')}
          {renderWidget('overdue')}
          {renderWidget('pending')}
        </section>

        {/* Row 3: Analytics & Activity (2 cols) */}
        <section style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', minHeight: '340px' }}>
          {renderWidget('analytics')}
          {renderWidget('activity')}
        </section>

        {/* Row 4: New Bottom Insights (3 cols) */}
        <section style={{ display: 'grid', gridTemplateColumns: '1.2fr 1.5fr 1fr', gap: '16px', minHeight: '180px', flex: 1 }}>
          <GlassWeeklyProgress tasks={tasks} />
          <GlassReportTracker tasks={tasks} />
          <GlassPerformanceInsights tasks={tasks} />
        </section>

        {selectedTask && (
          <TaskDetailsModal
            task={selectedTask}
            onClose={() => setSelectedTask(null)}
            onEdit={(taskToEdit) => {
              const target = taskToEdit || selectedTask;
              setSelectedTask(null);
              navigate("/tasks", { state: { editTask: target } });
            }}
            onDelete={(id) => {
              deleteTask(id);
              setSelectedTask(null);
            }}
          />
        )}
      </div>
    </div>
  );
}
`;

dashContent = dashContent.substring(0, oldReturnStart) + newReturnBlock;

fs.writeFileSync(dashPath, dashContent);

// 2. Adjust CSS scaling so everything fits perfectly.
// We remove the old compact grid rules since we inline them, and tweak the scale.
let cssContent = fs.readFileSync(cssPath, 'utf8');

// Replace the scale script I added earlier with a cleaner fit for 4 rows
cssContent = cssContent.replace(/transform:\s*scale\(0\.85\);/, 'transform: scale(0.72);');
cssContent = cssContent.replace(/width:\s*117\.6%;/, 'width: 138.8%;');
cssContent = cssContent.replace(/margin-left:\s*-8\.8%;/, 'margin-left: -19.4%;');

fs.writeFileSync(cssPath, cssContent);

console.log("Refactored layout to match 4 rows.");
