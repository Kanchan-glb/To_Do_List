const fs = require('fs');
const path = require('path');

const srcDir = path.join(__dirname, 'frontend', 'src', 'components');
const gdPath = path.join(srcDir, 'glassDashboard.css');
const goPath = path.join(srcDir, 'glassOverrides.css');
const dashPath = path.join(__dirname, 'frontend', 'src', 'dashboard.css');

// 1. Update glassDashboard.css
let gdContent = fs.readFileSync(gdPath, 'utf8');

// Reduce container padding
gdContent = gdContent.replace(/padding:\s*2rem;/g, 'padding: 0.5rem;');
gdContent = gdContent.replace(/margin:\s*1rem;/g, 'margin: 0.5rem;');

// Reduce grid gaps
gdContent = gdContent.replace(/gap:\s*1\.5rem;/g, 'gap: 0.75rem;');
gdContent = gdContent.replace(/margin-bottom:\s*1\.5rem;/g, 'margin-bottom: 0.75rem;');

// Reduce hero sizes
gdContent = gdContent.replace(/padding:\s*2rem;/g, 'padding: 1rem;');
gdContent = gdContent.replace(/margin-bottom:\s*2rem;/g, 'margin-bottom: 0.75rem;');
gdContent = gdContent.replace(/font-size:\s*2\.5rem;/g, 'font-size: 1.5rem;');
gdContent = gdContent.replace(/padding:\s*6px\s*12px;/g, 'padding: 4px 8px;'); // Tags
gdContent = gdContent.replace(/font-size:\s*0\.85rem;/g, 'font-size: 0.75rem;'); // Tags

// Reduce glass-card
gdContent = gdContent.replace(/padding:\s*1\.5rem;/g, 'padding: 0.75rem;');
gdContent = gdContent.replace(/margin-bottom:\s*1rem;/g, 'margin-bottom: 0.5rem;');

// Reduce grid columns to squeeze more on screen
gdContent = gdContent.replace(/minmax\(300px,\s*1fr\)/g, 'minmax(250px, 1fr)');
gdContent = gdContent.replace(/minmax\(400px,\s*1fr\)/g, 'minmax(350px, 1fr)');

fs.writeFileSync(gdPath, gdContent);

// 2. Update glassOverrides.css (Adding global compact overrides)
let goContent = fs.readFileSync(goPath, 'utf8');

// Append compact overrides at the end
const compactOverrides = `

/* =================================================
   COMPACT MODE AGGRESSIVE OVERRIDES
================================================= */
.force-glass .pa-card,
.force-glass .tac-side-card,
.force-glass .tac-sum-card,
.force-glass .pa-stat-card {
  padding: 8px !important;
  gap: 8px !important;
}

.force-glass h2 {
  font-size: 1.1rem !important;
  margin: 0 !important;
}

.force-glass h4 {
  font-size: 0.9rem !important;
  margin: 0 !important;
}

.force-glass p {
  font-size: 0.75rem !important;
  margin: 0 !important;
}

/* Reduce chart heights */
.force-glass .pa-chart-inset-container {
  min-height: 120px !important;
  height: 140px !important;
}

/* Reduce task item heights */
.force-glass .tac-task-item {
  padding: 6px 10px !important;
  font-size: 0.8rem !important;
  margin-bottom: 4px !important;
}

/* Reduce headers and dropdowns */
.force-glass select,
.force-glass .tac-date-picker {
  padding: 6px !important;
  font-size: 0.8rem !important;
  margin-bottom: 4px !important;
}

/* Reduce big stat values */
.force-glass .pa-stat-val {
  font-size: 1.2rem !important;
}

/* Squeeze Productivity Score circle */
.force-glass .tac-score-circle {
  transform: scale(0.7);
  margin-top: -20px !important;
  margin-bottom: -20px !important;
}

/* Adjust Dashboard grids in main file */
.glass-task-preview-grid {
  grid-template-columns: repeat(3, 1fr);
}
.glass-bottom-grid {
  grid-template-columns: repeat(2, 1fr);
}
`;

if (!goContent.includes('COMPACT MODE AGGRESSIVE OVERRIDES')) {
  fs.writeFileSync(goPath, goContent + compactOverrides);
}

// 3. Update dashboard.css to make sure nothing has min-heights blocking us
let dashContent = fs.readFileSync(dashPath, 'utf8');
dashContent = dashContent.replace(/min-height:\s*\d+px;/g, 'min-height: 0;');
dashContent = dashContent.replace(/padding:\s*\d+px/g, 'padding: 8px');
fs.writeFileSync(dashPath, dashContent);

console.log("Scaled everything down for a compact single-page layout.");
