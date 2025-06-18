Hooks.once("socketlib.ready", () => {
  const socket = socketlib.registerModule("currency-tracker");
  socket.register("notifyCurrencyChange", notifyCurrencyChange);
});

Hooks.once("ready", () => {
  if (!document.querySelector(".statusbox")) {
    const container = document.createElement("div");
    container.classList.add("statusbox");
    document.body.appendChild(container);
  }

  const trackedCurrencies = new Map();

  Hooks.on("updateActor", (actor, update) => {
    const oldCurrency = trackedCurrencies.get(actor.id);
    const newCurrency = foundry.utils.getProperty(actor.system, "currency");

    if (!newCurrency) return;

    if (oldCurrency) {
      for (const [denom, newValue] of Object.entries(newCurrency)) {
        const oldValue = oldCurrency[denom] ?? 0;
        const delta = newValue - oldValue;
        if (delta !== 0) {
          const verb = delta > 0 ? "Gained" : "Lost";
          const amount = Math.abs(delta);
          const text = `${verb} ${amount} ${denom}`;
          const cssClass = denom.toLowerCase();
          notifyCurrencyChange(text, cssClass);
        }
      }
    }

    trackedCurrencies.set(actor.id, foundry.utils.duplicate(newCurrency));
  });

  for (const actor of game.actors) {
    if (actor.hasPlayerOwner && actor.system?.currency) {
      trackedCurrencies.set(actor.id, foundry.utils.duplicate(actor.system.currency));
    }
  }
});

/* === CHANGES ===
  - Show .statusbox container only when a notification is present
  - Hide .statusbox container when last notification is removed
  - Notification container moves 50px lower via CSS (top: 70px)
*/
function notifyCurrencyChange(text, cssClass = "") {
  const container = document.querySelector(".statusbox");
  if (!container) return;

  // Show container if hidden (added)
  if (!container.classList.contains("show")) {
    container.classList.add("show");
  }

  const toast = document.createElement("div");
  toast.classList.add("currency-toast");
  if (cssClass) toast.classList.add(cssClass);
  toast.textContent = text;

  container.appendChild(toast);

  void toast.offsetWidth;  // Force reflow for animation

  toast.classList.add("show");

  setTimeout(() => {
    toast.classList.add("hide");
    setTimeout(() => {
      toast.remove();

      // Hide container if no more toasts (added)
      if (container.children.length === 0) {
        container.classList.remove("show");
      }
    }, 500);
  }, 3000);
}
