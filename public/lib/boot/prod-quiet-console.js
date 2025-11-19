(function(){
  try {
    var isLocal = /localhost|127\.0\.0\.1/.test(location.hostname);
    var qp = new URLSearchParams(location.search);
    var debugParam = qp.get('debug') === '1' || qp.get('diag') === '1';
    var enabled = (typeof window.__HI_DEBUG__ === 'boolean') ? window.__HI_DEBUG__ : false;
    if (isLocal || debugParam || enabled) return; // keep logs in dev/diagnostics

    var original = {
      log: console.log,
      info: console.info,
      debug: console.debug,
      warn: console.warn,
      error: console.error
    };
    // Silence only verbose channels; keep warn/error intact
    console.log = function(){};
    console.info = function(){};
    console.debug = function(){};

    // Expose a quick way to re-enable logs at runtime
    window.enableHiLogs = function(){
      console.log = original.log;
      console.info = original.info;
      console.debug = original.debug;
      console.warn = original.warn;
      console.error = original.error;
    };
  } catch(e) {
    // Never block page on silencer issues
  }
})();
