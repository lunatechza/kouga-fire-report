const geoStatus = document.getElementById('geoStatus');
const getLocationBtn = document.getElementById('getLocationBtn');
const whatsappBtn = document.getElementById('whatsappBtn');
const smsBtn = document.getElementById('smsBtn');
const copyBtn = document.getElementById('copyBtn');

let lastCoords = null;

function callNumber(number) {
  window.location.href = `tel:${number}`;
}

function timestampLocal() {
  return new Date().toLocaleString();
}

function buildMessage() {
  const visible = document.getElementById('visible').value;
  const size = document.getElementById('size').value;
  const spread = document.getElementById('spread').value;
  const note = document.getElementById('note').value.trim();
  const manualLocation = document.getElementById('manualLocation').value.trim();

  let locationText = 'Location: not provided';
  let mapsLink = '';

  if (lastCoords) {
    const { latitude, longitude } = lastCoords;
    locationText = `GPS: ${latitude.toFixed(6)}, ${longitude.toFixed(6)}`;
    mapsLink = `https://maps.google.com/?q=${latitude},${longitude}`;
  } else if (manualLocation) {
    locationText = `Manual location: ${manualLocation}`;
  }

  const lines = [
    '🔥 Kouga Wildfire Report',
    `Time: ${timestampLocal()}`,
    locationText,
    mapsLink ? `Map: ${mapsLink}` : null,
    `Visible: ${visible}`,
    `Size: ${size}`,
    `Spread: ${spread}`,
    note ? `Note: ${note}` : null
  ].filter(Boolean);

  return lines.join('\n');
}

function sendWhatsApp() {
  const msg = buildMessage();
  const url = `https://wa.me/?text=${encodeURIComponent(msg)}`;
  window.location.href = url;
}

function sendSMS() {
  const msg = buildMessage();
  const isIOS = /iPhone|iPad|iPod/i.test(navigator.userAgent);
  const url = isIOS
    ? `sms:&body=${encodeURIComponent(msg)}`
    : `sms:?body=${encodeURIComponent(msg)}`;
  window.location.href = url;
}

async function copyMessage() {
  const msg = buildMessage();
  try {
    await navigator.clipboard.writeText(msg);
    copyBtn.textContent = 'Copied!';
    setTimeout(() => (copyBtn.textContent = 'Copy message'), 1500);
  } catch (e) {
    alert('Copy failed. You can manually select and copy the text from the SMS fallback.');
  }
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
smsBtn.addEventListener('click', sendSMS);
copyBtn.addEventListener('click', copyMessage);

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    const swUrl = new URL('service-worker.js', window.location.href).toString();
    navigator.serviceWorker.register(swUrl);
  });
}
