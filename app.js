(function () {
  const isCoarse = window.matchMedia("(pointer: coarse)").matches;
  const transition = document.querySelector(".page-transition");

  /* ======================
     SOFT LOCK (HOME ONLY)
     - QR friendly: no lock on load
     - Locks on first interaction (scroll/click/swipe/key)
     - Hourly code (4 chars) a-z0-9
  ====================== */

  const isHome = document.body?.getAttribute("data-page") === "home";

  function getHourlyCode(secret) {
    const now = new Date();

    // UTC to be stable
    const y = now.getUTCFullYear();
    const m = now.getUTCMonth() + 1;
    const d = now.getUTCDate();
    const h = now.getUTCHours();

    const base = `${secret}${y}${m}${d}${h}`;

    // simple deterministic hash
    let hash = 0;
    for (let i = 0; i < base.length; i++) {
      hash = (hash * 31 + base.charCodeAt(i)) >>> 0;
    }

    const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
    let code = "";
    for (let i = 0; i < 4; i++) {
      code += chars[hash % chars.length];
      hash = Math.floor(hash / chars.length);
    }
    return code;
  }

  if (isHome) {
    const LOCK = {
      // 🔑 change this if you want
      SECRET: "vrh",
      UNLOCK_MINUTES: 60,
      KEY: "vrh_unlocked_until",
    };

    const nowMs = () => Date.now();
    const isUnlocked = () => {
      const until = Number(localStorage.getItem(LOCK.KEY) || "0");
      return Number.isFinite(until) && until > nowMs();
    };

    // Inject overlay
    const overlay = document.createElement("div");
    overlay.className = "lockOverlay";
    overlay.innerHTML = `
      <div class="lockCard">
        <div class="lockTop">
          <h2 class="lockTitle">Accès privé</h2>
          <button class="lockClose" type="button" aria-label="Fermer">Plus tard</button>
        </div>

        <p class="lockHint">
          Site réservé à la prospection, veuillez contacter le numéro sur la carte de visite pour demander le mot de passe.
        </p>

        <div class="lockRow">
          <input class="lockInput" type="password" inputmode="text" autocomplete="off"
                placeholder="Mot de passe" aria-label="Mot de passe" />
          <button class="lockBtn" type="button">OK</button>
        </div>

        <div class="lockError" aria-live="polite"></div>
      </div>
    `;
    document.body.appendChild(overlay);

    const input = overlay.querySelector(".lockInput");
    const okBtn = overlay.querySelector(".lockBtn");
    const closeBtn = overlay.querySelector(".lockClose");
    const err = overlay.querySelector(".lockError");

    function showLock() {
      document.body.classList.add("is-locked");
      overlay.classList.add("is-on");
      err.textContent = "";
      setTimeout(() => input?.focus(), 50);
    }

    function hideLock() {
      overlay.classList.remove("is-on");
      document.body.classList.remove("is-locked");
    }

    function unlock() {
      const v = String(input.value || "").trim().toLowerCase();
      const expected = getHourlyCode(LOCK.SECRET);

      if (v === expected) {
        const until = nowMs() + LOCK.UNLOCK_MINUTES * 60 * 1000;
        localStorage.setItem(LOCK.KEY, String(until));
        hideLock();
        return;
      }

      err.textContent = "Code incorrect.";
      input.select();
    }

    okBtn.addEventListener("click", unlock);
    input.addEventListener("keydown", (e) => {
      if (e.key === "Enter") unlock();
    });
    closeBtn.addEventListener("click", hideLock);

    // Prevent clicks from passing through overlay
    overlay.addEventListener("pointerdown", (e) => e.stopPropagation());
    overlay.addEventListener("click", (e) => e.stopPropagation());
    overlay.addEventListener("wheel", (e) => e.stopPropagation(), { passive: false });

    // First interaction gate (capture)
    let armed = true;

    function firstInteractionGate(e) {
      if (!armed) return;
      if (isUnlocked()) {
        armed = false;
        return;
      }
      if (overlay.classList.contains("is-on")) return;

      e.preventDefault?.();
      e.stopPropagation?.();
      e.stopImmediatePropagation?.();

      showLock();
      armed = false;
    }

    window.addEventListener("pointerdown", firstInteractionGate, { capture: true });
    window.addEventListener("wheel", firstInteractionGate, { capture: true, passive: false });
    window.addEventListener("touchstart", firstInteractionGate, { capture: true, passive: false });
    window.addEventListener("keydown", firstInteractionGate, { capture: true });

    if (isUnlocked()) armed = false;
  }

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
     MOBILE: VIDEO SHIELD
     - Without this, YouTube iframes eat the touch events on mobile
     - Shield captures swipe
     - Tap unlocks video for a few seconds to allow interaction
  ====================== */

  function setupVideoShields() {
    if (!isCoarse) return;

    document.querySelectorAll(".video").forEach((wrap) => {
      if (wrap.dataset.shielded === "1") return;
      wrap.dataset.shielded = "1";

      const shield = document.createElement("div");
      shield.className = "videoShield";
      shield.setAttribute("aria-hidden", "true");
      wrap.appendChild(shield);

      let moved = false;
      let downX = 0;
      let downY = 0;

      shield.addEventListener("pointerdown", (e) => {
        moved = false;
        downX = e.clientX;
        downY = e.clientY;
      });

      shield.addEventListener("pointermove", (e) => {
        const dx = Math.abs(e.clientX - downX);
        const dy = Math.abs(e.clientY - downY);
        if (dx > 6 || dy > 6) moved = true;
      });

      // Tap = unlock iframe temporarily
      shield.addEventListener("pointerup", () => {
        if (moved) return;
        wrap.classList.add("is-unlocked");
        clearTimeout(wrap._unlockT);
        wrap._unlockT = setTimeout(() => {
          wrap.classList.remove("is-unlocked");
        }, 4500);
      });
    });
  }

  /* ======================
     INFINITE CAROUSEL (TRANSFORM-BASED)
     - Smooth (no cheap bounce)
     - Infinite left/right
     - Starts on first slide
     - Any number of slides
  ====================== */

  function setupTransformCarousel(name) {
    const rail = document.getElementById(`rail-${name}`);
    if (!rail) return;
    if (rail.dataset.tc === "1") return;
    rail.dataset.tc = "1";

    const nowEl = document.getElementById(`${name}Now`);
    const totalEl = document.getElementById(`${name}Total`);

    const originals = Array.from(rail.children);
    const n = originals.length;
    if (!n) return;

    if (totalEl) totalEl.textContent = String(n).padStart(2, "0");

    // Track wrapper
    const track = document.createElement("div");
    track.className = "rail__track";

    // Move originals into track (middle set)
    originals.forEach((el) => track.appendChild(el));
    const setB = Array.from(track.children);

    // Clone A + C
    const fragA = document.createDocumentFragment();
    const fragC = document.createDocumentFragment();

    setB.forEach((el) => {
      const c = el.cloneNode(true);
      c.classList.add("is-dup");
      fragA.appendChild(c);
    });
    setB.forEach((el) => {
      const c = el.cloneNode(true);
      c.classList.add("is-dup");
      fragC.appendChild(c);
    });

    track.innerHTML = "";
    track.appendChild(fragA);
    setB.forEach((el) => track.appendChild(el));
    track.appendChild(fragC);

    rail.innerHTML = "";
    rail.appendChild(track);

    const slides = Array.from(track.children); // 3n

    // Metrics
    let gap = 22;
    let cardW = 360;
    let step = 382;
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
      const p = -x;
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

    // ✅ Smooth without bounce (no spring overshoot)
    function render() {
      const ease = dragging ? 0.22 : 0.14;
      x += (targetX - x) * ease;

      // stop micro-jitter near target
      if (Math.abs(targetX - x) < 0.02) x = targetX;

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

    // Drag
    rail.addEventListener("pointerdown", (e) => {
      dragging = true;
      rail.setPointerCapture(e.pointerId);
      startPX = e.clientX;
      startTarget = targetX;
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

    // Wheel (desktop)
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

    // Keyboard arrows (only on correct page)
    document.addEventListener("keydown", (e) => {
      const page = document.body.getAttribute("data-page");
      const ok = (name === "real" && page === "real") || (name === "reels" && page === "reels");
      if (!ok) return;

      if (e.key === "ArrowRight") goTo(realIndex + 1, true);
      if (e.key === "ArrowLeft") goTo(realIndex - 1, true);
    });

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

  setupVideoShields();
  setupTransformCarousel("real");
  setupTransformCarousel("reels");
})();
