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

    // ==== PF2E CURRENCY EXTRACTION ====
    let newCurrency = null;

    // PF2e current design: actor.system.inventory.currency
    if (actor.system?.inventory?.currency) {
      newCurrency = foundry.utils.duplicate(actor.system.inventory.currency);
    }
    // Fallback for custom systems
    else if (actor.system?.currency && typeof actor.system.currency === "object") {
      newCurrency = foundry.utils.duplicate(actor.system.currency);
    }

    if (!newCurrency) return;

    const oldCurrency = trackedCurrencies.get(actor.id);

    if (oldCurrency) {
      for (const [denom, newValue] of Object.entries(newCurrency)) {
        const oldValue = oldCurrency[denom] ?? 0;
        const delta = newValue - oldValue;

        if (delta !== 0) {
          const verb = delta > 0 ? "gained" : "lost";
          const amount = Math.abs(delta);

          const actorName =
            actor.name ||
            actor.prototypeToken?.name ||
            actor.data?.name ||
            "Unknown";

          const text = `${actorName} ${verb} ${amount} ${denom}`;
          const cssClass = denom.toLowerCase();

          notifyCurrencyChange(text, cssClass, actor);
        }
      }
    }

    trackedCurrencies.set(actor.id, foundry.utils.duplicate(newCurrency));
  });

  // ==== INITIALIZE ALL ACTORS ====
  for (const actor of game.actors) {
    if (actor.hasPlayerOwner) {
      let initCurrency = null;

      if (actor.system?.inventory?.currency) {
        initCurrency = foundry.utils.duplicate(actor.system.inventory.currency);
      }
      else if (actor.system?.currency && typeof actor.system.currency === "object") {
        initCurrency = foundry.utils.duplicate(actor.system.currency);
      }

      if (initCurrency) {
        trackedCurrencies.set(actor.id, initCurrency);
      }
    }
  }
});

// ==== NOTIFICATION FUNCTION ====
function notifyCurrencyChange(text, cssClass = "", actor = null) {
  const container = document.querySelector(".statusbox");
  if (!container) return;

  container.classList.add("show");
  const toast = document.createElement("div");
  toast.classList.add("currency-toast");
  if (cssClass) toast.classList.add(cssClass);
  toast.textContent = text;
  container.appendChild(toast);

  void toast.offsetWidth; // force reflow
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

  // Play coin SFX
  const playlist = game.playlists?.find(p => p.name === "SFX");
  if (playlist) {
    const track = playlist.sounds.find(s => s.name === "coin");
    if (track) playlist.playSound(track);
  }

  // Chat whisper to owners
  if (!actor) return;

  const ownerIds = game.users
    .filter(u => actor.testUserPermission(u, "OWNER"))
    .map(u => u.id);

  if (!ownerIds.includes(game.user.id)) return;

  const recipients = game.users
    .filter(u => actor.testUserPermission(u, "OWNER") || u.isGM)
    .map(u => u.id);

  ChatMessage.create({
    content: `<span class="currency-chat ${cssClass}">${text}</span>`,
    whisper: recipients
  });
}

