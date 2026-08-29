let selectedGuardians = [];

function toggleMenu() {
    const navLinks = document.getElementById('navLinks');
    navLinks.classList.toggle('active');
}

function toggleDropdown(event) {
    // Prevent event from bubbling up to document click listener
    if (event) event.stopPropagation();
    document.getElementById('dropdownList').classList.toggle('open');
}

function toggleGuardian(event) {
    event.stopPropagation();
    const item = event.currentTarget;
    const value = item.dataset.value;
    
    if (selectedGuardians.includes(value)) {
        selectedGuardians = selectedGuardians.filter(g => g !== value);
        item.classList.remove('selected');
    } else {
        selectedGuardians.push(value);
        item.classList.add('selected');
    }
    
    updateSelectedGuardians();
}

function updateSelectedGuardians() {
    const container = document.getElementById('multiSelect');
    
    if (selectedGuardians.length === 0) {
        container.innerHTML = '<span class="multi-select-text" id="selectedGuardians">Choose guardians...</span>';
    } else {
        const selectedElements = Array.from(document.querySelectorAll('.dropdown-item.selected'));
        container.innerHTML = selectedElements.map(el => 
            `<div class="guardian-tag">${el.textContent} <button type="button" onclick="removeGuardian(event, '${el.dataset.value}')">&times;</button></div>`
        ).join('');
    }
}

function removeGuardian(event, value) {
    // Prevent opening/toggling dropdown when clicking the 'x' button
    event.stopPropagation();
    
    selectedGuardians = selectedGuardians.filter(g => g !== value);
    const targetItem = document.querySelector(`.dropdown-item[data-value="${value}"]`);
    if (targetItem) {
        targetItem.classList.remove('selected');
    }
    updateSelectedGuardians();
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

function handleSignup() {
    clearAllErrors();
    const name = document.getElementById('signupName').value.trim();
    const email = document.getElementById('signupEmail').value.trim();
    const password = document.getElementById('signupPassword').value;
    const confirmPassword = document.getElementById('signupConfirmPassword').value;
    let isValid = true;

    if (!name) {
        showError('signupNameError', 'Name is required');
        isValid = false;
    }

    if (!email) {
        showError('signupEmailError', 'Email is required');
        isValid = false;
    } else if (!validateEmail(email)) {
        showError('signupEmailError', 'Enter a valid email');
        isValid = false;
    }

    if (!password) {
        showError('signupPasswordError', 'Password is required');
        isValid = false;
    } else if (password.length < 8) {
        showError('signupPasswordError', 'Min 8 characters');
        isValid = false;
    }

    if (!confirmPassword) {
        showError('signupConfirmPasswordError', 'Confirm your password');
        isValid = false;
    } else if (password !== confirmPassword) {
        showError('signupConfirmPasswordError', 'Passwords don\'t match');
        isValid = false;
    }

    if (selectedGuardians.length === 0) {
        showError('guardiansError', 'Select at least one guardian');
        isValid = false;
    }

    if (isValid) {
        alert('Account created successfully!');
    }
}

function showError(elementId, message) {
    const errorEl = document.getElementById(elementId);
    errorEl.textContent = message;
    errorEl.classList.add('show');
}

// Global click handler to close dropdown when clicking outside
document.addEventListener('click', (e) => {
    const multiSelect = document.getElementById('multiSelect');
    const dropdownList = document.getElementById('dropdownList');
    if (!multiSelect.contains(e.target) && !dropdownList.contains(e.target)) {
        dropdownList.classList.remove('open');
    }
});

document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        document.getElementById('dropdownList').classList.remove('open');
    }
});