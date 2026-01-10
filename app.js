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
  apiKey: 'AIzaSyDhGEhrs3en20GZaSMckL9Bj_5sjw0XBfk',
  authDomain: 'kouga-wildfire-report.firebaseapp.com',
  projectId: 'kouga-wildfire-report',
  storageBucket: 'kouga-wildfire-report.firebasestorage.app',
  messagingSenderId: '689369249430',
  appId: '1:689369249430:web:e73eca9ce748d82d5a34b7',
  measurementId: 'G-5QJLSETQD1'
};

let lastCoords = null;
let firestoreDb = null;
let logStatusEl = null;

const THROTTLE_MS = 30000;

const queryParams = new URLSearchParams(window.location.search);
const querySourceRaw = sanitizeTag(queryParams.get('source')) || 'kouga-pwa';
const queryRefRaw = sanitizeTag(queryParams.get('ref'));
const queryArea = sanitizeText(queryParams.get('area'), 120);
const queryWidgetVersion = sanitizeTag(queryParams.get('widgetVersion'));
const querySource = encodeTag(querySourceRaw);
const queryRef = encodeTag(queryRefRaw);
const queryWidgetVersionEncoded = encodeTag(queryWidgetVersion);
const queryLat = parseFloat(queryParams.get('lat'));
const queryLon = parseFloat(queryParams.get('lon'));
const hasQueryCoords = Number.isFinite(queryLat) && Number.isFinite(queryLon);

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

function sanitizeText(value, maxLength = 300) {
  if (!value) return null;
  const cleaned = value.trim().replace(/\s+/g, ' ');
  if (!cleaned) return null;
  return cleaned.slice(0, maxLength);
}

function sanitizeTag(value, maxLength = 80) {
  return sanitizeText(value, maxLength);
}

function encodeTag(value) {
  return value ? encodeURIComponent(value) : null;
}

function ensureLogStatus() {
  if (logStatusEl) {
    return logStatusEl;
  }
  const reference = document.getElementById('copyBtn');
  if (!reference) return null;
  const status = document.createElement('div');
  status.id = 'logStatus';
  status.style.marginTop = '6px';
  status.style.fontSize = '12px';
  status.style.color = '#6b7280';
  status.setAttribute('aria-live', 'polite');
  reference.insertAdjacentElement('afterend', status);
  logStatusEl = status;
  return logStatusEl;
}

function setLogStatus(message) {
  const status = ensureLogStatus();
  if (!status) return;
  status.textContent = message || '';
}

function getClientSessionId() {
  const key = 'kougaClientSessionId';
  try {
    const stored = localStorage.getItem(key);
    if (stored) {
      return stored;
    }
    const fresh = crypto.randomUUID ? crypto.randomUUID() : `session-${Date.now()}`;
    localStorage.setItem(key, fresh);
    return fresh;
  } catch (error) {
    return crypto.randomUUID ? crypto.randomUUID() : `session-${Date.now()}`;
  }
}

function getFieldValue(id) {
  const el = document.getElementById(id);
  return el ? el.value : '';
}

function getFieldChecked(id) {
  const el = document.getElementById(id);
  return el ? el.checked : false;
}

function hasRequiredFields() {
  const requiredIds = ['visible', 'severity', 'safeToReport', 'consent'];
  const missing = requiredIds.some((id) => !document.getElementById(id));
  if (missing) {
    setLogStatus('Form unavailable. Please refresh and try again.');
    return false;
  }
  return true;
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
  const visible = getFieldValue('visible');
  const severity = getFieldValue('severity');
  const size = getFieldValue('size');
  const spread = getFieldValue('spread');
  const note = sanitizeText(getFieldValue('note'), 300);
  const nearestArea = sanitizeText(getFieldValue('nearestArea'), 120);
  const safeToReport = getFieldChecked('safeToReport');

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
  if (!hasRequiredFields()) {
    return false;
  }
  const report = buildReportData();
  const consent = getFieldChecked('consent');

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
  logReport('copy');
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

function isThrottled() {
  const now = Date.now();
  let last = 0;
  try {
    last = Number(localStorage.getItem('kougaLastReportAt') || 0);
  } catch (error) {
    last = 0;
  }
  if (now - last < THROTTLE_MS) {
    const waitSeconds = Math.ceil((THROTTLE_MS - (now - last)) / 1000);
    setLogStatus(`Please wait ${waitSeconds}s before sending another report.`);
    return true;
  }
  try {
    localStorage.setItem('kougaLastReportAt', String(now));
  } catch (error) {
    // Ignore storage issues; throttling becomes best-effort.
  }
  return false;
}

function sendWhatsApp() {
  if (!validateForm()) {
    return;
  }
  if (isThrottled()) {
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
  if (isThrottled()) {
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

function applyQueryPrefill() {
  const nearestAreaInput = document.getElementById('nearestArea');
  if (nearestAreaInput && queryArea && !nearestAreaInput.value) {
    nearestAreaInput.value = queryArea;
  }
  if (hasQueryCoords) {
    lastCoords = { latitude: queryLat, longitude: queryLon };
    geoStatus.textContent = `Location (from link): ${queryLat.toFixed(6)}, ${queryLon.toFixed(6)}`;
  }
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
    source: querySource,
    ref: queryRef,
    widgetVersion: queryWidgetVersionEncoded,
    channel,
    submitChannel: channel,
    pageUrl: window.location.href,
    userAgent: navigator.userAgent,
    clientSessionId: getClientSessionId()
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
    setLogStatus('Logged ✓');
  } catch (error) {
    setLogStatus('Log failed (still sent).');
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
applyQueryPrefill();
loadConsent();
bindConsentPersistence();
setLastUpdated();
ensureLogStatus();

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    const swUrl = new URL('service-worker.js', window.location.href).toString();
    navigator.serviceWorker.register(swUrl);
  });
}
