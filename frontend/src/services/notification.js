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
    return;
  }

  if (Notification.permission === "granted") {
    try {
      if ('serviceWorker' in navigator) {
        navigator.serviceWorker.getRegistration().then(registration => {
          if (registration) {
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
            });
          } else {
            new Notification(title, {
              body: options.body || "Task Reminder",
              icon: "/icon-192.png",
              requireInteraction: true,
              ...options
            });
          }
        }).catch(err => {
          console.warn("SW getRegistration failed:", err);
          new Notification(title, { body: options.body || "Task Reminder", requireInteraction: true, ...options });
        });
      } else {
        new Notification(title, {
          body: options.body || "Task Reminder",
          icon: "/icon-192.png",
          requireInteraction: true,
          ...options
        });
      }
    } catch (e) {
      console.warn("Failed to trigger native Notification:", e);
    }
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
