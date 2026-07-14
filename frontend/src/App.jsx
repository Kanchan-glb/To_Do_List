import { useState, useEffect } from "react";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import LoginPage from "./components/LoginPage";
import DashboardPage from "./components/DashboardPage";
import Layout from "./components/Layout";
import TaskPage from "./components/TaskPage";
import MorningPlanner from "./components/MorningPlanner";
import ReportsPage from "./components/ReportsPage";
import SettingsPage from "./components/SettingsPage";
import { TaskProvider, useTasks } from "./context/TaskContext";
import { checkTaskReminders, sendBrowserNotification } from "./services/notification";
import { format, addDays } from "date-fns";

function ProtectedRoute({ children }) {
  const isAuthenticated = localStorage.getItem("smartAuth") === "true";
  return isAuthenticated ? children : <Navigate to="/login" replace />;
}

/**
 * Global component to handle background task reminders and interactive snoozing/rescheduling.
 */
function GlobalReminderEngine() {
  const { tasks, updateTask, rescheduleTask } = useTasks();
  const [activeReminder, setActiveReminder] = useState(null);
  const [notifiedTaskIds, setNotifiedTaskIds] = useState([]);
  
  // Custom reschedule view state
  const [showRescheduleForm, setShowRescheduleForm] = useState(false);
  const [customDate, setCustomDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [customTime, setCustomTime] = useState("17:00");

  useEffect(() => {
    const timer = setInterval(() => {
      checkTaskReminders(tasks, notifiedTaskIds, (task) => {
        // Trigger browser notification
        sendBrowserNotification(task.title, {
          body: `Due soon at ${task.dueTime}! Did you finish it?`
        });
        
        // Trigger app sound
        try {
          const audio = new Audio("https://assets.mixkit.co/active_storage/sfx/2019/2019-500.wav");
          audio.volume = 0.4;
          audio.play();
        } catch(e) {}

        // Trigger in-app interactive overlay banner
        setActiveReminder(task);
        setNotifiedTaskIds((prev) => [...prev, task.id]);
      });
    }, 10000); // Check every 10 seconds

    return () => clearInterval(timer);
  }, [tasks, notifiedTaskIds]);

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
    <div className="interactive-reminder-banner">
      <div className="reminder-header">
        <span style={{ fontSize: "1.2rem" }}>🔔</span>
        <strong>Smart Task Reminder</strong>
      </div>
      <p className="reminder-title">Did you complete <strong>"{activeReminder.title}"</strong>?</p>
      
      {!showRescheduleForm ? (
        <>
          <div className="reminder-actions">
            <button
              type="button"
              className="primary-btn"
              onClick={handleMarkComplete}
              style={{ background: "#10b981", color: "white" }}
            >
              ✔ Yes, Completed
            </button>
            <button
              type="button"
              className="secondary-button"
              onClick={() => setShowRescheduleForm(true)}
            >
              ❌ No, Reschedule
            </button>
          </div>
        </>
      ) : (
        <form onSubmit={handleCustomRescheduleSubmit} style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
          <p style={{ margin: "0 0 4px", fontSize: "0.82rem", color: "#64748b" }}>Choose rescheduling deadline:</p>
          <div style={{ display: "flex", gap: "6px" }}>
            <button
              type="button"
              className="secondary-button"
              onClick={() => handleQuickReschedule("evening")}
              style={{ fontSize: "0.78rem", padding: "6px 8px" }}
            >
              🌆 Evening
            </button>
            <button
              type="button"
              className="secondary-button"
              onClick={() => handleQuickReschedule("tomorrow")}
              style={{ fontSize: "0.78rem", padding: "6px 8px" }}
            >
              🌅 Tomorrow
            </button>
          </div>
          
          <div style={{ display: "flex", gap: "6px", alignItems: "center", marginTop: "4px" }}>
            <input
              type="date"
              value={customDate}
              onChange={(e) => setCustomDate(e.target.value)}
              style={{ padding: "4px", borderRadius: "6px", border: "1px solid #ccc", fontSize: "0.8rem", flex: 1 }}
              required
            />
            <input
              type="time"
              value={customTime}
              onChange={(e) => setCustomTime(e.target.value)}
              style={{ padding: "4px", borderRadius: "6px", border: "1px solid #ccc", fontSize: "0.8rem", flex: 1 }}
              required
            />
          </div>
          <div style={{ display: "flex", gap: "6px", marginTop: "4px" }}>
            <button type="submit" className="primary-btn" style={{ fontSize: "0.8rem", padding: "6px" }}>Confirm</button>
            <button
              type="button"
              className="secondary-button"
              onClick={() => setShowRescheduleForm(false)}
              style={{ fontSize: "0.8rem", padding: "6px" }}
            >
              Back
            </button>
          </div>
        </form>
      )}
    </div>
  );
}

function App() {
  return (
    <TaskProvider>
      <BrowserRouter>
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
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
        <GlobalReminderEngine />
      </BrowserRouter>
    </TaskProvider>
  );
}

export default App;