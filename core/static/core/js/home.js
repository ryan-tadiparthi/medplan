function toggleMenu(){
  document.getElementById('navLinks').classList.toggle('active');
}

document.querySelectorAll('.nav-links a').forEach(link=>{
  link.addEventListener('click',()=>{
    document.getElementById('navLinks').classList.remove('active');
  });
});
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