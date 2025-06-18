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

          //Get actor name
          const actorName =
            actor.name || actor.prototypeToken?.name || actor.data?.name || "Unknown";

          const text = `${actorName} ${verb} ${amount} ${denom}`;
          const cssClass = denom.toLowerCase();

          notifyCurrencyChange(text, cssClass);
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

function notifyCurrencyChange(text, cssClass = "") {
  const container = document.querySelector(".statusbox");
  if (!container) return;

  // Show container only while active
  container.classList.add("show");

  const toast = document.createElement("div");
  toast.classList.add("currency-toast");
  if (cssClass) toast.classList.add(cssClass);
  toast.textContent = text;

  container.appendChild(toast);
  void toast.offsetWidth; // Force reflow

  toast.classList.add("show");

  setTimeout(() => {
    toast.classList.add("hide");
    setTimeout(() => {
      toast.remove();

      // Hide container if empty
      if (container.children.length === 0) {
        container.classList.remove("show");
      }
    }, 500);
  }, 3000);
}

// Function to send a /desc message as GM
function sendCurrencyDesc(actorName, verb, amount, denom) {
  const gmUser = game.users.find(u => u.isGM && u.active);
  if (!gmUser) return;

  const messageContent = `/desc ${actorName} ${verb} ${amount} ${denom}`;
  ChatMessage.create({
    content: messageContent,
    speaker: { alias: "System" },
    whisper: [gmUser.id]
  });
}