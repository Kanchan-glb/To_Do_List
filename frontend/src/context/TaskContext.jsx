import { createContext, useContext, useState, useEffect, useRef } from "react";
import { format, isToday, isYesterday, differenceInDays, addHours } from "date-fns";

const TaskContext = createContext();

export function useTasks() {
  return useContext(TaskContext);
}

export function TaskProvider({ children }) {
  const userEmail = localStorage.getItem("smartEmail") || "guest";

  const getScopedData = (key, defaultValue, isJson = false) => {
    const userKey = `${key}_${userEmail}`;
    const userStored = localStorage.getItem(userKey);
    if (userStored !== null) {
      return isJson ? JSON.parse(userStored) : userStored;
    }
    
    // Migration logic for existing users
    const globalStored = localStorage.getItem(key);
    if (globalStored !== null) {
      localStorage.setItem(userKey, globalStored);
      localStorage.removeItem(key);
      return isJson ? JSON.parse(globalStored) : globalStored;
    }

    return defaultValue;
  };

  // Load initial tasks
  const [tasks, setTasks] = useState(() => getScopedData("smartTasks", [], true));
  const [geminiApiKey, setGeminiApiKey] = useState(() => getScopedData("smartGeminiKey", ""));
  const [streak, setStreak] = useState(() => parseInt(getScopedData("smartStreak", "1"), 10));
  const [lastActiveDate, setLastActiveDate] = useState(() => getScopedData("smartLastActiveDate", format(new Date(), "yyyy-MM-dd")));
  
  const [morningPlannerCompleted, setMorningPlannerCompleted] = useState(() => {
    const completedDay = getScopedData("smartMorningDay", "");
    return completedDay === format(new Date(), "yyyy-MM-dd");
  });

  const [nightReviewCompleted, setNightReviewCompleted] = useState(() => {
    const completedDay = getScopedData("smartNightDay", "");
    return completedDay === format(new Date(), "yyyy-MM-dd");
  });

  const [history, setHistory] = useState(() => getScopedData("smartHistory", [], true));

  // Pomodoro Focus Timer State
  const [focusTimeLeft, setFocusTimeLeft] = useState(1500); // 25 minutes standard
  const [isFocusRunning, setIsFocusRunning] = useState(false);
  const [focusMode, setFocusMode] = useState("work"); // work, shortBreak, longBreak
  const [focusStats, setFocusStats] = useState(() => getScopedData("smartFocusStats", { workMinutes: 0, completedSessions: 0 }, true));

  const timerRef = useRef(null);

  // Persistence triggers
  useEffect(() => {
    localStorage.setItem(`smartTasks_${userEmail}`, JSON.stringify(tasks));
  }, [tasks, userEmail]);

  useEffect(() => {
    localStorage.setItem(`smartGeminiKey_${userEmail}`, geminiApiKey);
  }, [geminiApiKey, userEmail]);

  useEffect(() => {
    localStorage.setItem(`smartHistory_${userEmail}`, JSON.stringify(history));
  }, [history, userEmail]);

  useEffect(() => {
    localStorage.setItem(`smartFocusStats_${userEmail}`, JSON.stringify(focusStats));
  }, [focusStats, userEmail]);

  // Request Notification Permissions
  useEffect(() => {
    if ("Notification" in window && Notification.permission !== "denied") {
      Notification.requestPermission();
    }
  }, []);

  // System Notification Reminders for Tasks (Handled globally in App.jsx via GlobalReminderEngine)
  // Cleaned up duplicate state here.


  // Handle Streak & Daily resets
  useEffect(() => {
    const todayStr = format(new Date(), "yyyy-MM-dd");
    if (lastActiveDate !== todayStr) {
      const daysDiff = differenceInDays(new Date(todayStr), new Date(lastActiveDate));
      let nextStreak = streak;

      if (daysDiff === 1) {
        nextStreak += 1;
      } else if (daysDiff > 1) {
        nextStreak = 1;
      }

      // Automatically save history for the lastActiveDate
      const completedOnLastActive = tasks.filter((t) => t.completed && (t.completedDate || t.dueDate) === lastActiveDate);
      const pendingOnLastActive = tasks.filter((t) => !t.completed && t.dueDate <= lastActiveDate);
      const totalForLastActive = completedOnLastActive.length + pendingOnLastActive.length;
      const rateForLastActive = totalForLastActive > 0 ? Math.round((completedOnLastActive.length / totalForLastActive) * 100) : 0;

      setHistory((prev) => {
        if (prev.some((h) => h.date === lastActiveDate && h.type === "daily")) {
          return prev;
        }
        return [
          {
            id: Date.now().toString() + "-auto",
            type: "daily",
            date: lastActiveDate,
            completedCount: completedOnLastActive.length,
            pendingCount: pendingOnLastActive.length,
            completionRate: rateForLastActive,
            notes: "Auto-saved daily summary"
          },
          ...prev
        ];
      });

      setStreak(nextStreak);
      localStorage.setItem(`smartStreak_${userEmail}`, nextStreak.toString());
      setLastActiveDate(todayStr);
      localStorage.setItem(`smartLastActiveDate_${userEmail}`, todayStr);

      setMorningPlannerCompleted(false);
      setNightReviewCompleted(false);
    }
  }, [lastActiveDate, streak, tasks, userEmail]);

  // Pomodoro timer tick logic
  useEffect(() => {
    if (isFocusRunning) {
      timerRef.current = setInterval(() => {
        setFocusTimeLeft((prev) => {
          if (prev <= 1) {
            clearInterval(timerRef.current);
            setIsFocusRunning(false);
            handleFocusTimerComplete();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isFocusRunning, focusMode]);

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
        workMinutes: prev.workMinutes + 25,
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

  const switchFocusMode = (mode) => {
    setIsFocusRunning(false);
    setFocusMode(mode);
    if (mode === "work") {
      setFocusTimeLeft(1500);
    } else if (mode === "shortBreak") {
      setFocusTimeLeft(300);
    } else if (mode === "longBreak") {
      setFocusTimeLeft(900);
    }
  };

  // Task Actions
  const addTask = (taskData) => {
    // Request permission on user gesture if not already granted/denied
    if ("Notification" in window && Notification.permission === "default") {
      Notification.requestPermission();
    }

    const newTask = {
      id: Date.now().toString(),
      title: taskData.title,
      description: taskData.description || "",
      category: taskData.category || "General",
      priority: taskData.priority || "Medium",
      dueDate: taskData.dueDate || format(new Date(), "yyyy-MM-dd"),
      dueTime: taskData.dueTime || format(addHours(new Date(), 1), "HH:mm"),
      completed: false,
      subtasks: taskData.subtasks || [],
      rescheduleCount: 0,
      createdDate: format(new Date(), "yyyy-MM-dd")
    };
    setTasks((prev) => [newTask, ...prev]);
    return newTask;
  };

  const updateTask = (taskId, updatedData) => {
    if (updatedData.dueTime || updatedData.dueDate) {
      localStorage.removeItem("reminded_" + taskId);
    }
    setTasks((prev) =>
      prev.map((t) => {
        if (t.id === taskId) {
          const newTask = { ...t, ...updatedData };
          if (updatedData.completed !== undefined && updatedData.completed !== t.completed) {
            newTask.completedDate = updatedData.completed ? format(new Date(), "yyyy-MM-dd") : null;
          }
          return newTask;
        }
        return t;
      })
    );
  };


  const deleteTask = (taskId) => {
    setTasks((prev) => prev.filter((t) => t.id !== taskId));
  };

  const toggleSubtask = (taskId, subtaskId) => {
    setTasks((prev) =>
      prev.map((t) => {
        if (t.id === taskId) {
          const updatedSubtasks = t.subtasks.map((st) =>
            st.id === subtaskId ? { ...st, completed: !st.completed } : st
          );
          
          const hasSubtasks = updatedSubtasks.length > 0;
          const allCompleted = hasSubtasks && updatedSubtasks.every(st => st.completed);

          const isNowCompleted = hasSubtasks ? allCompleted : t.completed;
          let newCompletedDate = t.completedDate;
          if (isNowCompleted && !t.completed) {
            newCompletedDate = format(new Date(), "yyyy-MM-dd");
          } else if (!isNowCompleted && t.completed) {
            newCompletedDate = null;
          }

          return { 
            ...t, 
            subtasks: updatedSubtasks,
            completed: isNowCompleted,
            completedDate: newCompletedDate
          };
        }
        return t;
      })
    );
  };

  const rescheduleTask = (taskId, newDate, newTime) => {
    localStorage.removeItem("reminded_" + taskId);
    setTasks((prev) =>
      prev.map((t) => {
        if (t.id === taskId) {
          return {
            ...t,
            dueDate: newDate,
            dueTime: newTime || t.dueTime,
            rescheduleCount: t.rescheduleCount + 1
          };
        }
        return t;
      })
    );
  };

  // Mark Morning Planner Done
  const completeMorningPlanning = () => {
    const todayStr = format(new Date(), "yyyy-MM-dd");
    setMorningPlannerCompleted(true);
    localStorage.setItem(`smartMorningDay_${userEmail}`, todayStr);
  };

  // Mark Night Review Done
  const completeNightReview = (summaryData) => {
    const todayStr = format(new Date(), "yyyy-MM-dd");
    setNightReviewCompleted(true);
    localStorage.setItem(`smartNightDay_${userEmail}`, todayStr);

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

  // Mark Weekly Review Done
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
    const todayStr = format(new Date(), "yyyy-MM-dd");
    const completed = tasks.filter(t => t.completed && (t.completedDate || t.dueDate) === todayStr).length;
    const pending = tasks.filter((t) => !t.completed && t.dueDate <= todayStr).length;
    const total = completed + pending;
    const rate = total > 0 ? Math.round((completed / total) * 100) : 0;

    const allPending = tasks.filter(t => !t.completed).length;
    const allCompleted = tasks.filter(t => t.completed).length;

    const overdue = tasks.filter(t => {
      if (t.completed) return false;
      const tDate = new Date(t.dueDate + "T" + (t.dueTime || "23:59"));
      return tDate < new Date();
    }).length;

    return {
      todayCount: total,
      todayCompleted: completed,
      completionRate: rate,
      pendingCount: pending,
      completedCount: allCompleted,
      overdueCount: overdue,
      streak
    };
  };

  return (
    <TaskContext.Provider
      value={{
        tasks,
        geminiApiKey,
        setGeminiApiKey,
        streak,
        morningPlannerCompleted,
        nightReviewCompleted,
        completeMorningPlanning,
        completeNightReview,
        saveWeeklyReview,
        history,
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
        switchFocusMode
      }}
    >
      {children}
    </TaskContext.Provider>
  );
}
