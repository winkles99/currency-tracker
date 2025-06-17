const notifyCurrencyChange = (text) => {
  const container = module.status.element[0].querySelector(".statusbox");

  const newElement = document.createElement("div");
  newElement.classList.add("currency-toast");
  newElement.textContent = text;

  container.appendChild(newElement);

  // Trigger reflow to enable animation
  void newElement.offsetWidth;

  // Add fade-in class
  newElement.classList.add("show");

  // Fade out after 5 seconds
  setTimeout(() => {
    newElement.classList.remove("show");
    newElement.classList.add("hide");

    // Remove from DOM after fade-out finishes
    setTimeout(() => {
      newElement.remove();
    }, 1000);
  }, 5000);
};
