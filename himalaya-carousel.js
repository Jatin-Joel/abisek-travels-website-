/**
 * himalaya-carousel.js
 * Abisek Travels — Cinematic Himalayan Destination Carousel
 *
 * Architecture:
 *  Layer 1 — Canvas frame sequencer  (#himalayaBg)
 *             Plays 300 extracted JPEG frames at ~24fps, looping continuously.
 *             Completely independent of carousel state.
 *
 *  Layer 3 — CSS-3D destination-card carousel  (#destCarousel)
 *             5 destination cards driven from DESTINATIONS data array.
 *             Active card: centered, full-size, opaque.
 *             Neighbours: scaled, rotated, offset in Z.
 *             GSAP animates every property transition.
 *
 *  Scroll   — GSAP ScrollTrigger scrubs the 500vh journey-section.
 *             Each 20% of scroll progress maps to one destination.
 *             Prev/Next buttons use the same underlying activeIndex state.
 *
 * Dependencies: GSAP + ScrollTrigger (already loaded as UMD globals)
 */

(function () {
  'use strict';

  /* ═══════════════════════════════════════════════════════════════════════
     0. DESTINATION DATA
  ════════════════════════════════════════════════════════════════════════ */

  const DESTINATIONS = [
    {
      id:       1,
      name:     'Himachal Pradesh',
      location: 'Dharamshala · Manali · Dalhousie',
      image:    'assets/dest_dharamshala.png',
      cta:      'Explore',
    },
    {
      id:       2,
      name:     'Kashmir',
      location: 'Srinagar · Gulmarg · Pahalgam',
      image:    'assets/dest_kashmir.png',
      cta:      'Explore',
    },
    {
      id:       3,
      name:     'Leh-Ladakh',
      location: 'Leh · Nubra Valley · Pangong',
      image:    'assets/dest_leh_ladakh.png',
      cta:      'Explore',
    },
    {
      id:       4,
      name:     'Uttarakhand',
      location: 'Mussoorie · Nainital · Rishikesh',
      image:    'assets/dest_nainital.png',
      cta:      'Explore',
    },
    {
      id:       5,
      name:     'Pathankot',
      location: 'Local & Outstation Transfers',
      image:    'assets/dest_pathankot.png',
      cta:      'Book Now',
    },
  ];

  const TOTAL = DESTINATIONS.length;

  /* ═══════════════════════════════════════════════════════════════════════
     1. REDUCED-MOTION DETECTION
  ════════════════════════════════════════════════════════════════════════ */

  const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Background Video Crossfade Engine
  function initSeamlessVideoLoop() {
    const vidA = document.getElementById('himalayaBgA');
    const vidB = document.getElementById('himalayaBgB');
    if (!vidA || !vidB) return;

    if (prefersReduced) {
      // Fallback: just show first frame of A
      vidA.style.opacity = 1;
      vidB.style.opacity = 0;
      return;
    }

    let activeVid = vidA;
    let inactiveVid = vidB;
    let isCrossfading = false;
    const crossfadeDuration = 0.8; // smooth 800ms blend

    // Kickoff initial video
    activeVid.play().catch(() => {});

    function checkLoop() {
      requestAnimationFrame(checkLoop);
      
      if (isCrossfading || !activeVid.duration) return;

      const timeLeft = activeVid.duration - activeVid.currentTime;
      if (timeLeft <= crossfadeDuration && timeLeft > 0) {
        isCrossfading = true;
        
        // Prepare and play the inactive video from the start
        inactiveVid.currentTime = 0;
        inactiveVid.play().catch(() => {});
        
        // Perform the crossfade
        gsap.to(inactiveVid, { opacity: 1, duration: crossfadeDuration, ease: "none" });
        gsap.to(activeVid, { 
          opacity: 0, 
          duration: crossfadeDuration, 
          ease: "none", 
          onComplete: () => {
            activeVid.pause();
            
            // Swap roles for the next cycle
            const temp = activeVid;
            activeVid = inactiveVid;
            inactiveVid = temp;
            
            isCrossfading = false;
          }
        });
      }
    }

    requestAnimationFrame(checkLoop);
  }

  /* ═══════════════════════════════════════════════════════════════════════
     3. BUILD CAROUSEL DOM
  ════════════════════════════════════════════════════════════════════════ */

  function buildCarouselDOM() {
    const carousel = document.getElementById('destCarousel');
    if (!carousel) return;

    

    // Build card elements
    DESTINATIONS.forEach((dest, i) => {
      const card = document.createElement('div');
      card.className   = 'dest-card';
      card.dataset.index = String(i);

      card.innerHTML = `
        <div class="dest-card__parallax">
          <div class="dest-card__inner">
            <div class="dest-card__img-wrap">
              <img
                src="${dest.image}"
                alt="${dest.name}"
                class="dest-card__img"
                loading="${i === 0 ? 'eager' : 'lazy'}"
                decoding="async"
              >
            </div>
            <div class="dest-card__glass-edge"></div>
            <div class="dest-card__glint"></div>
            <div class="dest-card__info">
              <span class="dest-card__number">0${i + 1}</span>
              <h2 class="dest-card__name">${dest.name}</h2>
              <p class="dest-card__location">${dest.location}</p>
              <a href="#booking" class="dest-card__cta" aria-label="Book ${dest.name}">${dest.cta} <span aria-hidden="true">→</span></a>
            </div>
          </div>
        </div>
      `;

      card.addEventListener('click', () => {
        goToDestination(i);
      });

      carousel.appendChild(card);
    });
  }

  /* ═══════════════════════════════════════════════════════════════════════
     4. CARD LAYOUT ENGINE
  ════════════════════════════════════════════════════════════════════════ */

  /**
   * Returns the GSAP-ready transform object for a card at relative position
   * `offset` from the active card (-2, -1, 0, +1, +2).
   */
  function cardTransform(offset) {
    const isMobile = window.innerWidth < 640;
    const isTouch = window.matchMedia('(hover: none)').matches || window.matchMedia('(pointer: coarse)').matches;
    const isTablet = window.innerWidth < 1024;

    const abs = Math.abs(offset);

    if (abs === 0) {
      // Active
      return {
        x:       0,
        z:       0,
        rotateY: 0,
        scale:   1.0,
        opacity: 1.0,
        filter:  'brightness(1)',
        zIndex:  10,
      };
    }

    const dir = offset > 0 ? 1 : -1;

    if (abs === 1) {
      // Immediate neighbour
      const tx = isMobile ? dir * 160 : isTablet ? dir * 260 : dir * 370;
      return {
        x:       tx,
        z:       -160,
        rotateY: dir * -15,
        scale:   isMobile ? 0.72 : 0.82,
        opacity: isMobile ? 0.6 : 0.75,
        filter:  'brightness(0.65)',
        zIndex:  8,
      };
    }

    if (abs === 2) {
      // Far neighbour
      if (isMobile) {
        return {
          x:       dir * 800,
          z:       -400,
          rotateY: dir * -30,
          scale:   0.50,
          opacity: 0,
          filter:  'brightness(0.4)',
          zIndex:  5,
        };
      }
      const tx = isTablet ? dir * 460 : dir * 580;
      return {
        x:       tx,
        z:       -350,
        rotateY: dir * -25,
        scale:   isTablet ? 0.58 : 0.68,
        opacity: 0.35,
        filter:  'brightness(0.4)',
        zIndex:  5,
      };
    }

    // Beyond visible range
    return {
      x:       dir * 1000,
      z:       -500,
      rotateY: dir * -35,
      scale:   0.5,
      opacity: 0,
      filter:  'brightness(0.3)',
      zIndex:  2,
    };
  }

  /* ═══════════════════════════════════════════════════════════════════════
     5. CAROUSEL STATE & GSAP ANIMATION
  ════════════════════════════════════════════════════════════════════════ */

  let activeIndex = 0;
  let isAnimating = false;

  function getCards() {
    return Array.from(document.querySelectorAll('.dest-card'));
  }

  /**
   * Animate all cards to reflect `newIndex` as the active destination.
   * @param {number} newIndex - The new active card index
   * @param {boolean} immediate - If true, snap without animation
   * @param {boolean} fromScroll - If true, bypass the isAnimating lock (scroll always wins)
   */
  function goToDestination(newIndex, immediate = false, fromScroll = false) {
    newIndex = ((newIndex % TOTAL) + TOTAL) % TOTAL; // safe modulo
    if (newIndex === activeIndex && !immediate) return;

    if (isAnimating && !immediate && !fromScroll) return;
    if (!immediate && !fromScroll) isAnimating = true;

    activeIndex = newIndex;
    updateCounter();
    updateHUD();
    
    // Optional Micro-Animation on tagline transition
    if (!immediate) {
      const hCopy = document.getElementById('journeyHeroCopy');
      if (hCopy) {
        gsap.fromTo(hCopy,
          { opacity: 0.65 },
          { opacity: 0.85, duration: 0.4, yoyo: true, repeat: 1, ease: 'power2.inOut', overwrite: 'auto' }
        );
      }
    }

    const cards = getCards();
    const isMobile = window.innerWidth < 640;
    const dur   = prefersReduced || immediate ? 0 : (isMobile ? 0.55 : 0.7);
    const ease  = 'power3.out';

    cards.forEach((card, i) => {
      // Toggle is-active for CSS hover states
      if (i === activeIndex) {
        card.classList.add('is-active');
        // Trigger Glint Effect ONCE
        if (!immediate && !prefersReduced) {
          const glint = card.querySelector('.dest-card__glint');
          if (glint) {
            glint.classList.remove('glint-run');
            void glint.offsetWidth; // trigger reflow
            glint.classList.add('glint-run');
          }
        }
      } else {
        card.classList.remove('is-active');
        // Reset parallax
        if (!prefersReduced && !isMobile) {
          const parallaxEl = card.querySelector('.dest-card__parallax');
          if (parallaxEl) {
            gsap.to(parallaxEl, { rotateY: 0, rotateX: 0, x: 0, y: 0, duration: 0.8, ease: 'power2.out' });
          }
        }
      }

      const offset = i - activeIndex;
      // Wrap offset for circular feel (though we don't wrap visually beyond ±2)
      const t = cardTransform(offset);

      const tl = gsap.to(card, {
        x:          t.x,
        z:          t.z,
        rotateY:    t.rotateY,
        scale:      t.scale,
        opacity:    t.opacity,
        filter:     t.filter,
        zIndex:     t.zIndex,
        duration:   dur,
        ease:       ease,
        force3D:    true,
        onComplete: () => {
          if (i === cards.length - 1) isAnimating = false;
        },
      });
    });
  }

  /* ═══════════════════════════════════════════════════════════════════════
     6. COUNTER & HUD
  ════════════════════════════════════════════════════════════════════════ */

  function updateCounter() {
    const el = document.getElementById('carouselCounter');
    if (!el) return;
    const n = String(activeIndex + 1).padStart(2, '0');
    const t = String(TOTAL).padStart(2, '0');
    el.textContent = `${n} / ${t}`;
  }

  function updateHUD() {
    const label = document.getElementById('journeyRegionLabel');
    if (!label) return;
    const dest = DESTINATIONS[activeIndex];
    label.innerHTML = `
      <span class="journey-label-region">${dest.name}</span>
      <span class="journey-label-desc">${dest.location}</span>
    `;
    // Keep HUD visible during journey
    label.style.opacity = '1';
  }

  /* ═══════════════════════════════════════════════════════════════════════
     7. SCROLL-TRIGGER BINDING
  ════════════════════════════════════════════════════════════════════════ */

  function initScrollTrigger() {
    if (typeof gsap === 'undefined' || typeof ScrollTrigger === 'undefined') {
      console.warn('himalaya-carousel: GSAP or ScrollTrigger not found');
      return;
    }

    gsap.registerPlugin(ScrollTrigger);

    const section = document.querySelector('.journey-section');
    if (!section) return;

    // Progress bar
    const progressBar = document.getElementById('journeyProgress');

    // Scroll cue — hide after first scroll
    const scrollCue = document.getElementById('journeyScrollCue');
    let scrollCueHidden = false;

    ScrollTrigger.create({
      trigger:    section,
      start:      'top top',
      end:        'bottom bottom',
      scrub:      1,             // smooth scrubbing
      pin:        false,         // pinning is handled by CSS position:sticky on .journey-sticky
      onUpdate:   (self) => {
        const progress = self.progress; // 0 → 1

        // Update progress bar
        if (progressBar) {
          progressBar.style.width = (progress * 100) + '%';
        }

        // Hide scroll cue on first scroll
        if (!scrollCueHidden && progress > 0.01) {
          scrollCueHidden = true;
          if (scrollCue) {
            gsap.to(scrollCue, { opacity: 0, duration: 0.4 });
          }
        }

        // Map scroll progress → destination index
        // Each destination occupies 1/TOTAL of the scroll range
        const rawIndex = Math.floor(progress * TOTAL);
        const clampedIndex = Math.min(rawIndex, TOTAL - 1);

        if (clampedIndex !== activeIndex) {
          goToDestination(clampedIndex, false, true); // fromScroll=true
        }
      },
      onLeaveBack: () => {
        // Scrolled back to top — reset to first destination
        goToDestination(0, false);
        if (scrollCue) {
          gsap.to(scrollCue, { opacity: 1, duration: 0.4 });
          scrollCueHidden = false;
        }
        if (progressBar) {
          progressBar.style.width = '0%';
        }
      },
    });
  }

  /* ═══════════════════════════════════════════════════════════════════════
     8. PREV / NEXT CONTROLS
  ════════════════════════════════════════════════════════════════════════ */

  function initControls() {
    const btnPrev = document.getElementById('carouselPrev');
    const btnNext = document.getElementById('carouselNext');
    if (!btnPrev || !btnNext) return;

    btnPrev.addEventListener('click', () => {
      goToDestination(activeIndex - 1);
    });

    btnNext.addEventListener('click', () => {
      goToDestination(activeIndex + 1);
    });

    // Keyboard navigation
    document.addEventListener('keydown', (e) => {
      // Only handle keys when journey section is in view
      const section = document.querySelector('.journey-section');
      if (!section) return;
      const rect = section.getBoundingClientRect();
      if (rect.bottom < 0 || rect.top > window.innerHeight) return;

      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
        e.preventDefault();
        goToDestination(activeIndex + 1);
      } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
        e.preventDefault();
        goToDestination(activeIndex - 1);
      }
    });
  }

  /* ═══════════════════════════════════════════════════════════════════════
     9. SUBTLE PARALLAX (DESKTOP)
  ════════════════════════════════════════════════════════════════════════ */

  function initParallax() {
    const isMobile = window.innerWidth < 640;
    if (prefersReduced || isMobile || isTouch) return;
    
    let mouseX = 0, mouseY = 0;
    const section = document.querySelector('.journey-section');
    if (!section) return;

    section.addEventListener('mousemove', (e) => {
      mouseX = (e.clientX / window.innerWidth - 0.5) * 2;
      mouseY = (e.clientY / window.innerHeight - 0.5) * 2;
      
      if (!isAnimating) {
        requestAnimationFrame(updateParallax);
      }
    }, { passive: true });

    function updateParallax() {
      if (isAnimating) return; // Prevent fighting GSAP transitions
      const cards = getCards();
      const activeCard = cards[activeIndex];
      if (!activeCard) return;

      const parallaxEl = activeCard.querySelector('.dest-card__parallax');
      if (parallaxEl) {
        gsap.to(parallaxEl, {
          rotateY: mouseX * 2.5,
          rotateX: -mouseY * 2.5,
          x: mouseX * 8,
          y: mouseY * 8,
          duration: 0.8,
          ease: 'power2.out'
        });
      }
    }
  }

  /* ═══════════════════════════════════════════════════════════════════════
     10. TOUCH / SWIPE SUPPORT
  ════════════════════════════════════════════════════════════════════════ */

  function initTouch() {
    const carousel = document.getElementById('destCarousel');
    if (!carousel) return;

    let touchStartX = 0;
    let touchStartY = 0;
    const SWIPE_THRESHOLD = 50; // px

    carousel.addEventListener('touchstart', (e) => {
      touchStartX = e.touches[0].clientX;
      touchStartY = e.touches[0].clientY;
    }, { passive: true });

    carousel.addEventListener('touchend', (e) => {
      const dx = e.changedTouches[0].clientX - touchStartX;
      const dy = e.changedTouches[0].clientY - touchStartY;
      // Only trigger if horizontal swipe is dominant
      if (Math.abs(dx) > SWIPE_THRESHOLD && Math.abs(dx) > Math.abs(dy) * 1.5) {
        if (dx < 0) {
          goToDestination(activeIndex + 1); // swipe left → next
        } else {
          goToDestination(activeIndex - 1); // swipe right → prev
        }
      }
    }, { passive: true });
  }

  /* ═══════════════════════════════════════════════════════════════════════
     10. HERO COPY FADE-OUT ON SCROLL
  ════════════════════════════════════════════════════════════════════════ */

  function initHeroCopyFade() {
    const heroCopy = document.getElementById('journeyHeroCopy');
    if (!heroCopy || typeof ScrollTrigger === 'undefined') return;

    ScrollTrigger.create({
      trigger: '.journey-section',
      start:   'top top',
      end:     '15% top',
      scrub:   true,
      onUpdate: (self) => {
        heroCopy.style.opacity = String((1 - self.progress) * 0.85);
      },
    });
  }

  /* ═══════════════════════════════════════════════════════════════════════
     11. RESPONSIVE RECALCULATION
  ════════════════════════════════════════════════════════════════════════ */

  function initResizeHandler() {
    let resizeTimer;
    window.addEventListener('resize', () => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => {
        // Re-apply layout instantly (no animation on resize)
        goToDestination(activeIndex, true);
      }, 150);
    }, { passive: true });
  }

  /* ═══════════════════════════════════════════════════════════════════════
     12. CINEMATIC ENTRANCE ANIMATION
  ════════════════════════════════════════════════════════════════════════ */

  function initEntranceAnimation() {
    const isMobile = window.innerWidth < 640;
    if (prefersReduced) return;
    
    const navbar = document.getElementById('navbar');
    const heroCopy = document.querySelector('.journey-hero-copy');
    const controls = document.querySelector('.carousel-controls');
    const cards = getCards();
    
    // Set initial states for entrance
      if (!isMobile) {
        gsap.set(navbar, { y: -50, opacity: 0 });
        gsap.set(heroCopy, { y: 20, opacity: 0 });
        gsap.set(controls, { opacity: 0 });
      }
    
    // Animate active card specifically (from scale 0.9 and slightly further back)
    const activeCard = cards[activeIndex];
    if (activeCard) {
      gsap.fromTo(activeCard, 
        { scale: 0.9, z: -100, opacity: 0 },
        { scale: 1, z: 0, opacity: 1, duration: isMobile ? 0.4 : 1.2, ease: 'power3.out', delay: 0 }
      );
    }
    
    // Animate side cards
    cards.forEach((card, i) => {
      if (i === activeIndex) return;
      gsap.fromTo(card,
        { opacity: 0, scale: 0.4 },
        { opacity: parseFloat(card.style.opacity) || 0.5, scale: parseFloat(card.style.transform.match(/scale\(([^)]+)\)/)?.[1]) || 0.7, duration: isMobile ? 0.4 : 1.2, ease: 'power3.out', delay: 05 }
      );
    });

    // Sequence the UI elements
    const tl = gsap.timeline({ delay: 0.1 });
    tl.to(navbar, { y: 0, opacity: 1, duration: 1, ease: 'power2.out' })
      .to(heroCopy, { y: 0, opacity: 0.85, duration: isMobile ? 0.7 : 1.0, ease: "power3.out" }, "-=0.6")
      .to(controls, { opacity: 1, duration: 1, ease: 'power2.out' }, "-=0.8");
  }

  /* ═══════════════════════════════════════════════════════════════════════
     13. INIT
  ════════════════════════════════════════════════════════════════════════ */

  function init() {
    // Build DOM first
    buildCarouselDOM();

    // Set initial card positions immediately (no animation)
    goToDestination(0, true);

    // Start background video seamlessly
    initSeamlessVideoLoop();

    // Bind scroll, controls, touch, parallax
    initScrollTrigger();
    initControls();
    initTouch();
    initParallax();
    initHeroCopyFade();
    initResizeHandler();
    initAboutAnimation();

    // Run entrance animation
    initEntranceAnimation();

    // Set initial HUD and counter
    updateCounter();
    updateHUD();

    // Ensure journeyProgress starts at 0
    const progressBar = document.getElementById('journeyProgress');
    if (progressBar) progressBar.style.width = '0%';
  }

  /* ═══════════════════════════════════════════════════════════════════════
     13. ABOUT SECTION CINEMATIC REVEAL
  ════════════════════════════════════════════════════════════════════════ */
  
  function initAboutAnimation() {
    if (prefersReduced) return;
    
    const aboutSection = document.getElementById('about');
    if (!aboutSection) return;

    const tl = gsap.timeline({
      scrollTrigger: {
        trigger: aboutSection,
        start: 'top 75%',
        end: 'bottom 25%',
        toggleActions: 'play none none reverse'
      }
    });

    // Glass panel subtle rise
    tl.from('.about-glass-panel', {
      y: 40,
      opacity: 0,
      duration: 1.2,
      ease: 'power3.out'
    })
    // Headings and paragraph
    .from(['.about-heading-sub', '.about-heading-main', '.about-paragraph'], {
      y: 20,
      opacity: 0,
      duration: 0.8,
      stagger: 0.15,
      ease: 'power2.out'
    }, '-=0.8')
    // Statistics stagger
    .from('.about-stat', {
      x: -15,
      opacity: 0,
      duration: 0.8,
      stagger: 0.15,
      ease: 'power2.out'
    }, '-=0.5')
    // Image subtle scale down and fade
    .from('.about-image-wrapper', {
      scale: 1.05,
      opacity: 0,
      duration: 1.5,
      ease: 'power2.out'
    }, '-=1.2');
  }

  // Run after DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
