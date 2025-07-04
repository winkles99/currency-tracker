Hooks.once("socketlib.ready", () => {
  const socket = socketlib.registerModule("currency-tracker");
  socket.register("notifyCurrencyChange", notifyCurrencyChange);
});

Hooks.once("ready", () => {
  // Create container only once
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
          const verb = delta > 0 ? "gained" : "lost";
          const amount = Math.abs(delta);

          const actorName =
            actor.name || actor.prototypeToken?.name || actor.data?.name || "Unknown";

          const text = `${actorName} ${verb} ${amount} ${denom}`;
          const cssClass = denom.toLowerCase();

          notifyCurrencyChange(text, cssClass, actor);
        }
      }
    }

    trackedCurrencies.set(actor.id, foundry.utils.duplicate(newCurrency));
  });

  // Initialize cache of existing actor currencies
  for (const actor of game.actors) {
    if (actor.hasPlayerOwner && actor.system?.currency) {
      trackedCurrencies.set(actor.id, foundry.utils.duplicate(actor.system.currency));
    }
  }
});

// === Updated notify function with chat + whisper support ===
function notifyCurrencyChange(text, cssClass = "", actor = null) {
  const container = document.querySelector(".statusbox");
  if (!container) return;

  // === UI Toast ===
  container.classList.add("show");

  const toast = document.createElement("div");
  toast.classList.add("currency-toast");
  if (cssClass) toast.classList.add(cssClass);
  toast.textContent = text;

  container.appendChild(toast);
  void toast.offsetWidth;

  toast.classList.add("show");

  setTimeout(() => {
    toast.classList.add("hide");
    setTimeout(() => {
      toast.remove();
      if (container.children.length === 0) {
        container.classList.remove("show");
      }
    }, 500);
  }, 3000);

  // === Chat Message ===
  const recipients = actor
    ? game.users.filter((u) => actor.testUserPermission(u, "OWNER")).map((u) => u.id)
    : [];

  ChatMessage.create({
    content: `<span class="currency-chat ${cssClass}">${text}</span>`,
    whisper: recipients
  });
}
