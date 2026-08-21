import { useEffect, useMemo, useState } from "react";
import { format, isToday, parseISO, subDays } from "date-fns";
import { useNavigate } from "react-router-dom";
import { useTasks } from "../context/TaskContext";
import TaskDetailsModal from "./TaskDetailsModal";
import "./glassDashboard.css";

const Icon = ({ children, size = 16, strokeWidth = 2.2, className="" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className={className}>
    {children}
  </svg>
);
const PlusIcon = ({size=16}) => <Icon size={size}><path d="M12 5v14M5 12h14" /></Icon>;
const TimerIcon = ({size=16}) => <Icon size={size}><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></Icon>;
const ArrowIcon = ({size=14}) => <Icon size={size}><path d="M5 12h14M13 6l6 6-6 6" /></Icon>;
const CheckIcon = ({size=16}) => <Icon size={size}><path d="m5 12 4 4L19 6" /></Icon>;
const CalendarIcon = ({size=16}) => <Icon size={size}><rect x="3" y="4" width="18" height="17" rx="3" /><path d="M8 2v4M16 2v4M3 9h18" /></Icon>;
const TargetIcon = ({size=16}) => <Icon size={size}><circle cx="12" cy="12" r="9" /><circle cx="12" cy="12" r="5" /><circle cx="12" cy="12" r="1.5" /></Icon>;
const ActivityIcon = ({size=16}) => <Icon size={size}><path d="M4 12h4l2-7 4 14 2-7h4" /></Icon>;
const FilterIcon = ({size=16}) => <Icon size={size}><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" /></Icon>;
const HumanIcon = ({size=16}) => <Icon size={size}><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></Icon>;
const StarIcon = ({size=16}) => <Icon size={size}><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" /></Icon>;
const GridIcon = ({size=16}) => <Icon size={size}><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></Icon>;
const MenuIcon = ({size=16}) => <Icon size={size}><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="18" x2="21" y2="18"/></Icon>;
const BellIcon = ({size=16}) => <Icon size={size}><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></Icon>;

function getStatus(task) { return task?.status || (task?.completed ? "Completed" : "Pending"); }
function formatDue(task) {
  if (!task?.dueDate) return "No due date";
  try {
    const date = parseISO(task.dueDate);
    const day = isToday(date) ? "Today" : format(date, "d MMM");
    return task.dueTime ? `${day} · ${task.dueTime}` : day;
  } catch {
    return task.dueDate;
  }
}

export default function GlassDashboard() {
  const navigate = useNavigate();
  const { tasks = [], getDailyProgress, deleteTask } = useTasks();
  const [now, setNow] = useState(new Date());
  const [selectedTask, setSelectedTask] = useState(null);
  const [activeFilter, setActiveFilter] = useState(null);

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 10000);
    return () => window.clearInterval(timer);
  }, []);

  const progress = getDailyProgress?.() || {};
  const todayKey = format(now, "yyyy-MM-dd");
  
  const todayTasks = useMemo(() => tasks.filter(t => t?.dueDate === todayKey), [tasks, todayKey]);
  const allMissionTasks = useMemo(() => {
    const overdue = tasks.filter(t => getStatus(t) === "Overdue");
    const today = todayTasks.filter(t => !overdue.find(o => o.id === t.id)); 
    return [...overdue, ...today];
  }, [todayTasks, tasks]);

  const todayCount = allMissionTasks.length;
  const todayCompleted = allMissionTasks.filter(t => getStatus(t) === "Completed").length;
  const pendingCount = allMissionTasks.filter(t => getStatus(t) === "Pending").length;
  const overdueCount = allMissionTasks.filter(t => getStatus(t) === "Overdue").length;

  const completionRate = todayCount ? Math.round((todayCompleted / todayCount) * 100) : 0;
  const pendingRate = todayCount ? Math.round((pendingCount / todayCount) * 100) : 0;
  const overdueRate = todayCount ? Math.round((overdueCount / todayCount) * 100) : 0;

  const weeklyData = useMemo(() => Array.from({ length: 7 }, (_, i) => {
    const date = subDays(now, 6 - i);
    const key = format(date, "yyyy-MM-dd");
    const due = tasks.filter(t => t?.dueDate === key).length;
    const done = tasks.filter(t => String(t?.completedAt || "").startsWith(key) || t?.completedDate === key).length;
    return { key, day: format(date, "EEE"), due, done, value: due ? Math.round((done / due) * 100) : done ? 100 : 0 };
  }), [tasks, now]);

  const openAdd = () => navigate("/tasks", { state: { openAddTaskModal: true } });
  const openTask = task => setSelectedTask(task);

  const displayTasks = useMemo(() => tasks.slice(0, 4), [tasks]);

  const filteredTasks = useMemo(() => {
    if (!activeFilter) return [];
    if (activeFilter === "overdue") return allMissionTasks.filter(t => getStatus(t) === "Overdue");
    if (activeFilter === "completed") return allMissionTasks.filter(t => getStatus(t) === "Completed");
    if (activeFilter === "pending") return allMissionTasks.filter(t => getStatus(t) === "Pending");
    if (activeFilter === "all") return allMissionTasks;
    return [];
  }, [allMissionTasks, activeFilter]);

  return (
    <div className="sci-fi-dashboard">
      {/* DEEP SPACE ENVIRONMENT */}
      <div className="sf-space-bg">
        <div className="sf-stars-dense"></div>
        <div className="sf-nebula-cluster sf-nebula-purple"></div>
        <div className="sf-nebula-cluster sf-nebula-blue"></div>
        <div className="sf-nebula-cluster sf-nebula-magenta"></div>
        <div className="sf-cosmic-dust"></div>
      </div>

     
      <div className="sf-dashboard-container">
        
        {/* TOP CENTER SCI-FI CEILING / PROJECTOR */}
        <div className="sf-ceiling-projector">
          <div className="sf-projector-base"></div>
          <div className="sf-projector-mid"></div>
          <div className="sf-projector-lens">
            <div className="sf-lens-core"></div>
          </div>
          <div className="sf-projector-beam"></div>
        </div>

        {/* 4. TELEMETRY LOG — TOP LEFT */}
        <div className="sf-panel sf-telemetry-log">
          <div className="sf-panel-bracket-tl"></div>
          <div className="sf-panel-bracket-tr"></div>
          <div className="sf-panel-bracket-bl"></div>
          <div className="sf-panel-bracket-br"></div>
          
          <div className="sf-panel-header">
            <span>TELEMETRY LOG</span>
            <div className="sf-header-lines"></div>
          </div>
          <div className="sf-telemetry-body">
            <div className="sf-circle-progress-wrapper">
              <svg className="sf-progress-svg" viewBox="0 0 160 160">
                <circle className="sf-ring-bg" cx="80" cy="80" r="65" />
                <circle className="sf-ring-magenta" cx="80" cy="80" r="65" strokeDasharray="408" strokeDashoffset={`${408 - (408 * completionRate) / 100}`} />
                <circle className="sf-ring-purple" cx="80" cy="80" r="52" />
                <circle className="sf-ring-cyan" cx="80" cy="80" r="42" strokeDasharray="3 3" />
                <circle className="sf-ring-outer-thin" cx="80" cy="80" r="75" />
              </svg>
              <div className="sf-hud-radial-marks"></div>
              <div className="sf-circle-value">
                <strong>{completionRate}%</strong>
                <small>COMPLETE</small>
              </div>
              <div className="sf-circle-label">TOTAL</div>
            </div>
            <div className="sf-telemetry-stats">
              <div className="sf-report-tracker">REPORT TRACKER</div>
              <div className="sf-today-label">Today</div>
              <div className="sf-total-tasks"><strong>{todayCount}</strong> Total</div>
              <ul className="sf-legend">
                <li><span className="sf-dot sf-dot-target"></span> Target</li>
                <li><span className="sf-dot sf-dot-completed"></span> Completed</li>
                <li><span className="sf-dot sf-dot-overdue"></span> Overdue</li>
              </ul>
              <button type="button" className="sf-btn-neon" onClick={() => navigate("/tasks")}>View all task data <ArrowIcon size={10}/></button>
            </div>
          </div>
        </div>

        {/* 5. TARGET ACQUISITION — LOWER LEFT */}
        <div className="sf-panel sf-target-acquisition">
          <div className="sf-panel-bracket-tl"></div>
          <div className="sf-panel-bracket-bl"></div>
          <div className="sf-panel-bracket-br"></div>
          <div className="sf-panel-bracket-tr"></div>
          
          <div className="sf-ta-header">
            <div className="sf-header-title">
              <ArrowIcon size={14} className="sf-flip-h"/> TARGET ACQUISITION
            </div>
            <div className="sf-live-indicator"><span className="sf-live-dot"></span> Live</div>
          </div>
          
          <div className="sf-ta-body">
            <div className="sf-ta-left-stack">
              <button className="sf-stack-btn active"><CalendarIcon size={14}/> Today</button>
              <button className="sf-stack-btn"><StarIcon size={14}/> All status</button>
              <button className="sf-stack-btn"><GridIcon size={14}/> All prioritize</button>
              <button className="sf-stack-btn"><TimerIcon size={14}/> All time</button>
              <div className="sf-stack-spacer"></div>
              <button className="sf-stack-btn sf-view-all-btn"><Icon size={14}><polygon points="12 2 2 7 12 12 22 7 12 2"/></Icon> View all tasks</button>
            </div>
            
            <div className="sf-ta-right-list">
              <div className="sf-search-field">
                <Icon size={14}><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></Icon>
                <input type="text" placeholder="Search" />
              </div>
              
              <div className="sf-tasks-list">
                {displayTasks.map((task, i) => (
                  <div key={task.id || i} className={`sf-task-row ${getStatus(task) === 'Completed' ? 'sf-row-done' : ''}`} onClick={() => openTask(task)}>
                    <div className="sf-row-icon">
                      {getStatus(task) === 'Completed' ? <CheckIcon size={14}/> : <div className="sf-circle-icon"></div>}
                    </div>
                    <div className="sf-row-info">
                      <div className="sf-row-title">{task.title}</div>
                      <div className="sf-row-meta">{formatDue(task)}</div>
                    </div>
                    <ArrowIcon size={14} className="sf-row-arrow"/>
                  </div>
                ))}
                {!displayTasks.length && (
                  <>
                    <div className="sf-task-row">
                      <div className="sf-row-icon"><CheckIcon size={14}/></div>
                      <div className="sf-row-info">
                        <div className="sf-row-title">read a book</div>
                        <div className="sf-row-meta">Today</div>
                      </div>
                      <ArrowIcon size={14} className="sf-row-arrow"/>
                    </div>
                    <div className="sf-task-row sf-row-pending">
                      <div className="sf-row-icon"><div className="sf-circle-icon sf-orange-circle"></div></div>
                      <div className="sf-row-info">
                        <div className="sf-row-title">Buy Work Supplies</div>
                        <div className="sf-row-meta">Monday, 20 Aug · 10:30</div>
                      </div>
                      <ArrowIcon size={14} className="sf-row-arrow"/>
                    </div>
                  </>
                )}
              </div>
              <div className="sf-ta-footer">
                <button className="sf-btn-neon sf-btn-purple">View all progress <ArrowIcon size={10}/></button>
              </div>
            </div>
            
            <div className="sf-ta-side-tools">
              <button><GridIcon size={14}/></button>
              <button><CalendarIcon size={14}/></button>
              <button><TargetIcon size={14}/></button>
              <button><TimerIcon size={14}/></button>
            </div>
          </div>
        </div>

        {/* 6. CENTRAL MISSION ORRERY */}
        <div className="sf-mission-orrery">
          <div className="sf-orbit-system">
            <div className={`sf-energy-core sf-clickable ${activeFilter === 'all' ? 'sf-active-core' : ''}`} onClick={() => setActiveFilter('all')}>
              <div className="sf-core-plasma-purple"></div>
              <div className="sf-core-plasma-pink"></div>
              <div className="sf-core-fire-orange"></div>
              <div className="sf-core-text">{completionRate}%</div>
            </div>

            <div className="sf-orbit-path sf-orbit-1">
              <div className="sf-planet-wrapper sf-pw-1">
                <div className="sf-planet-trail sf-trail-1"></div>
                <div className="sf-planet-counter-z sf-pcz-1">
                  <div className={`sf-planet sf-clickable ${activeFilter === 'completed' ? 'sf-active-planet-cyan' : ''}`} onClick={() => setActiveFilter('completed')}>
                    <div className="sf-planet-orb sf-orb-cyan"></div>
                    <div className="sf-planet-label"><strong>{todayCompleted}</strong><span>{completionRate}% DONE</span></div>
                  </div>
                </div>
              </div>
            </div>

            <div className="sf-orbit-path sf-orbit-2">
              <div className="sf-planet-wrapper sf-pw-2">
                <div className="sf-planet-trail sf-trail-2"></div>
                <div className="sf-planet-counter-z sf-pcz-2">
                  <div className={`sf-planet sf-clickable ${activeFilter === 'pending' ? 'sf-active-planet-purple' : ''}`} onClick={() => setActiveFilter('pending')}>
                    <div className="sf-planet-orb sf-orb-purple"></div>
                    <div className="sf-planet-label"><strong>{pendingCount}</strong><span>{pendingRate}% PENDING</span></div>
                  </div>
                </div>
              </div>
            </div>

            <div className="sf-orbit-path sf-orbit-3">
              <div className="sf-planet-wrapper sf-pw-3">
                <div className="sf-planet-trail sf-trail-3"></div>
                <div className="sf-planet-counter-z sf-pcz-3">
                  <div className={`sf-planet sf-clickable ${activeFilter === 'overdue' ? 'sf-active-planet-orange' : ''}`} onClick={() => setActiveFilter('overdue')}>
                    <div className="sf-planet-orb sf-orb-orange"></div>
                    <div className="sf-planet-label"><strong>{overdueCount}</strong><span>{overdueRate}% OVERDUE</span></div>
                  </div>
                </div>
              </div>
            </div>

            <div className="sf-orbit-path sf-orbit-4"></div>
            <div className="sf-orbit-path sf-orbit-5"></div>
          </div>

          <div className="sf-hologram-beam-up"></div>

          {/* 7. CENTRAL HOLOGRAPHIC PROJECTOR BASE */}
          <div className="sf-projector-base-unit">
            <div className="sf-base-ring sf-base-ring-1"></div>
            <div className="sf-base-ring sf-base-ring-2"></div>
            <div className="sf-base-ring sf-base-ring-3"></div>
            <div className="sf-base-ring sf-base-ring-4"></div>
            <div className="sf-base-emitter"></div>
          </div>

          <div className="sf-mission-title">
            <div className="sf-mission-text">MISSION ORRERY</div>
            <div className="sf-mission-sub">MON 0/0</div>
          </div>
        </div>

        {/* 8. TODAY'S TASK FLOATING HUD / DRILL-DOWN */}
        {activeFilter ? (
          <div className="sf-task-drilldown-panel">
            <div className="sf-dd-header">
              {activeFilter === 'completed' && <><CheckIcon size={18}/><span className="sf-dd-title">COMPLETED TASKS</span></>}
              {activeFilter === 'pending' && <><div className="sf-circle-icon"></div><span className="sf-dd-title">PENDING TASKS</span></>}
              {activeFilter === 'overdue' && <><span className="sf-icon-alert">!</span><span className="sf-dd-title">OVERDUE TASKS</span></>}
              {activeFilter === 'all' && <><TargetIcon size={18}/><span className="sf-dd-title">TODAY'S MISSION</span></>}
              <button className="sf-dd-close" onClick={() => setActiveFilter(null)}>×</button>
            </div>
            
            <div className="sf-dd-summary">
              {activeFilter === 'all' ? (
                <>
                  <div className="sf-dd-sum-total">{filteredTasks.length} Total Tasks</div>
                  <div className="sf-dd-sum-list">
                    <div><CheckIcon size={12}/> {todayCompleted} Completed</div>
                    <div><div className="sf-circle-icon sf-dd-mini-circle"></div> {pendingCount} Pending</div>
                    <div><span className="sf-icon-alert sf-dd-mini">!</span> {overdueCount} Overdue</div>
                  </div>
                </>
              ) : (
                <div className="sf-dd-sum-total">
                  {activeFilter === 'overdue' ? '' : 'Today · '}
                  {filteredTasks.length} Tasks
                </div>
              )}
            </div>
            
            <div className="sf-dd-divider"></div>
            
            <div className="sf-dd-tasks">
              {filteredTasks.length === 0 ? (
                <div className="sf-dd-empty">No tasks found</div>
              ) : (
                filteredTasks.map(t => (
                  <div key={t.id} className="sf-dd-task" onClick={() => openTask(t)}>
                    <div className="sf-dd-task-icon">
                       {getStatus(t) === 'Completed' ? <CheckIcon size={14}/> : getStatus(t) === 'Overdue' ? <span className="sf-icon-alert sf-dd-mini">!</span> : <div className="sf-circle-icon sf-dd-mini-circle"></div>}
                    </div>
                    <div className="sf-dd-task-info">
                       <div className="sf-dd-task-name">{t.title}</div>
                       <div className="sf-dd-task-time">
                         {getStatus(t) === 'Completed' && t.completedAt ? `Completed at ${format(new Date(t.completedAt), 'p')}` : formatDue(t)}
                       </div>
                    </div>
                  </div>
                ))
              )}
            </div>
            
            <div className="sf-dd-divider"></div>
            
            <div className="sf-dd-footer">
              <button className="sf-btn-neon sf-dd-btn-all" onClick={() => navigate("/tasks")}>View All Tasks <ArrowIcon size={10}/></button>
              <button className="sf-btn-neon sf-dd-btn-close" onClick={() => setActiveFilter(null)}>Close</button>
            </div>
          </div>
        ) : (
          <div className="sf-floating-hud">
            <div className="sf-hud-corner-tl"></div>
            <div className="sf-hud-corner-br"></div>
            Today's Tasks: {todayCompleted} Done,<br/>
            {pendingCount} Remaining.<br/>
            You've cleared the list!<br/>
            1 day streak. {completionRate}% complete.
          </div>
        )}

        {/* 9. STRATEGIC OVERVIEW ARRAY — TOP RIGHT */}
        <div className="sf-panel sf-strategic-overview">
          <div className="sf-panel-bracket-tl"></div>
          <div className="sf-panel-bracket-tr"></div>
          <div className="sf-panel-bracket-bl"></div>
          <div className="sf-panel-bracket-br"></div>
          
          <div className="sf-panel-header sf-header-magenta">
            <span>STRATEGIC OVERVIEW ARRAY</span>
            <div className="sf-header-lines"></div>
          </div>
          
          <div className="sf-strategic-body">
            <div className="sf-strategic-left">
              <div className="sf-section-title">Your week at a glance</div>
              <div className="sf-stats-row">
                <div className="sf-stat-item sf-stat-target">
                  <strong>{completionRate}%</strong>
                  <small>Target Goal</small>
                </div>
                <div className="sf-stat-item">
                  <strong>{todayCount}</strong>
                  <small>TOTAL TASKS</small>
                </div>
                <div className="sf-stat-item sf-stat-cyan">
                  <strong>{todayCompleted}</strong>
                  <small>COMPLETED</small>
                </div>
                <div className="sf-stat-item sf-stat-magenta">
                  <strong>{pendingCount}</strong>
                  <small>PENDING</small>
                </div>
              </div>
              <div className="sf-chart-area">
                <div className="sf-chart-y">
                  <span>100%</span><span>75%</span><span>50%</span><span>25%</span><span>0%</span>
                </div>
                <div className="sf-chart-bars">
                  {weeklyData.map((d, i) => (
                    <div key={i} className="sf-bar-wrap">
                      <div className="sf-bar-fill" style={{height: `${Math.max(10, d.value)}%`}}></div>
                      <div className="sf-bar-label">{d.day.charAt(0)}</div>
                    </div>
                  ))}
                  <div className="sf-chart-grid-bg"></div>
                </div>
              </div>
            </div>
            
            <div className="sf-strategic-right">
              <div className="sf-section-title sf-title-magenta">PERFORMANCE INSIGHTS</div>
              <div className="sf-insight-tabs">
                <button className="active">Day</button>
                <button>Mon</button>
                <button>Month</button>
                <button>Year</button>
              </div>
              <div className="sf-insights-list">
                <div className="sf-insight-card">
                  <div className="sf-icard-icon"><HumanIcon size={14}/></div>
                  <div className="sf-icard-text">
                    <small>Human Productivity</small>
                    <strong>1 day</strong>
                  </div>
                </div>
                <div className="sf-insight-card">
                  <div className="sf-icard-icon"><ActivityIcon size={14}/></div>
                  <div className="sf-icard-text">
                    <small>Task Digest</small>
                    <strong>8 tasks</strong>
                  </div>
                </div>
                <div className="sf-insight-card">
                  <div className="sf-icard-icon"><TargetIcon size={14}/></div>
                  <div className="sf-icard-text">
                    <small>Task completed to test</small>
                    <strong>100%</strong>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 10. BOTTOM RIGHT MISSION TIMELINE */}
        <div className="sf-panel sf-mission-timeline">
          <div className="sf-panel-bracket-tl"></div>
          <div className="sf-panel-bracket-tr"></div>
          <div className="sf-panel-bracket-bl"></div>
          <div className="sf-panel-bracket-br"></div>
          
          <div className="sf-timeline-grid-bg"></div>
          
          <div className="sf-timeline-nodes">
            {weeklyData.map((d, i) => {
              const positions = [
                { left: '10%', top: '50%' },
                { left: '25%', top: '30%' },
                { left: '40%', top: '60%' },
                { left: '55%', top: '40%' },
                { left: '70%', top: '70%' },
                { left: '85%', top: '35%' },
                { left: '100%', top: '50%' },
              ];
              const pos = positions[i] || positions[0];
              return (
                <div key={i} className="sf-timeline-node" style={{ left: pos.left, top: pos.top }}>
                  <div className="sf-node-info-top">
                    <span>{d.day.toUpperCase()}</span>
                    <span className="sf-node-val">{d.done}/{d.due || 1}</span>
                    <span className="sf-node-val-sub">{d.done}/{d.due || 1}</span>
                  </div>
                  <div className="sf-node-point"></div>
                  <div className="sf-node-info-bottom">
                    <ActivityIcon size={10}/>
                  </div>
                </div>
              );
            })}
            <svg className="sf-timeline-path" preserveAspectRatio="none">
              <path d="M 10%,50% L 25%,30% L 40%,60% L 55%,40% L 70%,70% L 85%,35%" stroke="rgba(0, 229, 255, 0.6)" strokeWidth="2" fill="none" vectorEffect="non-scaling-stroke"/>
            </svg>
          </div>
          
          <button className="sf-historical-btn">Historical Log <ArrowIcon size={10}/></button>
        </div>

      </div>

      {/* 11. BOTTOM SPACESHIP COCKPIT */}
      <div className="sf-spaceship-cockpit">
        {/* <div className="sf-cockpit-bg"></div> */}
        {/* <div className="sf-cockpit-panel-left">
          <div className="sf-cockpit-grooves"></div>
          <div className="sf-cockpit-vents"></div>
        </div> */}
        {/* <div className="sf-cockpit-panel-right">
          <div className="sf-cockpit-grooves"></div>
          <div className="sf-cockpit-vents"></div>
        </div> */}
        
        <div className="sf-cockpit-center-console">
          <div className="sf-console-structure">
            <div className="sf-console-neon-left"></div>
            <div className="sf-console-neon-right"></div>
            
            <div className="sf-add-button-housing">
              <div className="sf-add-button-ring-1"></div>
              <div className="sf-add-button-ring-2"></div>
              <button className="sf-huge-add-btn" onClick={openAdd}>
                <PlusIcon size={36}/>
              </button>
            </div>
          </div>
        </div>
        
        <div className="sf-cockpit-edge-glow"></div>
      </div>

      {selectedTask && <TaskDetailsModal task={selectedTask} onClose={() => setSelectedTask(null)} onEdit={(t) => { setSelectedTask(null); navigate("/tasks", { state: { editTask: t || selectedTask } }); }} onDelete={(id) => { deleteTask(id); setSelectedTask(null); }} />}
    </div>
  );
}
