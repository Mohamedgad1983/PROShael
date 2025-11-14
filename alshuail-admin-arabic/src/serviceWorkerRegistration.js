// Service Worker Registration with Update Detection
// src/serviceWorkerRegistration.js
import { logger } from './utils/logger';


export function register() {
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      const swUrl = `${process.env.PUBLIC_URL}/service-worker.js`;

      navigator.serviceWorker
        .register(swUrl)
        .then((registration) => {
          logger.debug('[SW] Registered successfully:', { scope: registration.scope });

          // Check for updates periodically
          setInterval(() => {
            registration.update();
          }, 60 * 60 * 1000); // Check every hour

          registration.onupdatefound = () => {
            const installingWorker = registration.installing;

            if (installingWorker) {
              installingWorker.onstatechange = () => {
                if (installingWorker.state === 'installed') {
                  if (navigator.serviceWorker.controller) {
                    logger.debug('[SW] New content available, please refresh');

                    // Show update notification
                    if (window.confirm('تحديث جديد متاح. هل تريد تحديث التطبيق؟')) {
                      installingWorker.postMessage({ action: 'skipWaiting' });
                      window.location.reload();
                    }
                  } else {
                    logger.debug('[SW] Content cached for offline use');
                  }
                }
              };
            }
          };
        })
        .catch((error) => {
          logger.error('[SW] Registration failed:', { error });
        });

      // Handle controller change
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        window.location.reload();
      });
    });
  }
}

export function unregister() {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.ready
      .then((registration) => {
        registration.unregister();
      })
      .catch((error) => {
        logger.error(error.message);
      });
  }
}
