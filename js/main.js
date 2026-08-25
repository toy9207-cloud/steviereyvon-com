/* ============================================================
   Stevie Rey Von — interactions
   ============================================================ */
(function () {
  "use strict";
  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ---- year ---- */
  var yr = document.getElementById("yr");
  if (yr) yr.textContent = new Date().getFullYear();

  /* ---- sticky header ---- */
  var header = document.getElementById("siteHeader");
  function onScroll() {
    if (window.scrollY > 60) header.classList.add("scrolled");
    else header.classList.remove("scrolled");
  }
  onScroll();
  window.addEventListener("scroll", onScroll, { passive: true });

  /* ---- mobile menu ---- */
  var toggle = document.getElementById("menuToggle");
  var nav = document.getElementById("nav");
  if (toggle) {
    toggle.addEventListener("click", function () {
      var open = document.body.classList.toggle("menu-open");
      toggle.setAttribute("aria-expanded", open ? "true" : "false");
    });
    nav.addEventListener("click", function (e) {
      if (e.target.tagName === "A") {
        document.body.classList.remove("menu-open");
        toggle.setAttribute("aria-expanded", "false");
      }
    });
  }

  /* ---- easing + count animation ---- */
  function easeOut(t) { return 1 - Math.pow(1 - t, 3); }
  function animateNumber(el, to, dur, fmt) {
    if (reduce) { el.textContent = fmt(to); return; }
    var start = null;
    function step(ts) {
      if (start === null) start = ts;
      var p = Math.min((ts - start) / dur, 1);
      el.textContent = fmt(Math.round(to * easeOut(p)));
      if (p < 1) requestAnimationFrame(step);
      else el.textContent = fmt(to);
    }
    requestAnimationFrame(step);
  }
  var grouped = function (n) { return n.toLocaleString("en-US"); };

  /* ---- reveal on scroll ---- */
  var revealEls = document.querySelectorAll(".reveal");
  if ("IntersectionObserver" in window && !reduce) {
    var ro = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) { en.target.classList.add("in"); ro.unobserve(en.target); }
      });
    }, { threshold: 0.12, rootMargin: "0px 0px -8% 0px" });
    revealEls.forEach(function (el) { ro.observe(el); });
  } else {
    revealEls.forEach(function (el) { el.classList.add("in"); });
  }

  /* ---- count-up stat cells (once visible) ---- */
  var statCells = document.querySelectorAll(".stat-cell .n[data-count]");
  if ("IntersectionObserver" in window) {
    var so = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) {
          animateNumber(en.target, +en.target.dataset.count, 1600, grouped);
          so.unobserve(en.target);
        }
      });
    }, { threshold: 0.6 });
    statCells.forEach(function (el) { so.observe(el); });
  } else {
    statCells.forEach(function (el) { el.textContent = grouped(+el.dataset.count); });
  }

  /* ============================================================
     LIVE EARNINGS TICKER — from data/earnings.json
     (falls back to the value baked into the markup)
     ============================================================ */
  var tickerVal = document.getElementById("tickerVal");
  var tickerNum = document.getElementById("tickerNum");
  var asOfEl = document.getElementById("asOf");
  var sparkStart = document.getElementById("sparkStart");

  function fmtDate(iso) {
    var d = new Date(iso + "T12:00:00");
    if (isNaN(d)) return iso;
    return d.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
  }

  function runTicker(total) {
    if (!tickerVal) return;
    // animate once the band scrolls into view
    var fired = false;
    function fire() {
      if (fired) return; fired = true;
      animateNumber(tickerVal, total, 2400, grouped);
    }
    if ("IntersectionObserver" in window && !reduce) {
      var io = new IntersectionObserver(function (entries) {
        entries.forEach(function (en) { if (en.isIntersecting) { fire(); io.disconnect(); } });
      }, { threshold: 0.4 });
      io.observe(tickerNum);
    } else { fire(); }
  }

  function drawSpark(history) {
    var svg = document.getElementById("spark");
    if (!svg || !history || history.length < 2) return;
    var W = 400, H = 120, pad = 8;
    var vals = history.map(function (h) { return h.total; });
    var min = Math.min.apply(null, vals), max = Math.max.apply(null, vals);
    var span = (max - min) || 1;
    var n = history.length;
    function x(i) { return pad + (i / (n - 1)) * (W - pad * 2); }
    function y(v) { return H - pad - ((v - min) / span) * (H - pad * 2); }

    var line = "", area = "M" + x(0) + "," + H;
    history.forEach(function (h, i) {
      var px = x(i).toFixed(1), py = y(h.total).toFixed(1);
      line += (i === 0 ? "M" : "L") + px + "," + py + " ";
      area += " L" + px + "," + py;
    });
    area += " L" + x(n - 1) + "," + H + " Z";

    var ns = "http://www.w3.org/2000/svg";
    // gradient defs
    var defs = document.createElementNS(ns, "defs");
    defs.innerHTML =
      '<linearGradient id="sparkFill" x1="0" y1="0" x2="0" y2="1">' +
      '<stop offset="0%" stop-color="#c19a4e" stop-opacity="0.32"/>' +
      '<stop offset="100%" stop-color="#c19a4e" stop-opacity="0"/></linearGradient>' +
      '<linearGradient id="sparkLine" x1="0" y1="0" x2="1" y2="0">' +
      '<stop offset="0%" stop-color="#9a7328"/><stop offset="100%" stop-color="#ecd7a4"/></linearGradient>';
    svg.appendChild(defs);

    var areaEl = document.createElementNS(ns, "path");
    areaEl.setAttribute("d", area);
    areaEl.setAttribute("fill", "url(#sparkFill)");
    svg.appendChild(areaEl);

    var lineEl = document.createElementNS(ns, "path");
    lineEl.setAttribute("d", line.trim());
    lineEl.setAttribute("fill", "none");
    lineEl.setAttribute("stroke", "url(#sparkLine)");
    lineEl.setAttribute("stroke-width", "2.5");
    lineEl.setAttribute("stroke-linecap", "round");
    lineEl.setAttribute("stroke-linejoin", "round");
    svg.appendChild(lineEl);

    // animate the draw
    if (!reduce) {
      var len = lineEl.getTotalLength();
      lineEl.style.strokeDasharray = len;
      lineEl.style.strokeDashoffset = len;
      lineEl.style.transition = "stroke-dashoffset 2.2s cubic-bezier(0.22,1,0.36,1)";
      requestAnimationFrame(function () { requestAnimationFrame(function () { lineEl.style.strokeDashoffset = "0"; }); });
    }

    // end dot
    var dot = document.createElementNS(ns, "circle");
    dot.setAttribute("cx", x(n - 1)); dot.setAttribute("cy", y(history[n - 1].total));
    dot.setAttribute("r", "4"); dot.setAttribute("fill", "#ecd7a4");
    svg.appendChild(dot);

    if (sparkStart) sparkStart.textContent = fmtDate(history[0].date).replace(/, \d{4}$/, "");
  }

  function drawAll(d) {
    var total = (d && d.total) || +tickerNum.dataset.total;
    runTicker(total);
    if (asOfEl && d && d.asOf) asOfEl.textContent = fmtDate(d.asOf);
    if (d && d.history) drawSpark(d.history);
  }
  // Fallback data baked into the page, so the ticker + graph always render
  // (works offline, from a local file, or if the live JSON can't be reached).
  function inlineData() {
    try {
      var el = document.getElementById("earnings-data");
      return el ? JSON.parse(el.textContent) : null;
    } catch (e) { return null; }
  }

  fetch("data/earnings.json", { cache: "no-store" })
    .then(function (r) { if (!r.ok) throw new Error("no data"); return r.json(); })
    .then(function (d) { drawAll(d); })
    .catch(function () {
      var fb = inlineData();
      if (fb) drawAll(fb);
      else { runTicker(+tickerNum.dataset.total); if (asOfEl) asOfEl.textContent = "July 3, 2026"; }
    });
})();
