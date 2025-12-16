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

  // Tilt (title)
  const tilt = document.querySelector("[data-tilt]");
  if (tilt && !isCoarse) {
    const clamp = (n, a, b) => Math.max(a, Math.min(b, n));
    const onMove = (ev) => {
      const r = tilt.getBoundingClientRect();
      const px = (ev.clientX - r.left) / r.width;
      const py = (ev.clientY - r.top) / r.height;
      const rx = clamp((0.5 - py) * 10, -8, 8);
      const ry = clamp((px - 0.5) * 12, -10, 10);
      tilt.style.transform = `perspective(900px) rotateX(${rx}deg) rotateY(${ry}deg)`;
    };
    const reset = () => (tilt.style.transform = "perspective(900px) rotateX(0deg) rotateY(0deg)");
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseleave", reset);
  }

  // Sliders: arrows + counter + focus + ← → + infinite wrap
  function setupSlider(name) {
    const rail = document.getElementById(`rail-${name}`);
    if (!rail) return;

    const slides = Array.from(rail.querySelectorAll(".slide"));
    const nowEl = document.getElementById(`${name}Now`);
    const totalEl = document.getElementById(`${name}Total`);
    if (totalEl) totalEl.textContent = String(slides.length).padStart(2, "0");

    const scrollToIndex = (idx) => {
      const n = slides.length;
      const wrapped = ((idx % n) + n) % n; // infinite wrap
      slides[wrapped].scrollIntoView({ behavior: "smooth", inline: "start", block: "nearest" });
    };

    const update = () => {
      const railRect = rail.getBoundingClientRect();
      let best = 0, bestDist = Infinity;

      slides.forEach((s, i) => {
        const r = s.getBoundingClientRect();
        const dist = Math.abs(r.left - railRect.left);
        if (dist < bestDist) { bestDist = dist; best = i; }
      });

      if (nowEl) nowEl.textContent = String(best + 1).padStart(2, "0");
      rail.classList.add("is-focusing");
      slides.forEach((s, i) => s.classList.toggle("is-current", i === best));
    };

    rail.addEventListener("scroll", () => requestAnimationFrame(update));
    update();

    document.querySelectorAll(`.arrowBtn[data-slider="${name}"]`).forEach((btn) => {
      btn.addEventListener("click", () => {
        const dir = Number(btn.getAttribute("data-dir") || "1");
        const cur = Number((nowEl?.textContent || "01")) - 1;
        scrollToIndex(cur + dir);
      });
    });

    document.addEventListener("keydown", (e) => {
      if (isTyping(document.activeElement)) return;
      if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;

      const page = document.body.getAttribute("data-page");
      const ok = (name === "real" && page === "real") || (name === "reels" && page === "reels");
      if (!ok) return;

      const cur = Number((nowEl?.textContent || "01")) - 1;
      if (e.key === "ArrowRight") scrollToIndex(cur + 1);
      if (e.key === "ArrowLeft") scrollToIndex(cur - 1);
    });
  }

  setupSlider("real");
  setupSlider("reels");
})();
