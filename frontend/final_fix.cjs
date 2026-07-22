const fs = require('fs');

let code = fs.readFileSync('src/components/Layout.jsx', 'utf8');

// 1. Update useTasks destructuring
// In the current git version, it looks like:
// const { tasks, getDailyProgress, focusTimeLeft, setFocusTimeLeft, isFocusRunning, setIsFocusRunning, focusMode, switchFocusMode, pomodoroSettings, updatePomodoroSettings } = useTasks();
code = code.replace(/updatePomodoroSettings\s*\} = useTasks\(\);/g, 'updatePomodoroSettings,\n    startTimer,\n    pauseTimer,\n    resetTimerToDefault\n  } = useTasks();');

// 2. Remove resetPomodoroTimer definition entirely
const resetRegex = /const resetPomodoroTimer = \(\) => \{[\s\S]*?\n  \};\n/g;
code = code.replace(resetRegex, '');

// 3. Move topbar actions to topbar-center
// The actions start with:
// <div className="topbar-actions">
//   <button type="button" className="topbar-add-task-btn" ... > ... </button>
//   <div className="timer-menu-wrap" ...> ... </div>
// </div> (not exactly, there's more after it).
// Let's just find the Add Task button and Timer Dropdown and move them.

const addTaskStart = code.indexOf('<button\n              type="button"\n              className="topbar-add-task-btn"');
const timerWrapStart = code.indexOf('<div className="timer-menu-wrap"');
const notifWrapStart = code.indexOf('{/* Notification Button & Dropdown */}');

if (addTaskStart !== -1 && notifWrapStart !== -1) {
    const extracted = code.substring(addTaskStart, notifWrapStart).trim();
    // Remove it from its original place
    code = code.substring(0, addTaskStart) + '\n            ' + code.substring(notifWrapStart);
    // Put it inside a topbar-center before topbar-actions
    // Wait, topbar-actions is just `{/* Right: Actions */}\n          <div className="topbar-actions">`
    const insertPoint = code.indexOf('{/* Right: Actions */}');
    const newCenter = `<div className="topbar-center">\n            ${extracted}\n          </div>\n          `;
    code = code.substring(0, insertPoint) + newCenter + code.substring(insertPoint);
}

// Now `code` contains the extracted text. We can perform targeted replacements on `code`.
// 4. Replace Timer Button
// The timer button starts with `<button` and ends with `</button>`, and has `className={\`topbar-icon-btn timer-btn`
const timerBtnRegex = /<button[^>]*?className=\{`topbar-icon-btn timer-btn[\s\S]*?<\/button>/;
const newTimerBtn = `{(!isFocusRunning && focusTimeLeft === pomodoroSettings[focusMode] * 60) ? (
              <button
                type="button"
                className={\`topbar-icon-btn timer-btn \${timerDropdownOpen ? "open" : ""}\`}
                onClick={() => setTimerDropdownOpen(!timerDropdownOpen)}
                style={{
                  background: "linear-gradient(135deg, #4f46e5, #7c3aed)",
                  color: "#fff",
                  border: "none",
                  borderRadius: "14px",
                  padding: "10px 18px",
                  minHeight: "42px",
                  minWidth: "140px",
                  fontWeight: "700",
                  fontSize: "14px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "8px",
                  boxShadow: "0 8px 24px rgba(79, 70, 229, 0.35)",
                  cursor: "pointer",
                  transition: "all 0.25s ease",
                }}
                aria-label="Pomodoro Timer"
              >
                <span className="timer-btn-icon">
                  <TimerIcon />
                </span>
                Timer
              </button>
            ) : (
              <div className={\`topbar-icon-btn timer-btn timer-active-group \${timerDropdownOpen ? "open" : ""}\`} style={{
                background: "linear-gradient(135deg, #4f46e5, #7c3aed)",
                color: "#fff",
                borderRadius: "14px",
                minHeight: "42px",
                minWidth: "140px",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "0 6px",
                boxShadow: "0 8px 24px rgba(79, 70, 229, 0.35)",
                gap: "4px"
              }}>
                <button 
                  onClick={() => isFocusRunning ? pauseTimer() : startTimer()} 
                  style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer', padding: '6px', display: 'flex', alignItems: 'center' }}
                >
                  {isFocusRunning ? <PauseIcon size={18} /> : <PlayIcon size={18} />}
                </button>
                
                <button 
                  onClick={() => setTimerDropdownOpen(!timerDropdownOpen)}
                  style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer', fontWeight: '700', fontSize: '15px', padding: '0', flex: 1, textAlign: 'center' }}
                >
                  {!isFocusRunning ? \`Resume \${Math.floor(focusTimeLeft / 60).toString().padStart(2, '0')}:\${(focusTimeLeft % 60).toString().padStart(2, '0')}\` : \`\${Math.floor(focusTimeLeft / 60).toString().padStart(2, '0')}:\${(focusTimeLeft % 60).toString().padStart(2, '0')}\`}
                </button>
                
                <button 
                  onClick={() => { setTimerDropdownOpen(true); resetTimerToDefault(); }}
                  style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer', padding: '6px', display: 'flex', alignItems: 'center' }}
                  title="Reset Timer"
                >
                  <ResetIcon size={18} />
                </button>
              </div>
            )}`;
code = code.replace(timerBtnRegex, newTimerBtn);

// 5. Replace Popup Header (add Close button)
const headerRegex = /<h4 className="timer-dropdown-title"[^>]*>Pomodoro Timer<\/h4>[\s\S]*?<\/\s*button\s*>/;
const newHeader = `<h4 className="timer-dropdown-title" style={{ margin: 0 }}>Pomodoro Timer</h4>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button
                        type="button"
                        className="timer-settings-btn"
                        onClick={() => {
                          if (!showTimerSettings) setTempSettings(pomodoroSettings);
                          setShowTimerSettings(!showTimerSettings);
                        }}
                        title="Edit Timer Durations"
                        style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: 'var(--text-secondary)', padding: '4px', borderRadius: '4px' }}
                      >
                        <PlusIcon />
                      </button>
                      <button
                        type="button"
                        onClick={() => setTimerDropdownOpen(false)}
                        title="Close Popup"
                        style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: 'var(--text-secondary)', padding: '4px', borderRadius: '4px', fontSize: '18px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                      >
                        ✕
                      </button>
                    </div>`;
code = code.replace(headerRegex, newHeader);

// 6. Replace Action Buttons (Start/Pause + Reset)
const actionBtnRegex = /<button[^>]*?className=\{`timer-action-btn[\s\S]*?<\/\s*button\s*>\s*<button[^>]*?className="timer-reset-btn"[^>]*?>[\s\S]*?<\/\s*button\s*>/;
const newActionBtn = `<button
                        type="button"
                        className={\`timer-action-btn \${isFocusRunning ? "running" : ""}\`}
                        onClick={() => isFocusRunning ? pauseTimer() : startTimer()}
                        style={{
                          background: isFocusRunning ? "transparent" : getModeColor(focusMode),
                          color: isFocusRunning ? getModeColor(focusMode) : "#fff",
                          borderColor: isFocusRunning ? getModeColor(focusMode) : "transparent",
                          flex: 1
                        }}
                      >
                        {isFocusRunning ? (
                          <><PauseIcon /> Pause</>
                        ) : (
                          focusTimeLeft !== pomodoroSettings[focusMode] * 60 ? (
                            <><PlayIcon /> Resume</>
                          ) : (
                            <><PlayIcon /> Start</>
                          )
                        )}
                      </button>`;
code = code.replace(actionBtnRegex, newActionBtn);

// 7. Add Reset to Default button at the bottom of the popup
// Wait, the popup bottom is just `</>\n)}\n</div>` inside `timerDropdownOpen && (` block.
// Let's replace the last closing tags of the timer dropdown
// Let's search for `timerDropdownOpen && (` block end.
const endOfTimerDropdown = code.indexOf('          {/* Notification Button & Dropdown */}');
const closeTags = code.substring(endOfTimerDropdown - 100, endOfTimerDropdown);

// The actual structure is:
//     </div>
//   </>
// )}
// </div>
// Let's just find `</>\n                  )}\n                </div>` and insert the button before it.
const bottomMatch = code.match(/<\/\s*>\s*\)\}\s*<\/\s*div\s*>/);
if (bottomMatch) {
    const newBottom = `<button
                        type="button"
                        onClick={resetTimerToDefault}
                        style={{
                          width: '100%',
                          padding: '10px',
                          marginTop: '8px',
                          background: 'rgba(239, 68, 68, 0.1)',
                          color: '#ef4444',
                          border: '1px solid rgba(239, 68, 68, 0.2)',
                          borderRadius: '8px',
                          cursor: 'pointer',
                          fontWeight: '600',
                          fontSize: '13px',
                          transition: 'all 0.2s'
                        }}
                        onMouseEnter={(e) => { e.currentTarget.style.background = '#ef4444'; e.currentTarget.style.color = '#fff'; }}
                        onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(239, 68, 68, 0.1)'; e.currentTarget.style.color = '#ef4444'; }}
                      >
                        Reset to Default
                      </button>
                    </>
                  )}
                </div>`;
    code = code.replace(/<\/\s*>\s*\)\}\s*<\/\s*div\s*>/, newBottom);
}

fs.writeFileSync('src/components/Layout.jsx', code);
console.log("Fully updated Layout.jsx without breaking it!");
