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
    if (k === "r") return navigate("./real-estate.html?v=10");
    if (k === "i") return navigate("./reels-interviews.html?v=10");
    if (k === "p") return navigate("./projets-independants.html?v=10");
    if (k === "h") return navigate("./index.html?v=10");
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
     INFINITE CAROUSEL (TRANSFORM-BASED)
     - Works on iOS/Android/Desktop
     - True infinite left/right
     - Starts on 1/n (first slide)
     - Any number of slides
  ====================== */

  function setupTransformCarousel(name) {
    const rail = document.getElementById(`rail-${name}`);
    if (!rail) return;
    if (rail.dataset.tc === "1") return;
    rail.dataset.tc = "1";

    const nowEl = document.getElementById(`${name}Now`);
    const totalEl = document.getElementById(`${name}Total`);

    // original slides = direct children (article.slide)
    const originals = Array.from(rail.children);
    const n = originals.length;
    if (!n) return;

    if (totalEl) totalEl.textContent = String(n).padStart(2, "0");

    // Build track
    const track = document.createElement("div");
    track.className = "rail__track";

    // Move originals into track (middle set B)
    originals.forEach((el) => track.appendChild(el));

    // Clone A and C from the originals we just moved
    const setB = Array.from(track.children); // n slides

    const fragA = document.createDocumentFragment();
    setB.forEach((el) => {
      const c = el.cloneNode(true);
      c.classList.add("is-dup");
      fragA.appendChild(c);
    });

    const fragC = document.createDocumentFragment();
    setB.forEach((el) => {
      const c = el.cloneNode(true);
      c.classList.add("is-dup");
      fragC.appendChild(c);
    });

    // Rebuild track = A + B + C
    track.innerHTML = "";
    track.appendChild(fragA);
    setB.forEach((el) => track.appendChild(el));
    track.appendChild(fragC);

    // Replace rail content
    rail.innerHTML = "";
    rail.appendChild(track);

    const slides = Array.from(track.children); // 3n

    // Measurements
    let gap = 22;
    let cardW = 360;
    let step = 382; // cardW + gap
    let setW = 0;

    const viewportW = () => rail.getBoundingClientRect().width;
    const centerOffset = () => (viewportW() - cardW) / 2;

    function measure() {
      const cs = getComputedStyle(track);
      const g = parseFloat(cs.columnGap || cs.gap || "22");
      gap = Number.isFinite(g) ? g : 22;

      const el = slides[n]; // first of middle set
      cardW = el ? el.getBoundingClientRect().width : 360;
      step = cardW + gap;
      setW = step * n;
    }

    // State
    let x = 0;
    let targetX = 0;
    let vel = 0;
    let dragging = false;
    let startPX = 0;
    let startTarget = 0;

    let realIndex = 0;

    function clampReal(r) {
      r = r % n;
      if (r < 0) r += n;
      return r;
    }

    function posForRealIndex(r) {
      // slide in middle set = (n + r) * step
      const slideLeft = (n + r) * step;
      return -(slideLeft - centerOffset());
    }

    function setActive(r) {
      realIndex = clampReal(r);
      rail.classList.add("is-focusing");
      slides.forEach((s) => s.classList.remove("is-current"));
      slides[n + realIndex]?.classList.add("is-current");
      if (nowEl) nowEl.textContent = String(realIndex + 1).padStart(2, "0");
    }

    function recenterIfNeeded() {
      const p = -x; // track position
      const min = step * (n * 0.35);
      const max = step * (n * 1.65);

      if (p < min) {
        x -= setW;
        targetX -= setW;
      } else if (p > max) {
        x += setW;
        targetX += setW;
      }
    }

    function render() {
      const diff = targetX - x;
      vel = vel * 0.82 + diff * 0.18;
      x += vel;

      recenterIfNeeded();

      track.style.transform = `translate3d(${x}px,0,0)`;
      requestAnimationFrame(render);
    }

    function goTo(r, smooth = true) {
      r = clampReal(r);
      setActive(r);
      const px = posForRealIndex(r);
      if (!smooth) {
        x = px;
        targetX = px;
        vel = 0;
      } else {
        targetX = px;
      }
    }

    function snapToNearest() {
      const p = -targetX;
      const approx = (p - centerOffset()) / step - n;
      const r = clampReal(Math.round(approx));
      goTo(r, true);
    }

    // Pointer drag (touch + mouse)
    rail.addEventListener("pointerdown", (e) => {
      dragging = true;
      rail.setPointerCapture(e.pointerId);
      startPX = e.clientX;
      startTarget = targetX;
      vel = 0;
      rail.classList.add("is-dragging");
    });

    rail.addEventListener("pointermove", (e) => {
      if (!dragging) return;
      const dx = e.clientX - startPX;
      targetX = startTarget + dx;
    });

    function endDrag() {
      if (!dragging) return;
      dragging = false;
      rail.classList.remove("is-dragging");
      snapToNearest();
    }

    rail.addEventListener("pointerup", endDrag);
    rail.addEventListener("pointercancel", endDrag);
    rail.addEventListener("lostpointercapture", endDrag);

    // Wheel support on desktop
    rail.addEventListener(
      "wheel",
      (e) => {
        e.preventDefault();
        const delta = e.deltaX !== 0 ? e.deltaX : e.deltaY;
        targetX -= delta;
        if (rail._snapT) clearTimeout(rail._snapT);
        rail._snapT = setTimeout(() => snapToNearest(), 140);
      },
      { passive: false }
    );

    // Buttons
    document.querySelectorAll(`.arrowBtn[data-slider="${name}"]`).forEach((btn) => {
      btn.addEventListener("click", () => {
        const dir = Number(btn.dataset.dir || 1);
        goTo(realIndex + dir, true);
      });
    });

    // Keyboard arrows (only on the correct page)
    document.addEventListener("keydown", (e) => {
      const page = document.body.getAttribute("data-page");
      const ok = (name === "real" && page === "real") || (name === "reels" && page === "reels");
      if (!ok) return;

      if (e.key === "ArrowRight") goTo(realIndex + 1, true);
      if (e.key === "ArrowLeft") goTo(realIndex - 1, true);
    });

    // Init (after layout settles)
    const init = () => {
      measure();
      goTo(0, false); // start at 1/n
    };

    init();
    window.addEventListener("load", init);
    window.addEventListener("resize", () => {
      measure();
      goTo(realIndex, false);
    });

    requestAnimationFrame(render);
  }

  setupTransformCarousel("real");
  setupTransformCarousel("reels");
})();
