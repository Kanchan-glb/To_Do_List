const fs = require('fs');
let code = fs.readFileSync('src/components/TaskPage.jsx', 'utf8');

const regex = /\{\/\* Bottom Row: Subtasks on left, View Details on right \(or left if no subtasks\) \*\/\}[\s\S]*?View Details →\s*<\/button>\s*\)\}\s*<\/div>/g;

const replacement = `<div className="task-card-actions">
  {task.subtasks?.length > 0 && (
    <button
      type="button"
      className="subtasks-btn"
      onClick={() => setSubtaskPopupTask(task)}
    >
      📋 Subtasks ({task.subtasks.length})
    </button>
  )}
  <button
    type="button"
    className="view-details-btn"
    onClick={() => navigate('/tasks/' + getTaskId(task))}
  >
    View Details →
  </button>
</div>`;

const newCode = code.replace(regex, replacement);
fs.writeFileSync('src/components/TaskPage.jsx', newCode);
console.log('Replaced occurrences:', (code.match(regex) || []).length);
