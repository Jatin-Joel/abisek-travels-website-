/**
 * js/booking.js
 * Abisek Travels — Booking form handler.
 *
 * Currently writes to WhatsApp as primary submit.
 * Replace the submitToSupabase stub with real Supabase SDK call when ready.
 */

document.addEventListener('DOMContentLoaded', function () {
  const form = document.getElementById('bookingForm');
  if (!form) return;

  // ── URL prefill ────────────────────────────────────────────────────────────
  const params = new URLSearchParams(window.location.search);
  const routeMap = {
    'pathankot-local': 'Pathankot City',
    'himachal':        'Dharamshala / McLeod Ganj',
    'kashmir':         'Srinagar',
    'chandigarh':      'Chandigarh',
    'delhi':           'Delhi',
    'leh-ladakh':      'Leh',
    'uttarakhand':     'Other',
    'pune':            'Pune',
  };
  const vehicleMap = {
    'ertiga':           'suv-mpv',
    'innova':           'premium-comfort',
    'hatchback-sedan':  'hatchback-sedan',
    'suv-mpv':          'suv-mpv',
    'premium-comfort':  'premium-comfort',
    'larger-groups':    'larger-groups',
  };

  const dropField    = document.getElementById('drop');
  const vehicleField = document.getElementById('vehicle');
  const tripField    = document.getElementById('tripType');

  if (dropField && params.get('route')) {
    const rawRoute = params.get('route');
    const desiredVal = routeMap[rawRoute];
    if (desiredVal) {
      dropField.value = desiredVal;
      if (!dropField.value) {
        Array.from(dropField.options).forEach(function (o) {
          if (o.value === desiredVal || o.text.toLowerCase().includes(desiredVal.toLowerCase())) {
            o.selected = true;
          }
        });
      }
    }
  }
  if (vehicleField && params.get('vehicle')) {
    const rawParam = params.get('vehicle');
    const matchedVal = vehicleMap[rawParam];
    if (matchedVal) {
      vehicleField.value = matchedVal;
    }
  }
  if (tripField && params.get('service')) {
    const svcMap = {
      'local':    'local',
      'airport':  'airport',
      'oneway':   'oneway',
      'roundtrip':'roundtrip',
      'multiday': 'multiday',
    };
    const v = svcMap[params.get('service')];
    if (v) tripField.value = v;
  }

  
  
  const pickupField = document.getElementById('pickup');
  const otherPickupWrapper = document.getElementById('otherPickupWrapper');

  if (pickupField && otherPickupWrapper) {
      pickupField.addEventListener('change', function() {
          if (pickupField.value === 'Other') {
              otherPickupWrapper.classList.remove('hidden');
              document.getElementById('otherPickup').required = true;
          } else {
              otherPickupWrapper.classList.add('hidden');
              document.getElementById('otherPickup').required = false;
          }
      });
  }

  // ── Form submit ────────────────────────────────────────────────────────────
  form.addEventListener('submit', function (e) {
    e.preventDefault();

    const bookingRef = 'ABK-' + Math.floor(1000 + Math.random() * 9000);
    const data = {
      bookingRef: bookingRef,
      name:       document.getElementById('name')?.value.trim() || '',
      phone:      document.getElementById('phone')?.value.trim() || '',
      pickup:     document.getElementById('pickup')?.value.trim() || '',
      drop:       document.getElementById('drop')?.value.trim() || '',
      date:       document.getElementById('travelDate')?.value || '',
      time:       document.getElementById('travelTime')?.value || '',
      passengers: document.getElementById('passengers')?.value || '',
      luggage:    document.getElementById('luggage')?.value || '',
      vehicle:    document.getElementById('vehicle')?.value || '',
      tripType:   document.getElementById('tripType')?.value || '',
      notes:      document.getElementById('notes')?.value.trim() || '',
    };

    // 1. Try Supabase (stub — replace with real SDK call)
    submitToSupabase(data).catch(function () {
      // Supabase failed or not set up — fall through to WhatsApp
    }).finally(function () {
      // 2. Always open WhatsApp as confirmation/fallback
      sendViaWhatsApp(data);
    });
  });

  // ── Supabase stub ──────────────────────────────────────────────────────────
  function submitToSupabase(data) {
    // TODO: replace with:
    //   return supabase.from('bookings').insert([data]);
    return Promise.resolve();
  }

  // ── WhatsApp send ──────────────────────────────────────────────────────────
  function sendViaWhatsApp(d) {
    const lines = [
      'Booking Reference: ' + d.bookingRef,
      'Hi, I\'d like to book a cab with Abisek Travels.',
      '',
      'Name: ' + d.name,
      'Phone: ' + d.phone,
      'Trip type: ' + d.tripType,
      'Pickup: ' + d.pickup,
      'Drop: ' + d.drop,
      'Date: ' + d.date + (d.time ? ' at ' + d.time : ''),
      'Passengers: ' + d.passengers,
      'Luggage: ' + d.luggage,
      'Vehicle preference: ' + d.vehicle,
      d.notes ? 'Notes: ' + d.notes : '',
    ].filter(Boolean).join('\n');

    const waNumber = (typeof SITE_CONFIG !== 'undefined') ? SITE_CONFIG.whatsapp : '917814442326';
    window.location.href = 'https://wa.me/' + waNumber + '?text=' + encodeURIComponent(lines);
  }
});
