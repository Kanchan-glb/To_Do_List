const fs = require('fs');

let layoutCode = fs.readFileSync('src/components/Layout.jsx', 'utf8');

const btnClassIdx = layoutCode.indexOf('className="topbar-add-task-btn"');
const endStr = '{/* Right: Actions */}';
const endIdx = layoutCode.indexOf(endStr);

if (btnClassIdx !== -1 && endIdx !== -1) {
    const startIdx = layoutCode.lastIndexOf('<button', btnClassIdx);
    
    if (startIdx !== -1 && startIdx < endIdx) {
        let before = layoutCode.substring(0, startIdx);
        let middle = layoutCode.substring(startIdx, endIdx);
        let after = layoutCode.substring(endIdx);

        if (!before.endsWith('<div className="topbar-center">\\n          ') && !before.endsWith('<div className="topbar-center">\\r\\n          ')) {
            layoutCode = before + '<div className="topbar-center">\n          ' + middle + '</div>\n          ' + after;
            fs.writeFileSync('src/components/Layout.jsx', layoutCode);
            console.log("Updated Layout.jsx");
        } else {
            console.log("Already wrapped.");
        }
    } else {
        console.log("Could not backtrack to <button");
    }
} else {
    console.log("Could not find start/end indices.");
}
