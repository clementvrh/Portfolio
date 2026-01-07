(function () {
  const isCoarse = window.matchMedia("(pointer: coarse)").matches;

  /* ============ basics (nav + cursor) ============ */

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

  /* ============ FIX: title duplicated (hide raw fallback if exists) ============ */
  // If both ".title" and ".glowtext" exist inside same block, we keep the glowtext and hide the plain one.
  // (CSS also reinforces, but we do a safe fix here too.)
  document.querySelectorAll(".titleBlock, .hero, body").forEach((scope) => {
    const plain = scope.querySelector?.("h1.title:not(.glowtextTitle)");
    const glow = scope.querySelector?.(".glowtext");
    if (plain && glow) plain.style.display = "none";
  });

  /* ============ Infinite carousel (3 sets) — TRUE infinite both sides, order preserved ============ */

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

    // Build A + B + C, where B is the original set
    // IMPORTANT: Keep original DOM nodes (B) as-is to preserve exact order.
    const fragA = document.createDocumentFragment();
    const fragC = document.createDocumentFragment();

    // A: clone of originals (same order)
    originals.forEach((node) => {
      const c = node.cloneNode(true);
      c.classList.add("is-dup");
      fragA.appendChild(c);
    });

    // C: clone of originals (same order)
    originals.forEach((node) => {
      const c = node.cloneNode(true);
      c.classList.add("is-dup");
      fragC.appendChild(c);
    });

    // prepend A then append C
    rail.insertBefore(fragA, rail.firstChild);
    rail.appendChild(fragC);

    const slides = Array.from(rail.children); // 3n
    const startIndex = n; // first element of middle set (B) => video 1/4

    let index = startIndex;
    let jumping = false;

    const disableSnap = () => rail.classList.add("is-jumping");
    const enableSnap = () => rail.classList.remove("is-jumping");

    const leftForIndex = (i) => (slides[i].offsetLeft - rail.offsetLeft);

    const scrollToIndex = (i, smooth = true) => {
      const t = slides[i];
      if (!t) return;
      rail.scrollTo({ left: leftForIndex(i), behavior: smooth ? "smooth" : "auto" });
    };

    const hardJump = (i) => {
      jumping = true;
      disableSnap();
      scrollToIndex(i, false);
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          enableSnap();
          jumping = false;
          setUI();
        });
      });
    };

    // map any index -> real slide [0..n-1] preserving order
    const realFromIndex = (i) => {
      const r = i % n;
      return r < 0 ? r + n : r;
    };

    const setUI = () => {
      const real = realFromIndex(index);
      if (nowEl) nowEl.textContent = String(real + 1).padStart(2, "0");

      rail.classList.add("is-focusing");
      slides.forEach((s) => s.classList.remove("is-current"));
      slides[index]?.classList.add("is-current");
    };

    const closestIndex = () => {
      const cur = rail.scrollLeft;
      let best = 0;
      let bestDist = Infinity;

      // find nearest slide to current scrollLeft
      for (let i = 0; i < slides.length; i++) {
        const d = Math.abs(leftForIndex(i) - cur);
        if (d < bestDist) {
          bestDist = d;
          best = i;
        }
      }
      return best;
    };

    // Start exactly at video 1/4 (center)
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        index = startIndex;
        hardJump(index);
      });
    });

    // HARD requirement: infinite in both directions, including long continuous scroll on desktop.
    // Strategy: while scrolling, if we approach edges (A or C), recenter immediately (invisible).
    const recenterIfNeeded = () => {
      // middle set is [n .. 2n-1]
      if (index < n * 0.6) {
        index += n; // bring to middle
        hardJump(index);
      } else if (index > n * 2.4) {
        index -= n;
        hardJump(index);
      }
    };

    let raf = 0;
    let endTimer = null;

    const onScroll = () => {
      if (jumping) return;

      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        index = closestIndex();
        setUI();

        // recenter DURING scrolling too (fix desktop "finite to the right")
        recenterIfNeeded();

        // also recenter after momentum ends (for mobile)
        if (endTimer) clearTimeout(endTimer);
        endTimer = setTimeout(() => {
          if (jumping) return;
          index = closestIndex();
          recenterIfNeeded();
        }, 120);
      });
    };

    rail.addEventListener("scroll", onScroll, { passive: true });
    setUI();

    // arrows
    document.querySelectorAll(`.arrowBtn[data-slider="${name}"]`).forEach((btn) => {
      btn.addEventListener("click", () => {
        const dir = Number(btn.dataset.dir || 1);
        index += dir;
        scrollToIndex(index, true);
      });
    });

    // keyboard
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
  }

  setupCarousel("real");
  setupCarousel("reels");
})();
