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
        
        // Close menu when clicking on links
        mobileMenu.querySelectorAll('a').forEach(link => {
            link.addEventListener('click', () => {
                mobileMenu.classList.add('hidden');
            });
        });
    }

    // 3. Custom Cursor Tracker
    const cursor = document.getElementById('customCursor');
    if (cursor) {
        let mouseX = 0;
        let mouseY = 0;
        let cursorX = 0;
        let cursorY = 0;

        document.addEventListener('mousemove', (e) => {
            mouseX = e.clientX;
            mouseY = e.clientY;
        });

        // Smooth cursor follow (lerp)
        const renderCursor = () => {
            const dx = mouseX - cursorX;
            const dy = mouseY - cursorY;
            cursorX += dx * 0.15;
            cursorY += dy * 0.15;
            cursor.style.left = `${cursorX}px`;
            cursor.style.top = `${cursorY}px`;
            requestAnimationFrame(renderCursor);
        };
        renderCursor();

        // Hover effect for interactive elements
        const hoverables = document.querySelectorAll('a, button, input, select, textarea, [role="button"], #mobileMenuBtn');
        hoverables.forEach((el) => {
            el.addEventListener('mouseenter', () => cursor.classList.add('hover'));
            el.addEventListener('mouseleave', () => cursor.classList.remove('hover'));
        });
    }

    // 4. Parallax Hero Background & Navbar Scroll styling
    const navbar = document.getElementById('navbar');
    const heroBg = document.getElementById('heroBg');

    window.addEventListener('scroll', () => {
        const scrollY = window.scrollY;
        
        // Navbar scrolled state
        if (navbar) {
            if (scrollY > 50) {
                navbar.classList.add('scrolled');
                navbar.classList.remove('py-6');
                navbar.classList.add('py-4');
            } else {
                navbar.classList.remove('scrolled');
                navbar.classList.remove('py-4');
                navbar.classList.add('py-6');
            }
        }

        // Hero parallax
        if (heroBg) {
            heroBg.style.transform = `translate3d(0, ${scrollY * 0.35}px, 0)`;
        }
    });

    // 5. Scroll Reveal Intersection Observer
    const scrollRevealObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('visible');
            }
        });
    }, {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px'
    });

    // Register elements for fade-in scroll reveal
    const animateElements = document.querySelectorAll('.fade-in, .fade-in-left, .fade-in-right');
    animateElements.forEach(el => {
        scrollRevealObserver.observe(el);
    });

    // Register scroll animations container triggers
    const scrollAnimateContainers = document.querySelectorAll('.scroll-animate');
    scrollAnimateContainers.forEach(container => {
        // Trigger reveal of children inside section container when section hits screen
        scrollRevealObserver.observe(container);
        container.querySelectorAll('.fade-in, .fade-in-left, .fade-in-right').forEach(child => {
            scrollRevealObserver.observe(child);
        });
    });

    // 6. Stats Count-Up Animation (requestAnimationFrame + cubic ease-out, fires once)
    const counterNumbers = document.querySelectorAll('.counter-number');

    const counterObserver = new IntersectionObserver((entries, observer) => {
        entries.forEach(entry => {
            // Guard: only fire if intersecting AND not already counted
            if (entry.isIntersecting && !entry.target.dataset.counted) {
                entry.target.dataset.counted = 'true'; // lock immediately — prevents any re-trigger
                observer.unobserve(entry.target);
                const target = parseInt(entry.target.getAttribute('data-target'), 10);
                animateCounter(entry.target, target);
            }
        });
    }, { threshold: 0.3 }); // 30% visible is enough to start

    counterNumbers.forEach(num => counterObserver.observe(num));

    function animateCounter(element, targetValue) {
        const duration = 1800; // ms — 1.8 s total
        const startTime = performance.now();

        // Cubic ease-out: starts fast, decelerates near the end
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
                element.textContent = targetValue; // guarantee exact final value
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
            const whatsappUrl = `https://wa.me/917973992326?text=${encodeURIComponent(message)}`;
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
