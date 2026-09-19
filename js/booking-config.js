/**
 * js/booking-config.js
 * Abisek Travels — Editable fare rates for the booking page.
 *
 * If rates are left empty ({}), the "Estimated fare" box on booking.html
 * will be hidden automatically. Fill in rates and refresh.
 *
 * All distances in km, prices in INR (₹).
 */

const BOOKING_CONFIG = {

  // Per-km rates by vehicle (leave null to hide fare estimate)
  rates: {
    innova:  null,   // e.g. 14  → ₹14/km
    ertiga:  null,   // e.g. 12  → ₹12/km
  },

  // Fixed surcharges (added on top of per-km rate if applicable)
  surcharges: {
    driverAllowance:  null,   // ₹ per night for multi-day trips
    greenTax:         null,   // ₹ flat (e.g. Himachal)
    highPassSurcharge: null,  // ₹ flat for Ladakh / Rohtang routes
  },

  // Flat fares for specific trip types (overrides per-km if set)
  flatFares: {
    airportTransfer: null,    // e.g. 999
    localHalfDay:    null,    // e.g. 1200  (4 hrs / 40 km)
    localFullDay:    null,    // e.g. 2000  (8 hrs / 80 km)
  },
};
