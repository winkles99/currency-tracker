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
    // Determine the "currency" object depending on system
    let newCurrency = null;

    // PF2e: currency stored in actor.system.resources.coinage
    if (actor.system?.resources?.coinage) {
      // coinage is array of objects: { denomination: "gp", value: 123 }
      newCurrency = actor.system.resources.coinage.reduce((obj, entry) => {
        obj[entry.denomination] = entry.value;
        return obj;
      }, {});
    }
    else if (actor.system?.currency && typeof actor.system.currency === "object") {
      // fallback: older/simple system
      newCurrency = actor.system.currency;
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
            actor.name || actor.prototypeToken?.name || actor.data?.name || "Unknown";
          const text = `${actorName} ${verb} ${amount} ${denom}`;
          const cssClass = denom.toLowerCase();
          notifyCurrencyChange(text, cssClass, actor);
        }
      }
    }

    // Save a copy
    trackedCurrencies.set(actor.id, foundry.utils.duplicate(newCurrency));
  });

  // Initialize existing actors
  for (const actor of game.actors) {
    if (actor.hasPlayerOwner) {
      let initCurrency = null;
      if (actor.system?.resources?.coinage) {
        initCurrency = actor.system.resources.coinage.reduce((obj, entry) => {
          obj[entry.denomination] = entry.value;
          return obj;
        }, {});
      }
      else if (actor.system?.currency && typeof actor.system.currency === "object") {
        initCurrency = actor.system.currency;
      }
      if (initCurrency) {
        trackedCurrencies.set(actor.id, foundry.utils.duplicate(initCurrency));
      }
    }
  }
});

// notifyCurrencyChange remains the same
function notifyCurrencyChange(text, cssClass = "", actor = null) {
  const container = document.querySelector(".statusbox");
  if (!container) return;

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

  // Play coin SFX
  const playlist = game.playlists?.find(p => p.name === "SFX");
  if (playlist) {
    const track = playlist.sounds.find(s => s.name === "coin");
    if (track) playlist.playSound(track);
  }

  // Chat whisper
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
