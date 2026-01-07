(function () {
  const isCoarse = window.matchMedia("(pointer: coarse)").matches;
  const transition = document.querySelector(".page-transition");

  const setActiveKey = () => {
    const page = document.body.getAttribute("data-page");
    document.querySelectorAll(".hotkey").forEach((e) => e.classList.remove("is-active"));
    const hotkeyEl = (k) => document.querySelector(`.hotkey[data-key="${k}"]`);
    if (page === "home") hotkeyEl("h")?.classList.add("is-active");
    if (page === "real") hotkeyEl("r")?.classList.add("is-active");
    if (page === "reels") hotkeyEl("i")?.classList.add("is-active");
    if (page === "inde") hotkeyEl("p")?.classList.add("is-active");
  };
  setActiveKey();

  const navigate = (url) => {
    if (transition) {
      transition.classList.add("is-on");
      setTimeout(() => (window.location.href = url), 180);
    } else {
      window.location.href = url;
    }
  };

  document.addEventListener("click", (e) => {
    const a = e.target.closest("a");
    if (!a) return;
    const href = a.getAttribute("href");
    if (!href) return;
    if (href.startsWith("mailto:") || href.startsWith("http")) return;
    if (href.endsWith(".html") || href.includes(".html?")) {
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

  // Cursor dot (desktop)
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

  const isTyping = (el) =>
    el && (el.tagName === "INPUT" || el.tagName === "TEXTAREA" || el.isContentEditable);

  /* =========================
     INFINITE CAROUSEL (SMOOTH)
     - 3 sets: A (clone) + B (original) + C (clone)
     - wrap by adjusting scrollLeft (no visible jump)
     - current slide = closest to rail center
     - order = EXACTLY your HTML order
     ========================= */

  function setupCarousel(name) {
    const rail = document.getElementById(`rail-${name}`);
    if (!rail) return;
    if (rail.dataset.inited === "1") return;
    rail.dataset.inited = "1";

    const nowEl = document.getElementById(`${name}Now`);
    const totalEl = document.getElementById(`${name}Total`);

    const originals = Array.from(rail.children);
    const n = originals.length;
    if (!n) return;

    if (totalEl) totalEl.textContent = String(n).padStart(2, "0");

    // A + B + C
    const fragA = document.createDocumentFragment();
    const fragC = document.createDocumentFragment();

    originals.forEach((node) => {
      const c = node.cloneNode(true);
      c.classList.add("is-dup");
      fragA.appendChild(c);
    });
    originals.forEach((node) => {
      const c = node.cloneNode(true);
      c.classList.add("is-dup");
      fragC.appendChild(c);
    });

    rail.insertBefore(fragA, rail.firstChild);
    rail.appendChild(fragC);

    let slides = Array.from(rail.children); // 3n

    const realFromIndex = (i) => {
      const r = i % n;
      return r < 0 ? r + n : r;
    };

    const scrollToIndex = (i, smooth = true) => {
      const t = slides[i];
      if (!t) return;
      const left = t.offsetLeft - rail.offsetLeft;
      rail.scrollTo({ left, behavior: smooth ? "smooth" : "auto" });
    };

    const slideCenterX = (el) => {
      const r = el.getBoundingClientRect();
      return r.left + r.width / 2;
    };

    const getClosestToCenter = () => {
      const rr = rail.getBoundingClientRect();
      const cx = rr.left + rr.width / 2;
      let best = 0;
      let bestDist = Infinity;
      for (let i = 0; i < slides.length; i++) {
        const d = Math.abs(slideCenterX(slides[i]) - cx);
        if (d < bestDist) {
          bestDist = d;
          best = i;
        }
      }
      return best;
    };

    const setUI = (idx) => {
      rail.classList.add("is-focusing");
      slides.forEach((s) => s.classList.remove("is-current"));
      slides[idx]?.classList.add("is-current");

      const real = realFromIndex(idx);
      if (nowEl) nowEl.textContent = String(real + 1).padStart(2, "0");
    };

    const getSetWidth = () => {
      if (!slides[n]) return 0;
      return slides[n].offsetLeft - slides[0].offsetLeft;
    };

    const wrapIfNeeded = () => {
      const setW = getSetWidth();
      if (!setW) return;

      // Middle set should be around [setW .. 2*setW]
      const leftThreshold = setW * 0.35;
      const rightThreshold = setW * 1.65;

      if (rail.scrollLeft < leftThreshold) {
        rail.scrollLeft += setW;
      } else if (rail.scrollLeft > rightThreshold) {
        rail.scrollLeft -= setW;
      }
    };

    // Start at first slide of middle set (=> 1/4)
    const startIndex = n;

    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        slides = Array.from(rail.children);
        scrollToIndex(startIndex, false);
        const idx = getClosestToCenter();
        setUI(idx);
      });
    });

    let raf = 0;
    const onScroll = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        wrapIfNeeded();
        const idx = getClosestToCenter();
        setUI(idx);
      });
    };
    rail.addEventListener("scroll", onScroll, { passive: true });

    // arrows
    document.querySelectorAll(`.arrowBtn[data-slider="${name}"]`).forEach((btn) => {
      btn.addEventListener("click", () => {
        const dir = Number(btn.dataset.dir || 1);
        const cur = getClosestToCenter();
        scrollToIndex(cur + dir, true);
      });
    });

    // keyboard
    document.addEventListener("keydown", (e) => {
      if (isTyping(document.activeElement)) return;
      const page = document.body.getAttribute("data-page");
      const ok = (name === "real" && page === "real") || (name === "reels" && page === "reels");
      if (!ok) return;

      if (e.key === "ArrowRight") {
        const cur = getClosestToCenter();
        scrollToIndex(cur + 1, true);
      }
      if (e.key === "ArrowLeft") {
        const cur = getClosestToCenter();
        scrollToIndex(cur - 1, true);
      }
    });
  }

  setupCarousel("real");
  setupCarousel("reels");
})();
