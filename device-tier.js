/**
 * device-tier.js
 * Abisek Travels -- Device Performance Tier Detection
 *
 * Classifies the current device as 'low', 'mid', or 'high' based on:
 *   - navigator.hardwareConcurrency  (CPU cores)
 *   - navigator.deviceMemory         (RAM in GB, Chrome/Android only)
 *   - Mobile user-agent detection    (Android / iPhone)
 *   - navigator.connection.saveData  (Data Saver -- forces 'low')
 *   - prefers-reduced-motion         (accessibility -- forces 'low')
 *
 * Result is written to:
 *   document.documentElement.dataset.tier   ('low' | 'mid' | 'high')
 *   window.__deviceTier                     (same string, for JS access)
 *
 * This script is intentionally tiny and runs synchronously so other
 * scripts can read window.__deviceTier immediately on load.
 */
(function () {
  'use strict';

  // 1. Hard overrides (always win)
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    setTier('low'); return;
  }

  var conn = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
  if (conn && conn.saveData === true) {
    setTier('low'); return;
  }

  // 2. Hardware signals
  var cores    = navigator.hardwareConcurrency || 0;
  var ramGB    = navigator.deviceMemory        || 0;
  var isMobile = /Android|iPhone/i.test(navigator.userAgent);
  var ect      = conn ? conn.effectiveType : null;

  // Low-tier network overrides hardware
  if (ect === 'slow-2g' || ect === '2g') {
    setTier('low'); return;
  }

  // 3. Tier classification
  var tier;

  if (isMobile) {
    if      (cores >= 8 && (ramGB === 0 || ramGB >= 4)) { tier = 'high'; }
    else if (cores >= 4)                                 { tier = 'mid';  }
    else                                                 { tier = 'low';  }
  } else {
    if      (cores >= 8) { tier = 'high'; }
    else if (cores >= 4) { tier = 'mid';  }
    else if (cores === 0){ tier = 'mid';  }  // unknown -- assume mid on desktop
    else                 { tier = 'low';  }

    // Low-RAM desktop pulls down one tier
    if (ramGB > 0 && ramGB < 2 && tier !== 'low') {
      tier = tier === 'high' ? 'mid' : 'low';
    }
  }

  setTier(tier);

  function setTier(t) {
    document.documentElement.dataset.tier = t;
    window.__deviceTier = t;
  }
})();
