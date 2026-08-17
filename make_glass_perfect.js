const fs = require('fs');
const path = require('path');

const srcDir = path.join(__dirname, 'frontend', 'src', 'components');

const paPath = path.join(srcDir, 'ProductivityAnalytics.jsx');
const tacPath = path.join(srcDir, 'TaskActivityCenter.jsx');
const gpaPath = path.join(srcDir, 'GlassProductivityAnalytics.jsx');
const gtacPath = path.join(srcDir, 'GlassTaskActivityCenter.jsx');

// 1. Create GlassProductivityAnalytics.jsx
let paContent = fs.readFileSync(paPath, 'utf8');
paContent = paContent.replace(/export default function ProductivityAnalytics\(\) \{/g, 'export default function GlassProductivityAnalytics() {\n  // Glass styling applied via wrapper');
paContent = paContent.replace(/import '\.\.\/dashboard\.css';/, 'import "../dashboard.css";\nimport "./glassOverrides.css";');
// Wrap return in <div className="force-glass">
paContent = paContent.replace(/return \(\s*<div className="pa-container">/, 'return (\n    <div className="force-glass" style={{ width: "100%", height: "100%" }}>\n      <div className="pa-container">');
// Close the wrapper at the very end of the string (no /m flag)
paContent = paContent.replace(/<\/div>\s*\);\s*\}\s*$/, '</div>\n    </div>\n  );\n}');
fs.writeFileSync(gpaPath, paContent);

// 2. Create GlassTaskActivityCenter.jsx
let tacContent = fs.readFileSync(tacPath, 'utf8');
tacContent = tacContent.replace(/export default function TaskActivityCenter\(\) \{/g, 'export default function GlassTaskActivityCenter() {\n  // Glass styling applied via wrapper');
tacContent = tacContent.replace(/import "\.\.\/dashboard\.css";/, 'import "../dashboard.css";\nimport "./glassOverrides.css";');
tacContent = tacContent.replace(/return \(\s*<div className="tac-container">/, 'return (\n    <div className="force-glass" style={{ width: "100%", height: "100%" }}>\n      <div className="tac-container">');
// Close the wrapper at the very end of the string (no /m flag)
tacContent = tacContent.replace(/<\/div>\s*\);\s*\}\s*$/, '</div>\n    </div>\n  );\n}');
fs.writeFileSync(gtacPath, tacContent);

console.log("Fixed files created successfully.");
