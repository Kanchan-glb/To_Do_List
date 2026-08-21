const fs = require('fs');
let layoutCode = fs.readFileSync('src/components/Layout.jsx', 'utf8');

const actionsIdx = layoutCode.indexOf('{/* Right: Actions */}');

if (actionsIdx !== -1) {
    let before = layoutCode.substring(0, actionsIdx);
    let after = layoutCode.substring(actionsIdx);
    
    if (!before.endsWith('</div>\n          ') && !before.endsWith('</div>\r\n          ')) {
        layoutCode = before + '</div>\n          ' + after;
        fs.writeFileSync('src/components/Layout.jsx', layoutCode);
        console.log("Added closing tag");
    }
}
