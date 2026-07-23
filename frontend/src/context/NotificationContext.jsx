import { createContext, useContext, useState, useEffect, useCallback, useRef } from "react";
import { useTasks } from "./TaskContext";
import { isBefore, addMinutes, isAfter, parseISO, differenceInMinutes, parse } from "date-fns";

const NotificationContext = createContext();

export function useNotification() {
  return useContext(NotificationContext);
}

export function NotificationProvider({ children }) {
  const { tasks } = useTasks();
  const userEmail = localStorage.getItem("smartEmail") || "guest";

  const getStorageKey = (key) => `${key}_${userEmail}`;

  const [notifications, setNotifications] = useState(() => {
    const stored = localStorage.getItem(getStorageKey("smartNotifications"));
    return stored ? JSON.parse(stored) : [];
  });

  const [notifiedEvents, setNotifiedEvents] = useState(() => {
    const stored = localStorage.getItem(getStorageKey("smartNotifiedEvents"));
    return stored ? JSON.parse(stored) : [];
  });

  // Persist notifications
  useEffect(() => {
    localStorage.setItem(getStorageKey("smartNotifications"), JSON.stringify(notifications));
  }, [notifications, userEmail]);

  // Persist notified events
  useEffect(() => {
    localStorage.setItem(getStorageKey("smartNotifiedEvents"), JSON.stringify(notifiedEvents));
  }, [notifiedEvents, userEmail]);

  const addNotification = useCallback((notification) => {
    setNotifications(prev => [
      {
        id: Date.now().toString() + Math.random().toString(36).substr(2, 5),
        createdAt: new Date().toISOString(),
        read: false,
        ...notification
      },
      ...prev
    ]);
  }, []);

  const addOrUpdateOverdueNotification = useCallback((task) => {
    setNotifications(prev => {
      const existingIdx = prev.findIndex(n => n.type === 'overdue' && n.taskId === task.id);
      const newTimestamp = new Date().toISOString();
      if (existingIdx !== -1) {
        // Update existing notification, move it to the top, mark unread
        const existing = prev[existingIdx];
        const updated = { ...existing, createdAt: newTimestamp, read: false, dueDate: task.dueDate, dueTime: task.dueTime, title: task.title || task.text };
        const newArr = [...prev];
        newArr.splice(existingIdx, 1);
        return [updated, ...newArr];
      } else {
        // Create new one
        return [
          {
            id: Date.now().toString() + Math.random().toString(36).substr(2, 5),
            createdAt: newTimestamp,
            read: false,
            type: "overdue",
            title: task.text || task.title || "Untitled Task",
            taskId: task.id,
            dueDate: task.dueDate,
            dueTime: task.dueTime
          },
          ...prev
        ];
      }
    });
  }, []);

  const markAllAsRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  };

  const clearAll = () => {
    setNotifications([]);
  };

  const deleteNotification = (id) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  const unreadCount = notifications.filter(n => !n.read).length;

  // Background Engine
  const lastCheck = useRef(new Date());

  useEffect(() => {
    const checkTasks = () => {
      const now = new Date();
      const newNotifiedEvents = [...notifiedEvents];
      let hasChanges = false;

      tasks.forEach(task => {
        if (task.completed) return;
        
        if (task.dueDate && task.dueTime) {
          // Parse "yyyy-MM-dd" and "HH:mm"
          const dateTimeStr = `${task.dueDate} ${task.dueTime}`;
          let taskDateTime;
          try {
             taskDateTime = parse(dateTimeStr, "yyyy-MM-dd HH:mm", new Date());
          } catch(e) {
            return;
          }

          const diffMins = differenceInMinutes(taskDateTime, now);

          // Due soon check (within 10 mins)
          const dueSoonKey = `duesoon_${task.id}`;
          if (diffMins >= 0 && diffMins <= 10 && !newNotifiedEvents.includes(dueSoonKey)) {
            addNotification({
              type: "due_soon",
              title: task.text || task.title || "Untitled Task",
              taskId: task.id,
              dueDate: task.dueDate,
              dueTime: task.dueTime,
              minutesLeft: diffMins
            });
            newNotifiedEvents.push(dueSoonKey);
            hasChanges = true;
          }
        }
      });

      if (hasChanges) {
        setNotifiedEvents(newNotifiedEvents);
      }
      lastCheck.current = now;
    };

    // Run check immediately and then every minute
    checkTasks();
    const interval = setInterval(checkTasks, 60000);

    return () => clearInterval(interval);
  }, [tasks, notifiedEvents, addNotification]);

  return (
    <NotificationContext.Provider value={{
      notifications,
      unreadCount,
      markAllAsRead,
      clearAll,
      deleteNotification,
      addNotification,
      addOrUpdateOverdueNotification
    }}>
      {children}
    </NotificationContext.Provider>
  );
}
