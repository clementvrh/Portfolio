(function () {
  const panel = document.querySelector(".panel");
  const btn = document.querySelector(".menuBtn");

  if (btn && panel) {
    btn.addEventListener("click", () => {
      const open = panel.getAttribute("data-open") === "true";
      panel.setAttribute("data-open", open ? "false" : "true");
      btn.setAttribute("aria-expanded", open ? "false" : "true");
    });
  }

  const isTyping = (el) =>
    el && (el.tagName === "INPUT" || el.tagName === "TEXTAREA" || el.isContentEditable);

  document.addEventListener("keydown", (e) => {
    if (isTyping(document.activeElement)) return;
    if (e.ctrlKey || e.metaKey || e.altKey) return;

    const k = e.key.toLowerCase();

    if (k === "1") window.location.href = "./real-estate.html";
    if (k === "2") window.location.href = "./reels-interviews.html";
    if (k === "3") window.location.href = "./projets-independants.html";
    if (k === "h") window.location.href = "./index.html";

    if (e.key === "Escape") {
      if (panel) panel.setAttribute("data-open", "false");
      btn?.setAttribute("aria-expanded", "false");
    }
  });
})();
