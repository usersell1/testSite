const CACHE_NAME = 'pwa-combined-example-cache-v1';
// רשימת הקבצים לשמירה ראשונית במטמון
const urlsToCache = [
    '/',
    '/index.html', // שם הקובץ הראשי
    '/manifest.json',
    '/icon-192.png', // הוסף גם את האייקונים לרשימת המטמון
    '/icon-512.png'
    // אם היו לך קבצי CSS/JS חיצוניים, גם אותם היית מוסיף לכאן
];

// התקנת ה-Service Worker ושמירת קבצים ראשונית במטמון
self.addEventListener('install', event => {
    console.log('Service Worker: Install event');
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => {
                console.log('Service Worker: Caching app shell');
                // ודא שכל הנתיבים ברשימה נכונים ונגישים
                return cache.addAll(urlsToCache.map(url => new Request(url, { cache: 'reload' }))); // הוספנו cache: 'reload' כדי למנוע בעיות מטמון בפיתוח
            })
            .catch(error => {
                console.error('Service Worker: Cache addAll failed:', error);
            })
    );
});

// יירוט בקשות רשת והגשה מהמטמון אם זמין
self.addEventListener('fetch', event => {
    // console.log('Service Worker: Fetching', event.request.url);
    event.respondWith(
        caches.match(event.request)
            .then(response => {
                // מחזיר מהמטמון אם נמצא
                if (response) {
                    // console.log('Service Worker: Found in cache', event.request.url);
                    return response;
                }
                // אם לא נמצא במטמון, מנסה לבקש מהרשת
                // console.log('Service Worker: Not in cache, fetching from network', event.request.url);
                return fetch(event.request)
                    .then(networkResponse => {
                        // אם הבקשה הצליחה, שומר את התשובה במטמון לשימוש עתידי
                        if (networkResponse && networkResponse.status === 200 && networkResponse.type === 'basic') {
                            const responseToCache = networkResponse.clone();
                            caches.open(CACHE_NAME)
                                .then(cache => {
                                    cache.put(event.request, responseToCache);
                                });
                        }
                        return networkResponse;
                    })
                    .catch(() => {
                         // אם הבקשה נכשלה (אופליין ואין במטמון), ניתן להציג דף אופליין חלופי
                         console.log('Service Worker: Fetch failed and no cache match for', event.request.url);
                         // כאן אפשר להוסיף לוגיקה להצגת דף אופליין גנרי אם הבקשה היא לדף HTML
                         // לדוגמה: return caches.match('/offline.html');
                    });
            })
    );
});


// מחיקת מטמון ישן (כאשר מופעלת גרסה חדשה של ה-SW)
self.addEventListener('activate', event => {
    console.log('Service Worker: Activate event');
    const cacheWhitelist = [CACHE_NAME]; // שם המטמון הנוכחי
    event.waitUntil(
        caches.keys().then(cacheNames => {
            return Promise.all(
                cacheNames.map(cacheName => {
                    // מוחק מטמון שאינו ברשימת ה-whitelist
                    if (cacheWhitelist.indexOf(cacheName) === -1) {
                        console.log('Service Worker: Deleting old cache', cacheName);
                        return caches.delete(cacheName);
                    }
                })
            );
        })
    );
});