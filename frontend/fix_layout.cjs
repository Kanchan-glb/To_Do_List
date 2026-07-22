const fs = require('fs');

let layoutCode = fs.readFileSync('src/components/Layout.jsx', 'utf8');

const startStr = '<button\n            type="button"\n            className="topbar-add-task-btn"';
const endStr = '{/* Right: Actions */}';

const startIdx = layoutCode.indexOf(startStr);
const endIdx = layoutCode.indexOf(endStr);

if (startIdx !== -1 && endIdx !== -1 && startIdx < endIdx) {
    let before = layoutCode.substring(0, startIdx);
    let middle = layoutCode.substring(startIdx, endIdx);
    let after = layoutCode.substring(endIdx);

    // Only wrap if not already wrapped
    if (!before.endsWith('<div className="topbar-center">\\n          ')) {
        layoutCode = before + '<div className="topbar-center">\n          ' + middle + '</div>\n          ' + after;
        fs.writeFileSync('src/components/Layout.jsx', layoutCode);
        console.log("Updated Layout.jsx");
    } else {
        console.log("Already wrapped.");
    }
} else {
    console.log("Could not find start/end indices.");
}
