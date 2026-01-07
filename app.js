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

  /* ===== Infinite Carousel (3 full sets) =====
     This is smooth on mobile AND desktop because we never "teleport" from 1->4.
     We just recenter invisibly when we drift too far.
  */
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
    const startIndex = n; // first slide of middle set => 1/4

    let index = startIndex;
    let jumping = false;

    const disableSnap = () => rail.classList.add("is-jumping");
    const enableSnap = () => rail.classList.remove("is-jumping");

    const leftForIndex = (i) => slides[i].offsetLeft - rail.offsetLeft;

    const scrollToIndex = (i, smooth = true) => {
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

    const realFromIndex = (i) => {
      const r = i % n;
      return r < 0 ? r + n : r;
    };

    const setUI = () => {
      rail.classList.add("is-focusing");
      slides.forEach((s) => s.classList.remove("is-current"));
      slides[index]?.classList.add("is-current");

      const real = realFromIndex(index);
      if (nowEl) nowEl.textContent = String(real + 1).padStart(2, "0");
    };

    const closestIndex = () => {
      const cur = rail.scrollLeft;
      let best = 0;
      let bestDist = Infinity;
      for (let i = 0; i < slides.length; i++) {
        const d = Math.abs(leftForIndex(i) - cur);
        if (d < bestDist) {
          bestDist = d;
          best = i;
        }
      }
      return best;
    };

    // Start at 1/4
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        index = startIndex;
        hardJump(index);
      });
    });

    // Recenter early enough so desktop never hits the end.
    const recenterIfNeeded = () => {
      if (index < n * 0.7) {
        index += n;
        hardJump(index);
      } else if (index > n * 2.3) {
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
        recenterIfNeeded();

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

    document.querySelectorAll(`.arrowBtn[data-slider="${name}"]`).forEach((btn) => {
      btn.addEventListener("click", () => {
        const dir = Number(btn.dataset.dir || 1);
        index += dir;
        scrollToIndex(index, true);
      });
    });

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
