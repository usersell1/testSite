const CACHE_NAME = 'pwa-combined-example-cache-v1';
// רשימת הקבצים לשמירה ראשונית במטמון (ודא שכוללת את כל הנכסים החיוניים)
const urlsToCache = [
    '/',
    '/index.html',
    '/style.css', // למרות שהוטמע ב-HTML, עדיף ש-Service Worker יטפל בבקשה לדף הראשי
    '/script.js', // גם אם משולב, הניווט הראשי הוא ל-index.html
    '/manifest.json',
    '/icon-192.png',
    '/icon-512.png'
    // הוסף כאן נכסים נוספים שהאפליקציה שלך משתמשת בהם וחיוניים לאופליין
];

// התקנת ה-Service Worker ושמירת קבצים ראשונית במטמון
self.addEventListener('install', event => {
    console.log('Service Worker: Install event');
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => {
                console.log('Service Worker: Caching app shell');
                // חשוב: לוודא שהנתיבים כאן נכונים ביחס לשורש האתר שלך ב-GitHub Pages
                return cache.addAll(urlsToCache);
            })
            .catch(error => {
                console.error('Service Worker: Cache addAll failed:', error);
                // טיפול בשגיאה אם השמירה במטמון נכשלה (חשוב לדעת אם זה קורה)
            })
    );
});

// יירוט בקשות רשת והגשה מהמטמון עם פתרון גיבוי (fallback)
self.addEventListener('fetch', event => {
    // אסטרטגיית Cache, falling back to network
    event.respondWith(
        caches.match(event.request)
            .then(response => {
                // אם המשאב נמצא במטמון, מחזיר אותו מיד
                if (response) {
                    return response;
                }

                // אם המשאב לא נמצא במטמון, מנסה לבקש אותו מהרשת
                const fetchRequest = event.request.clone();

                return fetch(fetchRequest)
                    .then(networkResponse => {
                        // בודק שתגובת הרשת תקינה (סטטוס 200, סוג תגובה בסיסי)
                        if (!networkResponse || networkResponse.status !== 200 || networkResponse.type !== 'basic') {
                            return networkResponse;
                        }

                        // משכפל את התגובה כדי שנוכל להשתמש בה גם בדפדפן וגם לשמור במטמון
                        const responseToCache = networkResponse.clone();

                        caches.open(CACHE_NAME)
                            .then(cache => {
                                cache.put(event.request, responseToCache);
                            });

                        return networkResponse;
                    })
                    .catch(() => {
                        // *** זהו החלק הקריטי לטיפול בשגיאת 404 במצב אופליין/כשל רשת ***
                        // אם בקשת הרשת נכשלה (כי אין חיבור או שגיאה אחרת)
                        // ובקשת המקור היא בקשת ניווט (כלומר, המשתמש מנסה לגשת לדף HTML)
                        // נחזיר את קובץ ה-index.html מהמטמון כפתרון גיבוי.
                        if (event.request.mode === 'navigate') {
                             console.log('Service Worker: Fetch failed for navigation request, serving index.html from cache');
                             return caches.match('/index.html'); // או הנתיב המדויק לדף הראשי אם הוא שונה
                        }

                         // עבור בקשות שאינן ניווט (CSS, JS, תמונות וכו') שנכשלו ואינן במטמון,
                         // ניתן להחזיר תשובת שגיאה ריקה או קובץ חלופי (למשל, תמונת Placeholder)
                         console.log('Service Worker: Fetch failed for non-navigation request and no cache match', event.request.url);
                         // ניתן להוסיף כאן return caches.match('/offline-image.png') לדוגמה עבור תמונות
                         // או להחזיר Promise.reject()
                    });
            })
    );
});

// מחיקת מטמון ישן (כאשר מופעלת גרסה חדשה של ה-SW)
self.addEventListener('activate', event => {
    console.log('Service Worker: Activate event');
    const cacheWhitelist = [CACHE_NAME];
    event.waitUntil(
        caches.keys().then(cacheNames => {
            return Promise.all(
                cacheNames.map(cacheName => {
                    if (cacheWhitelist.indexOf(cacheName) === -1) {
                        console.log('Service Worker: Deleting old cache', cacheName);
                        return caches.delete(cacheName);
                    }
                })
            );
        })
    );
});
