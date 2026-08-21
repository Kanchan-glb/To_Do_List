const fs = require('fs');

let layoutCode = fs.readFileSync('src/components/Layout.jsx', 'utf8');

layoutCode = layoutCode.replace(/<div className="topbar-center">\r?\n\s*<button\r?\n\s*className="sidebar-menu-btn"/, '<button\n            className="sidebar-menu-btn"');
layoutCode = layoutCode.replace(/<\/div>\r?\n\s*\{\/\* Right: Actions \*\/\}/, '{/* Right: Actions */}');

fs.writeFileSync('src/components/Layout.jsx', layoutCode);
console.log("Restored Layout.jsx properly");
