const fs = require('fs');

// 1. Update Layout.jsx
let layoutCode = fs.readFileSync('src/components/Layout.jsx', 'utf8');

const addBtnRegex = /<button[\s\S]*?className="topbar-add-task-btn"[\s\S]*?<span>Add Task<\/span>\s*<\/button>/;
const actionsRegex = /\{\/\* Right: Actions \*\/\}/;

const addBtnMatch = layoutCode.match(addBtnRegex);
const actionsMatch = layoutCode.match(actionsRegex);

if (addBtnMatch && actionsMatch) {
    const addBtnIdx = addBtnMatch.index;
    const actionsIdx = actionsMatch.index;

    if (addBtnIdx < actionsIdx) {
        let before = layoutCode.substring(0, addBtnIdx);
        let middle = layoutCode.substring(addBtnIdx, actionsIdx);
        let after = layoutCode.substring(actionsIdx);

        if (!before.endsWith('<div className="topbar-center">\\n          ')) {
            layoutCode = before + '<div className="topbar-center">\n          ' + middle + '</div>\n          ' + after;
            fs.writeFileSync('src/components/Layout.jsx', layoutCode);
            console.log("Updated Layout.jsx");
        }
    }
} else {
    console.log("Could not find regex matches in Layout.jsx");
}
