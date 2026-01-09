/**
 * Service Worker registration and management
 */

export interface ServiceWorkerStatus {
  registered: boolean;
  active: boolean;
  error?: string;
}

/**
 * Register service worker
 */
export async function registerServiceWorker(): Promise<ServiceWorkerStatus> {
  if (!('serviceWorker' in navigator)) {
    return {
      registered: false,
      active: false,
      error: 'Service workers not supported',
    };
  }

  // Only register in production
  if (process.env.NODE_ENV !== 'production') {
    console.log('[SW] Skipping registration in development');
    return {
      registered: false,
      active: false,
      error: 'Development mode',
    };
  }

  try {
    const registration = await navigator.serviceWorker.register('/service-worker.js', {
      scope: '/',
    });

    console.log('[SW] Service worker registered:', registration);

    // Wait for service worker to become active
    if (registration.active) {
      return {
        registered: true,
        active: true,
      };
    }

    // Wait for activation
    await new Promise<void>((resolve) => {
      if (registration.installing) {
        registration.installing.addEventListener('statechange', (e: Event) => {
          const sw = e.target as ServiceWorker;
          if (sw.state === 'activated') {
            resolve();
          }
        });
      } else {
        resolve();
      }
    });

    return {
      registered: true,
      active: true,
    };
  } catch (error) {
    console.error('[SW] Registration failed:', error);
    return {
      registered: false,
      active: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Unregister service worker
 */
export async function unregisterServiceWorker(): Promise<boolean> {
  if (!('serviceWorker' in navigator)) {
    return false;
  }

  try {
    const registration = await navigator.serviceWorker.getRegistration();
    if (registration) {
      await registration.unregister();
      console.log('[SW] Service worker unregistered');
      return true;
    }
    return false;
  } catch (error) {
    console.error('[SW] Unregistration failed:', error);
    return false;
  }
}

/**
 * Clear all caches
 */
export async function clearCaches(): Promise<boolean> {
  if (!('serviceWorker' in navigator)) {
    return false;
  }

  try {
    const registration = await navigator.serviceWorker.getRegistration();
    if (registration?.active) {
      const messageChannel = new MessageChannel();
      
      return new Promise((resolve) => {
        messageChannel.port1.onmessage = (event) => {
          resolve(event.data.success);
        };

        registration.active.postMessage(
          { type: 'CLEAR_CACHE' },
          [messageChannel.port2]
        );
      });
    }
    return false;
  } catch (error) {
    console.error('[SW] Cache clear failed:', error);
    return false;
  }
}

/**
 * Get cache size
 */
export async function getCacheSize(): Promise<number> {
  if (!('serviceWorker' in navigator)) {
    return 0;
  }

  try {
    const registration = await navigator.serviceWorker.getRegistration();
    if (registration?.active) {
      const messageChannel = new MessageChannel();
      
      return new Promise((resolve) => {
        messageChannel.port1.onmessage = (event) => {
          resolve(event.data.size);
        };

        registration.active.postMessage(
          { type: 'GET_CACHE_SIZE' },
          [messageChannel.port2]
        );
      });
    }
    return 0;
  } catch (error) {
    console.error('[SW] Cache size check failed:', error);
    return 0;
  }
}

/**
 * Check if service worker is active
 */
export async function isServiceWorkerActive(): Promise<boolean> {
  if (!('serviceWorker' in navigator)) {
    return false;
  }

  try {
    const registration = await navigator.serviceWorker.getRegistration();
    return !!registration?.active;
  } catch (error) {
    return false;
  }
}
