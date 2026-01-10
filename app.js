const geoStatus = document.getElementById('geoStatus');
const getLocationBtn = document.getElementById('getLocationBtn');
const whatsappBtn = document.getElementById('whatsappBtn');
const emailBtn = document.getElementById('emailBtn');
const copyBtn = document.getElementById('copyBtn');
const lastUpdatedEl = document.getElementById('lastUpdated');

const WHATSAPP_NUMBER = '27817609183';
const EMAIL_ADDRESS = 'callcentre@kouga.gov.za';
const EMAIL_SUBJECT = 'Wildfire Report – Kouga';

const firebaseConfig = {
  apiKey: '',
  authDomain: '',
  projectId: '',
  appId: ''
};

let lastCoords = null;
let firestoreDb = null;

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

function safeValue(value) {
  return value && value.trim() ? value.trim() : null;
}

function setError(id, show) {
  const el = document.getElementById(id);
  if (!el) return;
  el.classList.toggle('visible', show);
}

function hasGeolocation() {
  return !!lastCoords;
}

function buildReportData() {
  const visible = document.getElementById('visible').value;
  const severity = document.getElementById('severity').value;
  const size = document.getElementById('size').value;
  const spread = document.getElementById('spread').value;
  const note = safeValue(document.getElementById('note').value);
  const nearestArea = safeValue(document.getElementById('nearestArea').value);
  const safeToReport = document.getElementById('safeToReport').checked;

  let locationLine = 'GPS: not available';
  let mapsLink = null;
  let lat = null;
  let lon = null;

  if (lastCoords) {
    const { latitude, longitude } = lastCoords;
    lat = latitude;
    lon = longitude;
    locationLine = `GPS: ${latitude.toFixed(6)}, ${longitude.toFixed(6)}`;
    mapsLink = `https://maps.google.com/?q=${latitude},${longitude}`;
  } else if (nearestArea) {
    locationLine = `Nearest area: ${nearestArea}`;
  }

  return {
    visible,
    severity,
    size,
    spread,
    note,
    nearestArea,
    safeToReport,
    lat,
    lon,
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
    `Severity: ${report.severity}`,
    `Size: ${report.size}`,
    `Spread: ${report.spread}`,
    report.nearestArea && !hasGeolocation() ? `Nearest area: ${report.nearestArea}` : null,
    report.note ? `Note: ${report.note}` : null
  ].filter(Boolean);

  return lines.join('\n');
}

function validateForm() {
  const report = buildReportData();
  const consent = document.getElementById('consent').checked;

  const visibleMissing = !report.visible;
  const severityMissing = !report.severity;
  const safeMissing = !report.safeToReport;
  const nearestAreaMissing = !hasGeolocation() && !report.nearestArea;
  const consentMissing = !consent;

  setError('visibleError', visibleMissing);
  setError('severityError', severityMissing);
  setError('safeError', safeMissing);
  setError('nearestAreaError', nearestAreaMissing);
  setError('consentError', consentMissing);

  return !(visibleMissing || severityMissing || safeMissing || nearestAreaMissing || consentMissing);
}

function showCopyFallback(text) {
  const temp = document.createElement('textarea');
  temp.value = text;
  temp.style.position = 'fixed';
  temp.style.top = '-9999px';
  document.body.appendChild(temp);
  temp.focus();
  temp.select();
  try {
    document.execCommand('copy');
    alert('Report copied to clipboard.');
  } catch (error) {
    alert('Unable to copy. Please select and copy manually.');
  } finally {
    document.body.removeChild(temp);
  }
}

async function copyReport() {
  if (!validateForm()) {
    return;
  }
  const text = buildMessage();
  if (navigator.clipboard && navigator.clipboard.writeText) {
    try {
      await navigator.clipboard.writeText(text);
      alert('Report copied to clipboard.');
      return;
    } catch (error) {
      showCopyFallback(text);
    }
  } else {
    showCopyFallback(text);
  }
}

function sendWhatsApp() {
  if (!validateForm()) {
    return;
  }
  const msg = buildMessage();
  logReport('whatsapp');
  const url = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(msg)}`;
  window.location.href = url;
}

function sendEmail() {
  if (!validateForm()) {
    return;
  }
  const body = buildMessage();
  logReport('email');
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
      setError('nearestAreaError', false);
    },
    (err) => {
      geoStatus.textContent = `Location failed: ${err.message}. Please enter nearest town/area.`;
    },
    { enableHighAccuracy: true, timeout: 10000, maximumAge: 30000 }
  );
}

function initializeFirebase() {
  try {
    if (!firebaseConfig || !firebaseConfig.projectId) {
      return null;
    }
    if (!firebase.apps.length) {
      firebase.initializeApp(firebaseConfig);
    }
    return firebase.firestore();
  } catch (error) {
    return null;
  }
}

async function generateClientReportId(payload) {
  const stableString = JSON.stringify(payload);
  if (window.crypto && window.crypto.subtle) {
    try {
      const data = new TextEncoder().encode(stableString);
      const hashBuffer = await window.crypto.subtle.digest('SHA-256', data);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
    } catch (error) {
      return `fallback-${crypto.randomUUID ? crypto.randomUUID() : Date.now()}`;
    }
  }
  return `fallback-${crypto.randomUUID ? crypto.randomUUID() : Date.now()}`;
}

function baseReportPayload(report, channel) {
  return {
    reportedAtClient: new Date().toISOString(),
    lat: report.lat,
    lon: report.lon,
    mapsLink: report.mapsLink,
    visible: report.visible,
    severity: report.severity,
    size: report.size,
    spread: report.spread,
    nearestArea: report.nearestArea,
    note: report.note,
    source: 'kouga-pwa',
    channel,
    pageUrl: window.location.href,
    userAgent: navigator.userAgent
  };
}

async function logReport(channel) {
  if (!firestoreDb) {
    return;
  }
  const report = buildReportData();
  const payload = baseReportPayload(report, channel);
  try {
    const clientReportId = await generateClientReportId(payload);
    await firestoreDb.collection('fire_reports').add({
      ...payload,
      clientReportId,
      reportedAt: firebase.firestore.FieldValue.serverTimestamp()
    });
  } catch (error) {
    // Best-effort logging only.
  }
}

function loadConsent() {
  const stored = localStorage.getItem('kougaConsent');
  const consentCheckbox = document.getElementById('consent');
  if (stored === 'true') {
    consentCheckbox.checked = true;
  }
}

function bindConsentPersistence() {
  const consentCheckbox = document.getElementById('consent');
  consentCheckbox.addEventListener('change', () => {
    localStorage.setItem('kougaConsent', consentCheckbox.checked ? 'true' : 'false');
  });
}

function setLastUpdated() {
  if (!lastUpdatedEl) return;
  lastUpdatedEl.textContent = new Date().toLocaleDateString('en-ZA', {
    year: 'numeric',
    month: 'long',
    day: '2-digit'
  });
}

getLocationBtn.addEventListener('click', requestLocation);
whatsappBtn.addEventListener('click', sendWhatsApp);
emailBtn.addEventListener('click', sendEmail);
copyBtn.addEventListener('click', copyReport);

firestoreDb = initializeFirebase();
loadConsent();
bindConsentPersistence();
setLastUpdated();

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    const swUrl = new URL('service-worker.js', window.location.href).toString();
    navigator.serviceWorker.register(swUrl);
  });
}
