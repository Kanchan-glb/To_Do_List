import { precacheAndRoute } from 'workbox-precaching';
import { clientsClaim } from 'workbox-core';

// Precaching automatically injected by vite-plugin-pwa
precacheAndRoute(self.__WB_MANIFEST || []);

// Claim any clients immediately
self.skipWaiting();
clientsClaim();

// Handle interaction with the native OS notification
self.addEventListener('notificationclick', (event) => {
  const notification = event.notification;
  const action = event.action;
  const data = notification.data || {};
  
  notification.close();

  // Focus the window or open a new one
  const urlToOpen = new URL('/', self.location.origin).href;

  const promiseChain = clients.matchAll({
    type: 'window',
    includeUncontrolled: true
  }).then((windowClients) => {
    let matchingClient = null;
    
    for (let i = 0; i < windowClients.length; i++) {
      const windowClient = windowClients[i];
      if (windowClient.url.includes(self.location.origin)) {
        matchingClient = windowClient;
        break;
      }
    }

    if (matchingClient) {
      // Focus existing window
      matchingClient.focus();
      
      // Fallback: Also send via client.postMessage directly
      if (action) {
        matchingClient.postMessage({
          type: 'NOTIFICATION_ACTION',
          action: action,
          taskId: data.taskId
        });
      }
    } else {
      // Open new window
      clients.openWindow(urlToOpen).then(newClient => {
        if (newClient && action) {
          setTimeout(() => {
            newClient.postMessage({
              type: 'NOTIFICATION_ACTION',
              action: action,
              taskId: data.taskId
            });
          }, 3000);
        }
      });
    }

    // Always send action via BroadcastChannel
    if (action) {
      const bc = new BroadcastChannel('smart-task-channel');
      bc.postMessage({
        type: 'NOTIFICATION_ACTION',
        action: action,
        taskId: data.taskId
      });
      // Do not close bc immediately to prevent race conditions
      setTimeout(() => bc.close(), 1000);
    }
  });

  event.waitUntil(promiseChain);
});
