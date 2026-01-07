(function () {
  const isCoarse = window.matchMedia("(pointer: coarse)").matches;
  const transition = document.querySelector(".page-transition");

  /* ======================
     PAGE NAVIGATION
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
    if (k === "r") navigate("./real-estate.html?v=final");
    if (k === "i") navigate("./reels-interviews.html?v=final");
    if (k === "p") navigate("./projets-independants.html?v=final");
    if (k === "h") navigate("./index.html?v=final");
  });

  /* ======================
     CURSOR DOT (DESKTOP)
     ====================== */

  const dot = document.querySelector(".cursor-dot");
  if (dot && !isCoarse) {
    let x = innerWidth / 2, y = innerHeight / 2;
    let tx = x, ty = y;

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
     INFINITE CAROUSEL (CLEAN)
     ====================== */

  function setupCarousel(name) {
    const rail = document.getElementById(`rail-${name}`);
    if (!rail || rail.dataset.ready) return;
    rail.dataset.ready = "1";

    const nowEl = document.getElementById(`${name}Now`);
    const totalEl = document.getElementById(`${name}Total`);

    const originals = Array.from(rail.children);
    const n = originals.length;
    if (!n) return;

    if (totalEl) totalEl.textContent = String(n).padStart(2, "0");

    // Build A + B + C
    const fragA = document.createDocumentFragment();
    const fragC = document.createDocumentFragment();

    originals.forEach((el) => fragA.appendChild(el.cloneNode(true)));
    originals.forEach((el) => fragC.appendChild(el.cloneNode(true)));

    rail.prepend(fragA);
    rail.appendChild(fragC);

    const slides = Array.from(rail.children);

    const slideW = () => slides[n].offsetLeft - slides[0].offsetLeft;
    const centerX = () => {
      const r = rail.getBoundingClientRect();
      return r.left + r.width / 2;
    };

    const realIndexFromScroll = () => {
      let best = 0;
      let bestDist = Infinity;
      for (let i = 0; i < n; i++) {
        const el = slides[n + i];
        const r = el.getBoundingClientRect();
        const cx = r.left + r.width / 2;
        const d = Math.abs(cx - centerX());
        if (d < bestDist) {
          bestDist = d;
          best = i;
        }
      }
      return best;
    };

    const setActive = (real) => {
      slides.forEach((s) => s.classList.remove("is-current"));
      slides[n + real]?.classList.add("is-current");
      rail.classList.add("is-focusing");
      if (nowEl) nowEl.textContent = String(real + 1).padStart(2, "0");
    };

    const scrollToReal = (real, smooth = true) => {
      const el = slides[n + real];
      if (!el) return;
      const left = el.offsetLeft - rail.offsetLeft;
      rail.scrollTo({ left, behavior: smooth ? "smooth" : "auto" });
      setActive(real);
    };

    // START ON 1/4
    requestAnimationFrame(() => {
      scrollToReal(0, false);
    });

    const wrap = () => {
      const w = slideW();
      if (!w) return;

      if (rail.scrollLeft < w * 0.5) rail.scrollLeft += w;
      if (rail.scrollLeft > w * 1.5) rail.scrollLeft -= w;
    };

    let raf = 0;
    rail.addEventListener("scroll", () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        wrap();
        const real = realIndexFromScroll();
        setActive(real);
      });
    }, { passive: true });

    // Buttons
    document.querySelectorAll(`.arrowBtn[data-slider="${name}"]`).forEach((btn) => {
      btn.addEventListener("click", () => {
        const dir = Number(btn.dataset.dir || 1);
        const cur = realIndexFromScroll();
        scrollToReal((cur + dir + n) % n, true);
      });
    });

    // Keyboard arrows
    document.addEventListener("keydown", (e) => {
      const page = document.body.dataset.page;
      const ok = (name === "real" && page === "real") || (name === "reels" && page === "reels");
      if (!ok) return;

      const cur = realIndexFromScroll();
      if (e.key === "ArrowRight") scrollToReal((cur + 1) % n, true);
      if (e.key === "ArrowLeft") scrollToReal((cur - 1 + n) % n, true);
    });
  }

  setupCarousel("real");
  setupCarousel("reels");
})();
