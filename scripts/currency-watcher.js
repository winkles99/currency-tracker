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
  toast.classList.add("flex");
  toast.classList.add("flex-col");
  toast.classList.add("gap-2");
  toast.classList.add("w-60");
  toast.classList.add("sm:w-72");
  toast.classList.add("text-[10px]");
  toast.classList.add("sm:text-xs");
  toast.classList.add("z-50");
  
  const alertDiv = document.createElement("div");
  alertDiv.classList.add("success-alert");
  alertDiv.classList.add("cursor-default");
  alertDiv.classList.add("flex");
  alertDiv.classList.add("items-center");
  alertDiv.classList.add("justify-between");
  alertDiv.classList.add("w-full");
  alertDiv.classList.add("h-12");
  alertDiv.classList.add("sm:h-14");
  alertDiv.classList.add("rounded-lg");
  alertDiv.classList.add("bg-[#232531]");
  alertDiv.classList.add("px-[10px]");
  
  const contentDiv = document.createElement("div");
  contentDiv.classList.add("flex");
  contentDiv.classList.add("gap-2");
  
  const iconDiv = document.createElement("div");
  iconDiv.classList.add("text-[#2b9875]");
  iconDiv.classList.add("bg-white/5");
  iconDiv.classList.add("backdrop-blur-xl");
  iconDiv.classList.add("p-1");
  iconDiv.classList.add("rounded-lg");
  
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("xmlns", "http://www.w3.org/2000/svg");
  svg.setAttribute("fill", "none");
  svg.setAttribute("viewBox", "0 0 24 24");
  svg.setAttribute("stroke-width", "1.5");
  svg.setAttribute("stroke", "currentColor");
  svg.classList.add("w-6");
  svg.classList.add("h-6");
  
  const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
  path.setAttribute("stroke-linecap", "round");
  path.setAttribute("stroke-linejoin", "round");
  path.setAttribute("d", "m4.5 12.75 6 6 9-13.5");
  
  svg.appendChild(path);
  iconDiv.appendChild(svg);
  
  const textDiv = document.createElement("div");
  
  const titleP = document.createElement("p");
  titleP.classList.add("text-white");
  titleP.textContent = text;
  
  const descP = document.createElement("p");
  descP.classList.add("text-gray-500");
  descP.textContent = "Currency update";
  
  textDiv.appendChild(titleP);
  textDiv.appendChild(descP);
  
  contentDiv.appendChild(iconDiv);
  contentDiv.appendChild(textDiv);
  
  const closeBtn = document.createElement("button");
  closeBtn.classList.add("text-gray-600");
  closeBtn.classList.add("hover:bg-white/5");
  closeBtn.classList.add("p-1");
  closeBtn.classList.add("rounded-md");
  closeBtn.classList.add("transition-colors");
  closeBtn.classList.add("ease-linear");
  
  const closeSvg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  closeSvg.setAttribute("xmlns", "http://www.w3.org/2000/svg");
  closeSvg.setAttribute("fill", "none");
  closeSvg.setAttribute("viewBox", "0 0 24 24");
  closeSvg.setAttribute("stroke-width", "1.5");
  closeSvg.setAttribute("stroke", "currentColor");
  closeSvg.classList.add("w-6");
  closeSvg.classList.add("h-6");
  
  const closePath = document.createElementNS("http://www.w3.org/2000/svg", "path");
  closePath.setAttribute("stroke-linecap", "round");
  closePath.setAttribute("stroke-linejoin", "round");
  closePath.setAttribute("d", "M6 18 18 6M6 6l12 12");
  
  closeSvg.appendChild(closePath);
  closeBtn.appendChild(closeSvg);
  
  closeBtn.addEventListener("click", () => {
    toast.classList.add("hide");
    setTimeout(() => {
      toast.remove();
      if (container.children.length === 0) {
        container.classList.remove("show");
      }
    }, 500);
  });
  
  alertDiv.appendChild(contentDiv);
  alertDiv.appendChild(closeBtn);
  toast.appendChild(alertDiv);
  
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

