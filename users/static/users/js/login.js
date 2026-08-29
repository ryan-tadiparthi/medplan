    function toggleMenu() {
            const navLinks = document.getElementById('navLinks');
            navLinks.classList.toggle('active');
        }

        function clearAllErrors() {
            document.querySelectorAll('.error').forEach(el => {
                el.classList.remove('show');
                el.textContent = '';
            });
        }

        function validateEmail(email) {
            return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
        }

        function handleLogin() {
            clearAllErrors();
            const email = document.getElementById('loginEmail').value.trim();
            const password = document.getElementById('loginPassword').value;
            let isValid = true;

            if (!email) {
                showError('loginEmailError', 'Email is required');
                isValid = false;
            } else if (!validateEmail(email)) {
                showError('loginEmailError', 'Enter a valid email');
                isValid = false;
            }

            if (!password) {
                showError('loginPasswordError', 'Password is required');
                isValid = false;
            }

            if (isValid) {
                alert('Sign in successful!');
            }
        }

        function showError(elementId, message) {
            const errorEl = document.getElementById(elementId);
            errorEl.textContent = message;
            errorEl.classList.add('show');
        }


// 1. Initialize Google Translate silently in the background
function googleTranslateElementInit() {
  new google.translate.TranslateElement({
    pageLanguage: 'en',
    includedLanguages: 'en,es,ne,fr',
    autoDisplay: false
  }, 'google_translate_element');
}

// 2. Inject Google Translate API script dynamically
(function() {
  if (!document.getElementById('google-translate-script')) {
    var script = document.createElement('script');
    script.id = 'google-translate-script';
    script.type = 'text/javascript';
    script.src = '//translate.google.com/translate_a/element.js?cb=googleTranslateElementInit';
    document.head.appendChild(script);
  }
})();

// 3. Trigger Google translation when your custom select value changes
document.addEventListener('DOMContentLoaded', function() {
  var select = document.getElementById('customLanguageSelect');
  
  if (select) {
    select.addEventListener('change', function() {
      var lang = this.value;
      var googleCombo = document.querySelector('.goog-te-combo');
      
      if (googleCombo) {
        googleCombo.value = lang;
        googleCombo.dispatchEvent(new Event('change'));
      }
    });
  }
});