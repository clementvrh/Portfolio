(function () {
  const isCoarse = window.matchMedia("(pointer: coarse)").matches;
  const transition = document.querySelector(".page-transition");

  const isTyping = (el) =>
    el && (el.tagName === "INPUT" || el.tagName === "TEXTAREA" || el.isContentEditable);

  const navigate = (url) => {
    if (transition) {
      transition.classList.add("is-on");
      setTimeout(() => (window.location.href = url), 180);
    } else {
      window.location.href = url;
    }
  };

  // Intercept internal links (keep mailto/external normal)
  document.addEventListener("click", (e) => {
    const a = e.target.closest("a");
    if (!a) return;
    const href = a.getAttribute("href");
    if (!href) return;
    if (href.startsWith("mailto:") || href.startsWith("http")) return;

    // internal html navigation
    if (href.includes(".html")) {
      e.preventDefault();
      navigate(href);
    }
  });

  // Keyboard navigation between pages (works even if header hotkeys removed)
  document.addEventListener("keydown", (e) => {
    if (isTyping(document.activeElement)) return;
    if (e.ctrlKey || e.metaKey || e.altKey) return;

    const k = e.key.toLowerCase();
    if (k === "r") return navigate("./real-estate.html?v=10");
    if (k === "i") return navigate("./reels-interviews.html?v=10");
    if (k === "p") return navigate("./projets-independants.html?v=10");
    if (k === "h") return navigate("./index.html?v=10");
  });

  // Contact glow on click
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

  /* =========================
     INFINITE CAROUSEL (MOBILE + DESKTOP)
     - clones 3 sets (A + B + C)
     - always keeps "current" in the MIDDLE set
     - wrap by adjusting scrollLeft with setWidth = scrollWidth/3
     - starts at 1/4 (index 0) centered
     ========================= */

  function setupCarousel(name) {
    const rail = document.getElementById(`rail-${name}`);
    if (!rail) return;
    if (rail.dataset.inited === "1") return;
    rail.dataset.inited = "1";

    const nowEl = document.getElementById(`${name}Now`);
    const totalEl = document.getElementById(`${name}Total`);

    // Original slides (middle set)
    const originals = Array.from(rail.children);
    const n = originals.length;
    if (!n) return;

    if (totalEl) totalEl.textContent = String(n).padStart(2, "0");

    // Build A + B + C (A and C are clones)
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

    const slides = Array.from(rail.children); // 3n

    const setWidth = () => rail.scrollWidth / 3;

    const clampReal = (r) => {
      const x = r % n;
      return x < 0 ? x + n : x;
    };

    const middleIndexForReal = (realIndex) => n + clampReal(realIndex); // force middle set

    const scrollToMiddleReal = (realIndex, smooth = true) => {
      const idx = middleIndexForReal(realIndex);
      const el = slides[idx];
      if (!el) return;

      const left = el.offsetLeft - rail.offsetLeft;
      rail.scrollTo({ left, behavior: smooth ? "smooth" : "auto" });
      setCurrentReal(realIndex);
    };

    const wrapIfNeeded = () => {
      const w = setWidth();
      if (!w) return;

      // Keep scrollLeft roughly inside middle set [w .. 2w]
      if (rail.scrollLeft < w * 0.5) rail.scrollLeft += w;
      else if (rail.scrollLeft > w * 1.5) rail.scrollLeft -= w;
    };

    const getClosestReal = () => {
      // compute closest to center among middle set slides only (n..2n-1)
      const rr = rail.getBoundingClientRect();
      const cx = rr.left + rr.width / 2;

      let bestReal = 0;
      let bestDist = Infinity;

      for (let real = 0; real < n; real++) {
        const idx = n + real;
        const el = slides[idx];
        if (!el) continue;
        const r = el.getBoundingClientRect();
        const elCx = r.left + r.width / 2;
        const d = Math.abs(elCx - cx);
        if (d < bestDist) {
          bestDist = d;
          bestReal = real;
        }
      }
      return bestReal;
    };

    const setCurrentReal = (realIndex) => {
      const r = clampReal(realIndex);

      rail.classList.add("is-focusing");
      slides.forEach((s) => s.classList.remove("is-current"));

      const idx = n + r; // middle set only
      slides[idx]?.classList.add("is-current");

      if (nowEl) nowEl.textContent = String(r + 1).padStart(2, "0");
    };

    // Start at 1/4 centered (realIndex = 0)
    const start = () => {
      // Ensure layout is ready (iframes can cause reflow)
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          // put us in the middle set and exactly on slide 1
          const idx = middleIndexForReal(0);
          const el = slides[idx];
          if (el) {
            const left = el.offsetLeft - rail.offsetLeft;
            rail.scrollLeft = left;
          }
          // wrap to stabilize
          wrapIfNeeded();
          setCurrentReal(0);
        });
      });
    };

    start();
    window.addEventListener("load", start); // extra safety after iframes load
    window.addEventListener("resize", () => {
      // keep same real slide centered on resize
      const cur = getClosestReal();
      scrollToMiddleReal(cur, false);
    });

    let raf = 0;
    rail.addEventListener(
      "scroll",
      () => {
        cancelAnimationFrame(raf);
        raf = requestAnimationFrame(() => {
          wrapIfNeeded();
          const cur = getClosestReal();
          setCurrentReal(cur);
        });
      },
      { passive: true }
    );

    // Buttons
    document.querySelectorAll(`.arrowBtn[data-slider="${name}"]`).forEach((btn) => {
      btn.addEventListener("click", () => {
        const dir = Number(btn.dataset.dir || 1);
        const cur = getClosestReal();
        scrollToMiddleReal(cur + dir, true);
      });
    });

    // Keyboard arrows (only on the right page)
    document.addEventListener("keydown", (e) => {
      if (isTyping(document.activeElement)) return;

      const page = document.body.getAttribute("data-page");
      const ok = (name === "real" && page === "real") || (name === "reels" && page === "reels");
      if (!ok) return;

      if (e.key === "ArrowRight") {
        const cur = getClosestReal();
        scrollToMiddleReal(cur + 1, true);
      }
      if (e.key === "ArrowLeft") {
        const cur = getClosestReal();
        scrollToMiddleReal(cur - 1, true);
      }
    });
  }

  setupCarousel("real");
  setupCarousel("reels");
})();
