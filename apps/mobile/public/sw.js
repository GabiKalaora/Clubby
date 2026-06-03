// Clubby Web Push Service Worker
// Handles push notifications for web users

self.addEventListener('push', (event) => {
  if (!event.data) return

  let data = {}
  try {
    data = event.data.json()
  } catch {
    data = { title: 'Clubby', body: event.data.text() }
  }

  const options = {
    body: data.body ?? '',
    icon: '/icon.png',
    badge: '/badge.png',
    data: data.data ?? {},
    requireInteraction: false,
    tag: data.data?.benefitId ?? 'clubby-notification',
  }

  event.waitUntil(
    self.registration.showNotification(data.title ?? 'Clubby', options)
  )
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const benefitId = event.notification.data?.benefitId
  const url = benefitId
    ? `/redeem/${benefitId}`
    : '/'

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          client.navigate(url)
          return client.focus()
        }
      }
      if (clients.openWindow) return clients.openWindow(url)
    })
  )
})
