import { useState, useEffect, useRef, lazy, Suspense } from "react";

import { BrowserRouter, Navigate, Route, Routes, useLocation, useNavigate } from "react-router-dom";
import { Toaster } from "react-hot-toast";

// Route-level lazy imports — each page becomes its own JS chunk
// This means the initial bundle only loads what's needed for the current route
const LoginPage = lazy(() => import("./components/LoginPage"));
const DashboardPage = lazy(() => import("./components/DashboardPage"));
const GlassDashboard = lazy(() => import("./components/GlassDashboard"));
const Layout = lazy(() => import("./components/Layout"));
const TaskPage = lazy(() => import("./components/TaskPage"));
const MorningPlanner = lazy(() => import("./components/MorningPlanner"));
const ReportsPage = lazy(() => import("./components/ReportsPage"));
const WorkProgressTracker = lazy(() => import("./components/WorkProgressTracker"));
const SettingsPage = lazy(() => import("./components/SettingsPage"));
const ProfilePage = lazy(() => import("./components/ProfilePage"));
const MorningPopup = lazy(() => import("./components/MorningPopup"));
const NightPopup = lazy(() => import("./components/NightPopup"));

import { TaskProvider, useTasks } from "./context/TaskContext";
import { NotificationProvider, useNotification } from "./context/NotificationContext";
import { checkTaskReminders, sendBrowserNotification, checkOverdueTaskReminders } from "./services/notification";
import { format, addDays } from "date-fns";
import { calculateDefaultDueTime } from "./utils/taskUtils";

// Audio is created lazily inside the effect — avoids a startup network fetch to external CDN
let reminderAudio = null;
function getReminderAudio() {
  if (!reminderAudio) {
    reminderAudio = new Audio("https://assets.mixkit.co/active_storage/sfx/2019/2019-500.wav");
    reminderAudio.volume = 0.4;
  }
  return reminderAudio;
}

// Simple loading fallback for Suspense
const PageLoader = () => (
  <div style={{
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    height: "100vh",
    background: "var(--bg-app)",
    color: "var(--text-secondary)",
    fontSize: "0.9rem",
    fontFamily: "var(--font-body, Inter, sans-serif)"
  }}>
    <div style={{ textAlign: "center" }}>
      <div style={{
        width: 36,
        height: 36,
        border: "3px solid var(--color-primary, #6D28D9)",
        borderTopColor: "transparent",
        borderRadius: "50%",
        animation: "spin 0.7s linear infinite",
        margin: "0 auto 12px"
      }} />
      Loading...
    </div>
  </div>
);




/**
 * Global component to handle background task reminders and interactive snoozing/rescheduling.
 */
function GlobalReminderEngine() {
  const navigate = useNavigate();
  const { addOrUpdateOverdueNotification } = useNotification();
  const { tasks, updateTask, rescheduleTask } = useTasks();
  const [activeReminder, setActiveReminder] = useState(null);

  const [notifiedTaskIds, setNotifiedTaskIds] = useState([]);

  const [overdueTaskRecords, setOverdueTaskRecords] = useState({});

  const tasksRef = useRef(tasks);
  const notifiedTaskIdsRef = useRef(notifiedTaskIds);
  const updateTaskRef = useRef(updateTask);
  const overdueTaskRecordsRef = useRef(overdueTaskRecords);
  const morningNotifiedRef = useRef(new Set());
  const nightNotifiedRef = useRef(new Set());

  useEffect(() => {
    tasksRef.current = tasks;
    notifiedTaskIdsRef.current = notifiedTaskIds;
    updateTaskRef.current = updateTask;
    overdueTaskRecordsRef.current = overdueTaskRecords;
  }, [tasks, notifiedTaskIds, updateTask, overdueTaskRecords]);

  // Custom reschedule view state
  const [showRescheduleForm, setShowRescheduleForm] = useState(false);
  const [customDate, setCustomDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [customStartTime, setCustomStartTime] = useState(format(new Date(), "HH:mm"));
  const [customTime, setCustomTime] = useState("17:00");
  const [isTimeManuallySet, setIsTimeManuallySet] = useState(false);

  useEffect(() => {
    if (activeReminder && !isTimeManuallySet) {
      const dateStr = `${customDate}T${customStartTime}`;
      const startObj = new Date(dateStr);
      if (!isNaN(startObj)) {
        setCustomTime(calculateDefaultDueTime(activeReminder.category, startObj));
      }
    }
  }, [activeReminder, customDate, customStartTime, isTimeManuallySet]);

  useEffect(() => {
    // Check theme preference
    const savedTheme = localStorage.getItem("app-theme");
    if (savedTheme === "dark") {
      document.documentElement.classList.add("dark-mode");
    }
  }, []);

  useEffect(() => {
    const timer = setInterval(() => {
      checkTaskReminders(tasksRef.current, notifiedTaskIdsRef.current, (task, signature) => {
        // Trigger browser notification with actions
        sendBrowserNotification(task.title, {
          body: `Due soon at ${task.dueTime}! Did you finish it?`,
          data: { taskId: task.id } // Pass task ID to service worker
        });

        try {
          const audio = getReminderAudio();
          audio.currentTime = 0;
          audio.play();
        } catch (e) { }

        // Trigger in-app interactive overlay banner
        setActiveReminder(task);
        setIsTimeManuallySet(false);
        setCustomStartTime(format(new Date(), "HH:mm"));
        setCustomDate(format(new Date(), "yyyy-MM-dd"));

        setNotifiedTaskIds(prev => {
          if (prev.includes(signature)) return prev;
          return [...prev, signature];
        });
      });

      // Overdue Task Notifications
      checkOverdueTaskReminders(
        tasksRef.current,
        (taskId) => overdueTaskRecordsRef.current[taskId],
        (taskId, timeMs) => {
          setOverdueTaskRecords(prev => ({ ...prev, [taskId]: timeMs }));
        },
        (task) => {
          sendBrowserNotification("⏰ Overdue Task Reminder", {
            body: `Your task "${task.title}" is overdue.\nPlease complete or reschedule it as soon as possible.\nOriginal Due: ${task.dueDate} at ${task.dueTime}`,
            data: { taskId: task.id, isOverdueClick: true },
            requireInteraction: true // Ensures it doesn't auto-dismiss
          });
          if (addOrUpdateOverdueNotification) {
            addOrUpdateOverdueNotification(task);
          }
        }
      );

      // Smart Morning Planner OS Notification
      const now = new Date();
      const currentHour = now.getHours();
      if (currentHour === 9 && now.getMinutes() === 0) {
        const todayDateStr = format(now, "yyyy-MM-dd");
        if (!morningNotifiedRef.current.has(todayDateStr)) {
          const pendingTasks = tasks.filter(t => !t.completed && (t.dueDate <= todayDateStr || t.rescheduleCount > 0));
          const pendingCount = pendingTasks.length;

          let overdueCount = 0;
          let highestPriority = "None";

          if (pendingCount > 0) {
            overdueCount = pendingTasks.filter(t => {
              const d = new Date(t.dueDate + "T23:59");
              return d < now && t.dueDate !== todayDateStr;
            }).length;

            const highPrio = pendingTasks.find(t => t.priority === "High");
            const medPrio = pendingTasks.find(t => t.priority === "Medium");
            if (highPrio) highestPriority = highPrio.title;
            else if (medPrio) highestPriority = medPrio.title;
            else highestPriority = pendingTasks[0].title;
          }

          sendBrowserNotification("🌅 Good Morning!", {
            body: `You have:\n• ${pendingCount} Pending Tasks\n• ${overdueCount} Overdue Tasks\n• Highest Priority: ${highestPriority}\n\nLet's make today productive!`,
            data: { isMorning: true },
            actions: [
              { action: 'plan', title: '📋 Plan My Day' }
            ]
          });

          morningNotifiedRef.current.add(todayDateStr);
        }
      }

      // Smart Night Review OS Notification
      if (currentHour === 22 && now.getMinutes() === 0) {
        const todayDateStr = format(now, "yyyy-MM-dd");
        if (!nightNotifiedRef.current.has(todayDateStr)) {
          const pendingCount = tasks.filter(t => !t.completed && t.dueDate === todayDateStr).length;

          let overdueCount = tasks.filter(t => {
            if (t.completed) return false;
            const d = new Date(t.dueDate + "T23:59");
            return d < now && t.dueDate !== todayDateStr;
          }).length;

          sendBrowserNotification("🌙 Night Review", {
            body: `You have:\n• ${pendingCount} Pending Tasks\n• ${overdueCount} Overdue Tasks\n\nReview your remaining tasks before ending the day.`,
            data: { isNight: true },
            actions: [
              { action: 'review', title: '🌙 Review Tasks' }
            ]
          });

          nightNotifiedRef.current.add(todayDateStr);
        }
      }

    }, 60000); // Check every 10 seconds

    // Listen for messages from the service worker (OS Notification Clicks)
    const handleAction = (event) => {
      if (event.data && event.data.type === 'NOTIFICATION_ACTION') {
        const { action, taskId, isMorning, isNight, isOverdueClick } = event.data;
        console.log(`[Reminder System] Native Notification clicked. Action: "${action || 'body'}", Task ID: ${taskId}`);
        
        if (isOverdueClick && (!action || action === 'body')) {
          navigate(`/tasks/${taskId}`);
          return;
        }

        if (action === 'plan' || isMorning) {
          window.dispatchEvent(new Event('openMorningPlanner'));
          return;
        }

        if (action === 'review' || isNight) {
          window.dispatchEvent(new Event('openNightReview'));
          return;
        }

        const matchingTask = tasksRef.current.find(t => t.id === taskId);

        if (matchingTask) {
          // If the action is from OS, and the big modal is open, we can close it
          if (action === 'complete') {
            updateTaskRef.current(taskId, { completed: true });
            setActiveReminder(null);
            setShowRescheduleForm(false);
          } else if (action === 'reschedule') {
            setActiveReminder(matchingTask);
            setShowRescheduleForm(true);
          }
        }
      }
    };

    const bc = new BroadcastChannel('smart-task-channel');
    bc.onmessage = handleAction;

    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.addEventListener('message', handleAction);
    }

    return () => {
      clearInterval(timer);
      bc.close();
      if ('serviceWorker' in navigator) {
        navigator.serviceWorker.removeEventListener('message', handleAction);
      }
    };
  }, []); // Run only once to start the background engine

  if (!activeReminder) return null;

  const handleMarkComplete = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      await updateTask(activeReminder.id, { completed: true });
      setActiveReminder(null);
      setShowRescheduleForm(false);
    } catch (err) {}
  };

  const handleQuickReschedule = (e, type) => {
    e.preventDefault();
    e.stopPropagation();
    let nextDate = format(new Date(), "yyyy-MM-dd");
    let nextTime = "19:00";

    if (type === "evening") {
      nextTime = "19:00";
    } else if (type === "tomorrow") {
      nextDate = format(addDays(new Date(), 1), "yyyy-MM-dd");
      nextTime = "09:00";
    }

    rescheduleTask(activeReminder.id, nextDate, nextTime);
    setActiveReminder(null);
    setShowRescheduleForm(false);
  };

  const handleCustomRescheduleSubmit = (e) => {
    e.preventDefault();
    e.stopPropagation();
    rescheduleTask(activeReminder.id, customDate, customTime);
    setActiveReminder(null);
    setShowRescheduleForm(false);
  };

  return (
  <>
    <div className="reminder-modal-overlay">
      <div className="reminder-modal-card scale-in">
        <div className="reminder-modal-header">
          <h3 className="reminder-modal-title">
            <span style={{ marginRight: "8px" }}>🔔</span>
            Smart Task Reminder
          </h3>
          <button className="reminder-modal-close" onClick={() => setActiveReminder(null)}>&times;</button>
        </div>

        <div className="reminder-modal-body">
          <p className="reminder-question">Did you complete <strong>"{activeReminder.title}"</strong>?</p>
        </div>

        <div className="reminder-modal-footer">
          {!showRescheduleForm ? (
            <div className="reminder-actions">
              <button className="reminder-btn success" onClick={handleMarkComplete}>
                ✔ Yes, Completed
              </button>
              <button className="reminder-btn danger" onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setShowRescheduleForm(true);
              }}>
                ❌ No, Reschedule
              </button>
            </div>
          ) : (
            <form onSubmit={handleCustomRescheduleSubmit} style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              <p style={{ margin: "0", fontSize: "0.95rem", color: "var(--text-secondary)", textAlign: "center" }}>
                Choose a new deadline:
              </p>

              <div style={{ display: "flex", gap: "8px", justifyContent: "center" }}>
                <button type="button" className="reminder-btn secondary" onClick={(e) => handleQuickReschedule(e, "evening")} style={{ padding: "8px" }}>
                  🌆 Evening
                </button>
                <button type="button" className="reminder-btn secondary" onClick={(e) => handleQuickReschedule(e, "tomorrow")} style={{ padding: "8px" }}>
                  🌅 Tomorrow
                </button>
              </div>

              <div className="reminder-reschedule-box" style={{ marginTop: "8px", display: "flex", flexDirection: "column", gap: "10px" }}>
                <div>
                  <label style={{ fontSize: "0.85rem", color: "#64748b", fontWeight: "600", display: "block", marginBottom: "4px" }}>New Date</label>
                  <input
                    type="date"
                    value={customDate}
                    onChange={(e) => setCustomDate(e.target.value)}
                    className="reminder-time-input"
                    style={{ width: "100%" }}
                    required
                  />
                </div>
                <div>
                  <label style={{ fontSize: "0.85rem", color: "#64748b", fontWeight: "600", display: "block", marginBottom: "4px" }}>Start Time</label>
                  <input
                    type="time"
                    value={customStartTime}
                    onChange={(e) => setCustomStartTime(e.target.value)}
                    className="reminder-time-input"
                    style={{ width: "100%" }}
                    required
                  />
                </div>
                <div>
                  <label style={{ fontSize: "0.85rem", color: "#64748b", fontWeight: "600", display: "block", marginBottom: "4px" }}>
                    Suggested Due Time {!isTimeManuallySet && <span style={{ fontWeight: "normal", fontStyle: "italic", color: "#3b82f6" }}>(Automatically calculated)</span>}
                  </label>
                  <input
                    type="time"
                    value={customTime}
                    onChange={(e) => {
                      setCustomTime(e.target.value);
                      setIsTimeManuallySet(true);
                    }}
                    className="reminder-time-input"
                    style={{ width: "100%" }}
                    required
                  />
                </div>
              </div>

              <div style={{ display: "flex", gap: "8px", marginTop: "4px" }}>
                <button type="submit" className="reminder-btn save" style={{ flex: 1, background: "#f1f5f9", color: "black", fontWeight: "800", border: "2px solid #cbd5e1", borderRadius: "10px", padding: "12px", boxShadow: "0 4px 6px rgba(0,0,0,0.05)", cursor: "pointer" }}>Confirm</button>
                <button type="button" className="reminder-btn cancel" onClick={() => setShowRescheduleForm(false)} style={{ flex: 1 }}>Cancel</button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
    </>
  );
}

function ProtectedRoute({ children }) {
  const isAuthenticated = localStorage.getItem("smartAuth") === "true";
  return isAuthenticated ? children : <Navigate to="/login" replace />;
}

function App() {
  return (
    <TaskProvider>
      <NotificationProvider>
        <BrowserRouter>
          <Toaster
            position="top-right"
            toastOptions={{
              duration: 2500,
            }}
          />
          {/* Suspense wraps all lazy-loaded routes — shows PageLoader while chunk downloads */}
          <Suspense fallback={<PageLoader />}>
            <MorningPopup />
            <NightPopup />
            <Routes>
              <Route path="/login" element={<LoginPage />} />
              <Route path="/" element={<Navigate to="/dashboard" replace />} />
              <Route
                path="/dashboard"
                element={
                  <ProtectedRoute>
                    <Layout>
                      <DashboardPage />
                    </Layout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/glass-dashboard"
                element={
                  <ProtectedRoute>
                    <Layout>
                      <GlassDashboard />
                    </Layout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/tasks"
                element={
                  <ProtectedRoute>
                    <Layout>
                      <TaskPage />
                    </Layout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/tasks/:statusOrId"
                element={
                  <ProtectedRoute>
                    <Layout>
                      <TaskPage />
                    </Layout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/planner"
                element={
                  <ProtectedRoute>
                    <Layout>
                      <MorningPlanner />
                    </Layout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/reports"
                element={
                  <ProtectedRoute>
                    <Layout>
                      <ReportsPage />
                    </Layout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/progress"
                element={
                  <ProtectedRoute>
                    <Layout>
                      <WorkProgressTracker />
                    </Layout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/settings"
                element={
                  <ProtectedRoute>
                    <Layout>
                      <SettingsPage />
                    </Layout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/profile"
                element={
                  <ProtectedRoute>
                    <Layout>
                      <ProfilePage />
                    </Layout>
                  </ProtectedRoute>
                }
              />
              <Route path="*" element={<Navigate to="/dashboard" replace />} />
            </Routes>
          </Suspense>
          <GlobalReminderEngine />
        </BrowserRouter>
      </NotificationProvider>
    </TaskProvider>
  );
}

export default App;