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
     INFINITE CAROUSEL SLIDER
     - starts at 1/4 (center)
     - center snap
     - neighbors visible
     - seamless loop (no visible jump)
     ========================= */

  function setupInfiniteCarousel(name) {
    const rail = document.getElementById(`rail-${name}`);
    if (!rail) return;

    // Prevent double init
    if (rail.dataset.inited === "1") return;
    rail.dataset.inited = "1";

    const nowEl = document.getElementById(`${name}Now`);
    const totalEl = document.getElementById(`${name}Total`);

    // Original slides (before clones)
    const originals = Array.from(rail.children);
    const total = originals.length;
    if (totalEl) totalEl.textContent = String(total).padStart(2, "0");
    if (total < 2) return;

    // Clone last to head, first to tail
    const firstClone = originals[0].cloneNode(true);
    const lastClone = originals[total - 1].cloneNode(true);
    firstClone.classList.add("is-clone");
    lastClone.classList.add("is-clone");

    rail.insertBefore(lastClone, originals[0]);
    rail.appendChild(firstClone);

    const slides = Array.from(rail.children);

    // Index in "slides" array (with clones). Real first = 1
    let index = 1;
    let jumping = false;

    const disableSnap = () => rail.classList.add("is-jumping");
    const enableSnap = () => rail.classList.remove("is-jumping");

    const scrollToIndex = (i, smooth = true) => {
      const target = slides[i];
      if (!target) return;

      const left = target.offsetLeft - rail.offsetLeft;
      rail.scrollTo({ left, behavior: smooth ? "smooth" : "auto" });
    };

    const setUI = () => {
      // current slide class (visual)
      slides.forEach((s) => s.classList.remove("is-current"));
      slides[index]?.classList.add("is-current");
      rail.classList.add("is-focusing");

      // counter: map clones back to real
      let real = index - 1; // because index=1 => real 0
      if (real < 0) real = total - 1;
      if (real >= total) real = 0;

      if (nowEl) nowEl.textContent = String(real + 1).padStart(2, "0");
    };

    const hardJump = (i) => {
      jumping = true;
      disableSnap();
      scrollToIndex(i, false);

      // re-enable snap next paint
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          enableSnap();
          jumping = false;
          setUI();
        });
      });
    };

    // Initial position MUST be after layout
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        hardJump(1); // start on first real slide => 1/4
      });
    });

    const closestIndex = () => {
      const cur = rail.scrollLeft;
      let best = 0;
      let bestDist = Infinity;
      slides.forEach((s, i) => {
        const d = Math.abs((s.offsetLeft - rail.offsetLeft) - cur);
        if (d < bestDist) {
          bestDist = d;
          best = i;
        }
      });
      return best;
    };

    let raf = 0;
    const onScroll = () => {
      if (jumping) return;
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        index = closestIndex();
        setUI();

        // Seamless loop
        if (index === 0) {
          // at head clone (last)
          hardJump(total);
        } else if (index === slides.length - 1) {
          // at tail clone (first)
          hardJump(1);
        }
      });
    };

    rail.addEventListener("scroll", onScroll, { passive: true });

    // Arrow buttons
    document.querySelectorAll(`.arrowBtn[data-slider="${name}"]`).forEach((btn) => {
      btn.addEventListener("click", () => {
        const dir = Number(btn.dataset.dir || 1);
        index += dir;
        scrollToIndex(index, true);
      });
    });

    // Keyboard arrows
    document.addEventListener("keydown", (e) => {
      if (isTyping(document.activeElement)) return;

      const page = document.body.getAttribute("data-page");
      const ok = (name === "real" && page === "real") || (name === "reels" && page === "reels");
      if (!ok) return;

      if (e.key === "ArrowRight") {
        index += 1;
        scrollToIndex(index, true);
      }
      if (e.key === "ArrowLeft") {
        index -= 1;
        scrollToIndex(index, true);
      }
    });

    // First UI state
    setUI();
  }

  setupInfiniteCarousel("real");
  setupInfiniteCarousel("reels");
})();
