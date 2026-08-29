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