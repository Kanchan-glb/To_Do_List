const fs = require('fs');

// 1. Update Layout.jsx
let layoutCode = fs.readFileSync('src/components/Layout.jsx', 'utf8');

// Wrap Add Task and Timer in <div className="topbar-center">
const searchBtnRegex = /<button[\s\S]*?className="topbar-add-task-btn"[\s\S]*?<span>Add Task<\/span>\s*<\/button>/;
const timerRegex = /<div className="timer-menu-wrap" ref=\{timerDropdownRef\}>[\s\S]*?{timerDropdownOpen && \([\s\S]*?<\/div>\s*\)\}\s*<\/div>/;

// Instead of complex regex, we can just find the exact index.
const addBtnIdx = layoutCode.indexOf('<button\n            type="button"\n            className="topbar-add-task-btn"');
const actionsIdx = layoutCode.indexOf('{/* Right: Actions */}');

if (addBtnIdx !== -1 && actionsIdx !== -1) {
    let before = layoutCode.substring(0, addBtnIdx);
    let middle = layoutCode.substring(addBtnIdx, actionsIdx);
    let after = layoutCode.substring(actionsIdx);

    // Ensure we don't double wrap
    if (!before.endsWith('<div className="topbar-center">\n          ')) {
        layoutCode = before + '<div className="topbar-center">\n          ' + middle + '</div>\n          ' + after;
        fs.writeFileSync('src/components/Layout.jsx', layoutCode);
        console.log("Updated Layout.jsx");
    }
}

// 2. Update index.css
let cssCode = fs.readFileSync('src/index.css', 'utf8');

const cssToAdd = `
.topbar-center {
  position: absolute;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  align-items: center;
  gap: 12px;
  z-index: 10;
}

@media (max-width: 768px) {
  .topbar-center {
    gap: 6px;
  }
  .topbar-add-task-btn span,
  .timer-btn .timer-label,
  .timer-btn {
     /* We will handle icon-only styling safely below */
  }
  .topbar-add-task-btn span:not(.icon) {
    display: none;
  }
  .topbar-add-task-btn {
    min-width: 42px !important;
    padding: 0 10px !important;
  }
  .timer-btn {
    min-width: 42px !important;
    padding: 0 10px !important;
    font-size: 0 !important; /* Hide 'Timer' text */
  }
  .timer-btn .timer-btn-icon {
    margin: 0;
  }
}
`;

if (!cssCode.includes('.topbar-center {')) {
    cssCode += cssToAdd;
    fs.writeFileSync('src/index.css', cssCode);
    console.log("Updated index.css");
}
