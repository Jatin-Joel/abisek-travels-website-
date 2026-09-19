/**
 * js/site-config.js
 * Abisek Travels — Central site configuration and feature flags.
 * Edit this file to enable/disable sections and update contact details.
 */

const SITE_CONFIG = {

  // ── Feature Flags ─────────────────────────────────────────────────────────
  // Set to true once you have confirmed real reviews from customers.
  SHOW_REVIEWS: false,

  // Set to true once vehicle details have been confirmed.
  SHOW_FLEET: false,

  // ── Contact Details ───────────────────────────────────────────────────────
  phone: '+91 78144 42326',
  whatsapp: '917814442326',     // digits only, used in wa.me links
  email: 'abhishekattwal02@gmail.com',
  address: 'Pathankot Junction, Punjab 145001, India',

  // WhatsApp booking message (pre-filled)
  waMessage: 'Hi%2C%20I%27d%20like%20to%20book%20a%20cab%20with%20Abisek%20Travels',
};

// Apply feature flags on DOM ready
document.addEventListener('DOMContentLoaded', () => {
  // Reviews section
  const reviewsSection = document.getElementById('testimonials');
  if (reviewsSection) {
    reviewsSection.style.display = SITE_CONFIG.SHOW_REVIEWS ? '' : 'none';
  }

  // Fleet section
  const fleetSection = document.getElementById('fleet-teaser');
  if (fleetSection) {
    fleetSection.style.display = SITE_CONFIG.SHOW_FLEET ? '' : 'none';
  }

  // Inject real phone number into all tel: links
  document.querySelectorAll('a[data-phone]').forEach(a => {
    a.href = 'tel:' + SITE_CONFIG.phone.replace(/\s/g, '');
    a.textContent = SITE_CONFIG.phone;
  });

  // Inject WhatsApp links
  document.querySelectorAll('a[data-whatsapp]').forEach(a => {
    a.href = 'https://wa.me/' + SITE_CONFIG.whatsapp + '?text=' + SITE_CONFIG.waMessage;
  });
});
