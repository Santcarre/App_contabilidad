// Este código se concatena al service worker generado por next-pwa (S6-03).
// Escucha el evento "sync" (Background Sync) y avisa a las pestañas
// abiertas para que procesen la cola offline (IndexedDB outbox).
self.addEventListener("sync", (event) => {
  if (event.tag === "contabilidad-outbox") {
    event.waitUntil(
      self.clients
        .matchAll({ type: "window", includeUncontrolled: true })
        .then((clients) => {
          clients.forEach((client) =>
            client.postMessage({ type: "OFFLINE_SYNC" })
          );
        })
    );
  }
});
