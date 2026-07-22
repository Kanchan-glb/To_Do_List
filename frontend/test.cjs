const fs = require('fs');
const c = fs.readFileSync('src/components/TaskPage.jsx', 'utf8');
const s = c.indexOf('<section className="status-grid">');
const e = c.indexOf('{subtaskPopupTask && (');
console.log(s, e);
