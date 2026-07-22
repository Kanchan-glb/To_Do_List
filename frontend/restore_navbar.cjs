const fs = require('fs');

let layoutCode = fs.readFileSync('src/components/Layout.jsx', 'utf8');

// The exact string that was added before the first match
const startStr = '<div className="topbar-center">\\n          <button\\n            className="sidebar-menu-btn"';
layoutCode = layoutCode.replace('<div className="topbar-center">\n          <button\n            className="sidebar-menu-btn"', '<button\n            className="sidebar-menu-btn"');

const endStr = '</div>\n          {/* Right: Actions */}';
layoutCode = layoutCode.replace('</div>\n          {/* Right: Actions */}', '{/* Right: Actions */}');

fs.writeFileSync('src/components/Layout.jsx', layoutCode);
console.log("Restored Layout.jsx");
