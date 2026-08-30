// ---------- Mobile nav toggle ----------
function toggleMenu() {
  var navLinks = document.getElementById('navLinks');
  if (!navLinks) {
    console.warn('toggleMenu: #navLinks not found in the DOM.');
    return;
  }
  navLinks.classList.toggle('active');
}
// Explicitly expose to global scope. If this file (or a wrapper around it)
// is an IIFE, an inline onclick="toggleMenu()" in your HTML can't see the
// function otherwise — this line guarantees it's reachable either way.
window.toggleMenu = toggleMenu;

// Wrapped in DOMContentLoaded so this still works even if the script tag
// loads before the nav markup exists in the page.
document.addEventListener('DOMContentLoaded', function () {
  document.querySelectorAll('.nav-links a').forEach(function (link) {
    link.addEventListener('click', function () {
      var navLinks = document.getElementById('navLinks');
      if (navLinks) navLinks.classList.remove('active');
    });
  });
});

// ---------- Google Translate (silent init) ----------
function googleTranslateElementInit() {
  new google.translate.TranslateElement({
    pageLanguage: 'en',
    includedLanguages: 'en,hi,ne,ta,te,kn,ml,bn,mr,gu,pa,or,as,ur,fr,es',
    autoDisplay: false
  }, 'google_translate_element');
}

(function () {
  if (!document.getElementById('google-translate-script')) {
    var script = document.createElement('script');
    script.id = 'google-translate-script';
    script.type = 'text/javascript';
    script.src = '//translate.google.com/translate_a/element.js?cb=googleTranslateElementInit';
    document.head.appendChild(script);
  }
})();

// ---------- Wire up custom language select (works inside the toggle menu too) ----------
document.addEventListener('DOMContentLoaded', function () {
  var select = document.getElementById('customLanguageSelect');
  if (!select) return;

  select.addEventListener('click', function (e) {
    e.stopPropagation();
  });

  select.addEventListener('change', function (e) {
    e.stopPropagation();
    var lang = this.value;
    applyGoogleTranslate(lang);
  });

  function applyGoogleTranslate(lang, attempt) {
    attempt = attempt || 0;
    var googCombo = document.querySelector('.goog-te-combo');

    if (googCombo) {
      googCombo.value = lang;
      googCombo.dispatchEvent(new Event('change', { bubbles: true }));

      var navLinks = document.getElementById('navLinks');
      if (navLinks) {
        setTimeout(function () {
          navLinks.classList.remove('active');
        }, 150);
      }
      return;
    }

    if (attempt < 25) {
      setTimeout(function () {
        applyGoogleTranslate(lang, attempt + 1);
      }, 200);
    } else {
      console.warn('Google Translate widget did not load in time.');
    }
  }
});