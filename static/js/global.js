// ---------- Mobile nav toggle ----------
function toggleMenu() {
  document.getElementById('navLinks').classList.toggle('active');
}

document.querySelectorAll('.nav-links a').forEach(link => {
  link.addEventListener('click', () => {
    document.getElementById('navLinks').classList.remove('active');
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

  // Prevent clicks/taps on the select from being swallowed by any
  // outer "click to close menu" logic you might add later.
  select.addEventListener('click', function (e) {
    e.stopPropagation();
  });

  select.addEventListener('change', function (e) {
    e.stopPropagation();
    var lang = this.value;
    applyGoogleTranslate(lang);
  });

  // Waits for Google's hidden <select class="goog-te-combo"> to exist,
  // then sets it and fires a bubbling change event.
  // This matters because the Google script loads asynchronously —
  // if the user opens the mobile menu and picks a language fast,
  // the combo box might not be in the DOM yet.
  function applyGoogleTranslate(lang, attempt) {
    attempt = attempt || 0;
    var googCombo = document.querySelector('.goog-te-combo');

    if (googCombo) {
      googCombo.value = lang;
      googCombo.dispatchEvent(new Event('change', { bubbles: true }));

      // Close the mobile menu only after translation has actually fired
      var navLinks = document.getElementById('navLinks');
      if (navLinks) {
        setTimeout(function () {
          navLinks.classList.remove('active');
        }, 150);
      }
      return;
    }

    // Not ready yet — retry for up to ~5 seconds
    if (attempt < 25) {
      setTimeout(function () {
        applyGoogleTranslate(lang, attempt + 1);
      }, 200);
    } else {
      console.warn('Google Translate widget did not load in time.');
    }
  }
});