const fs = require('fs');
let code = fs.readFileSync('src/components/Layout.jsx', 'utf8');

const addTaskMatch = code.match(/<\s*button[^>]*?className="topbar-add-task-btn"[\s\S]*?(?=\{\/\*\s*Notification Button & Dropdown\s*\*\/})/i);
if (addTaskMatch) {
    const extracted = addTaskMatch[0].trim();
    code = code.replace(addTaskMatch[0], '\n          ');
    const ip = code.indexOf('{/* Right: Actions */}');
    code = code.substring(0, ip) + '<div className="topbar-center">\n            ' + extracted + '\n          </div>\n          ' + code.substring(ip);
    fs.writeFileSync('src/components/Layout.jsx', code);
    console.log("Moved successfully.");
} else {
    console.log("Not matched.");
}
