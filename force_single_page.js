const fs = require('fs');
const path = require('path');

const srcDir = path.join(__dirname, 'frontend', 'src', 'components');
const gdPath = path.join(srcDir, 'glassDashboard.css');

let gdContent = fs.readFileSync(gdPath, 'utf8');

// Add a forceful scaling to the main content container to guarantee it fits on one page
if (!gdContent.includes('transform: scale(0.9)')) {
  gdContent = gdContent.replace('.glass-content {', '.glass-content {\n  transform: scale(0.85);\n  transform-origin: top center;\n  width: 117.6%; /* Compensate for scale (1 / 0.85 = 1.176) */\n  margin-left: -8.8%;\n');
  
  // Make sure the container itself doesn't scroll and perfectly fits
  gdContent = gdContent.replace('overflow-y: auto;', 'overflow: hidden;\n  height: 100vh;\n  display: flex;\n  flex-direction: column;');
}

fs.writeFileSync(gdPath, gdContent);
console.log("Applied global scale(0.85) to force fit on single page.");
