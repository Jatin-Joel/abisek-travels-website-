document.addEventListener('DOMContentLoaded', () => {
    // 1. Initialize Lucide Icons
    if (typeof lucide !== 'undefined') {
        lucide.createIcons();
    }

    // 2. Mobile Menu Toggle
    const mobileMenuBtn = document.getElementById('mobileMenuBtn');
    const mobileMenu = document.getElementById('mobileMenu');
    
    if (mobileMenuBtn && mobileMenu) {
        mobileMenuBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            mobileMenu.classList.toggle('hidden');
        });
        
        // Close menu when clicking outside
        document.addEventListener('click', (e) => {
            if (!mobileMenu.classList.contains('hidden') && !mobileMenu.contains(e.target) && e.target !== mobileMenuBtn) {
                mobileMenu.classList.add('hidden');
            }
        });

        // Close menu on Escape key
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && !mobileMenu.classList.contains('hidden')) {
                mobileMenu.classList.add('hidden');
            }
        });
        
        // Close menu when clicking on links
        mobileMenu.querySelectorAll('a').forEach(link => {
            link.addEventListener('click', () => {
                mobileMenu.classList.add('hidden');
            });
        });
    }

    // 3. Custom Cursor Tracker (Enhancement only, native cursor remains)
    const cursor = document.getElementById('customCursor');
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const isFinePointer = window.matchMedia('(pointer: fine)').matches;

    if (cursor && isFinePointer && !prefersReducedMotion) {
        let mouseX = window.innerWidth / 2;
        let mouseY = window.innerHeight / 2;
        let cursorX = mouseX;
        let cursorY = mouseY;
        let isCursorActive = false;

        document.addEventListener('mousemove', (e) => {
            mouseX = e.clientX;
            mouseY = e.clientY;
            if (!isCursorActive) {
                isCursorActive = true;
                cursor.style.opacity = '1';
            }
        }, { passive: true });

        const renderCursor = () => {
            // Smooth lerp
            cursorX += (mouseX - cursorX) * 0.2;
            cursorY += (mouseY - cursorY) * 0.2;
            
            // Use translate3d instead of top/left for performance
            cursor.style.transform = `translate3d(${cursorX}px, ${cursorY}px, 0) translate(-50%, -50%)`;
            requestAnimationFrame(renderCursor);
        };
        requestAnimationFrame(renderCursor);

        // Hover effect for interactive elements
        const setupHover = () => {
            const hoverables = document.querySelectorAll('a, button, input, select, textarea, [role="button"]');
            hoverables.forEach((el) => {
                if (!el.hasAttribute('data-cursor-bound')) {
                    el.addEventListener('mouseenter', () => cursor.classList.add('hover'));
                    el.addEventListener('mouseleave', () => cursor.classList.remove('hover'));
                    el.setAttribute('data-cursor-bound', 'true');
                }
            });
        };
        
        setupHover();
        setInterval(setupHover, 2000);
    }

    // 4. Parallax Hero Background & Navbar Scroll styling (Passive for performance)
    const navbar = document.getElementById('navbar');
    const heroBg = document.getElementById('heroBg');

    window.addEventListener('scroll', () => {
        const scrollY = window.scrollY;
        
        // Navbar scrolled state
        if (navbar) {
            if (scrollY > 30) {
                navbar.classList.add('scrolled');
                navbar.classList.remove('py-4', 'sm:py-6');
                navbar.classList.add('py-3');
            } else {
                navbar.classList.remove('scrolled');
                navbar.classList.remove('py-3');
                navbar.classList.add('py-4', 'sm:py-6');
            }
        }

        // Hero parallax
        if (heroBg && window.innerWidth >= 768) {
            heroBg.style.transform = `translate3d(0, ${scrollY * 0.3}px, 0)`;
        }
    }, { passive: true });

    // 5. Scroll Reveal Intersection Observer
    const scrollRevealObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('visible');
            }
        });
    }, {
        threshold: 0.08,
        rootMargin: '0px 0px -30px 0px'
    });

    // Register elements for fade-in scroll reveal
    const animateElements = document.querySelectorAll('.fade-in, .fade-in-left, .fade-in-right');
    animateElements.forEach(el => {
        scrollRevealObserver.observe(el);
    });

    // Register scroll animations container triggers
    const scrollAnimateContainers = document.querySelectorAll('.scroll-animate');
    scrollAnimateContainers.forEach(container => {
        scrollRevealObserver.observe(container);
        container.querySelectorAll('.fade-in, .fade-in-left, .fade-in-right').forEach(child => {
            scrollRevealObserver.observe(child);
        });
    });

    // 6. Stats Count-Up Animation (requestAnimationFrame + cubic ease-out, fires once)
    const counterNumbers = document.querySelectorAll('.counter-number');

    const counterObserver = new IntersectionObserver((entries, observer) => {
        entries.forEach(entry => {
            if (entry.isIntersecting && !entry.target.dataset.counted) {
                entry.target.dataset.counted = 'true';
                observer.unobserve(entry.target);
                const target = parseInt(entry.target.getAttribute('data-target'), 10);
                animateCounter(entry.target, target);
            }
        });
    }, { threshold: 0.25 });

    counterNumbers.forEach(num => counterObserver.observe(num));

    function animateCounter(element, targetValue) {
        const duration = 1600; // ms
        const startTime = performance.now();

        function easeOut(t) {
            return 1 - Math.pow(1 - t, 3);
        }

        function tick(now) {
            const elapsed = now - startTime;
            const rawProgress = Math.min(elapsed / duration, 1);
            const easedProgress = easeOut(rawProgress);
            element.textContent = Math.floor(easedProgress * targetValue);

            if (rawProgress < 1) {
                requestAnimationFrame(tick);
            } else {
                element.textContent = targetValue;
            }
        }

        requestAnimationFrame(tick);
    }

    // 7. Booking Form Handler (WhatsApp Redirect)
    const bookingForm = document.getElementById('whatsappBookingForm');
    if (bookingForm) {
        bookingForm.addEventListener('submit', (e) => {
            e.preventDefault();
            
            const name = document.getElementById('bookingName').value || 'Not specified';
            const whatsapp = document.getElementById('bookingWhatsapp').value || 'Not specified';
            const pickup = document.getElementById('bookingPickup').value || 'Not specified';
            const drop = document.getElementById('bookingDrop').value || 'Not specified';
            const datetime = document.getElementById('bookingDate').value;

            // Format travel date into a readable format
            let formattedDate = datetime || 'Not specified';
            if (datetime) {
                try {
                    const dateObj = new Date(datetime);
                    formattedDate = dateObj.toLocaleString('en-IN', { 
                        dateStyle: 'medium', 
                        timeStyle: 'short' 
                    });
                } catch(e) {
                    // fallback to raw string
                }
            }

            const message = `New Booking Request 🚖\nName: ${name}\nContact: ${whatsapp}\nPickup: ${pickup}\nDrop: ${drop}\nDate: ${formattedDate}`;
            
            // Open in WhatsApp API
            const whatsappUrl = `https://wa.me/917814442326?text=${encodeURIComponent(message)}`;
            window.open(whatsappUrl, '_blank');
        });
    }

    // 8. Copyright Year Dynamic Update
    const copyrightYear = document.getElementById('copyrightYear');
    if (copyrightYear) {
        copyrightYear.textContent = new Date().getFullYear();
    }

    // 9. FAQ Accordion
    const faqBtns = document.querySelectorAll('.faq-btn');
    faqBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const body = btn.nextElementSibling;
            const icon = btn.querySelector('.faq-icon');
            const isOpen = !body.classList.contains('hidden');

            // Close all
            document.querySelectorAll('.faq-body').forEach(b => b.classList.add('hidden'));
            document.querySelectorAll('.faq-btn').forEach(b => {
                b.setAttribute('aria-expanded', 'false');
                b.querySelector('.faq-icon')?.classList.remove('rotate-180');
            });

            // Toggle current
            if (!isOpen) {
                body.classList.remove('hidden');
                btn.setAttribute('aria-expanded', 'true');
                icon?.classList.add('rotate-180');
            }
        });
    });
});


// Premium Navbar Scroll & Mobile Menu
document.addEventListener('DOMContentLoaded', () => {
    const navbar = document.getElementById('navbar');
    if (!navbar) return;

    // Use IntersectionObserver on the hero section for accurate transitioning
    const heroSection = document.getElementById('home') || document.querySelector('.hero-section'); 
    
    if (heroSection) {
        // Trigger when the hero section leaves the top bounds minus navbar height
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (!entry.isIntersecting) {
                    navbar.classList.remove('nav-transparent');
                    navbar.classList.add('nav-scrolled');
                } else {
                    navbar.classList.add('nav-transparent');
                    navbar.classList.remove('nav-scrolled');
                }
            });
        }, {
            // When the bottom of the hero crosses the top of the viewport
            rootMargin: "-56px 0px 0px 0px",
            threshold: 0
        });
        observer.observe(heroSection);
    } else {
        // Fallback for pages without a clear hero
        let ticking = false;
        const onScroll = () => {
            if (window.scrollY > 56) {
                navbar.classList.remove('nav-transparent');
                navbar.classList.add('nav-scrolled');
            } else {
                navbar.classList.add('nav-transparent');
                navbar.classList.remove('nav-scrolled');
            }
            ticking = false;
        };
        window.addEventListener('scroll', () => {
            if (!ticking) {
                window.requestAnimationFrame(onScroll);
                ticking = true;
            }
        }, {passive: true});
        onScroll(); // initial check
    }

    const mobileBtn = document.getElementById('mobileMenuBtn');
    const mobileMenu = document.getElementById('mobileMenu');
    if (mobileBtn && mobileMenu) {
        mobileBtn.addEventListener('click', () => {
            mobileMenu.classList.toggle('hidden');
        });
        const mLinks = mobileMenu.querySelectorAll('a.mobile-nav-link');
        mLinks.forEach(l => l.addEventListener('click', () => mobileMenu.classList.add('hidden')));
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') mobileMenu.classList.add('hidden');
        });
    }
});
