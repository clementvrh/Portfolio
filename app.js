(function () {
  const isCoarse = window.matchMedia("(pointer: coarse)").matches;

  /* =========================
     PAGE TRANSITION + HOTKEYS
     ========================= */

  const transition = document.querySelector(".page-transition");
  const hotkeyEl = (k) => document.querySelector(`.hotkey[data-key="${k}"]`);

  const pressKey = (k) => {
    const el = hotkeyEl(k);
    if (!el) return;
    el.classList.add("is-pressed");
    setTimeout(() => el.classList.remove("is-pressed"), 120);
  };

  const setActiveKey = () => {
    const page = document.body.getAttribute("data-page");
    document.querySelectorAll(".hotkey").forEach((e) => e.classList.remove("is-active"));

    if (page === "home") hotkeyEl("h")?.classList.add("is-active");
    if (page === "real") hotkeyEl("r")?.classList.add("is-active");
    if (page === "reels") hotkeyEl("i")?.classList.add("is-active");
    if (page === "inde") hotkeyEl("p")?.classList.add("is-active");
  };

  const navigate = (url, kForPress) => {
    if (kForPress) pressKey(kForPress);
    if (transition) {
      transition.classList.add("is-on");
      setTimeout(() => (window.location.href = url), 180);
    } else {
      window.location.href = url;
    }
  };

  setActiveKey();

  const isTyping = (el) =>
    el && (el.tagName === "INPUT" || el.tagName === "TEXTAREA" || el.isContentEditable);

  document.addEventListener("keydown", (e) => {
    if (isTyping(document.activeElement)) return;
    if (e.ctrlKey || e.metaKey || e.altKey) return;

    const k = e.key.toLowerCase();
    if (k === "r") navigate("./real-estate.html", "r");
    if (k === "i") navigate("./reels-interviews.html", "i");
    if (k === "p") navigate("./projets-independants.html", "p");
    if (k === "h") navigate("./index.html", "h");

    if (e.key === "Escape") pressKey("escape");
  });

  document.addEventListener("click", (e) => {
    const a = e.target.closest("a");
    if (!a) return;
    const href = a.getAttribute("href");
    if (!href) return;
    if (href.startsWith("mailto:") || href.startsWith("http")) return;

    if (href.endsWith(".html")) {
      e.preventDefault();
      navigate(href);
    }
  });

  const contact = document.querySelector(".contactBtn");
  if (contact) {
    contact.addEventListener("click", () => {
      contact.classList.add("is-glow");
      setTimeout(() => contact.classList.remove("is-glow"), 320);
    });
  }

  /* =========================
     CURSOR DOT
     ========================= */

  const dot = document.querySelector(".cursor-dot");
  if (dot && !isCoarse) {
    let x = window.innerWidth / 2;
    let y = window.innerHeight / 2;
    let tx = x;
    let ty = y;

    window.addEventListener("mousemove", (e) => {
      tx = e.clientX;
      ty = e.clientY;
    });

    const tick = () => {
      x += (tx - x) * 0.22;
      y += (ty - y) * 0.22;
      dot.style.left = x + "px";
      dot.style.top = y + "px";
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }

  /* =========================
     SLIDERS — INFINITE (MOBILE + DESKTOP IDENTIQUE)
     ========================= */

  function setupInfiniteSlider(name) {
    const rail = document.getElementById(`rail-${name}`);
    if (!rail) return;

    const originalSlides = Array.from(rail.children);
    const total = originalSlides.length;

    const nowEl = document.getElementById(`${name}Now`);
    const totalEl = document.getElementById(`${name}Total`);
    if (totalEl) totalEl.textContent = String(total).padStart(2, "0");

    // Clone first & last
    const firstClone = originalSlides[0].cloneNode(true);
    const lastClone = originalSlides[total - 1].cloneNode(true);
    firstClone.classList.add("is-clone");
    lastClone.classList.add("is-clone");

    rail.insertBefore(lastClone, originalSlides[0]);
    rail.appendChild(firstClone);

    const slides = Array.from(rail.children);

    let index = 1;

    const goTo = (i, smooth = true) => {
      rail.scrollTo({
        left: slides[i].offsetLeft,
        behavior: smooth ? "smooth" : "auto",
      });
    };

    goTo(index, false);

    let isJumping = false;

    const update = () => {
      if (isJumping) return;

      const railLeft = rail.scrollLeft;
      let closest = 0;
      let minDist = Infinity;

      slides.forEach((s, i) => {
        const d = Math.abs(s.offsetLeft - railLeft);
        if (d < minDist) {
          minDist = d;
          closest = i;
        }
      });

      index = closest;

      rail.classList.add("is-focusing");
      slides.forEach((s, i) => s.classList.toggle("is-current", i === index));

      if (nowEl) {
        let realIndex = index - 1;
        if (realIndex < 0) realIndex = total - 1;
        if (realIndex >= total) realIndex = 0;
        nowEl.textContent = String(realIndex + 1).padStart(2, "0");
      }

      if (index === 0) {
        isJumping = true;
        rail.classList.add("is-jumping");
        requestAnimationFrame(() => {
          index = total;
          goTo(index, false);
          rail.classList.remove("is-jumping");
          isJumping = false;
        });
      }

      if (index === slides.length - 1) {
        isJumping = true;
        rail.classList.add("is-jumping");
        requestAnimationFrame(() => {
          index = 1;
          goTo(index, false);
          rail.classList.remove("is-jumping");
          isJumping = false;
        });
      }
    };

    rail.addEventListener("scroll", () => requestAnimationFrame(update));
    update();

    document.querySelectorAll(`.arrowBtn[data-slider="${name}"]`).forEach((btn) => {
      btn.addEventListener("click", () => {
        const dir = Number(btn.dataset.dir || 1);
        index += dir;
        goTo(index);
      });
    });

    document.addEventListener("keydown", (e) => {
      if (isTyping(document.activeElement)) return;
      const page = document.body.dataset.page;
      if ((name === "real" && page !== "real") || (name === "reels" && page !== "reels")) return;

      if (e.key === "ArrowRight") {
        index++;
        goTo(index);
      }
      if (e.key === "ArrowLeft") {
        index--;
        goTo(index);
      }
    });
  }

  setupInfiniteSlider("real");
  setupInfiniteSlider("reels");
})();
