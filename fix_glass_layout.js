const fs = require('fs');
const path = require('path');

const srcDir = path.join(__dirname, 'frontend', 'src', 'components');

const gpaPath = path.join(srcDir, 'GlassProductivityAnalytics.jsx');
const gtacPath = path.join(srcDir, 'GlassTaskActivityCenter.jsx');

// Fix Productivity Analytics
let paContent = fs.readFileSync(gpaPath, 'utf8');
if (!paContent.includes("import '../dashboard.css';")) {
  paContent = paContent.replace('import "./glassDashboard.css";', "import '../dashboard.css';\nimport \"./glassDashboard.css\";");
}
// Add pa-card back to give structure
paContent = paContent.replace(/className="glass-card"/g, 'className="pa-card glass-card"');
// Fix missing padding/margin for the grid
paContent = paContent.replace(/className="pa-stats-grid"/g, 'className="pa-stats-grid glass-pa-grid"');

// Write back
fs.writeFileSync(gpaPath, paContent);

// Fix Task Activity Center
let tacContent = fs.readFileSync(gtacPath, 'utf8');
if (!tacContent.includes("import '../dashboard.css';")) {
  tacContent = tacContent.replace('import "./glassDashboard.css";', "import '../dashboard.css';\nimport \"./glassDashboard.css\";");
}
// Add structure classes back
tacContent = tacContent.replace(/className="glass-card"/g, 'className="tac-side-card glass-card"');
tacContent = tacContent.replace(/className="tac-side-card glass-card tac-sum-card"/g, 'className="tac-sum-card glass-card"');

fs.writeFileSync(gtacPath, tacContent);

console.log("Layout fixed.");
