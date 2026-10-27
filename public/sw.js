/* IronLog — service worker
 * Só cuida de notificações (Web Push e cliques). Não faz cache de páginas ou assets,
 * para nunca servir uma versão antiga do app. */

self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

async function visibleClients() {
  const wins = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
  return wins.filter((w) => w.visibilityState === "visible");
}

self.addEventListener("push", (event) => {
  let payload = {};
  try {
    payload = event.data ? event.data.json() : {};
  } catch {
    payload = { body: event.data ? event.data.text() : "" };
  }
  const title = payload.title || "Descanso finalizado";
  const body = payload.body || "Bora para a próxima série!";
  const url = payload.url || "/treino";

  event.waitUntil(
    (async () => {
      // Com o app visível, o cronômetro na tela já avisou (som/vibração): só repassa a mensagem.
      const visible = await visibleClients();
      if (visible.length > 0 && !/teste/i.test(title)) {
        visible.forEach((c) => c.postMessage({ type: "rest-finished", token: payload.token || null }));
        return;
      }
      await self.registration.showNotification(title, {
        body,
        tag: payload.tag || "ironlog-rest",
        renotify: true,
        icon: "/icon-192.png",
        badge: "/badge-96.png",
        vibrate: [200, 100, 200, 100, 300],
        timestamp: Date.now(),
        data: { url },
      });
    })(),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = (event.notification.data && event.notification.data.url) || "/treino";
  event.waitUntil(
    (async () => {
      const wins = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
      const existing = wins.find((w) => "focus" in w);
      if (existing) {
        await existing.focus();
        if ("navigate" in existing && !existing.url.endsWith(url)) {
          try {
            await existing.navigate(url);
          } catch {
            /* navegação bloqueada: manter a janela como está */
          }
        }
        return;
      }
      await self.clients.openWindow(url);
    })(),
  );
});
