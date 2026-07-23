import { createContext, useContext, useState, useEffect, useRef } from "react";
import { format, isToday, isYesterday, differenceInDays, addHours, subDays } from "date-fns";
import { calculateDefaultDueTime } from "../utils/taskUtils";

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

  const formatCategory = (cat) => {
    if (!cat) return "General";
    return cat
      .split(/[\s_]+/)
      .map(word => word ? word.charAt(0).toUpperCase() + word.slice(1).toLowerCase() : "")
      .join('');
  };

  // Load initial tasks
  const [tasks, setTasks] = useState(() => {
    const loadedTasks = getScopedData("smartTasks", [], true);
    return loadedTasks.map(task => ({
      ...task,
      category: formatCategory(task.category)
    }));
  });
  const [geminiApiKey, setGeminiApiKey] = useState(() => getScopedData("smartGeminiKey", ""));
  const [streak, setStreak] = useState(0);
  const [longestStreak, setLongestStreak] = useState(() => parseInt(getScopedData("smartLongestStreak", "0"), 10));
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

  const [pomodoroSettings, setPomodoroSettings] = useState(() => getScopedData("smartPomodoroSettings", {
    work: 25,
    shortBreak: 5,
    longBreak: 15
  }, true));

  useEffect(() => {
    localStorage.setItem(`smartPomodoroSettings_${userEmail}`, JSON.stringify(pomodoroSettings));
  }, [pomodoroSettings, userEmail]);

  // Pomodoro Focus Timer State
  const [pomodoroState, setPomodoroState] = useState(() => {
    const defaultSettings = getScopedData("smartPomodoroSettings", { work: 25, shortBreak: 5, longBreak: 15 }, true);
    return getScopedData("smartPomodoroState", {
      focusMode: "work",
      focusTimeLeft: defaultSettings.work * 60,
      isFocusRunning: false,
      targetTime: null
    }, true);
  });

  const focusTimeLeft = pomodoroState.focusTimeLeft;
  const isFocusRunning = pomodoroState.isFocusRunning;
  const focusMode = pomodoroState.focusMode;

  const [focusStats, setFocusStats] = useState(() => getScopedData("smartFocusStats", { workMinutes: 0, completedSessions: 0 }, true));

  // Persist Pomodoro State
  useEffect(() => {
    localStorage.setItem(`smartPomodoroState_${userEmail}`, JSON.stringify(pomodoroState));
  }, [pomodoroState, userEmail]);

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


  // Dynamic Streak & Longest Streak Calculation from Completed Task Dates
  useEffect(() => {
    const completedTasks = tasks.filter(t => t.completed && t.completedDate);
    const uniqueDates = [...new Set(completedTasks.map(t => t.completedDate))];
    const sortedDates = uniqueDates.sort();

    if (sortedDates.length === 0) {
      setStreak(0);
      setLongestStreak(0);
      localStorage.setItem(`smartStreak_${userEmail}`, "0");
      localStorage.setItem(`smartLongestStreak_${userEmail}`, "0");
      return;
    }

    // Calculate maximum consecutive streak in history
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

    // Calculate active streak ending today or yesterday
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
    localStorage.setItem(`smartStreak_${userEmail}`, currentStreak.toString());
    localStorage.setItem(`smartLongestStreak_${userEmail}`, finalLongest.toString());
  }, [tasks, userEmail]);

  // Handle Daily resets & Auto-History logs
  useEffect(() => {
    const todayStr = format(new Date(), "yyyy-MM-dd");
    if (lastActiveDate !== todayStr) {
      // Automatically save history for the lastActiveDate
      let completedCount = 0, pendingCount = 0, overdueCount = 0, totalCount = 0, rescheduledCount = 0;

      tasks.forEach(t => {
        const taskDue = t.dueDate || t.createdDate || "2099-01-01";
        const isCompletedOnOrBefore = t.completed && t.completedDate && t.completedDate <= lastActiveDate;
        const isCompletedOnDay = t.completed && t.completedDate === lastActiveDate;
        const isDueOnDay = taskDue === lastActiveDate;
        const isCarryForward = taskDue < lastActiveDate && (!isCompletedOnOrBefore || isCompletedOnDay);

        if (isDueOnDay || isCarryForward) {
          totalCount++;
          if (isCompletedOnDay) {
            completedCount++;
          } else if (taskDue < lastActiveDate) {
            overdueCount++;
          } else {
            pendingCount++;
          }
        }

        if (t.rescheduleHistory?.some(h => h.rescheduledAtDate === lastActiveDate)) {
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
      localStorage.setItem(`smartLastActiveDate_${userEmail}`, todayStr);

      setMorningPlannerCompleted(false);
      setNightReviewCompleted(false);
    }
  }, [lastActiveDate, streak, tasks, userEmail]);

  // Pomodoro timer tick logic
  useEffect(() => {
    // If we just loaded and it's supposedly running, check if it expired while away
    if (pomodoroState.isFocusRunning && pomodoroState.targetTime) {
      const remaining = Math.round((pomodoroState.targetTime - Date.now()) / 1000);
      if (remaining <= 0) {
         setIsFocusRunning(false); // We need to define this helper for handleFocusTimerComplete backwards compatibility
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
      category: formatCategory(taskData.category),
      priority: taskData.priority || "Medium",
      dueDate: taskData.dueDate || format(new Date(), "yyyy-MM-dd"),
      dueTime: taskData.dueTime || calculateDefaultDueTime(formatCategory(taskData.category)),
      completed: false,
      subtasks: taskData.subtasks || [],
      rescheduleCount: 0,
      rescheduleHistory: [],
      createdDate: format(new Date(), "yyyy-MM-dd"),
      createdTime: format(new Date(), "HH:mm:ss"),
      // Extra Voice / Offline Extracted Details
      startTime: taskData.startTime || null,
      endTime: taskData.endTime || null,
      reminder: taskData.reminder || null,
      person: taskData.person || null,
      location: taskData.location || null,
      tags: taskData.tags || [],
      recurrence: taskData.recurrence || null,
      notes: taskData.notes || null,
      originalTranscript: taskData.originalTranscript || null,
      translatedTranscript: taskData.translatedTranscript || null
    };

    console.log(`[Reminder System] Reminder scheduled for task: "${newTask.title}" at ${newTask.dueDate} ${newTask.dueTime}`);
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
          let rescheduleUpdates = {};
          if ((updatedData.dueDate && updatedData.dueDate !== t.dueDate) ||
            (updatedData.dueTime && updatedData.dueTime !== t.dueTime)) {
            const historyItem = {
              previousDate: t.dueDate,
              previousTime: t.dueTime,
              newDate: updatedData.dueDate || t.dueDate,
              newTime: updatedData.dueTime || t.dueTime,
              rescheduledAtDate: format(new Date(), "yyyy-MM-dd"),
              rescheduledAtTime: format(new Date(), "HH:mm:ss")
            };
            rescheduleUpdates = {
              rescheduleCount: (t.rescheduleCount || 0) + 1,
              rescheduleHistory: [...(t.rescheduleHistory || []), historyItem]
            };
          }

          const newTask = { ...t, ...updatedData, ...rescheduleUpdates };
          if (updatedData.category) {
            newTask.category = formatCategory(updatedData.category);
          }
          if (updatedData.completed !== undefined && updatedData.completed !== t.completed) {
            newTask.completedDate = updatedData.completed ? format(new Date(), "yyyy-MM-dd") : null;
            newTask.completedAt = updatedData.completed ? new Date().toISOString() : null;
            if (updatedData.completed) {
              console.log(`[Reminder System] Reminder cancelled for completed task: "${t.title}"`);
            }
          }
          if (updatedData.dueDate || updatedData.dueTime) {
            console.log(`[Reminder System] Reminder rescheduled for task: "${t.title}" to ${newTask.dueDate} ${newTask.dueTime}`);
          }
          return newTask;
        }
        return t;
      })
    );
  };


  const deleteTask = (taskId) => {
    setTasks((prev) => {
      const taskToDelete = prev.find(t => t.id === taskId);
      if (taskToDelete && !taskToDelete.completed) {
        console.log(`[Reminder System] Reminder cancelled for deleted task: "${taskToDelete.title}"`);
      }
      return prev.filter((t) => t.id !== taskId);
    });
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
          let newCompletedAt = t.completedAt;
          if (isNowCompleted && !t.completed) {
            newCompletedDate = format(new Date(), "yyyy-MM-dd");
            newCompletedAt = new Date().toISOString();
            console.log(`[Reminder System] Reminder cancelled for completed task: "${t.title}"`);
          } else if (!isNowCompleted && t.completed) {
            newCompletedDate = null;
            newCompletedAt = null;
          }

          return {
            ...t,
            subtasks: updatedSubtasks,
            completed: isNowCompleted,
            completedDate: newCompletedDate,
            completedAt: newCompletedAt
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
          console.log(`[Reminder System] Reminder rescheduled for task: "${t.title}" to ${newDate} ${newTime || t.dueTime}`);

          const historyItem = {
            previousDate: t.dueDate,
            previousTime: t.dueTime,
            newDate: newDate,
            newTime: newTime || t.dueTime,
            rescheduledAtDate: format(new Date(), "yyyy-MM-dd"),
            rescheduledAtTime: format(new Date(), "HH:mm:ss")
          };

          return {
            ...t,
            dueDate: newDate,
            dueTime: newTime || t.dueTime,
            rescheduleCount: (t.rescheduleCount || 0) + 1,
            rescheduleHistory: [...(t.rescheduleHistory || []), historyItem]
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
        longestStreak,
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
