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

  // Send to chat
  ChatMessage.create({
    content: `<span class="currency-change-message ${cssClass}">${text}</span>`,
    whisper: game.user?.isGM ? undefined : [game.user.id] // Optional: make GM see all, players only see their own
  });

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
