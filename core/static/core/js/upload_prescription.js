document.addEventListener('DOMContentLoaded', function () {

    /* ===== PHOTO DROPZONE ===== */

    var photoInput = document.getElementById('photoInput');
    var dropzone = document.getElementById('dropzone');
    var emptyState = document.getElementById('dropzoneEmpty');
    var previewState = document.getElementById('dropzonePreview');
    var previewImg = document.getElementById('previewImg');
    var fileNameEl = document.getElementById('fileName');
    var fileSizeEl = document.getElementById('fileSize');
    var removeBtn = document.getElementById('removePhoto');
    var photoError = document.getElementById('photoError');

    var MAX_BYTES = 10 * 1024 * 1024;

    function formatSize(bytes) {
        if (bytes < 1024 * 1024) {
            return Math.round(bytes / 1024) + ' KB';
        }
        return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
    }

    function showError(message) {
        photoError.textContent = message;
        photoError.hidden = false;
        dropzone.classList.add('has-error');
    }

    function clearError() {
        photoError.hidden = true;
        dropzone.classList.remove('has-error');
    }

    function showPreview(file) {
        var url = URL.createObjectURL(file);
        previewImg.src = url;
        fileNameEl.textContent = file.name;
        fileSizeEl.textContent = formatSize(file.size);
        emptyState.hidden = true;
        previewState.hidden = false;
    }

    function resetDropzone() {
        photoInput.value = '';
        emptyState.hidden = false;
        previewState.hidden = true;
        previewImg.src = '';
    }

    function handleFile(file) {
        if (!file) return;
        if (!/^image\/(jpeg|png|jpg)$/.test(file.type)) {
            showError('Please choose a JPG or PNG image.');
            resetDropzone();
            return;
        }
        if (file.size > MAX_BYTES) {
            showError('That photo is larger than 10MB — please choose a smaller one.');
            resetDropzone();
            return;
        }
        clearError();
        showPreview(file);
    }

    if (photoInput && dropzone) {
        dropzone.addEventListener('click', function () {
            photoInput.click();
        });

        dropzone.addEventListener('keydown', function (e) {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                photoInput.click();
            }
        });

        photoInput.addEventListener('change', function () {
            handleFile(photoInput.files[0]);
        });

        ['dragenter', 'dragover'].forEach(function (evt) {
            dropzone.addEventListener(evt, function (e) {
                e.preventDefault();
                dropzone.classList.add('drag-over');
            });
        });

        ['dragleave', 'drop'].forEach(function (evt) {
            dropzone.addEventListener(evt, function (e) {
                e.preventDefault();
                dropzone.classList.remove('drag-over');
            });
        });

        dropzone.addEventListener('drop', function (e) {
            var file = e.dataTransfer.files[0];
            if (!file) return;
            var dt = new DataTransfer();
            dt.items.add(file);
            photoInput.files = dt.files;
            handleFile(file);
        });

        removeBtn.addEventListener('click', function (e) {
            e.stopPropagation();
            resetDropzone();
            clearError();
        });
    }

    /* ===== DESCRIPTION ANALYZER WITH MULTI-API SUPPORT ===== */

    var descInput = document.getElementById('descriptionInput');
    var wordCountEl = document.getElementById('wordCount');
    var clarityRing = document.getElementById('clarityRing');
    var clarityPct = document.getElementById('clarityPct');
    var clarityLabel = document.getElementById('clarityLabel');
    var chipsEl = document.getElementById('analyzerChips');
    var tipsEl = document.getElementById('analyzerTips');

    // Local word lists for basic analysis
    var SYMPTOM_WORDS = ['fever', 'cough', 'pain', 'ache', 'nausea', 'dizzy', 'dizziness',
        'rash', 'fatigue', 'tired', 'vomit', 'headache', 'sore throat', 'swelling',
        'breath', 'cold', 'flu', 'itch', 'cramp'];
    var DURATION_WORDS = ['day', 'days', 'week', 'weeks', 'hour', 'hours', 'since',
        'started', 'morning', 'night', 'month', 'months', 'yesterday', 'today'];
    var SEVERITY_WORDS = ['mild', 'moderate', 'severe', 'sharp', 'dull', 'worse',
        'better', 'constant', 'occasional', 'intense', 'slight'];
    var LOCATION_WORDS = ['head', 'chest', 'stomach', 'back', 'throat', 'leg', 'arm',
        'joint', 'knee', 'shoulder', 'ear', 'eye', 'foot', 'hand', 'neck', 'abdomen'];

    // API endpoints
    var APIs = {
        CONDITION: 'https://clinicaltables.nlm.nih.gov/api/conditions/v3/search',
        ICD10: 'https://clinicaltables.nlm.nih.gov/api/icd10cm/v3/search',
        RXNORM: 'https://rxnav.nlm.nih.gov/REST/drugs.json'
    };

    var searchCache = {};
    var cacheExpiry = 1000 * 60 * 60; // 1 hour

    /**
     * Generic API search function for Clinical Tables
     */
    function searchAPI(apiUrl, term, cacheKey) {
        return new Promise(function (resolve) {
            if (!term || term.length < 2) {
                resolve([]);
                return;
            }

            var now = Date.now();
            
            // Check cache
            if (searchCache[cacheKey] && (now - searchCache[cacheKey].timestamp) < cacheExpiry) {
                resolve(searchCache[cacheKey].results);
                return;
            }

            var url = apiUrl + '?terms=' + encodeURIComponent(term);
            fetch(url)
                .then(function (response) {
                    if (!response.ok) throw new Error('API error');
                    return response.json();
                })
                .then(function (data) {
                    var results = [];
                    
                    // Parse NLM Clinical Tables API response: [count, ids, null, [[code, name], ...]]
                    if (data && data[3] && Array.isArray(data[3])) {
                        results = data[3].slice(0, 5).map(function (item) {
                            return item[1] || item[0];
                        }).filter(Boolean);
                    }
                    
                    searchCache[cacheKey] = { results: results, timestamp: now };
                    resolve(results);
                })
                .catch(function (err) {
                    console.error('API search error:', err);
                    resolve([]);
                });
        });
    }

    /**
     * Search RxNorm for drug names
     */
    function searchDrugs(term) {
        return new Promise(function (resolve) {
            if (!term || term.length < 2) {
                resolve([]);
                return;
            }

            var now = Date.now();
            var cacheKey = 'drug_' + term.toLowerCase();
            
            // Check cache
            if (searchCache[cacheKey] && (now - searchCache[cacheKey].timestamp) < cacheExpiry) {
                resolve(searchCache[cacheKey].results);
                return;
            }

            var url = APIs.RXNORM + '?name=' + encodeURIComponent(term);
            fetch(url)
                .then(function (response) {
                    if (!response.ok) throw new Error('RxNorm API error');
                    return response.json();
                })
                .then(function (data) {
                    var results = [];
                    
                    // RxNorm returns: { drugGroup: { conceptGroup: [ { conceptProperties: [ { name, rxcui }, ... ] } ] } }
                    if (data && data.drugGroup && data.drugGroup.conceptGroup) {
                        data.drugGroup.conceptGroup.forEach(function (group) {
                            if (group.conceptProperties) {
                                group.conceptProperties.slice(0, 3).forEach(function (drug) {
                                    if (drug.name) results.push(drug.name);
                                });
                            }
                        });
                    }
                    
                    searchCache[cacheKey] = { results: results.slice(0, 5), timestamp: now };
                    resolve(searchCache[cacheKey].results);
                })
                .catch(function (err) {
                    console.error('RxNorm error:', err);
                    resolve([]);
                });
        });
    }

    /**
     * Check drug interactions
     */
    function checkDrugInteractions(medications) {
        if (!medications || medications.length < 2) return Promise.resolve(null);

        return new Promise(function (resolve) {
            // For simplicity, we'll just return a warning if multiple drugs exist
            // Full implementation would need to map drug names to RxCUIs first
            var message = 'Note: You have ' + medications.length + ' medications. Consult your doctor about potential interactions.';
            resolve({ warning: message, count: medications.length });
        });
    }

    function containsAny(text, list) {
        return list.some(function (w) { return text.indexOf(w) !== -1; });
    }

    /**
     * Main symptom analysis function
     */
    function analyze(text) {
        var lower = text.toLowerCase();
        var words = text.trim().length ? text.trim().split(/\s+/) : [];
        var wordCount = words.length;

        // Basic analysis
        var hasSymptom = containsAny(lower, SYMPTOM_WORDS);
        var hasDuration = containsAny(lower, DURATION_WORDS);
        var hasSeverity = containsAny(lower, SEVERITY_WORDS);
        var hasLocation = containsAny(lower, LOCATION_WORDS);

        var found = [hasSymptom, hasDuration, hasSeverity, hasLocation].filter(Boolean).length;
        var pct = wordCount === 0 ? 0 : Math.round((found / 4) * 100);

        wordCountEl.textContent = wordCount;
        clarityRing.style.setProperty('--pct', pct);
        clarityPct.textContent = pct + '%';

        var label = 'Start typing to see feedback';
        if (wordCount > 0) {
            if (pct <= 25) label = 'Getting started';
            else if (pct <= 50) label = 'Adding useful detail';
            else if (pct <= 75) label = 'Good detail';
            else label = 'Very clear description';
        }
        clarityLabel.textContent = label;

        // Basic chips
        var chips = [];
        if (hasSymptom) chips.push('Symptom noted');
        if (hasDuration) chips.push('Duration noted');
        if (hasSeverity) chips.push('Severity noted');
        if (hasLocation) chips.push('Location noted');
        
        chipsEl.innerHTML = chips.map(function (c) {
            return '<span class="chip">' + c + '</span>';
        }).join('');

        // Tips
        var tips = [];
        if (wordCount === 0) {
            tips.push('Describe what you\'re experiencing in your own words — there\'s no wrong way to start.');
        } else {
            if (!hasDuration) tips.push('Mention how long you\'ve had this, e.g. "for 3 days" or "since yesterday".');
            if (!hasSeverity) tips.push('Describe how strong it feels, e.g. "mild", "sharp", or "gets worse at night".');
            if (!hasLocation) tips.push('Note where it\'s located, e.g. "in my lower back" or "behind my left eye".');
            if (tips.length === 0) tips.push('This gives your doctor a clear picture. Add anything else you think matters.');
        }
        tipsEl.innerHTML = tips.map(function (t) {
            return '<li>' + t + '</li>';
        }).join('');

        // API searches for richer data
        if (wordCount > 2 && hasSymptom) {
            searchAPI(APIs.CONDITION, SYMPTOM_WORDS[0], 'condition_demo').then(function (conditions) {
                if (conditions && conditions.length > 0) {
                    var conditionChips = conditions.slice(0, 2).map(function (c) {
                        return '<span class="chip" style="background:#e8f4f8;">🏥 ' + c + '</span>';
                    });
                    if (conditionChips.length > 0) {
                        chipsEl.innerHTML += conditionChips.join('');
                    }
                }
            });
        }
    }

    if (descInput) {
        descInput.addEventListener('input', function () {
            analyze(descInput.value);
        });
        analyze(descInput.value || '');
    }

    /* ===== MEDICATION SEARCH & MANAGEMENT ===== */

    var medicationInput = document.getElementById('medicationInput');
    var medicationSuggestions = document.getElementById('medicationSuggestions');
    var medicationsList = document.getElementById('medicationsList');
    var medicationTags = document.getElementById('medicationTags');

    var medications = []; // Store added medications

    /**
     * Render medication tags
     */
    function renderMedicationTags() {
        medicationTags.innerHTML = medications.map(function (med, idx) {
            return '<div class="medication-tag">' +
                '<span>💊 ' + med + '</span>' +
                '<button type="button" data-index="' + idx + '" aria-label="Remove ' + med + '">×</button>' +
                '</div>';
        }).join('');

        // Update hidden field for form submission
        medicationsList.value = medications.join(', ');

        // Add remove button handlers
        var removeButtons = medicationTags.querySelectorAll('button');
        removeButtons.forEach(function (btn) {
            btn.addEventListener('click', function (e) {
                e.preventDefault();
                var idx = parseInt(this.getAttribute('data-index'), 10);
                medications.splice(idx, 1);
                renderMedicationTags();
            });
        });

        // Check for interactions if multiple medications
        if (medications.length >= 2) {
            checkDrugInteractions(medications).then(function (result) {
                if (result && result.warning) {
                    console.warn(result.warning);
                }
            });
        }
    }

    /**
     * Add medication
     */
    function addMedication(drug) {
        var normalized = drug.trim().toLowerCase();
        
        // Check for duplicates
        if (medications.some(function (m) { return m.toLowerCase() === normalized; })) {
            return;
        }

        // Preserve original casing
        medications.push(drug);
        renderMedicationTags();
        medicationInput.value = '';
        medicationSuggestions.innerHTML = '';
    }

    if (medicationInput) {
        var suggestionTimeout;

        medicationInput.addEventListener('input', function () {
            clearTimeout(suggestionTimeout);
            var term = medicationInput.value.trim();

            if (term.length < 2) {
                medicationSuggestions.innerHTML = '';
                return;
            }

            medicationSuggestions.innerHTML = '<p class="suggestion-loading">Searching medications...</p>';

            // Debounce API calls
            suggestionTimeout = setTimeout(function () {
                searchDrugs(term).then(function (drugs) {
                    if (!drugs || drugs.length === 0) {
                        medicationSuggestions.innerHTML = '<p class="suggestion-none">No medications found</p>';
                        return;
                    }

                    var html = '<ul class="suggestion-list">' +
                        drugs.map(function (drug) {
                            return '<li><a href="#" data-drug="' + drug + '" class="suggestion-item">' +
                                '<span class="suggestion-icon">💊</span>' +
                                '<span class="suggestion-text">' + drug + '</span>' +
                                '</a></li>';
                        }).join('') +
                        '</ul>';

                    medicationSuggestions.innerHTML = html;

                    // Add click handlers
                    var items = medicationSuggestions.querySelectorAll('.suggestion-item');
                    items.forEach(function (item) {
                        item.addEventListener('click', function (e) {
                            e.preventDefault();
                            var drug = this.getAttribute('data-drug');
                            addMedication(drug);
                        });
                    });
                });
            }, 300);
        });

        // Handle pasting comma-separated medications
        medicationInput.addEventListener('paste', function (e) {
            setTimeout(function () {
                var text = medicationInput.value;
                var drugs = text.split(',').map(function (d) { return d.trim(); }).filter(Boolean);
                
                drugs.forEach(function (drug) {
                    addMedication(drug);
                });
                
                medicationInput.value = '';
            }, 10);
        });

        // Close suggestions on blur
        medicationInput.addEventListener('blur', function () {
            setTimeout(function () {
                medicationSuggestions.innerHTML = '';
            }, 200);
        });

        // Handle Enter key to add typed medication
        medicationInput.addEventListener('keydown', function (e) {
            if (e.key === 'Enter') {
                e.preventDefault();
                var term = medicationInput.value.trim();
                if (term) {
                    addMedication(term);
                }
            }
        });
    }
});