(function () {
  const isCoarse = window.matchMedia("(pointer: coarse)").matches;
  const transition = document.querySelector(".page-transition");

  /* ============================================================
     ACCESS GATE (HOME ONLY) — version OK (inchangé)
  ============================================================ */

  const ACCESS = {
    SECRET: "vrh",
    UNLOCK_MINUTES: 60,
    KEY: "vrh_unlocked_until",
  };

  const page = document.body?.getAttribute("data-page");
  const gateEnabled = page === "home";

  const nowMs = () => Date.now();
  const isUnlocked = () => Number(localStorage.getItem(ACCESS.KEY) || "0") > nowMs();

  function getHourlyCodeUTC() {
    const now = new Date();
    const y = now.getUTCFullYear();
    const m = now.getUTCMonth() + 1;
    const d = now.getUTCDate();
    const h = now.getUTCHours();
    const base = `${ACCESS.SECRET}${y}${m}${d}${h}`;

    let hash = 0;
    for (let i = 0; i < base.length; i++) hash = (hash * 31 + base.charCodeAt(i)) >>> 0;

    const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
    let code = "";
    for (let i = 0; i < 4; i++) {
      code += chars[hash % chars.length];
      hash = Math.floor(hash / chars.length);
    }
    return code;
  }

  function isTypingTarget(t) {
    if (!t) return false;
    if (t.closest?.(".lockOverlay")) return true;
    const tag = (t.tagName || "").toLowerCase();
    if (tag === "input" || tag === "textarea" || tag === "select") return true;
    if (t.isContentEditable) return true;
    return false;
  }

  let gateOverlay = null;
  let gateInput = null;
  let gateErr = null;

  function buildGateOverlayIfNeeded() {
    if (gateOverlay) return;

    gateOverlay = document.createElement("div");
    gateOverlay.className = "lockOverlay";
    gateOverlay.innerHTML = `
      <div class="lockCard" role="dialog" aria-modal="true" aria-label="Accès privé">
        <h2 class="lockTitle">Accès privé</h2>

        <p class="lockHint">
          Site réservé à la prospection, veuillez contacter le numéro sur la carte de visite pour demander le mot de passe.
        </p>

        <div class="lockRow">
          <input class="lockInput"
                 type="text"
                 inputmode="text"
                 autocapitalize="none"
                 autocomplete="off"
                 placeholder="Mot de passe"
                 aria-label="Mot de passe" />
          <button class="lockBtn" type="button">OK</button>
        </div>

        <div class="lockError" aria-live="polite"></div>
      </div>
    `;
    document.body.appendChild(gateOverlay);

    gateInput = gateOverlay.querySelector(".lockInput");
    const okBtn = gateOverlay.querySelector(".lockBtn");
    gateErr = gateOverlay.querySelector(".lockError");

    function unlock() {
      const v = String(gateInput.value || "").trim().toLowerCase();
      const expected = getHourlyCodeUTC();

      if (v === expected) {
        const until = nowMs() + ACCESS.UNLOCK_MINUTES * 60 * 1000;
        localStorage.setItem(ACCESS.KEY, String(until));
        hideGate();
        return;
      }
      gateErr.textContent = "Mot de passe incorrect.";
      gateInput.select();
      gateInput.focus();
    }

    okBtn.addEventListener("click", unlock);
    gateInput.addEventListener("keydown", (e) => {
      if (e.key === "Enter") unlock();
    });

    gateOverlay.addEventListener("wheel", (e) => e.preventDefault(), { passive: false });
    gateOverlay.addEventListener("touchmove", (e) => e.preventDefault(), { passive: false });

    gateOverlay.addEventListener(
      "pointerdown",
      (e) => {
        const card = gateOverlay.querySelector(".lockCard");
        if (card && !card.contains(e.target)) {
          e.preventDefault();
          setTimeout(() => gateInput?.focus(), 0);
        }
      },
      { passive: false }
    );
  }

  function showGate() {
    buildGateOverlayIfNeeded();
    document.body.classList.add("is-locked");
    gateOverlay.classList.add("is-on");
    gateErr.textContent = "";
    setTimeout(() => gateInput?.focus(), 50);
  }

  function hideGate() {
    if (!gateOverlay) return;
    gateOverlay.classList.remove("is-on");
    document.body.classList.remove("is-locked");
  }

  function gateIsVisible() {
    return !!(gateOverlay && gateOverlay.classList.contains("is-on"));
  }

  const gateListeners = [];
  function addGateListener(target, type, handler, options) {
    target.addEventListener(type, handler, options);
    gateListeners.push([target, type, handler, options]);
  }
  function removeGateListeners() {
    while (gateListeners.length) {
      const [t, type, h, opt] = gateListeners.pop();
      t.removeEventListener(type, h, opt);
    }
  }

  function gateIfNeededAndBlock(e) {
    if (!gateEnabled) return false;
    if (isUnlocked()) return false;
    if (gateIsVisible()) return true;

    e?.preventDefault?.();
    e?.stopPropagation?.();
    e?.stopImmediatePropagation?.();
    showGate();
    return true;
  }

  if (gateEnabled && !isUnlocked()) {
    const onFirstPointer = (e) => { if (gateIfNeededAndBlock(e)) removeGateListeners(); };
    const onFirstWheel = (e) => { if (gateIfNeededAndBlock(e)) removeGateListeners(); };
    const onFirstTouch = (e) => { if (gateIfNeededAndBlock(e)) removeGateListeners(); };
    const onFirstKey = (e) => {
      if (isTypingTarget(e.target)) return;
      if (gateIfNeededAndBlock(e)) removeGateListeners();
    };

    addGateListener(window, "pointerdown", onFirstPointer, { capture: true });
    addGateListener(window, "wheel", onFirstWheel, { capture: true, passive: false });
    addGateListener(window, "touchstart", onFirstTouch, { capture: true, passive: false });
    addGateListener(window, "keydown", onFirstKey, { capture: true });
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
    if (gateEnabled && !isUnlocked() && !gateIsVisible()) {
      if (gateIfNeededAndBlock(e)) return;
    }

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
    if (isTypingTarget(e.target)) return;

    if (gateEnabled && !isUnlocked()) {
      if (!gateIsVisible()) {
        if (gateIfNeededAndBlock(e)) return;
      } else {
        return;
      }
    }

    const k = e.key.toLowerCase();
    if (k === "r") return navigate("./real-estate.html?v=14");
    if (k === "i") return navigate("./reels-interviews.html?v=14");
    if (k === "p") return navigate("./projets-independants.html?v=14");
    if (k === "h") return navigate("./index.html?v=14");
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

  /* ============================================================
     INFINITE CAROUSEL (TRANSFORM-BASED)
     ✅ Fix mobile: use TOUCH (reliable), desktop keeps POINTER.
  ============================================================ */

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

    const track = document.createElement("div");
    track.className = "rail__track";

    originals.forEach((el) => track.appendChild(el));
    const setB = Array.from(track.children);

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

    const slides = Array.from(track.children);

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

      const el = slides[n];
      cardW = el ? el.getBoundingClientRect().width : 360;
      step = cardW + gap;
      setW = step * n;
    }

    let x = 0;
    let targetX = 0;
    let dragging = false;

    let startPX = 0;
    let startPY = 0;
    let startTarget = 0;

    let intentDecided = false;
    let intentIsHorizontal = false;

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
      const min = step * (n * 0.25);
      const max = step * (n * 1.75);

      if (p < min) {
        x -= setW;
        targetX -= setW;
      } else if (p > max) {
        x += setW;
        targetX += setW;
      }
    }

    function render() {
      const ease = dragging ? 0.22 : 0.14;
      x += (targetX - x) * ease;
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

    /* ---------- DESKTOP: pointer drag (comme avant) ---------- */
    if (!isCoarse) {
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
    }

    /* ---------- MOBILE: touch gesture intent horizontal ---------- */
    if (isCoarse) {
      rail.addEventListener("touchstart", (e) => {
        if (!e.touches || e.touches.length !== 1) return;
        const t = e.touches[0];

        startPX = t.clientX;
        startPY = t.clientY;
        startTarget = targetX;

        dragging = false;
        intentDecided = false;
        intentIsHorizontal = false;
      }, { passive: true });

      rail.addEventListener("touchmove", (e) => {
        if (!e.touches || e.touches.length !== 1) return;
        const t = e.touches[0];
        const dx = t.clientX - startPX;
        const dy = t.clientY - startPY;

        if (!intentDecided) {
          const adx = Math.abs(dx);
          const ady = Math.abs(dy);
          if (adx < 4 && ady < 4) return;

          intentDecided = true;
          intentIsHorizontal = adx > ady;
          dragging = intentIsHorizontal;

          if (dragging) rail.classList.add("is-dragging");
        }

        if (!dragging) return;

        // Horizontal drag => prevent page scrolling
        e.preventDefault();
        targetX = startTarget + dx;
      }, { passive: false });

      rail.addEventListener("touchend", () => {
        if (!dragging) return;
        dragging = false;
        rail.classList.remove("is-dragging");
        snapToNearest();
      });

      rail.addEventListener("touchcancel", () => {
        if (!dragging) return;
        dragging = false;
        rail.classList.remove("is-dragging");
        snapToNearest();
      });
    }

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

    // Arrows buttons
    document.querySelectorAll(`.arrowBtn[data-slider="${name}"]`).forEach((btn) => {
      btn.addEventListener("click", () => {
        const dir = Number(btn.dataset.dir || 1);
        goTo(realIndex + dir, true);
      });
    });

    // Keyboard arrows for pages
    document.addEventListener("keydown", (e) => {
      const page = document.body.getAttribute("data-page");
      const ok = (name === "real" && page === "real") || (name === "reels" && page === "reels");
      if (!ok) return;

      if (e.key === "ArrowRight") goTo(realIndex + 1, true);
      if (e.key === "ArrowLeft") goTo(realIndex - 1, true);
    });

    const init = () => {
      measure();
      goTo(0, false);
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
