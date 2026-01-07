(function () {
  const isCoarse = window.matchMedia && window.matchMedia("(pointer: coarse)").matches;

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
      setTimeout(() => (window.location.href = url), 170);
      return;
    }
    window.location.href = url;
  };

  setActiveKey();

  const isTyping = (el) =>
    el && (el.tagName === "INPUT" || el.tagName === "TEXTAREA" || el.isContentEditable);

  // Keyboard shortcuts
  document.addEventListener("keydown", (e) => {
    if (isTyping(document.activeElement)) return;
    if (e.ctrlKey || e.metaKey || e.altKey) return;

    const k = e.key.toLowerCase();

    if (k === "r") return navigate("./real-estate.html", "r");
    if (k === "i") return navigate("./reels-interviews.html", "i");
    if (k === "p") return navigate("./projets-independants.html", "p");
    if (k === "h") return navigate("./index.html", "h");

    if (e.key === "Escape") {
      pressKey("escape");
    }
  });

  // Click: smooth internal nav with transition (ignore mailto/external)
  document.addEventListener("click", (e) => {
    const a = e.target.closest("a");
    if (!a) return;

    const href = a.getAttribute("href");
    if (!href) return;

    // Ignore mailto, tel, external
    if (href.startsWith("mailto:") || href.startsWith("tel:") || href.startsWith("http")) return;

    if (href.startsWith("./") || href.endsWith(".html")) {
      e.preventDefault();
      navigate(href);
    }
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
    let x = window.innerWidth / 2, y = window.innerHeight / 2;
    let tx = x, ty = y;

    window.addEventListener("mousemove", (ev) => {
      tx = ev.clientX;
      ty = ev.clientY;
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

  // True infinite slider (clones + seamless jump)
  function setupInfiniteSlider(name) {
    const rail = document.getElementById(`rail-${name}`);
    if (!rail) return;

    // only once
    if (rail.dataset.infiniteReady === "1") return;
    rail.dataset.infiniteReady = "1";

    const nowEl = document.getElementById(`${name}Now`);
    const totalEl = document.getElementById(`${name}Total`);

    const getSlides = () => Array.from(rail.querySelectorAll(".slide"));
    let slides = getSlides();

    // Save originals
    const originals = slides.filter((s) => !s.classList.contains("is-clone"));
    const total = originals.length;
    if (totalEl) totalEl.textContent = String(total).padStart(2, "0");

    if (total < 2) return;

    // Create clones: last -> head, first -> tail
    const first = originals[0];
    const last = originals[originals.length - 1];

    const firstClone = first.cloneNode(true);
    firstClone.classList.add("is-clone");
    firstClone.querySelectorAll("iframe").forEach((f) => {
      // keep same src (ok), but avoid duplicate titles not important
    });

    const lastClone = last.cloneNode(true);
    lastClone.classList.add("is-clone");

    rail.insertBefore(lastClone, rail.firstChild);
    rail.appendChild(firstClone);

    slides = getSlides();
    const realStartIndex = 1; // because we prepended 1 clone

    // jump to first real without animation
    const jumpTo = (index) => {
      const target = slides[index];
      if (!target) return;
      rail.scrollLeft = target.offsetLeft - rail.offsetLeft;
    };

    const smoothTo = (index) => {
      const target = slides[index];
      if (!target) return;
      rail.scrollTo({ left: target.offsetLeft - rail.offsetLeft, behavior: "smooth" });
    };

    // initial position
    requestAnimationFrame(() => jumpTo(realStartIndex));

    const indexFromScroll = () => {
      const railLeft = rail.getBoundingClientRect().left;
      let best = 0, bestDist = Infinity;
      slides.forEach((s, i) => {
        const dist = Math.abs(s.getBoundingClientRect().left - railLeft);
        if (dist < bestDist) { bestDist = dist; best = i; }
      });
      return best;
    };

    const setCurrentUI = (realIdx) => {
      const show = ((realIdx % total) + total) % total;
      if (nowEl) nowEl.textContent = String(show + 1).padStart(2, "0");

      rail.classList.add("is-focusing");
      // focus only REAL slides visually
      slides.forEach((s) => s.classList.remove("is-current"));
      const currentRealSlide = originals[show];
      currentRealSlide?.classList.add("is-current");
    };

    let raf = 0;
    const onScroll = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const idx = indexFromScroll();

        // if we’re on clones, jump
        if (idx === 0) {
          // at head clone (last)
          jumpTo(total); // last real is at index total (because 0 clone + 1..total reals + tail clone)
          setCurrentUI(total - 1);
          return;
        }
        if (idx === total + 1) {
          // at tail clone (first)
          jumpTo(1);
          setCurrentUI(0);
          return;
        }

        // real slide indices: 1..total
        setCurrentUI(idx - 1);
      });
    };

    rail.addEventListener("scroll", onScroll);
    onScroll();

    // arrows
    document.querySelectorAll(`.arrowBtn[data-slider="${name}"]`).forEach((btn) => {
      btn.addEventListener("click", () => {
        const dir = Number(btn.getAttribute("data-dir") || "1");
        const idx = indexFromScroll();
        smoothTo(idx + dir);
      });
    });

    // keyboard ← →
    document.addEventListener("keydown", (e) => {
      if (isTyping(document.activeElement)) return;
      if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;

      const page = document.body.getAttribute("data-page");
      const ok = (name === "real" && page === "real") || (name === "reels" && page === "reels");
      if (!ok) return;

      const idx = indexFromScroll();
      if (e.key === "ArrowRight") smoothTo(idx + 1);
      if (e.key === "ArrowLeft") smoothTo(idx - 1);
    });
  }

  setupInfiniteSlider("real");
  setupInfiniteSlider("reels");
})();
