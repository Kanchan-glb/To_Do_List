import { createContext, useContext, useState, useEffect, useRef } from "react";
import { format, isToday, isYesterday, differenceInDays, addHours } from "date-fns";

const TaskContext = createContext();

export function useTasks() {
  return useContext(TaskContext);
}

export function TaskProvider({ children }) {
  // Load initial tasks
  const [tasks, setTasks] = useState(() => {
    const stored = localStorage.getItem("smartTasks");
    return stored ? JSON.parse(stored) : [];
  });

  // API Key & User preferences
  const [geminiApiKey, setGeminiApiKey] = useState(() => {
    return localStorage.getItem("smartGeminiKey") || "";
  });

  const [streak, setStreak] = useState(() => {
    return parseInt(localStorage.getItem("smartStreak") || "1", 10);
  });

  const [lastActiveDate, setLastActiveDate] = useState(() => {
    return localStorage.getItem("smartLastActiveDate") || format(new Date(), "yyyy-MM-dd");
  });

  // Morning & Night planning status
  const [morningPlannerCompleted, setMorningPlannerCompleted] = useState(() => {
    const completedDay = localStorage.getItem("smartMorningDay");
    return completedDay === format(new Date(), "yyyy-MM-dd");
  });

  const [nightReviewCompleted, setNightReviewCompleted] = useState(() => {
    const completedDay = localStorage.getItem("smartNightDay");
    return completedDay === format(new Date(), "yyyy-MM-dd");
  });

  // Productivity history & reviews
  const [history, setHistory] = useState(() => {
    const stored = localStorage.getItem("smartHistory");
    return stored ? JSON.parse(stored) : [];
  });

  // Pomodoro Focus Timer State
  const [focusTimeLeft, setFocusTimeLeft] = useState(1500); // 25 minutes standard
  const [isFocusRunning, setIsFocusRunning] = useState(false);
  const [focusMode, setFocusMode] = useState("work"); // work, shortBreak, longBreak
  const [focusStats, setFocusStats] = useState(() => {
    const stored = localStorage.getItem("smartFocusStats");
    return stored ? JSON.parse(stored) : { workMinutes: 0, completedSessions: 0 };
  });

  const timerRef = useRef(null);

  // Persistence triggers
  useEffect(() => {
    localStorage.setItem("smartTasks", JSON.stringify(tasks));
  }, [tasks]);

  useEffect(() => {
    localStorage.setItem("smartGeminiKey", geminiApiKey);
  }, [geminiApiKey]);

  useEffect(() => {
    localStorage.setItem("smartHistory", JSON.stringify(history));
  }, [history]);

  useEffect(() => {
    localStorage.setItem("smartFocusStats", JSON.stringify(focusStats));
  }, [focusStats]);

  // Request Notification Permissions
  useEffect(() => {
    if ("Notification" in window && Notification.permission !== "denied") {
      Notification.requestPermission();
    }
  }, []);

  // System Notification Reminders for Tasks (Handled globally in App.jsx via GlobalReminderEngine)
  // Cleaned up duplicate state here.


  // Handle Streak & Daily resets on mount
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

      setStreak(nextStreak);
      localStorage.setItem("smartStreak", nextStreak.toString());
      setLastActiveDate(todayStr);
      localStorage.setItem("smartLastActiveDate", todayStr);

      setMorningPlannerCompleted(false);
      setNightReviewCompleted(false);
    }
  }, [lastActiveDate, streak]);

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
    localStorage.setItem("smartMorningDay", todayStr);
  };

  // Mark Night Review Done
  const completeNightReview = (summaryData) => {
    const todayStr = format(new Date(), "yyyy-MM-dd");
    setNightReviewCompleted(true);
    localStorage.setItem("smartNightDay", todayStr);

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
