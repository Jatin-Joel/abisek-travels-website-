# Content to Verify Before Publishing

Review every item below and supply the real value. Items marked **HIDDEN** are not visible on the page yet — the element is hidden and will only show when you give the go-ahead.

---

## Contact Details

| Item | Current value in code | Confirmed? |
|---|---|---|
| Phone number | `+91 98765 43210` (placeholder) | ❌ |
| WhatsApp number | `+91 98765 43210` (same placeholder) | ❌ |
| Email address | Not shown — add when confirmed | ❌ |
| Facebook URL | `#` (hidden link placeholder) | ❌ |
| Instagram URL | `#` (hidden link placeholder) | ❌ |
| Office address | "Pathankot, Punjab 145001" | ❌ Confirm full address |

---

## Driver Section

| Item | Status |
|---|---|
| Driver's real name | Not shown — "Meet Your Driver" used instead |
| Driver photo (`assets/driver.png`) | Does this file exist and is it the right photo? |
| Driver title / role description | Confirm the short line under the name |

---

## Vehicle Specs (shown on homepage vehicle teaser and fleet.html)

> All specs below are from the Stitch design reference. Confirm before publishing.

| Vehicle | Spec | Confirmed? |
|---|---|---|
| Toyota Innova Crysta | 2.4L Diesel, 150 BHP | ❌ |
| Toyota Innova Crysta | Ground Clearance: 178mm | ❌ |
| Toyota Innova Crysta | Luggage capacity: 300L / "3–4 large suitcases" | ❌ |
| Maruti Suzuki Ertiga | 1.5L Petrol/CNG, 103 BHP | ❌ |
| Maruti Suzuki Ertiga | Ground Clearance: 185mm | ❌ |
| Maruti Suzuki Ertiga | Luggage capacity: 209L / "2–3 large suitcases" | ❌ |
| Both | Is either vehicle 4WD? (removed from site until confirmed) | ❌ |

---

## Routes Section

| Item | Needs confirming |
|---|---|
| Stop names on each route card | Are Dharamshala · Dalhousie · Manali · Shimla correct for Himachal? |
| Ladakh route via Manali vs Srinagar | Both options offered? |
| Any routes to remove or add? | — |

---

## FAQ Answers (facts that need your confirmation)

| Question | Answer used on site | Confirmed? |
|---|---|---|
| Cancellation policy | "48 hours before the trip, full refund of advance" | ❌ |
| Luggage — Innova | "3–4 large suitcases" | ❌ |
| Luggage — Ertiga | "2–3 large suitcases" | ❌ |
| Oxygen cylinder for AMS | "Can be arranged on request for Ladakh / Spiti" | ❌ |
| Advance payment % | "Partial advance at time of booking" | ❌ — what % exactly? |
| Night driving rule | "No high-pass driving after 8 PM" | ❌ |
| Pickup cities | "Pathankot, Amritsar airport, Chandigarh, Delhi NCR" | ❌ |

---

## Pricing (not shown publicly until confirmed)

| Item | Status |
|---|---|
| Innova Crysta per-km rate | Not on page — add to `js/booking-config.js` |
| Ertiga per-km rate | Not on page — add to `js/booking-config.js` |
| Airport transfer flat rate | Not on page |
| High-pass surcharge | Not on page |
| Green tax / driver allowance | Not on page |

---

## Reviews Section (HIDDEN — `display:none`)

The reviews section is completely hidden until you supply real reviews. To turn it on:
1. Remove `style="display:none;"` from the `<section id="reviews">` tag in `index.html`.
2. Add real review cards inside `<div id="reviewCards">` in this format:

```html
<div class="testimonial-card">
  <p class="text-body-md text-secondary mb-md">"Your real review text here."</p>
  <div class="text-caps text-primary">— Real Name, City</div>
</div>
```

**DO NOT use any of these fabricated reviews — they have been removed:**
- "Dr. Ananya Rao, Bangalore" — fake
- "The descent from Khardung La was treacherous..." — fake

---

## Driver Accreditations Page (`driver.html`)

Do not publish the following until confirmed:
- "5,000+ High-Altitude Pass Crossings"
- "Zero Incident Record"
- "8+ Years High-Altitude Navigation"
- "First Responder Trained"
- "100% Safety Record"
- "17,500+ ft Max Operating Altitude"
- "4.98 Guest Rating"

---

## Pass Altitudes (used on status ticker — not currently showing)

Confirm or remove before re-enabling the ticker:
- Zoji La Pass: 11,575 ft
- Khardung La: 17,582 ft
- Rohtang Pass: 13,058 ft
- Atal Tunnel: 10,040 ft
- Banihal Pass: 9,291 ft
