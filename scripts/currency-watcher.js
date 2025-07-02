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

  const trackedCurrencies = new Map(); // For D&D 5e-style currencies
  const trackedZenit = new Map();      // For Fabula Ultima

  Hooks.on("updateActor", (actor, update) => {
    // === Handle D&D-style currency ===
    const newCurrency = foundry.utils.getProperty(actor.system, "currency");
    if (newCurrency) {
      const oldCurrency = trackedCurrencies.get(actor.id);

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
    }

    // === Handle Fabula Ultima "zenit" ===
    const newZenit = foundry.utils.getProperty(actor.system, "resources.zenit.value");
    if (typeof newZenit === "number") {
      const oldZenit = trackedZenit.get(actor.id);
      if (typeof oldZenit === "number" && newZenit !== oldZenit) {
        const delta = newZenit - oldZenit;
        const verb = delta > 0 ? "gained" : "lost";
        const amount = Math.abs(delta);

        const actorName =
          actor.name || actor.prototypeToken?.name || actor.data?.name || "Unknown";

        const text = `${actorName} ${verb} ${amount} zenit`;
        notifyCurrencyChange(text, "zenit", actor);
      }

      trackedZenit.set(actor.id, newZenit);
    }
  });

  // === Initialize caches ===
  for (const actor of game.actors) {
    if (!actor.hasPlayerOwner) continue;

    const currency = foundry.utils.getProperty(actor.system, "currency");
    if (currency) {
      trackedCurrencies.set(actor.id, foundry.utils.duplicate(currency));
    }

    const zenit = foundry.utils.getProperty(actor.system, "resources.zenit.value");
    if (typeof zenit === "number") {
      trackedZenit.set(actor.id, zenit);
    }
  }
});

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
