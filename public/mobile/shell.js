// Mobile shell: loads the desktop page HTML, injects mobile overrides, and renders.
(async function () {
  var src = document.documentElement.getAttribute('data-src') || '/index.html';

  function renderError(msg) {
    try {
      document.body.innerHTML =
        '<div style="font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;padding:18px;max-width:720px;margin:0 auto;">' +
        '<h1 style="font-size:18px;margin:0 0 8px;">Mobile view failed to load</h1>' +
        '<p style="margin:0;color:#555;line-height:1.4;">' +
        String(msg).replace(/</g, '&lt;').replace(/>/g, '&gt;') +
        '</p>' +
        '<p style="margin:12px 0 0;"><a href="' +
        src +
        '" style="color:#2563eb;text-decoration:underline;">Open desktop page</a></p>' +
        '</div>';
    } catch (_) {}
  }

  try {
    var res = await fetch(src, { credentials: 'same-origin' });
    if (!res.ok) {
      renderError('HTTP ' + res.status + ' fetching ' + src);
      return;
    }

    var htmlText = await res.text();
    var parser = new DOMParser();
    var doc = parser.parseFromString(htmlText, 'text/html');

    // Ensure absolute resolution for any relative URLs
    if (!doc.querySelector('base')) {
      var base = doc.createElement('base');
      base.setAttribute('href', '/');
      doc.head.insertBefore(base, doc.head.firstChild);
    }

    // Mark document as mobile (used by /mobile/mobile.css overrides)
    doc.documentElement.classList.add('is-mobile');
    if (doc.body) doc.body.classList.add('is-mobile');

    // Inject mobile override stylesheet
    var mobileCss = doc.createElement('link');
    mobileCss.setAttribute('rel', 'stylesheet');
    mobileCss.setAttribute('href', '/mobile/mobile.css');
    doc.head.appendChild(mobileCss);

    // Inject a tiny marker for debugging
    var meta = doc.createElement('meta');
    meta.setAttribute('name', 'shoso-view');
    meta.setAttribute('content', 'mobile');
    doc.head.appendChild(meta);

    var out = '<!DOCTYPE html>\n' + doc.documentElement.outerHTML;
    document.open();
    document.write(out);
    document.close();
  } catch (e) {
    console.error('mobile shell error:', e);
    renderError(e && e.message ? e.message : 'Unknown error');
  }
})();






