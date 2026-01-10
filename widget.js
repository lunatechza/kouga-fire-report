/* Kouga Fire Report Widget v1.1.0 */
(() => {
  const WIDGET_VERSION = '1.1.0';
  const WIDGET_ID = 'kouga-report-widget';

  if (window.KougaReportWidget && window.KougaReportWidget.loaded) {
    return;
  }

  function sanitizeText(value, maxLength = 80) {
    if (!value) return null;
    const cleaned = value.trim().replace(/\s+/g, ' ');
    if (!cleaned) return null;
    return cleaned.slice(0, maxLength);
  }

  function resolveScriptElement() {
    return document.currentScript
      || document.querySelector('script[data-kouga-widget]')
      || document.querySelector('script[src$="/widget.js"], script[src$="widget.js"]');
  }

  function resolveBaseUrl(scriptEl, overrideUrl) {
    if (overrideUrl) {
      try {
        return new URL(overrideUrl, window.location.href).toString();
      } catch (error) {
        return null;
      }
    }
    if (scriptEl && scriptEl.src) {
      return new URL('.', scriptEl.src).toString();
    }
    return new URL('./', window.location.href).toString();
  }

  function buildWidgetUrl(baseUrl, source, ref, widgetVersion) {
    const reportUrl = new URL(baseUrl, window.location.href);
    if (source) {
      reportUrl.searchParams.set('source', source);
    }
    if (ref) {
      reportUrl.searchParams.set('ref', ref);
    }
    if (widgetVersion) {
      reportUrl.searchParams.set('widgetVersion', widgetVersion);
    }
    return reportUrl.toString();
  }

  function inject() {
    if (document.getElementById(WIDGET_ID)) {
      return;
    }

    const scriptEl = resolveScriptElement();
    const dataset = scriptEl ? scriptEl.dataset : {};
    const label = sanitizeText(dataset.label, 60) || '🔥 Report Fire';
    const source = sanitizeText(dataset.source, 80) || 'embed';
    const ref = sanitizeText(dataset.ref, 80);
    const position = sanitizeText(dataset.position, 20) || 'bottom-right';
    const widgetVersion = sanitizeText(dataset.version, 20);

    const baseUrl = resolveBaseUrl(scriptEl, dataset.url);
    if (!baseUrl) {
      return;
    }

    const reportUrl = buildWidgetUrl(baseUrl, source, ref, widgetVersion);

    const button = document.createElement('a');
    button.id = WIDGET_ID;
    button.href = reportUrl;
    button.target = '_blank';
    button.rel = 'noopener noreferrer';
    button.textContent = label;
    button.setAttribute('aria-label', label);

    const style = {
      position: 'fixed',
      zIndex: '9999',
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '48px',
      padding: '12px 16px',
      borderRadius: '999px',
      background: '#d7263d',
      color: '#ffffff',
      textDecoration: 'none',
      fontFamily: 'system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif',
      fontSize: '16px',
      fontWeight: '700',
      boxShadow: '0 8px 20px rgba(0, 0, 0, 0.2)'
    };

    const positionMap = {
      'bottom-right': { bottom: '16px', right: '16px' },
      'bottom-left': { bottom: '16px', left: '16px' },
      'top-right': { top: '16px', right: '16px' },
      'top-left': { top: '16px', left: '16px' }
    };

    const placement = positionMap[position] || positionMap['bottom-right'];

    Object.assign(button.style, style, placement);

    document.body.appendChild(button);

    window.KougaReportWidget = {
      loaded: true,
      version: WIDGET_VERSION
    };
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', inject, { once: true });
  } else {
    inject();
  }
})();
