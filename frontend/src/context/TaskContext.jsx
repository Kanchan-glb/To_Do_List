import { createContext, useContext, useState, useEffect, useRef } from "react";
import { format, subDays, differenceInDays } from "date-fns";
import * as api from "../api/authApi";

const TaskContext = createContext();

export function useTasks() {
  return useContext(TaskContext);
}

export function TaskProvider({ children }) {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(false);
  const [geminiApiKey, setGeminiApiKey] = useState("");

  const [streak, setStreak] = useState(0);
  const [longestStreak, setLongestStreak] = useState(0);
  const [lastActiveDate, setLastActiveDate] = useState(format(new Date(), "yyyy-MM-dd"));

  const [morningPlannerCompleted, setMorningPlannerCompleted] = useState(false);
  const [nightReviewCompleted, setNightReviewCompleted] = useState(false);

  const [history, setHistory] = useState([]);

  const [pomodoroSettings, setPomodoroSettings] = useState({
    work: 25,
    shortBreak: 5,
    longBreak: 15
  });

  // Pomodoro Focus Timer State
  const [pomodoroState, setPomodoroState] = useState({
    focusMode: "work",
    focusTimeLeft: 25 * 60,
    isFocusRunning: false,
    targetTime: null
  });

  const focusTimeLeft = pomodoroState.focusTimeLeft;
  const isFocusRunning = pomodoroState.isFocusRunning;
  const focusMode = pomodoroState.focusMode;

  const [focusStats, setFocusStats] = useState({ workMinutes: 0, completedSessions: 0 });

  const fetchTasks = async () => {
    setLoading(true);
    try {
      const { data } = await api.getTasks();
      if (data && data.tasks) {
        setTasks(data.tasks);
      }
    } catch (err) {
      console.error("Error fetching tasks from backend:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTasks();
  }, []);

  const updatePomodoroSettings = (newSettings) => {
    setPomodoroSettings(newSettings);
    if (!pomodoroState.isFocusRunning) {
      setPomodoroState(prev => ({
        ...prev,
        focusTimeLeft: newSettings[prev.focusMode] * 60
      }));
    }
  };

  const startTimer = () => {
    if (pomodoroState.isFocusRunning) return;
    setPomodoroState(prev => ({
      ...prev,
      isFocusRunning: true,
      targetTime: Date.now() + prev.focusTimeLeft * 1000
    }));
  };

  const pauseTimer = () => {
    if (!pomodoroState.isFocusRunning) return;
    setPomodoroState(prev => {
      const remaining = prev.targetTime ? Math.max(0, Math.round((prev.targetTime - Date.now()) / 1000)) : prev.focusTimeLeft;
      return {
        ...prev,
        isFocusRunning: false,
        focusTimeLeft: remaining,
        targetTime: null
      };
    });
  };

  const resetTimerToDefault = () => {
    const defaultSettings = { work: 25, shortBreak: 5, longBreak: 10 };
    setPomodoroSettings(defaultSettings);
    setPomodoroState(prev => ({
      ...prev,
      isFocusRunning: false,
      focusTimeLeft: defaultSettings[prev.focusMode] * 60,
      targetTime: null
    }));
  };

  const timerRef = useRef(null);

  // Request Notification Permissions
  useEffect(() => {
    if ("Notification" in window && Notification.permission !== "denied") {
      Notification.requestPermission();
    }
  }, []);

  // Compute streak from backend tasks
  useEffect(() => {
    const completedTasks = tasks.filter(t => t.status === "Completed" || t.completed);
    const uniqueDates = [...new Set(completedTasks.map(t => {
      if (t.completedAt) return format(new Date(t.completedAt), "yyyy-MM-dd");
      if (t.completedDate) return t.completedDate;
      if (t.dueDate) return t.dueDate;
      return null;
    }).filter(Boolean))];

    const sortedDates = uniqueDates.sort();

    if (sortedDates.length === 0) {
      setStreak(0);
      setLongestStreak(0);
      return;
    }

    let maxStreak = 0;
    let tempStreak = 0;
    let lastDate = null;

    for (let i = 0; i < sortedDates.length; i++) {
      const currentDate = new Date(sortedDates[i] + "T12:00:00");
      if (lastDate === null) {
        tempStreak = 1;
      } else {
        const diff = differenceInDays(currentDate, lastDate);
        if (diff === 1) {
          tempStreak += 1;
        } else if (diff > 1) {
          if (tempStreak > maxStreak) {
            maxStreak = tempStreak;
          }
          tempStreak = 1;
        }
      }
      lastDate = currentDate;
    }
    if (tempStreak > maxStreak) {
      maxStreak = tempStreak;
    }

    const todayStr = format(new Date(), "yyyy-MM-dd");
    const yesterdayStr = format(subDays(new Date(), 1), "yyyy-MM-dd");

    let currentStreak = 0;
    if (sortedDates.includes(todayStr)) {
      let checkDate = new Date(todayStr + "T12:00:00");
      while (sortedDates.includes(format(checkDate, "yyyy-MM-dd"))) {
        currentStreak++;
        checkDate = subDays(checkDate, 1);
      }
    } else if (sortedDates.includes(yesterdayStr)) {
      let checkDate = new Date(yesterdayStr + "T12:00:00");
      while (sortedDates.includes(format(checkDate, "yyyy-MM-dd"))) {
        currentStreak++;
        checkDate = subDays(checkDate, 1);
      }
    } else {
      currentStreak = 0;
    }

    const finalLongest = Math.max(maxStreak, currentStreak);
    setStreak(currentStreak);
    setLongestStreak(finalLongest);
  }, [tasks]);

  // Handle Daily resets & Auto-History logs
  useEffect(() => {
    const todayStr = format(new Date(), "yyyy-MM-dd");
    if (lastActiveDate !== todayStr) {
      let completedCount = 0, pendingCount = 0, overdueCount = 0, totalCount = 0, rescheduledCount = 0;

      tasks.forEach(t => {
        const taskDue = t.dueDate || "2099-01-01";
        const isCompletedOnDay = t.status === "Completed" && t.completedAt && format(new Date(t.completedAt), "yyyy-MM-dd") === lastActiveDate;

        if (taskDue === lastActiveDate || isCompletedOnDay) {
          totalCount++;
          if (isCompletedOnDay) {
            completedCount++;
          } else if (t.status === "Overdue") {
            overdueCount++;
          } else {
            pendingCount++;
          }
        }

        if (t.rescheduleHistory?.some(h => h.rescheduledAt && format(new Date(h.rescheduledAt), "yyyy-MM-dd") === lastActiveDate)) {
          rescheduledCount++;
        }
      });

      const rateForLastActive = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;
      const prodScore = Math.min(100, rateForLastActive + (streak > 3 ? 5 : 0) + (completedCount > 5 ? 10 : 0));

      setHistory((prev) => {
        if (prev.some((h) => h.date === lastActiveDate && h.type === "daily")) {
          return prev;
        }
        return [
          {
            id: Date.now().toString() + "-auto",
            type: "daily",
            date: lastActiveDate,
            totalTasks: totalCount,
            completedCount: completedCount,
            pendingCount: pendingCount,
            overdueCount: overdueCount,
            rescheduledCount: rescheduledCount,
            completionRate: rateForLastActive,
            productivityScore: prodScore
          },
          ...prev
        ];
      });

      setLastActiveDate(todayStr);
      setMorningPlannerCompleted(false);
      setNightReviewCompleted(false);
    }
  }, [lastActiveDate, streak, tasks]);

  // Pomodoro timer tick logic
  useEffect(() => {
    if (pomodoroState.isFocusRunning && pomodoroState.targetTime) {
      const remaining = Math.round((pomodoroState.targetTime - Date.now()) / 1000);
      if (remaining <= 0) {
        setIsFocusRunning(false);
        handleFocusTimerComplete();
        return;
      }
    }

    if (pomodoroState.isFocusRunning) {
      timerRef.current = setInterval(() => {
        setPomodoroState((prev) => {
          if (!prev.isFocusRunning || !prev.targetTime) return prev;

          const remaining = Math.round((prev.targetTime - Date.now()) / 1000);
          if (remaining <= 0) {
            clearInterval(timerRef.current);
            setTimeout(() => handleFocusTimerComplete(), 0);
            return {
              ...prev,
              isFocusRunning: false,
              focusTimeLeft: 0,
              targetTime: null
            };
          }
          return {
            ...prev,
            focusTimeLeft: remaining
          };
        });
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [pomodoroState.isFocusRunning, pomodoroState.targetTime]);

  const handleFocusTimerComplete = () => {
    try {
      const audio = new Audio("https://assets.mixkit.co/active_storage/sfx/2869/2869-500.wav");
      audio.volume = 0.5;
      audio.play();
    } catch (e) {
      console.log("Audio not supported or blocked: ", e);
    }

    if (focusMode === "work") {
      setFocusStats((prev) => ({
        workMinutes: prev.workMinutes + pomodoroSettings.work,
        completedSessions: prev.completedSessions + 1
      }));
      if ("Notification" in window && Notification.permission === "granted") {
        new Notification("Pomodoro Complete!", { body: "Great job! Focus session completed. Take a break." });
      } else {
        alert("Great job! Focus session completed. Take a break.");
      }
      switchFocusMode("shortBreak");
    } else {
      if ("Notification" in window && Notification.permission === "granted") {
        new Notification("Break Over!", { body: "Break is over! Ready to get back to focus?" });
      } else {
        alert("Break is over! Ready to get back to focus?");
      }
      if ("Notification" in window && Notification.permission === "default") {
        Notification.requestPermission();
      }
      switchFocusMode("work");
    }
  };

  const setIsFocusRunning = (running) => {
    if (running) {
      startTimer();
    } else {
      pauseTimer();
    }
  };

  const setFocusTimeLeft = (timeOrFn) => {
    setPomodoroState(prev => {
      const newTime = typeof timeOrFn === 'function' ? timeOrFn(prev.focusTimeLeft) : timeOrFn;
      return { ...prev, focusTimeLeft: newTime };
    });
  };

  const switchFocusMode = (mode) => {
    setPomodoroState(prev => ({
      ...prev,
      isFocusRunning: false,
      focusMode: mode,
      focusTimeLeft: pomodoroSettings[mode] * 60,
      targetTime: null
    }));
  };

  const addTask = async (taskData) => {
    try {
      const res = await api.createTask(taskData);
      await fetchTasks();
      return res;
    } catch (err) {
      console.error("Error creating task:", err);
      throw err;
    }
  };

  const updateTask = async (id, updatedData) => {
    try {
      const res = await api.updateTask(id, updatedData);
      await fetchTasks();
      return res;
    } catch (err) {
      console.error("Error updating task:", err);
      throw err;
    }
  };

  const deleteTask = async (id) => {
    try {
      const res = await api.deleteTask(id);
      await fetchTasks();
      return res;
    } catch (err) {
      console.error("Error deleting task:", err);
      throw err;
    }
  };

  const toggleSubtask = async (taskId, subtaskId) => {
    const task = tasks.find(t => t.id === taskId || t._id === taskId);
    if (!task) return;

    const updatedSubtasks = (task.subtasks || []).map((st) =>
      (st.id === subtaskId || st._id === subtaskId) ? { ...st, completed: !st.completed } : st
    );

    try {
      const res = await api.updateTask(taskId || task._id, { subtasks: updatedSubtasks });
      await fetchTasks();
      return res;
    } catch (err) {
      console.error("Error toggling subtask:", err);
      throw err;
    }
  };

  const rescheduleTask = async (id, newDate, reason) => {
    try {
      const res = await api.rescheduleTask(id, {
        newDate,
        reason,
      });
      await fetchTasks();
      return res;
    } catch (err) {
      console.error("Error rescheduling task:", err);
      throw err;
    }
  };

  const completeMorningPlanning = () => {
    setMorningPlannerCompleted(true);
  };

  const completeNightReview = (summaryData) => {
    const todayStr = format(new Date(), "yyyy-MM-dd");
    setNightReviewCompleted(true);

    setHistory((prev) => [
      {
        id: Date.now().toString(),
        type: "daily",
        date: todayStr,
        ...summaryData
      },
      ...prev
    ]);
  };

  const saveWeeklyReview = (reviewData) => {
    const todayStr = format(new Date(), "yyyy-MM-dd");
    setHistory((prev) => [
      {
        id: Date.now().toString(),
        type: "weekly",
        date: todayStr,
        ...reviewData
      },
      ...prev
    ]);
  };

  const getDailyProgress = () => {
    const completed = tasks.filter(t => t.status === "Completed" || t.completed).length;
    const pending = tasks.filter(t => t.status === "Pending").length;
    const overdue = tasks.filter(t => t.status === "Overdue").length;
    const total = completed + pending;
    const rate = total > 0 ? Math.round((completed / total) * 100) : 0;

    return {
      todayCount: total,
      todayCompleted: completed,
      completionRate: rate,
      pendingCount: pending,
      completedCount: completed,
      overdueCount: overdue,
      streak
    };
  };

  return (
    <TaskContext.Provider
      value={{
        tasks,
        loading,
        fetchTasks,
        geminiApiKey,
        setGeminiApiKey,
        streak,
        longestStreak,
        morningPlannerCompleted,
        nightReviewCompleted,
        completeMorningPlanning,
        completeNightReview,
        saveWeeklyReview,
        history,
        fetchTasks,
        loading,
        addTask,
        updateTask,
        deleteTask,
        toggleSubtask,
        rescheduleTask,
        getDailyProgress,
        // Focus Timer State
        focusTimeLeft,
        setFocusTimeLeft,
        isFocusRunning,
        setIsFocusRunning,
        focusMode,
        focusStats,
        switchFocusMode,
        pomodoroSettings,
        updatePomodoroSettings,
        startTimer,
        pauseTimer,
        resetTimerToDefault
      }}
    >
      {children}
    </TaskContext.Provider>
  );
}

