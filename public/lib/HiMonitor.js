// HI-OS: Minimal monitoring & breadcrumbs
// Non-invasive, no external deps. Upgrade path: plug into Sentry or custom endpoint.

const HiMonitor = (() => {
  const q = [];
  const max = 200;
  function push(type, payload) {
    const evt = { t: Date.now(), type, payload };
    q.push(evt);
    if (q.length > max) q.shift();
    return evt;
  }

  function breadcrumb(message, data) {
    return push('crumb', { message, data });
  }

  function error(err, context) {
    const payload = {
      message: err?.message || String(err),
      stack: err?.stack,
      context
    };
    return push('error', payload);
  }

  function getBuffer() { return q.slice(); }

  // Global hooks
  window.addEventListener('error', (e) => error(e.error || e.message, { where: 'window.error' }));
  window.addEventListener('unhandledrejection', (e) => error(e.reason, { where: 'unhandledrejection' }));

  // Expose API
  return { breadcrumb, error, getBuffer };
})();

window.HiMonitor = HiMonitor;
export default HiMonitor;