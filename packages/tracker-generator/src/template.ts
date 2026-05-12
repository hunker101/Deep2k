export const TRACKER_TEMPLATE = `(function() {
  var $$VAR_HOST$$ = location.host;
  var $$VAR_PATH$$ = location.pathname + location.search;
  var $$VAR_REF$$  = document.referrer || '';
  var $$VAR_RES$$  = screen.width + 'x' + screen.height;

  function $$FN_SEND$$() {
    var $$VAR_DATA$$ = {
      h: $$VAR_HOST$$,
      p: $$VAR_PATH$$,
      r: $$VAR_REF$$,
      s: $$VAR_RES$$,
      t: Date.now()
    };

    if (navigator.sendBeacon && '$$BEACON_METHOD$$' === 'sendBeacon') {
      navigator.sendBeacon('$$ENDPOINT_PATH$$', JSON.stringify($$VAR_DATA$$));
    } else if ('$$BEACON_METHOD$$' === 'fetch') {
      fetch('$$ENDPOINT_PATH$$', {
        method: 'POST',
        body: JSON.stringify($$VAR_DATA$$),
        keepalive: true,
        headers: { 'Content-Type': 'text/plain' }
      }).catch(function(){});
    } else if ('$$BEACON_METHOD$$' === 'image') {
      var $$VAR_IMG$$ = new Image();
      $$VAR_IMG$$.src = '$$ENDPOINT_PATH$$?d=' + encodeURIComponent(JSON.stringify($$VAR_DATA$$));
    } else {
      var $$VAR_XHR$$ = new XMLHttpRequest();
      $$VAR_XHR$$.open('POST', '$$ENDPOINT_PATH$$', true);
      $$VAR_XHR$$.send(JSON.stringify($$VAR_DATA$$));
    }
  }

  if (document.readyState === 'complete') {
    setTimeout($$FN_SEND$$, $$INIT_DELAY$$);
  } else {
    window.addEventListener('load', function() {
      setTimeout($$FN_SEND$$, $$INIT_DELAY$$);
    });
  }
})();
`;

export const TEMPLATE_VAR_SLOTS = [
  'VAR_HOST',
  'VAR_PATH',
  'VAR_REF',
  'VAR_RES',
  'VAR_DATA',
  'FN_SEND',
  'VAR_IMG',
  'VAR_XHR',
] as const;

export type TemplateVarSlot = (typeof TEMPLATE_VAR_SLOTS)[number];
