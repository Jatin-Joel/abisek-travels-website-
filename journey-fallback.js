/**
 * journey-fallback.js
 * Lightweight fallback hero shown when WebGL is unavailable or the device
 * fails the low-power heuristic. No Three.js dependency whatsoever.
 * Activated by journey.js dispatching a CustomEvent("journey:fallback") on window.
 */
(function () {
  'use strict';

  /* ── Route pin data ─────────────────────────────────────────────────── */
  var PINS = [
    { label: 'Pathankot',         pct: 8,  desc: 'Starting point — Punjab' },
    { label: 'Himachal Pradesh',  pct: 32, desc: 'Scenic hill routes' },
    { label: 'Kashmir',           pct: 58, desc: 'Multi-day valley tours' },
    { label: 'Leh-Ladakh',        pct: 88, desc: 'Extended expeditions' },
  ];

  /* ── Zone palette keyframes for the animated gradient ───────────────── */
  var PALETTE_CSS = `
    @keyframes journeyFbGrad {
      0%   { background-position: 0% 0%; }
      25%  { background-position: 0% 33%; }
      50%  { background-position: 0% 60%; }
      75%  { background-position: 0% 80%; }
      100% { background-position: 0% 0%; }
    }
  `;

  /* ── SVG road illustration ───────────────────────────────────────────── */
  function buildRoadSVG() {
    return `
    <svg viewBox="0 0 600 420" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <defs>
        <linearGradient id="fbRoad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"  stop-color="#3db39e" stop-opacity="0.05"/>
          <stop offset="100%" stop-color="#3db39e" stop-opacity="0.3"/>
        </linearGradient>
        <!-- Mountain silhouettes per zone -->
        <!-- Punjab: gentle undulation -->
        <path id="mPunjab" d="M0 360 Q80 340 160 345 Q240 350 320 338 Q400 328 480 335 Q560 342 600 338 L600 420 L0 420 Z"/>
        <!-- Himachal: rolling hills -->
        <path id="mHimachal" d="M0 300 Q60 260 130 240 Q200 220 250 200 Q300 180 370 210 Q430 235 500 215 Q550 200 600 220 L600 420 L0 420 Z"/>
        <!-- Kashmir: higher peaks -->
        <path id="mKashmir" d="M0 280 Q50 220 110 180 Q170 140 220 160 Q270 180 320 130 Q380 80 430 120 Q480 160 520 140 Q560 120 600 150 L600 420 L0 420 Z"/>
        <!-- Ladakh: dramatic jagged peaks -->
        <path id="mLadakh" d="M0 260 Q30 180 80 140 Q120 110 150 90 Q180 70 220 100 Q260 130 300 80 Q340 30 380 60 Q420 90 450 50 Q480 10 510 40 Q540 70 570 50 Q590 35 600 60 L600 420 L0 420 Z"/>
      </defs>

      <!-- Punjab layer (warm yellow-green) -->
      <use href="#mPunjab"   fill="#2a3a0a" opacity="0.6"/>
      <!-- Himachal layer (deep green) -->
      <use href="#mHimachal" fill="#1a3020" opacity="0.65"/>
      <!-- Kashmir layer (blue-grey) -->
      <use href="#mKashmir"  fill="#152035" opacity="0.7"/>
      <!-- Ladakh layer (dark slate) -->
      <use href="#mLadakh"   fill="#0d1520" opacity="0.8"/>

      <!-- Road path: winding through all zones -->
      <path d="M 300 410 C 295 360 310 330 290 290 C 270 250 305 210 280 170 C 255 130 310 100 295 60 C 285 35 300 10 300 10"
            stroke="url(#fbRoad)" stroke-width="18" fill="none" stroke-linecap="round"
            opacity="0.55"/>
      <!-- Road center dashes -->
      <path d="M 300 410 C 295 360 310 330 290 290 C 270 250 305 210 280 170 C 255 130 310 100 295 60 C 285 35 300 10 300 10"
            stroke="#3db39e" stroke-width="1.5" fill="none" stroke-linecap="round"
            stroke-dasharray="8 14" opacity="0.4"/>

      <!-- Pin markers along the road -->
      <!-- Pathankot (bottom) -->
      <circle cx="300" cy="390" r="5" fill="#3db39e" opacity="0.9"/>
      <circle cx="300" cy="390" r="10" fill="none" stroke="#3db39e" stroke-width="1" opacity="0.4"/>
      <!-- Himachal -->
      <circle cx="290" cy="280" r="4.5" fill="#3db39e" opacity="0.85"/>
      <circle cx="290" cy="280" r="9"   fill="none" stroke="#3db39e" stroke-width="1" opacity="0.35"/>
      <!-- Kashmir -->
      <circle cx="283" cy="170" r="4.5" fill="#3db39e" opacity="0.85"/>
      <circle cx="283" cy="170" r="9"   fill="none" stroke="#3db39e" stroke-width="1" opacity="0.35"/>
      <!-- Ladakh (top) -->
      <circle cx="296" cy="60" r="5" fill="#fff" opacity="0.9"/>
      <circle cx="296" cy="60" r="10" fill="none" stroke="#fff" stroke-width="1" opacity="0.3"/>

      <!-- Snow peak glints on Ladakh -->
      <circle cx="150" cy="88"  r="2" fill="#fff" opacity="0.6"/>
      <circle cx="300" cy="78"  r="2.5" fill="#fff" opacity="0.7"/>
      <circle cx="450" cy="48"  r="2" fill="#fff" opacity="0.6"/>
      <circle cx="510" cy="38"  r="1.5" fill="#fff" opacity="0.5"/>
    </svg>`;
  }

  /* ── Hero copy HTML ──────────────────────────────────────────────────── */
  function buildHeroCopy() {
    return `
    <div style="
      position:relative;z-index:10;
      display:flex;flex-direction:column;
      align-items:center;justify-content:center;
      text-align:center;
      padding:6rem 1.5rem 2rem;
      max-width:680px;margin:0 auto;
    ">
      <div style="
        display:inline-flex;align-items:center;gap:0.45rem;
        padding:0.35rem 0.85rem;
        border-radius:999px;
        background:rgba(255,255,255,0.08);
        border:1px solid rgba(255,255,255,0.14);
        color:#3db39e;
        font-size:0.72rem;
        font-family:'Poppins',sans-serif;
        font-weight:500;
        letter-spacing:0.03em;
        margin-bottom:1.5rem;
        backdrop-filter:blur(12px);
      ">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
        </svg>
        Verified &amp; Safe Outstation Cab Service
      </div>
      <h1 style="
        font-family:'Poppins',sans-serif;
        font-weight:700;
        font-size:clamp(2rem,7vw,3.75rem);
        line-height:1.14;
        color:#fff;
        letter-spacing:-0.02em;
        margin:0 0 1.25rem;
        text-shadow:0 2px 32px rgba(0,0,0,0.85);
      ">Explore the Mountains,<br>
        <span style="color:#3db39e">Travel in Comfort.</span>
      </h1>
      <p style="
        font-family:'Inter',sans-serif;
        font-size:clamp(0.875rem,2vw,1.1rem);
        color:rgba(255,255,255,0.7);
        max-width:38rem;
        line-height:1.65;
        margin:0 0 2.25rem;
        text-shadow:0 1px 16px rgba(0,0,0,0.6);
      ">Professional outstation taxi services from Pathankot. Trusted, secure, and affordable rides to North India&#8217;s most breathtaking hill destinations.</p>
      <div style="display:flex;flex-wrap:wrap;gap:0.875rem;align-items:center;justify-content:center">
        <a href="#booking" style="
          display:inline-flex;align-items:center;gap:0.5rem;
          background:#3db39e;color:#000;
          font-family:'Poppins',sans-serif;font-weight:600;font-size:0.9375rem;
          padding:0.8125rem 1.75rem;border-radius:0.75rem;
          text-decoration:none;
          box-shadow:0 4px 20px rgba(61,179,158,0.3);
        ">
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <rect x="3" y="4" width="18" height="18" rx="2"/>
            <line x1="16" y1="2" x2="16" y2="6"/>
            <line x1="8" y1="2" x2="8" y2="6"/>
            <line x1="3" y1="10" x2="21" y2="10"/>
          </svg>
          Book Your Ride
        </a>
        <a href="#destinations" style="
          display:inline-flex;align-items:center;
          background:rgba(255,255,255,0.1);color:#fff;
          border:1px solid rgba(255,255,255,0.28);
          font-family:'Poppins',sans-serif;font-weight:500;font-size:0.9375rem;
          padding:0.8125rem 1.75rem;border-radius:0.75rem;
          text-decoration:none;
          backdrop-filter:blur(8px);
        ">Explore Routes</a>
      </div>
    </div>`;
  }

  /* ── Route pin list overlaid on SVG ─────────────────────────────────── */
  function buildPinList() {
    var html = '<div style="position:absolute;right:1.5rem;top:50%;transform:translateY(-50%);z-index:10;display:flex;flex-direction:column;gap:1rem">';
    PINS.forEach(function(p) {
      html += `<div style="display:flex;align-items:center;gap:0.5rem;opacity:0.85">
        <span style="width:6px;height:6px;border-radius:50%;background:#3db39e;flex-shrink:0"></span>
        <div>
          <div style="font-family:'Poppins',sans-serif;font-size:0.72rem;font-weight:700;color:#fff;line-height:1.2">${p.label}</div>
          <div style="font-family:'Inter',sans-serif;font-size:0.6rem;color:#3db39e;opacity:0.8">${p.desc}</div>
        </div>
      </div>`;
    });
    html += '</div>';
    return html;
  }

  /* ── Main activate function ──────────────────────────────────────────── */
  function activate() {
    var container = document.getElementById('journeyFallback');
    var canvas    = document.getElementById('journeyCanvas');
    if (!container) return;

    /* Hide WebGL canvas */
    if (canvas) canvas.style.display = 'none';

    /* Inject style keyframes */
    var styleEl = document.createElement('style');
    styleEl.textContent = PALETTE_CSS;
    document.head.appendChild(styleEl);

    /* Build the animated gradient background */
    var bg = document.createElement('div');
    bg.className = 'journey-fallback__bg';
    bg.style.cssText = [
      'position:absolute;inset:0;',
      'background:linear-gradient(to bottom,',
        '#1a0800 0%,',    /* Punjab warm night */
        '#0d1f0a 22%,',   /* Himachal deep green */
        '#091628 48%,',   /* Kashmir blue-grey */
        '#040c18 72%,',   /* Ladakh cold dark */
        '#020609 100%',
      ');',
      'background-size:100% 400%;',
      'animation:journeyFbGrad 16s ease-in-out infinite alternate;',
    ].join('');
    container.appendChild(bg);

    /* SVG road illustration */
    var roadWrap = document.createElement('div');
    roadWrap.className = 'journey-fallback__road';
    roadWrap.innerHTML = buildRoadSVG();
    container.appendChild(roadWrap);

    /* Pin list */
    container.insertAdjacentHTML('beforeend', buildPinList());

    /* Hero copy */
    container.insertAdjacentHTML('beforeend', buildHeroCopy());

    /* Show fallback */
    container.hidden = false;
    container.style.display = 'flex';
  }

  /* ── Listen for journey:fallback event from journey.js ───────────────── */
  window.addEventListener('journey:fallback', activate, { once: true });

  /* ── Also handle the case where journey.js never runs (e.g. parse error) */
  /* Give journey.js 3 seconds to signal; if silent, show fallback */
  var timeout = setTimeout(function () {
    var canvas = document.getElementById('journeyCanvas');
    /* Only activate if canvas is still empty / not rendering */
    if (canvas && !canvas._journeyRunning) {
      activate();
    }
  }, 3000);

  window.addEventListener('journey:running', function () {
    clearTimeout(timeout);
  }, { once: true });

}());
