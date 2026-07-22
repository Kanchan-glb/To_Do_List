const fs = require('fs');
let code = fs.readFileSync('src/components/TaskPage.jsx', 'utf8');

// Change overflowY: "auto" to overflow: "hidden" for status-card-previews
code = code.replace(/className="status-card-previews" style={{ flex: 1, overflowY: "auto", paddingRight: "4px" }}/g, 'className="status-card-previews" style={{ flex: 1, overflow: "hidden", paddingRight: "4px" }}');

// Change pendingTasksList.map to pendingTasksList.slice(0, 3).map
code = code.replace(/pendingTasksList\s*\n\s*\.map\(\(task\) => \{/g, 'pendingTasksList.slice(0, 3).map((task) => {');

// Change overdueTasksList.map to overdueTasksList.slice(0, 3).map
code = code.replace(/overdueTasksList\s*\n\s*\.map\(\(task\) => \{/g, 'overdueTasksList.slice(0, 3).map((task) => {');

// Change completedTasksList.map to completedTasksList.slice(0, 3).map
code = code.replace(/completedTasksList\s*\n\s*\.map\(\(task\) => \{/g, 'completedTasksList.slice(0, 3).map((task) => {');

// Change incomingTasksList.map to incomingTasksList.slice(0, 3).map
code = code.replace(/incomingTasksList\s*\n\s*\.map\(\(task\) => \{/g, 'incomingTasksList.slice(0, 3).map((task) => {');

fs.writeFileSync('src/components/TaskPage.jsx', code);
console.log('Done!');
