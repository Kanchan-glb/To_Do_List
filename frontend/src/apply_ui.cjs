const fs = require('fs');
const filePath = 'c:/Users/Globussoft/new/To_Do_List/frontend/src/components/Layout.jsx';
let content = fs.readFileSync(filePath, 'utf-8');

// 1. Update the menu toggle button
const menuBtnRegex = /\{\!isSidebarOpen && \([\s\S]*?<button\s+className="menu-toggle-btn"[\s\S]*?aria-label="Open Sidebar"\s*>[\s\S]*?<MenuIcon \/>\s*<\/button>\s*\)\}/;
const newMenuBtn = `              <button
                className="menu-toggle-btn"
                onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                aria-label="Toggle Sidebar"
                style={{
                  background: "#1e1e1e",
                  border: "none",
                  color: "#fff",
                  cursor: "pointer",
                  display: isSidebarOpen ? "none" : "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  width: "44px",
                  height: "44px",
                  borderRadius: "12px",
                  padding: "0",
                  transition: "all 0.2s ease"
                }}
                onMouseEnter={(e) => { e.currentTarget.style.background = "#2a2a2a"; e.currentTarget.style.transform = "scale(1.05)"; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = "#1e1e1e"; e.currentTarget.style.transform = "scale(1)"; }}
              >
                <MenuIcon />
              </button>`;

content = content.replace(menuBtnRegex, newMenuBtn);

// 2. Fix the "Smart Planner" text (Wait, does HEAD have the Smart Planner text?)
// Let's check HEAD's topbar-left.
// In HEAD, it has: 
// <div>
//   <p className="topbar-eyebrow">Welcome back</p>
//   <h3 className="topbar-title">
//     {userName}
//   </h3>
// </div>
// The user doesn't want that! The previous agent changed it to "Smart Planner". I should just leave it as it is in HEAD or change it to "Smart Planner"?
// Let's change it to Smart Planner since the user liked it in the screenshot.
const welcomeBackRegex = /<div>\s*<p className="topbar-eyebrow">Welcome back<\/p>\s*<h3 className="topbar-title">\s*\{userName\}\s*<\/h3>\s*<\/div>/;
const newLogo = `<div style={{ display: isSidebarOpen ? "none" : "flex", alignItems: "center", gap: "12px", borderLeft: "1px solid var(--border-light)", paddingLeft: "12px" }}>
              <span style={{ fontWeight: 700, fontSize: "1.1rem", color: "var(--text-primary)", letterSpacing: "0.5px" }}>Smart Planner</span>
            </div>`;
content = content.replace(welcomeBackRegex, newLogo);

// Update topbar-left style to have gap
content = content.replace(/<div className="topbar-left" style=\{\{ display: "flex", alignItems: "center" \}\}>/, '<div className="topbar-left" style={{ display: "flex", alignItems: "center", gap: "12px", justifySelf: "start" }}>');

// 3. Move Add Task and Timer to center
const addTaskMatch = content.match(/(<button\s+type="button"\s+className="topbar-add-task-btn"[\s\S]*?<span>Add Task<\/span>\s*<\/button>)/);
const timerMenuMatch = content.match(/(<div className="timer-menu-wrap" ref=\{timerDropdownRef\}>[\s\S]*?<\/div>\s*)\{\/\* Daily Progress Ring \*\/\}/);

if (addTaskMatch && timerMenuMatch) {
  const newCenter = `<div className="topbar-center" style={{ display: "flex", justifyContent: "center", justifySelf: 'center', gap: '12px' }}>
            ${addTaskMatch[1]}
            ${timerMenuMatch[1]}
          </div>`;

  const newActionsStart = `<div className="topbar-actions" style={{ justifySelf: 'end', display: 'flex', alignItems: 'center', gap: '12px' }}>
            {/* Notification Button & Dropdown */}`; // Skip Daily Progress Ring entirely!

  const oldBlockRegex = /<div className="topbar-center">[\s\S]*?<div className="topbar-actions" style=\{\{ justifySelf: 'end', display: 'flex', alignItems: 'center', gap: '12px' \}\}>[\s\S]*?\{\/\* Notification Button & Dropdown \*\/\}/;

  content = content.replace(oldBlockRegex, `${newCenter}\n\n          ${newActionsStart}`);
} else {
  console.log("Could not find addTask or timerMenu");
}

fs.writeFileSync(filePath, content);
console.log('Done!');
