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
     INFINITE CAROUSEL (PRO)
     - Start 1/4
     - Infinite left/right
     - No jump visible
     - Same behavior desktop/mobile
  ====================== */

  function setupCarousel(name) {
    const rail = document.getElementById(`rail-${name}`);
    if (!rail) return;
    if (rail.dataset.inited === "1") return;
    rail.dataset.inited = "1";

    const nowEl = document.getElementById(`${name}Now`);
    const totalEl = document.getElementById(`${name}Total`);

    // originals (your 4 slides in HTML, in correct order)
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

    let currentReal = 0; // 0..n-1
    let isJumping = false;
    let setW = 0;

    const clampReal = (r) => ((r % n) + n) % n;

    const computeSetWidth = () => {
      // total scrollWidth = 3 sets
      setW = rail.scrollWidth / 3;
      if (!isFinite(setW) || setW <= 0) setW = 0;
    };

    const centeredLeftFor = (el) => {
      // center slide in viewport
      const left = el.offsetLeft - rail.offsetLeft;
      return left - (rail.clientWidth - el.clientWidth) / 2;
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

    const keepInMiddleSet = () => {
      // we keep scrollLeft within [0.5*setW .. 1.5*setW] by shifting +-setW
      if (!setW) return;

      while (rail.scrollLeft < setW * 0.5) {
        hardSetScrollLeft(rail.scrollLeft + setW);
      }
      while (rail.scrollLeft > setW * 1.5) {
        hardSetScrollLeft(rail.scrollLeft - setW);
      }
    };

    const setActive = (real) => {
      currentReal = clampReal(real);

      rail.classList.add("is-focusing");
      slides.forEach((s) => s.classList.remove("is-current"));

      // highlight ONLY the middle set element
      const mid = n + currentReal;
      slides[mid]?.classList.add("is-current");

      if (nowEl) nowEl.textContent = String(currentReal + 1).padStart(2, "0");
    };

    const scrollToReal = (real, smooth = true) => {
      const r = clampReal(real);
      const el = slides[n + r]; // middle set
      if (!el) return;

      const target = centeredLeftFor(el);

      if (smooth) rail.scrollTo({ left: target, behavior: "smooth" });
      else hardSetScrollLeft(target);

      setActive(r);
    };

    const closestRealToCenter = () => {
      // measure center distance within middle set only
      const railRect = rail.getBoundingClientRect();
      const cx = railRect.left + railRect.width / 2;

      let best = 0;
      let bestDist = Infinity;

      for (let i = 0; i < n; i++) {
        const el = slides[n + i];
        if (!el) continue;
        const r = el.getBoundingClientRect();
        const elCx = r.left + r.width / 2;
        const d = Math.abs(elCx - cx);
        if (d < bestDist) {
          bestDist = d;
          best = i;
        }
      }
      return best;
    };

    // Smooth “end of scroll” snap (works for touch + trackpad)
    let endTimer = null;
    const onScroll = () => {
      if (isJumping) return;
      keepInMiddleSet();

      // update active while scrolling (for opacity focus)
      const cur = closestRealToCenter();
      setActive(cur);

      if (endTimer) clearTimeout(endTimer);
      endTimer = setTimeout(() => {
        if (isJumping) return;
        keepInMiddleSet();
        const snapTo = closestRealToCenter();
        scrollToReal(snapTo, true);
      }, 110);
    };

    rail.addEventListener("scroll", onScroll, { passive: true });

    // Buttons
    document.querySelectorAll(`.arrowBtn[data-slider="${name}"]`).forEach((btn) => {
      btn.addEventListener("click", () => {
        const dir = Number(btn.dataset.dir || 1);
        scrollToReal(currentReal + dir, true);
      });
    });

    // Keyboard arrows on the right page only
    document.addEventListener("keydown", (e) => {
      const page = document.body.getAttribute("data-page");
      const ok = (name === "real" && page === "real") || (name === "reels" && page === "reels");
      if (!ok) return;

      if (e.key === "ArrowRight") scrollToReal(currentReal + 1, true);
      if (e.key === "ArrowLeft") scrollToReal(currentReal - 1, true);
    });

    const init = () => {
      computeSetWidth();

      // Force starting point: first slide of middle set (1/4)
      setActive(0);
      scrollToReal(0, false);

      // after iframes load, widths can change a tiny bit => re-center
      setTimeout(() => {
        computeSetWidth();
        scrollToReal(0, false);
      }, 450);

      setTimeout(() => {
        computeSetWidth();
        scrollToReal(currentReal, false);
      }, 1100);
    };

    // init now + after load
    init();
    window.addEventListener("load", init);
    window.addEventListener("resize", () => {
      computeSetWidth();
      scrollToReal(currentReal, false);
    });
  }

  setupCarousel("real");
  setupCarousel("reels");
})();
