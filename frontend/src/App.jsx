import { useState, useEffect } from "react";
import { BrowserRouter, Navigate, Route, Routes, useLocation, useNavigate } from "react-router-dom";
import LoginPage from "./components/LoginPage";
import DashboardPage from "./components/DashboardPage";
import Layout from "./components/Layout";
import TaskPage from "./components/TaskPage";
import MorningPlanner from "./components/MorningPlanner";
import ReportsPage from "./components/ReportsPage";
import SettingsPage from "./components/SettingsPage";
import ProfilePage from "./components/ProfilePage";
import MorningPopup from "./components/MorningPopup";
import NightPopup from "./components/NightPopup";
import { TaskProvider, useTasks } from "./context/TaskContext";
import { checkTaskReminders, sendBrowserNotification } from "./services/notification";
import { format, addDays } from "date-fns";



/**
 * Global component to handle background task reminders and interactive snoozing/rescheduling.
 */
function GlobalReminderEngine() {
  const { tasks, updateTask, rescheduleTask } = useTasks();
  const [activeReminder, setActiveReminder] = useState(null);
  const userEmail = localStorage.getItem("smartEmail") || "guest";
  
  const [notifiedTaskIds, setNotifiedTaskIds] = useState(() => {
    try {
      const userKey = `smartNotifiedTasks_${userEmail}`;
      const userStored = localStorage.getItem(userKey);
      if (userStored) return JSON.parse(userStored);
      
      const stored = localStorage.getItem("smartNotifiedTasks");
      if (stored) {
        localStorage.setItem(userKey, stored);
        localStorage.removeItem("smartNotifiedTasks");
        return JSON.parse(stored);
      }
      return [];
    } catch (e) {
      return [];
    }
  });

  // Custom reschedule view state
  const [showRescheduleForm, setShowRescheduleForm] = useState(false);
  const [customDate, setCustomDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [customTime, setCustomTime] = useState("17:00");

  useEffect(() => {
    // Check theme preference
    const savedTheme = localStorage.getItem("app-theme");
    if (savedTheme === "dark") {
      document.documentElement.classList.add("dark-mode");
    }
  }, []);

  useEffect(() => {
    const timer = setInterval(() => {
      checkTaskReminders(tasks, notifiedTaskIds, (task, signature) => {
        // Trigger browser notification with actions
        sendBrowserNotification(task.title, {
          body: `Due soon at ${task.dueTime}! Did you finish it?`,
          data: { taskId: task.id } // Pass task ID to service worker
        });

        // Trigger app sound
        try {
          const audio = new Audio("https://assets.mixkit.co/active_storage/sfx/2019/2019-500.wav");
          audio.volume = 0.4;
          audio.play();
        } catch (e) { }

        // Trigger in-app interactive overlay banner
        setActiveReminder(task);
        
        setNotifiedTaskIds(prev => {
          if (prev.includes(signature)) return prev;
          const next = [...prev, signature];
          localStorage.setItem(`smartNotifiedTasks_${userEmail}`, JSON.stringify(next));
          return next;
        });
      });
      // Smart Morning Planner OS Notification
      const now = new Date();
      const currentHour = now.getHours();

      if (currentHour === 8 && now.getMinutes() === 0) {
        const todayDateStr = format(now, "yyyy-MM-dd");
        const morningKey = `morning_notified_${todayDateStr}_${userEmail}`;
        if (!localStorage.getItem(morningKey)) {
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
          
          localStorage.setItem(morningKey, "true");
        }
      }

      // Smart Night Review OS Notification
      if (currentHour === 22 && now.getMinutes() === 0) {
        const todayDateStr = format(now, "yyyy-MM-dd");
        const nightKey = `night_notified_${todayDateStr}_${userEmail}`;
        if (!localStorage.getItem(nightKey)) {
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
          
          localStorage.setItem(nightKey, "true");
        }
      }

    }, 10000); // Check every 10 seconds

    // Listen for messages from the service worker (OS Notification Clicks)
    const handleAction = (event) => {
      if (event.data && event.data.type === 'NOTIFICATION_ACTION') {
        const { action, taskId, isMorning, isNight } = event.data;
        
        if (action === 'plan' || isMorning) {
          window.dispatchEvent(new Event('openMorningPlanner'));
          return;
        }

        if (action === 'review' || isNight) {
          window.dispatchEvent(new Event('openNightReview'));
          return;
        }

        const matchingTask = tasks.find(t => t.id === taskId);

        if (matchingTask) {
          // If the action is from OS, and the big modal is open, we can close it
          if (action === 'complete') {
            updateTask(taskId, { completed: true });
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
  }, [tasks, notifiedTaskIds, updateTask]);

  if (!activeReminder) return null;

  const handleMarkComplete = () => {
    updateTask(activeReminder.id, { completed: true });
    setActiveReminder(null);
    setShowRescheduleForm(false);
    alert(`Success: "${activeReminder.title}" completed!`);
  };

  const handleQuickReschedule = (type) => {
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
    alert(`Task rescheduled to ${type === "evening" ? "this evening" : "tomorrow morning"}!`);
  };

  const handleCustomRescheduleSubmit = (e) => {
    e.preventDefault();
    rescheduleTask(activeReminder.id, customDate, customTime);
    setActiveReminder(null);
    setShowRescheduleForm(false);
    alert("Task rescheduled to your custom time!");
  };

  return (
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
              <button className="reminder-btn danger" onClick={() => setShowRescheduleForm(true)}>
                ❌ No, Reschedule
              </button>
            </div>
          ) : (
            <form onSubmit={handleCustomRescheduleSubmit} style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              <p style={{ margin: "0", fontSize: "0.95rem", color: "var(--text-secondary)", textAlign: "center" }}>
                Choose a new deadline:
              </p>

              <div style={{ display: "flex", gap: "8px", justifyContent: "center" }}>
                <button type="button" className="reminder-btn secondary" onClick={() => handleQuickReschedule("evening")} style={{ padding: "8px" }}>
                  🌆 Evening
                </button>
                <button type="button" className="reminder-btn secondary" onClick={() => handleQuickReschedule("tomorrow")} style={{ padding: "8px" }}>
                  🌅 Tomorrow
                </button>
              </div>

              <div className="reminder-reschedule-box" style={{ marginTop: "8px" }}>
                <input
                  type="date"
                  value={customDate}
                  onChange={(e) => setCustomDate(e.target.value)}
                  className="reminder-time-input"
                  required
                />
                <input
                  type="time"
                  value={customTime}
                  onChange={(e) => setCustomTime(e.target.value)}
                  className="reminder-time-input"
                  required
                />
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
  );
}

function ProtectedRoute({ children }) {
  const isAuthenticated = localStorage.getItem("smartAuth") === "true";
  return isAuthenticated ? children : <Navigate to="/login" replace />;
}

function App() {
  return (
    <TaskProvider>
      <BrowserRouter>
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
        <GlobalReminderEngine />
      </BrowserRouter>
    </TaskProvider>
  );
}

export default App;