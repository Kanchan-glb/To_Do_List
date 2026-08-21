const fs = require('fs');
const filePath = 'c:/Users/Globussoft/new/To_Do_List/frontend/src/components/Layout.jsx';
let content = fs.readFileSync(filePath, 'utf-8');

const addTaskMatch = content.match(/(<button\s+type="button"\s+className="topbar-add-task-btn"[\s\S]*?<span>Add Task<\/span>\s*<\/button>)/);
const timerMenuMatch = content.match(/(<div className="timer-menu-wrap" ref=\{timerDropdownRef\}>[\s\S]*?<\/div>\s*)\{\/\* Daily Progress Ring \*\/\}/);

if (!addTaskMatch || !timerMenuMatch) {
  console.log('Could not find matches');
  process.exit(1);
}

const newCenter = `{/* Center: Actions */}
          <div className="topbar-center" style={{ display: "flex", justifyContent: "center", justifySelf: 'center', gap: '12px' }}>
            ${addTaskMatch[1]}
            ${timerMenuMatch[1]}
          </div>`;

const newActionsStart = `<div className="topbar-actions" style={{ justifySelf: 'end', display: 'flex', alignItems: 'center', gap: '12px' }}>
            {/* Daily Progress Ring */}`;

const oldBlockRegex = /\{\/\* Center: Smart Command Bar \*\/\}[\s\S]*?<div className="topbar-actions" style=\{\{ justifySelf: 'end', display: 'flex', alignItems: 'center', gap: '12px' \}\}>[\s\S]*?\{\/\* Daily Progress Ring \*\/\}/;

content = content.replace(oldBlockRegex, `${newCenter}\n\n          ${newActionsStart}`);

fs.writeFileSync(filePath, content);
console.log('Done!');
