(function () {
  const isCoarse = window.matchMedia("(pointer: coarse)").matches;
  const transition = document.querySelector(".page-transition");

  /* ======================
     NAVIGATION PAGES
  ====================== */

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

    if (href.includes(".html")) {
      e.preventDefault();
      navigate(href);
    }
  });

  document.addEventListener("keydown", (e) => {
    if (e.ctrlKey || e.metaKey || e.altKey) return;

    const k = e.key.toLowerCase();
    if (k === "r") return navigate("./real-estate.html?v=final");
    if (k === "i") return navigate("./reels-interviews.html?v=final");
    if (k === "p") return navigate("./projets-independants.html?v=final");
    if (k === "h") return navigate("./index.html?v=final");
  });

  /* ======================
     CONTACT GLOW
  ====================== */

  const contact = document.querySelector(".contactBtn");
  if (contact) {
    contact.addEventListener("click", () => {
      contact.classList.add("is-glow");
      setTimeout(() => contact.classList.remove("is-glow"), 320);
    });
  }

  /* ======================
     CURSOR DOT (DESKTOP)
  ====================== */

  const dot = document.querySelector(".cursor-dot");
  if (dot && !isCoarse) {
    let x = innerWidth / 2,
      y = innerHeight / 2;
    let tx = x,
      ty = y;

    addEventListener("mousemove", (e) => {
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
    tick();
  }

  /* ======================
     INFINITE CAROUSEL (UNLIMITED)
     - Works with any number of slides (n)
     - Starts at 1/n (first slide)
     - Infinite left/right
     - Smooth snap
     - Center slide highlighted
  ====================== */

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

    // Build A + B + C
    const fragA = document.createDocumentFragment();
    const fragC = document.createDocumentFragment();
    originals.forEach((node) => fragA.appendChild(node.cloneNode(true)));
    originals.forEach((node) => fragC.appendChild(node.cloneNode(true)));
    rail.prepend(fragA);
    rail.appendChild(fragC);

    const slides = Array.from(rail.children); // 3n

    let currentReal = 0;
    let isJumping = false;
    let setW = 0;
    let step = 0; // one slide step in px (measured, robust)

    const clampReal = (r) => ((r % n) + n) % n;

    const computeMetrics = () => {
      setW = rail.scrollWidth / 3;
      // step = distance between consecutive slides in the middle set
      const a = slides[n + 0];
      const b = slides[n + 1] || slides[n + 0];
      step = Math.abs((b?.offsetLeft ?? 0) - (a?.offsetLeft ?? 0)) || 1;
    };

    const disableSnap = () => rail.classList.add("is-jumping");
    const enableSnap = () => rail.classList.remove("is-jumping");

    const hardSetScrollLeft = (left) => {
      isJumping = true;
      disableSnap();
      rail.scrollLeft = left;
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          enableSnap();
          isJumping = false;
        });
      });
    };

    const centeredLeftFor = (el) => {
      const left = el.offsetLeft - rail.offsetLeft;
      return left - (rail.clientWidth - el.clientWidth) / 2;
    };

    // Keep scrollLeft in middle band using exact offsets (no visible jump)
    const keepInMiddleSet = () => {
      if (!setW) return;

      // Use wider safe band to avoid fighting inertia on trackpad
      const min = setW * 0.35;
      const max = setW * 1.65;

      if (rail.scrollLeft < min) hardSetScrollLeft(rail.scrollLeft + setW);
      else if (rail.scrollLeft > max) hardSetScrollLeft(rail.scrollLeft - setW);
    };

    const setActive = (real) => {
      currentReal = clampReal(real);
      rail.classList.add("is-focusing");
      slides.forEach((s) => s.classList.remove("is-current"));

      // highlight middle set only
      slides[n + currentReal]?.classList.add("is-current");

      if (nowEl) nowEl.textContent = String(currentReal + 1).padStart(2, "0");
    };

    const scrollToReal = (real, smooth = true) => {
      const r = clampReal(real);
      const el = slides[n + r];
      if (!el) return;

      const target = centeredLeftFor(el);
      if (smooth) rail.scrollTo({ left: target, behavior: "smooth" });
      else hardSetScrollLeft(target);

      setActive(r);
    };

    // ✅ Key change: determine current index by scrollLeft proximity,
    // not by getBoundingClientRect (which can be noisy with masks/padding).
    const closestRealByScroll = () => {
      const base = centeredLeftFor(slides[n + 0]); // "ideal left" for 1/4
      const cur = rail.scrollLeft;

      // How many steps from the first middle slide?
      const k = Math.round((cur - base) / step);
      return clampReal(k);
    };

    // Smooth end-of-scroll snap
    let endTimer = null;
    const onScroll = () => {
      if (isJumping) return;

      keepInMiddleSet();

      const curReal = closestRealByScroll();
      setActive(curReal);

      if (endTimer) clearTimeout(endTimer);
      endTimer = setTimeout(() => {
        if (isJumping) return;
        keepInMiddleSet();
        const snapReal = closestRealByScroll();
        scrollToReal(snapReal, true);
      }, 140);
    };

    rail.addEventListener("scroll", onScroll, { passive: true });

    // Buttons
    document.querySelectorAll(`.arrowBtn[data-slider="${name}"]`).forEach((btn) => {
      btn.addEventListener("click", () => {
        const dir = Number(btn.dataset.dir || 1);
        scrollToReal(currentReal + dir, true);
      });
    });

    // Keyboard arrows (only on the correct page)
    document.addEventListener("keydown", (e) => {
      const page = document.body.getAttribute("data-page");
      const ok = (name === "real" && page === "real") || (name === "reels" && page === "reels");
      if (!ok) return;

      if (e.key === "ArrowRight") scrollToReal(currentReal + 1, true);
      if (e.key === "ArrowLeft") scrollToReal(currentReal - 1, true);
    });

    const init = () => {
      computeMetrics();

      // Start at 1/4
      setActive(0);
      scrollToReal(0, false);

      // Recompute after iframes load (they can change widths)
      setTimeout(() => {
        computeMetrics();
        scrollToReal(0, false);
      }, 450);

      setTimeout(() => {
        computeMetrics();
        scrollToReal(currentReal, false);
      }, 1100);
    };

    init();
    window.addEventListener("load", init);
    window.addEventListener("resize", () => {
      computeMetrics();
      scrollToReal(currentReal, false);
    });
  }

  setupCarousel("real");
  setupCarousel("reels");
})();
