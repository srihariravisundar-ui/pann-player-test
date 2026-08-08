// sw.js - Required for PWA Installation
self.addEventListener('install', (e) => {
    console.log('[Service Worker] Install');
});

// A simple fetch listener satisfies the PWA requirements for Chrome/Android
self.addEventListener('fetch', (e) => {
    // We are letting the browser handle fetches normally, 
    // but this listener must exist for the app to be installable.
});
