const fs = require('fs');
const path = require('path');

const srcDir = path.join(__dirname, 'frontend', 'src', 'components');

const paPath = path.join(srcDir, 'ProductivityAnalytics.jsx');
const tacPath = path.join(srcDir, 'TaskActivityCenter.jsx');
const gpaPath = path.join(srcDir, 'GlassProductivityAnalytics.jsx');
const gtacPath = path.join(srcDir, 'GlassTaskActivityCenter.jsx');

// Read files
let paContent = fs.readFileSync(paPath, 'utf8');
let tacContent = fs.readFileSync(tacPath, 'utf8');

// --- Transform ProductivityAnalytics ---
// Rename component
paContent = paContent.replace(/export default function ProductivityAnalytics/g, 'export default function GlassProductivityAnalytics');
// Remove dashboard.css import, add glassDashboard.css
paContent = paContent.replace(/import '\.\.\/dashboard\.css';/g, 'import "./glassDashboard.css";');
// Replace neumorphic tooltip background
paContent = paContent.replace(/background: '#edf2f8'/g, "background: 'rgba(255,255,255,0.15)', backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)'");
paContent = paContent.replace(/boxShadow: '-6px -6px 16px #ffffff, 6px 6px 18px #b8c6d9'/g, "boxShadow: '0 8px 32px 0 rgba(0,0,0,0.1)'");
// Replace text colors
paContent = paContent.replace(/color: '#1e293b'/g, "color: '#fff'");
paContent = paContent.replace(/color: '#0f172a'/g, "color: '#fff'");
paContent = paContent.replace(/color: '#000000'/g, "color: '#fff'");
// Replace pa-card with glass-card
paContent = paContent.replace(/className="pa-card"/g, 'className="glass-card"');
// Strip out some inline box shadows in the render
paContent = paContent.replace(/boxShadow:\s*['"][^'"]*['"]/g, "boxShadow: 'none'");
// Replace backgrounds that are #edf2f8
paContent = paContent.replace(/background:\s*['"]#edf2f8['"]/g, "background: 'rgba(255,255,255,0.1)'");


// --- Transform TaskActivityCenter ---
// Rename component
tacContent = tacContent.replace(/export default function TaskActivityCenter/g, 'export default function GlassTaskActivityCenter');
// Remove dashboard.css import, add glassDashboard.css
tacContent = tacContent.replace(/import "\.\.\/dashboard\.css";/g, 'import "./glassDashboard.css";');
// Replace side card class
tacContent = tacContent.replace(/className="tac-side-card"/g, 'className="glass-card"');
// Replace sum card class
tacContent = tacContent.replace(/className="tac-sum-card"/g, 'className="glass-card tac-sum-card"');
// Inline styles adjustments for View All button
tacContent = tacContent.replace(/background: 'linear-gradient[^']*'/g, "background: 'rgba(255, 255, 255, 0.2)'");
tacContent = tacContent.replace(/boxShadow: '[^']*'/g, "boxShadow: '0 4px 15px rgba(0,0,0,0.1)'");
tacContent = tacContent.replace(/color: '#7c3aed'/g, "color: '#fff'");
tacContent = tacContent.replace(/border: '1\.5px solid #c4b5fd'/g, "border: '1px solid rgba(255,255,255,0.4)'");

// For the embedded CSS in TaskActivityCenter, let's remove the neumorphic styles
tacContent = tacContent.replace(/box-shadow: inset -6px -6px 14px #ffffff, inset 6px 6px 16px #b8c6d9;/g, "");
tacContent = tacContent.replace(/background: #edf2f8;/g, "background: rgba(255,255,255,0.1); backdrop-filter: blur(12px);");
tacContent = tacContent.replace(/box-shadow: -6px -6px 14px #ffffff, 6px 6px 16px #b8c6d9;/g, "");
tacContent = tacContent.replace(/box-shadow: -8px -8px 18px #ffffff, 8px 8px 20px #a3b4c9;/g, "");
tacContent = tacContent.replace(/color: #1e293b;/g, "color: #fff;");
tacContent = tacContent.replace(/color: #64748b;/g, "color: rgba(255,255,255,0.8);");

// Write files
fs.writeFileSync(gpaPath, paContent);
fs.writeFileSync(gtacPath, tacContent);

console.log("Glass components created.");
