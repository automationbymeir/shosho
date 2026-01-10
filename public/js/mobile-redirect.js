// Mobile/desktop routing helper.
// - Mobile devices get redirected to /mobile/*
// - Desktop devices get redirected back to /* from /mobile/*
(function () {
  try {
    var qs = new URLSearchParams(window.location.search || '');
    if (qs.has('noMobileRedirect') || qs.has('nomobile')) return;

    // Manual override (useful for testing)
    var forcedView = (qs.get('view') || '').toLowerCase(); // 'mobile' | 'desktop'

    var isMobile = false;
    if (forcedView === 'mobile') {
      isMobile = true;
    } else if (forcedView === 'desktop') {
      isMobile = false;
    } else {
      // Prefer UA-CH when available
      if (navigator.userAgentData && typeof navigator.userAgentData.mobile === 'boolean') {
        isMobile = navigator.userAgentData.mobile;
      } else {
        var ua = (navigator.userAgent || '').toLowerCase();
        // Covers iPhone/iPad, Android, and generic mobile UAs
        isMobile = /mobi|android|iphone|ipad|ipod|windows phone/.test(ua);
      }
    }

    var path = window.location.pathname || '/';
    var inMobile = path === '/mobile' || path.indexOf('/mobile/') === 0;

    // Avoid redirecting Firebase internal pages/assets
    if (path.indexOf('/__/') === 0) return;

    if (isMobile && !inMobile) {
      var target = '/mobile' + (path.charAt(0) === '/' ? path : '/' + path);
      window.location.replace(target + (window.location.search || '') + (window.location.hash || ''));
      return;
    }

    if (!isMobile && inMobile) {
      var stripped = path.replace(/^\/mobile(\/|$)/, '/');
      if (!stripped) stripped = '/';
      window.location.replace(stripped + (window.location.search || '') + (window.location.hash || ''));
      return;
    }
  } catch (e) {
    // Never block app load
    console.warn('mobile-redirect failed:', e);
  }
})();






