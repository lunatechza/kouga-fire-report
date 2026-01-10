const geoStatus = document.getElementById('geoStatus');
const getLocationBtn = document.getElementById('getLocationBtn');
const whatsappBtn = document.getElementById('whatsappBtn');
const emailBtn = document.getElementById('emailBtn');

const WHATSAPP_NUMBER = '27817609183';
const EMAIL_ADDRESS = 'callcentre@kouga.gov.za';
const EMAIL_SUBJECT = 'Wildfire Report – Kouga';

let lastCoords = null;

function callNumber(number) {
  window.location.href = `tel:${number}`;
}

function timestampLocal() {
  return new Date().toLocaleString('en-ZA', {
    timeZone: 'Africa/Johannesburg',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  });
}

function buildReportData() {
  const visible = document.getElementById('visible').value;
  const size = document.getElementById('size').value;
  const spread = document.getElementById('spread').value;
  const note = document.getElementById('note').value.trim();
  const manualLocation = document.getElementById('manualLocation').value.trim();

  let locationLine = 'GPS: not available';
  let mapsLink = null;

  if (lastCoords) {
    const { latitude, longitude } = lastCoords;
    locationLine = `GPS: ${latitude.toFixed(6)}, ${longitude.toFixed(6)}`;
    mapsLink = `https://maps.google.com/?q=${latitude},${longitude}`;
  } else if (manualLocation) {
    locationLine = `Manual location: ${manualLocation}`;
  }

  return {
    visible,
    size,
    spread,
    note,
    locationLine,
    mapsLink
  };
}

function buildMessage() {
  const report = buildReportData();

  const lines = [
    'FIRE REPORT (Kouga Municipality)',
    `Time (Africa/Johannesburg): ${timestampLocal()}`,
    report.locationLine,
    report.mapsLink ? `Map: ${report.mapsLink}` : null,
    `Visible: ${report.visible}`,
    `Size: ${report.size}`,
    `Spread: ${report.spread}`,
    report.note ? `Note: ${report.note}` : null
  ].filter(Boolean);

  return lines.join('\n');
}

function sendWhatsApp() {
  const msg = buildMessage();
  const url = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(msg)}`;
  window.location.href = url;
}

function sendEmail() {
  const body = buildMessage();
  const url = `mailto:${EMAIL_ADDRESS}?subject=${encodeURIComponent(EMAIL_SUBJECT)}&body=${encodeURIComponent(body)}`;
  window.location.href = url;
}

function requestLocation() {
  if (!navigator.geolocation) {
    geoStatus.textContent = 'Geolocation not supported on this device.';
    return;
  }
  geoStatus.textContent = 'Requesting location...';
  navigator.geolocation.getCurrentPosition(
    (pos) => {
      lastCoords = pos.coords;
      geoStatus.textContent = `Location: ${pos.coords.latitude.toFixed(6)}, ${pos.coords.longitude.toFixed(6)}`;
    },
    (err) => {
      geoStatus.textContent = `Location failed: ${err.message}. You can enter manual location.`;
    },
    { enableHighAccuracy: true, timeout: 10000, maximumAge: 30000 }
  );
}

getLocationBtn.addEventListener('click', requestLocation);
whatsappBtn.addEventListener('click', sendWhatsApp);
emailBtn.addEventListener('click', sendEmail);

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    const swUrl = new URL('service-worker.js', window.location.href).toString();
    navigator.serviceWorker.register(swUrl);
  });
}
