/**
 * Service to manage browser notifications and reminder alerts.
 */

export function requestNotificationPermission() {
  if (!("Notification" in window)) {
    console.log("This browser does not support desktop notification");
    return;
  }

  if (Notification.permission !== "granted" && Notification.permission !== "denied") {
    Notification.requestPermission().then((permission) => {
      console.log("Notification permission:", permission);
    });
  }
}

export function sendBrowserNotification(title, options = {}) {
  if (!("Notification" in window)) {
    console.warn("[Reminder System] Browser does not support native notifications.");
    return;
  }

  const send = () => {
    console.log(`[Reminder System] Attempting to display browser notification: "${title}"`);
    try {
      if ('serviceWorker' in navigator) {
        navigator.serviceWorker.getRegistration().then(registration => {
          if (registration) {
            console.log("[Reminder System] SW registration found, calling showNotification...");
            registration.showNotification(title, {
              body: options.body || "Task Reminder",
              icon: "/icon-192.png",
              actions: [
                { action: 'complete', title: '✔ Yes, Completed' },
                { action: 'reschedule', title: '❌ No, Reschedule' }
              ],
              data: options.data || {},
              requireInteraction: true,
              ...options
            }).then(() => {
              console.log("[Reminder System] showNotification succeeded.");
            }).catch(e => {
              console.error("[Reminder System] showNotification failed:", e);
              fallbackNotification();
            });
          } else {
            console.log("[Reminder System] No SW registration found, falling back to standard Notification.");
            fallbackNotification();
          }
        }).catch(err => {
          console.warn("[Reminder System] SW getRegistration failed:", err);
          fallbackNotification();
        });
      } else {
        console.log("[Reminder System] Service Worker not supported, using standard Notification.");
        fallbackNotification();
      }
    } catch (e) {
      console.error("[Reminder System] Failed to trigger native Notification:", e);
    }
  };

  const fallbackNotification = () => {
    try {
      // Filter out actions from options to prevent TypeError in standard Notification
      const safeOptions = { ...options };
      delete safeOptions.actions;
      delete safeOptions.requireInteraction; // Sometimes causes issues on non-SW notifications

      const n = new Notification(title, {
        body: safeOptions.body || "Task Reminder",
        icon: "/icon-192.png",
        ...safeOptions
      });
      n.onclick = (event) => {
        console.log("[Reminder System] Native Notification clicked (Fallback).");
        event.preventDefault();
        window.focus();
        n.close();
      };
      n.onshow = () => console.log("[Reminder System] Fallback Notification displayed.");
      n.onerror = (e) => console.error("[Reminder System] Fallback Notification error:", e);
      n.onclose = () => console.log("[Reminder System] Fallback Notification closed.");
    } catch (err) {
      console.error("[Reminder System] Fallback Notification creation failed:", err);
    }
  };

  if (Notification.permission === "granted") {
    send();
  } else if (Notification.permission === "default") {
    console.warn("[Reminder System] Notification permission is default. Requesting permission...");
    Notification.requestPermission().then((permission) => {
      if (permission === "granted") {
        send();
      } else {
        console.warn("[Reminder System] Notification permission denied by user.");
      }
    });
  } else {
    console.warn("[Reminder System] Notification permission is denied. Native notification suppressed.");
  }
}

/**
 * Checks all tasks for reminders.
 * Returns tasks that are due soon and need immediate interactive prompt.
 * 
 * Normal task: 10 minutes before.
 * High priority task: triggers hourly/more frequently, but here we can check if it's within 10 minutes of its due time.
 */
export function checkTaskReminders(tasks, notifiedTaskIds, onTriggerReminder) {
  const now = new Date();
  
  tasks.forEach((task) => {
    if (task.completed) return;
    
    const taskScheduleSignature = `${task.id}_${task.dueDate}_${task.dueTime || "12:00"}`;
    if (notifiedTaskIds.includes(taskScheduleSignature)) return;

    // Parse task due datetime
    try {
      const dueStr = `${task.dueDate}T${task.dueTime || "12:00"}`;
      const dueTime = new Date(dueStr);
      
      // Calculate minutes difference
      const diffMs = dueTime - now;
      const diffMins = diffMs / (1000 * 60);

      // Trigger reminder if task is due in less than 10 minutes and hasn't passed more than 5 minutes ago
      if (diffMins <= 10 && diffMins >= -5) {
        console.log(`[Reminder System] Triggering reminder for task: ${task.title} at ${dueStr}`);
        onTriggerReminder(task, taskScheduleSignature);
      }
    } catch (e) {
      console.error("Error parsing task date for reminder:", e);
    }
  });
}

/**
 * Checks all tasks for overdue reminders.
 * Returns tasks that have passed their due time and need an hourly overdue prompt.
 */
export function checkOverdueTaskReminders(tasks, getOverdueRecord, saveOverdueRecord, onTriggerReminder) {
  const now = new Date();
  
  tasks.forEach((task) => {
    if (task.completed) return;
    
    try {
      const dueStr = `${task.dueDate}T${task.dueTime || "12:00"}`;
      const dueTime = new Date(dueStr);
      
      // Calculate milliseconds difference
      const diffMs = now - dueTime;
      
      // If task is overdue (diffMs > 0)
      if (diffMs > 0) {
        const lastNotified = getOverdueRecord(task.id);
        
        // If never notified, or if 1 hour (3600000 ms) has passed since last notification
        if (!lastNotified || now.getTime() - lastNotified >= 3600000) {
          console.log(`[Reminder System] Triggering overdue reminder for task: ${task.title}`);
          onTriggerReminder(task);
          saveOverdueRecord(task.id, now.getTime());
        }
      }
    } catch (e) {
      console.error("Error parsing task date for overdue reminder:", e);
    }
  });
}
