(function () {
  const isCoarse = window.matchMedia("(pointer: coarse)").matches;
  const transition = document.querySelector(".page-transition");

  /* ============================================================
     ACCESS GATE (HOME ONLY)
     - Trigger: first interaction OR keyboard shortcuts
     - Mandatory (no close button)
     - Hourly code (4 chars a-z0-9) based on UTC + SECRET
     - Stores unlock for 60 minutes in localStorage
     - FIX: typing inside popup input works (keyboard shortcuts won't block input)
  ============================================================ */

  const ACCESS = {
    SECRET: "vrh",                 // must match vrhok.html
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

  // Helpers: detect typing context (so we don't hijack keyboard)
  function isTypingTarget(t) {
    if (!t) return false;
    if (t.closest?.(".lockOverlay")) return true; // typing inside our popup
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

    // Block scrolling behind overlay (but DO NOT block typing/clicking inside input)
    gateOverlay.addEventListener(
      "wheel",
      (e) => e.preventDefault(),
      { passive: false }
    );
    gateOverlay.addEventListener(
      "touchmove",
      (e) => e.preventDefault(),
      { passive: false }
    );

    // If user clicks outside card, refocus input
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

  // Arm/disarm first-interaction listeners so they don't interfere with OK
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

    // If overlay is already visible, do NOT block keystrokes (let user type)
    if (gateIsVisible()) return true;

    if (e) {
      e.preventDefault?.();
      e.stopPropagation?.();
      e.stopImmediatePropagation?.();
    }
    showGate();
    return true;
  }

  // Gate triggers: first interaction OR keyboard usage (only once)
  if (gateEnabled && !isUnlocked()) {
    const onFirstPointer = (e) => {
      if (gateIfNeededAndBlock(e)) removeGateListeners();
    };
    const onFirstWheel = (e) => {
      if (gateIfNeededAndBlock(e)) removeGateListeners();
    };
    const onFirstTouch = (e) => {
      if (gateIfNeededAndBlock(e)) removeGateListeners();
    };
    const onFirstKey = (e) => {
      // If user is already typing somewhere, don't hijack
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
    // If home is locked, enforce gate on link click
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

    // ✅ Allow normal typing in inputs / popup
    if (isTypingTarget(e.target)) return;

    // ✅ Block hotkeys bypass on home if locked (but don't block if popup already open)
    if (gateEnabled && !isUnlocked()) {
      if (!gateIsVisible()) {
        if (gateIfNeededAndBlock(e)) return;
      } else {
        return; // popup open => do nothing
      }
    }

    const k = e.key.toLowerCase();
    if (k === "r") return navigate("./real-estate.html?v=12");
    if (k === "i") return navigate("./reels-interviews.html?v=12");
    if (k === "p") return navigate("./projets-independants.html?v=12");
    if (k === "h") return navigate("./index.html?v=12");
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

  /* ======================
     INFINITE CAROUSEL (TRANSFORM-BASED)
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

    document.querySelectorAll(`.arrowBtn[data-slider="${name}"]`).forEach((btn) => {
      btn.addEventListener("click", () => {
        const dir = Number(btn.dataset.dir || 1);
        goTo(realIndex + dir, true);
      });
    });

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
