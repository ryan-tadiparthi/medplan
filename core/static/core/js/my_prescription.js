(function(){

  var STORAGE_KEYS = ['profile','profileHistory','medications','appointments','guardians','vitals','takenLog'];
  var state = { profile:null, profileHistory:[], medications:[], appointments:[], guardians:[], vitals:[], takenLog:{} };
  var calDate = new Date();
  var selectedDay = null;
  var chartInstance = null;
  var vitalsChartInstance = null;
  var adherenceChartInstance = null;
  var currentMetric = 'weight';
  var openInfoIds = {};
  var notifiedKeys = {};

  /* General, commonly-known side effects for widely used medicines.
     Informational only — not exhaustive, not dosage-specific, not medical advice. */
  var SIDE_EFFECTS = {
    'metformin': ['Nausea or upset stomach', 'Diarrhea, especially when starting', 'Metallic taste', 'Usually improves by taking with food'],
    'lisinopril': ['Dry, tickly cough', 'Dizziness, especially when standing up', 'Headache'],
    'atorvastatin': ['Muscle aches', 'Digestive upset', 'Rarely, liver enzyme changes checked by blood tests'],
    'simvastatin': ['Muscle aches', 'Digestive upset', 'Headache'],
    'amlodipine': ['Ankle or leg swelling', 'Flushing', 'Headache', 'Dizziness'],
    'levothyroxine': ['Usually well tolerated at the right dose', 'Too high a dose can cause a racing heart, jitteriness, or trouble sleeping'],
    'aspirin': ['Stomach irritation or heartburn', 'Increased bruising or bleeding', 'Take with food to reduce stomach upset'],
    'ibuprofen': ['Stomach upset', 'Increased blood pressure with regular use', 'Fluid retention', 'Avoid long-term use without medical advice'],
    'paracetamol': ['Generally well tolerated at recommended doses', 'Avoid exceeding the daily limit, especially with alcohol'],
    'acetaminophen': ['Generally well tolerated at recommended doses', 'Avoid exceeding the daily limit, especially with alcohol'],
    'omeprazole': ['Headache', 'Stomach pain or diarrhea', 'Long-term use sometimes linked to lower vitamin B12 or magnesium'],
    'metoprolol': ['Fatigue', 'Cold hands or feet', 'Slowed heart rate', 'Dizziness'],
    'losartan': ['Dizziness', 'Higher potassium levels, monitored by blood tests', 'Usually fewer cough issues than lisinopril-type drugs'],
    'hydrochlorothiazide': ['Increased urination', 'Low potassium', 'Dizziness', 'Sun sensitivity'],
    'warfarin': ['Increased bleeding or bruising risk', 'Requires regular blood tests to monitor levels', 'Many food and drug interactions'],
    'insulin': ['Low blood sugar (shakiness, sweating, confusion)', 'Weight gain', 'Injection site reactions'],
    'sertraline': ['Nausea, especially at first', 'Sleep changes', 'Sexual side effects', 'Usually settles after a few weeks'],
    'escitalopram': ['Nausea', 'Sleep changes', 'Sexual side effects'],
    'alprazolam': ['Drowsiness', 'Dizziness', 'Dependency risk with regular use', 'Avoid alcohol'],
    'prednisone': ['Increased appetite and weight gain', 'Mood changes', 'Trouble sleeping', 'Raised blood sugar'],
    'albuterol': ['Jitteriness or shakiness', 'Fast heartbeat', 'Headache'],
    'azithromycin': ['Nausea or stomach upset', 'Diarrhea', 'Finish the full course as prescribed'],
    'amoxicillin': ['Stomach upset', 'Diarrhea', 'Allergic rash in some people'],
    'gabapentin': ['Drowsiness', 'Dizziness', 'Coordination changes'],
    'tramadol': ['Drowsiness', 'Nausea', 'Dizziness', 'Constipation'],
    'furosemide': ['Increased urination', 'Low potassium', 'Dizziness from fluid loss'],
    'clopidogrel': ['Increased bruising or bleeding', 'Stomach upset']
  };

  function pad(n){ return n<10 ? '0'+n : ''+n; }
  function todayStr(){ var d=new Date(); return d.getFullYear()+'-'+pad(d.getMonth()+1)+'-'+pad(d.getDate()); }
  function fmtDate(dstr){
    var parts = dstr.split('-');
    var d = new Date(parseInt(parts[0]),parseInt(parts[1])-1,parseInt(parts[2]));
    return d.toLocaleDateString(undefined,{weekday:'short',month:'short',day:'numeric'});
  }
  function uid(){ return Math.random().toString(36).slice(2,10); }

  async function loadAll(){
    for (var i=0;i<STORAGE_KEYS.length;i++){
      var key = STORAGE_KEYS[i];
      try{
        var res = await window.storage.get(key, false);
        if (res && res.value){
          state[key] = JSON.parse(res.value);
        }
      }catch(e){ /* key not found yet, keep default */ }
    }
  }

  async function saveKey(key){
    try{
      await window.storage.set(key, JSON.stringify(state[key]), false);
    }catch(e){ console.error('Could not save', key, e); }
  }

  /* ---------------- PROFILE ---------------- */

  function computeBmi(heightCm, weightKg){
    var m = heightCm/100;
    return weightKg / (m*m);
  }
  function bmiCategory(bmi){
    if (bmi < 18.5) return {label:'Underweight', tag:'tag-warn'};
    if (bmi < 25) return {label:'Healthy range', tag:'tag-normal'};
    if (bmi < 30) return {label:'Above range', tag:'tag-warn'};
    return {label:'Well above range', tag:'tag-danger'};
  }

  function renderProfile(){
    var formWrap = document.getElementById('profileFormWrap');
    var summaryWrap = document.getElementById('profileSummaryWrap');

    if (!state.profile){
      formWrap.style.display = '';
      summaryWrap.style.display = 'none';
      return;
    }

    formWrap.style.display = 'none';
    summaryWrap.style.display = '';

    var bmi = computeBmi(state.profile.height, state.profile.weight);
    var cat = bmiCategory(bmi);

    var statGrid = document.getElementById('statGrid');
    statGrid.innerHTML =
      statCard('Age', state.profile.age + ' yrs', null) +
      statCard('Height', state.profile.height + ' cm', null) +
      statCard('Weight', state.profile.weight + ' kg', null) +
      statCard('BMI', bmi.toFixed(1), cat);

    renderChart(currentMetric);
    renderGlance();
    renderTips();
    renderEmergencyCard();
    renderInsights();
  }

  function statCard(label, value, cat){
    var tag = cat ? '<span class="s-tag '+cat.tag+'">'+cat.label+'</span>' : '';
    return '<div class="stat-card"><div class="s-label">'+label+'</div><div class="s-value">'+value+'</div>'+tag+'</div>';
  }

  function saveProfile(){
    var name = document.getElementById('pName').value.trim();
    var age = parseFloat(document.getElementById('pAge').value);
    var height = parseFloat(document.getElementById('pHeight').value);
    var weight = parseFloat(document.getElementById('pWeight').value);
    var allergies = document.getElementById('pAllergies').value.trim();
    var conditions = document.getElementById('pConditions').value.trim();
    var errEl = document.getElementById('profileError');

    if (!name || isNaN(age) || isNaN(height) || isNaN(weight)){
      errEl.style.display = 'block';
      return;
    }
    errEl.style.display = 'none';

    state.profile = { name:name, age:age, height:height, weight:weight, allergies:allergies, conditions:conditions };
    saveKey('profile');

    var bmi = computeBmi(height, weight);
    var today = todayStr();
    var entry = { date: today, age: age, height: height, weight: weight, bmi: parseFloat(bmi.toFixed(1)) };
    var existingIdx = state.profileHistory.findIndex(function(h){ return h.date === today; });
    if (existingIdx >= 0){ state.profileHistory[existingIdx] = entry; }
    else { state.profileHistory.push(entry); }
    state.profileHistory.sort(function(a,b){ return a.date.localeCompare(b.date); });
    saveKey('profileHistory');

    renderProfile();
  }

  function fillProfileForm(){
    if (!state.profile) return;
    document.getElementById('pName').value = state.profile.name || '';
    document.getElementById('pAge').value = state.profile.age || '';
    document.getElementById('pHeight').value = state.profile.height || '';
    document.getElementById('pWeight').value = state.profile.weight || '';
    document.getElementById('pAllergies').value = state.profile.allergies || '';
    document.getElementById('pConditions').value = state.profile.conditions || '';
  }

  function renderChart(metric){
    currentMetric = metric;
    document.querySelectorAll('#chartToggle button').forEach(function(b){
      b.classList.toggle('active', b.dataset.metric === metric);
    });

    var labels = state.profileHistory.map(function(h){ return fmtDate(h.date); });
    var data = state.profileHistory.map(function(h){ return h[metric]; });
    var labelName = {weight:'Weight (kg)', height:'Height (cm)', bmi:'BMI', age:'Age (years)'}[metric];

    var ctx = document.getElementById('profileChart').getContext('2d');
    if (chartInstance) chartInstance.destroy();
    chartInstance = new Chart(ctx, {
      type:'line',
      data:{ labels:labels, datasets:[{ label:labelName, data:data, borderColor:'#6C5CE7', backgroundColor:'rgba(108,92,231,0.12)', fill:true, tension:0.3, pointRadius:5, pointBackgroundColor:'#6C5CE7', borderWidth:3 }] },
      options:{
        responsive:true, maintainAspectRatio:false,
        plugins:{ legend:{ display:false } },
        scales:{ y:{ ticks:{ font:{ size:14 } } }, x:{ ticks:{ font:{ size:13 } } } }
      }
    });
  }

  /* ---------------- MEDICATIONS ---------------- */

  function findSideEffects(medName){
    var n = (medName||'').toLowerCase().trim();
    if (!n) return null;
    for (var key in SIDE_EFFECTS){
      if (n.indexOf(key) >= 0 || key.indexOf(n) >= 0){
        return { key:key, effects: SIDE_EFFECTS[key] };
      }
    }
    return null;
  }

  function renderMedTable(){
    var tbody = document.querySelector('#medTable tbody');
    if (state.medications.length === 0){
      tbody.innerHTML = '<tr><td colspan="7" class="empty-note">No medicines added yet.</td></tr>';
    } else {
      var rows = '';
      state.medications.forEach(function(m){
        var times = m.times.map(function(t){ return '<span class="pill">'+t+'</span>'; }).join('');
        var remindOn = !!m.remindEnabled;
        rows += '<tr>' +
          '<td>'+escapeHtml(m.name)+'</td>' +
          '<td>'+escapeHtml(m.dosage||'—')+'</td>' +
          '<td>'+times+'</td>' +
          '<td>'+escapeHtml(m.notes||'—')+'</td>' +
          '<td><button class="bell-toggle'+(remindOn?' on':'')+'" data-toggle-remind="'+m.id+'" title="'+(remindOn?'Reminders on':'Reminders off')+'"><i class="fa-solid fa-bell'+(remindOn?'':'-slash')+'"></i></button></td>' +
          '<td><button class="btn-ghost" data-toggle-info="'+m.id+'"><i class="fa-solid fa-circle-info"></i> Info</button></td>' +
          '<td><button class="btn btn-danger btn-sm" data-remove-med="'+m.id+'"><i class="fa-solid fa-trash"></i></button></td>' +
        '</tr>';
        if (openInfoIds[m.id]){
          var found = findSideEffects(m.name);
          var text;
          if (found){
            text = '<strong>Commonly reported with medicines like '+escapeHtml(m.name)+':</strong> '+found.effects.map(escapeHtml).join(' · ');
          } else {
            text = 'No general reference info on file for "'+escapeHtml(m.name)+'". Ask your pharmacist or check the leaflet that came with it for possible side effects.';
          }
          rows += '<tr class="side-effect-row"><td colspan="7">'+text+' <span style="display:block;margin-top:6px;font-style:italic;">General information only, not exhaustive and not personalized — always confirm with your pharmacist or doctor.</span></td></tr>';
        }
      });
      tbody.innerHTML = rows;
    }
    renderTodaySchedule();
    renderCalendar();
    renderGlance();
    renderEmergencyCard();
    renderInsights();
  }

  function escapeHtml(s){
    var d = document.createElement('div');
    d.textContent = s == null ? '' : s;
    return d.innerHTML;
  }

  function allDosesFlat(){
    var doses = [];
    state.medications.forEach(function(m){
      m.times.forEach(function(t){
        doses.push({ medId:m.id, name:m.name, dosage:m.dosage, time:t });
      });
    });
    doses.sort(function(a,b){ return a.time.localeCompare(b.time); });
    return doses;
  }

  function renderTodaySchedule(){
    var wrap = document.getElementById('todaySchedule');
    var doses = allDosesFlat();
    if (doses.length === 0){
      wrap.innerHTML = '<p class="empty-note">Add a medicine below to see today\'s schedule here.</p>';
      renderReminderBanner();
      return;
    }
    var today = todayStr();
    var taken = state.takenLog[today] || [];
    wrap.innerHTML = doses.map(function(d){
      var doseKey = d.medId + '_' + d.time;
      var isTaken = taken.indexOf(doseKey) >= 0;
      return '<div class="day-list-item"><label style="display:flex;align-items:center;gap:12px;cursor:pointer;">' +
        '<input type="checkbox" data-dose-key="'+doseKey+'" '+(isTaken?'checked':'')+' style="width:20px;height:20px;">' +
        '<span style="'+(isTaken?'text-decoration:line-through;color:var(--ink-soft);':'')+'"><strong>'+d.time+'</strong> — '+escapeHtml(d.name)+' ('+escapeHtml(d.dosage||'—')+')</span>' +
        '</label></div>';
    }).join('');
    renderReminderBanner();
  }

  function toggleDoseTaken(doseKey){
    var today = todayStr();
    if (!state.takenLog[today]) state.takenLog[today] = [];
    var idx = state.takenLog[today].indexOf(doseKey);
    if (idx >= 0) state.takenLog[today].splice(idx,1);
    else state.takenLog[today].push(doseKey);
    saveKey('takenLog');
    renderTodaySchedule();
    renderInsights();
  }

  function saveMedication(){
    var name = document.getElementById('mName').value.trim();
    var dosage = document.getElementById('mDosage').value.trim();
    var timesRaw = document.getElementById('mTimes').value.trim();
    var notes = document.getElementById('mNotes').value.trim();
    var remindEnabled = document.getElementById('mRemind').checked;
    var remindMinutes = parseInt(document.getElementById('mRemindMins').value) || 0;
    var errEl = document.getElementById('medError');

    var times = timesRaw.split(',').map(function(t){ return t.trim(); }).filter(Boolean);

    if (!name || times.length === 0){
      errEl.style.display = 'block';
      return;
    }
    errEl.style.display = 'none';

    state.medications.push({ id:uid(), name:name, dosage:dosage, times:times, notes:notes, remindEnabled:remindEnabled, remindMinutes:remindMinutes });
    saveKey('medications');

    document.getElementById('mName').value = '';
    document.getElementById('mDosage').value = '';
    document.getElementById('mTimes').value = '';
    document.getElementById('mNotes').value = '';
    document.getElementById('mRemindMins').value = '0';
    document.getElementById('mRemind').checked = true;
    document.getElementById('addMedForm').style.display = 'none';

    renderMedTable();
  }

  function removeMedication(id){
    state.medications = state.medications.filter(function(m){ return m.id !== id; });
    delete openInfoIds[id];
    saveKey('medications');
    renderMedTable();
  }

  function toggleReminder(id){
    var med = state.medications.find(function(m){ return m.id === id; });
    if (!med) return;
    med.remindEnabled = !med.remindEnabled;
    saveKey('medications');
    renderMedTable();
  }

  function toggleInfo(id){
    openInfoIds[id] = !openInfoIds[id];
    renderMedTable();
  }

  /* ---------------- REMINDERS ---------------- */

  function updateNotifStatus(){
    var el = document.getElementById('notifStatus');
    if (!('Notification' in window)){
      el.textContent = 'Notifications are not supported in this browser.';
    } else if (Notification.permission === 'granted'){
      el.textContent = 'Notifications are on.';
    } else if (Notification.permission === 'denied'){
      el.textContent = 'Notifications are blocked — enable them in your browser settings.';
    } else {
      el.textContent = 'Notifications are off — click to enable.';
    }
  }

  function enableNotifications(){
    if (!('Notification' in window)){
      updateNotifStatus();
      return;
    }
    Notification.requestPermission().then(function(){ updateNotifStatus(); });
  }

  function renderReminderBanner(){
    var wrap = document.getElementById('reminderBanner');
    var now = new Date();
    var nowMinutes = now.getHours()*60 + now.getMinutes();
    var today = todayStr();
    var taken = state.takenLog[today] || [];

    var upcoming = [];
    state.medications.forEach(function(m){
      if (!m.remindEnabled) return;
      m.times.forEach(function(t){
        var parts = t.split(':');
        if (parts.length < 2) return;
        var doseMinutes = parseInt(parts[0])*60 + parseInt(parts[1]);
        var diff = doseMinutes - nowMinutes;
        var doseKey = m.id+'_'+t;
        if (diff >= -15 && diff <= 60 && taken.indexOf(doseKey) < 0){
          upcoming.push({ name:m.name, dosage:m.dosage, time:t, diff:diff });
        }
      });
    });

    if (upcoming.length === 0){
      wrap.innerHTML = '';
      return;
    }
    upcoming.sort(function(a,b){ return a.diff - b.diff; });
    var items = upcoming.map(function(u){
      var when = u.diff < 0 ? 'now (a little overdue)' : (u.diff === 0 ? 'right now' : 'in about '+u.diff+' min');
      return '<div class="rb-item"><i class="fa-solid fa-clock"></i> '+escapeHtml(u.name)+' ('+escapeHtml(u.dosage||'—')+') at '+u.time+' — '+when+'</div>';
    }).join('');
    wrap.innerHTML = '<div class="reminder-banner"><div class="rb-title"><i class="fa-solid fa-bell"></i> Upcoming doses</div>'+items+'</div>';
  }

  function checkReminders(){
    if (!('Notification' in window) || Notification.permission !== 'granted') return;
    var now = new Date();
    var nowMinutes = now.getHours()*60 + now.getMinutes();
    var today = todayStr();
    state.medications.forEach(function(m){
      if (!m.remindEnabled) return;
      m.times.forEach(function(t){
        var parts = t.split(':');
        if (parts.length < 2) return;
        var doseMinutes = parseInt(parts[0])*60 + parseInt(parts[1]);
        var remindAt = doseMinutes - (m.remindMinutes || 0);
        var key = m.id+'_'+t+'_'+today;
        if (nowMinutes === remindAt && !notifiedKeys[key]){
          notifiedKeys[key] = true;
          try{
            new Notification('Medication reminder', { body: m.name+' ('+(m.dosage||'—')+') at '+t, icon:'' });
          }catch(e){ /* ignore */ }
        }
      });
    });
    renderReminderBanner();
  }

  /* ---------------- CALENDAR ---------------- */

  function renderCalendar(){
    var year = calDate.getFullYear();
    var month = calDate.getMonth();
    document.getElementById('calMonthLabel').textContent = calDate.toLocaleDateString(undefined,{month:'long', year:'numeric'});

    var grid = document.getElementById('calGrid');
    var dowNames = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
    var html = dowNames.map(function(d){ return '<div class="cal-dow">'+d+'</div>'; }).join('');

    var firstDay = new Date(year, month, 1);
    var startOffset = firstDay.getDay();
    var daysInMonth = new Date(year, month+1, 0).getDate();
    var daysInPrevMonth = new Date(year, month, 0).getDate();
    var todayS = todayStr();
    var hasMeds = state.medications.length > 0;

    var totalCells = Math.ceil((startOffset + daysInMonth) / 7) * 7;
    for (var i=0; i<totalCells; i++){
      var dayNum, cellMonth, cellYear, otherMonth = false;
      if (i < startOffset){
        dayNum = daysInPrevMonth - startOffset + i + 1;
        cellMonth = month - 1; cellYear = year; otherMonth = true;
      } else if (i >= startOffset + daysInMonth){
        dayNum = i - startOffset - daysInMonth + 1;
        cellMonth = month + 1; cellYear = year; otherMonth = true;
      } else {
        dayNum = i - startOffset + 1;
        cellMonth = month; cellYear = year;
      }
      var normMonth = ((cellMonth % 12) + 12) % 12;
      var normYear = cellYear + Math.floor(cellMonth/12) - (cellMonth < 0 ? 1 : 0);
      var dstr = normYear + '-' + pad(normMonth+1) + '-' + pad(dayNum);
      var hasAppt = state.appointments.some(function(a){ return a.date === dstr; });
      var isToday = dstr === todayS;
      var isSelected = dstr === selectedDay;

      var dots = '';
      if (hasMeds && !otherMonth) dots += '<span class="dot-med"></span>';
      if (hasAppt) dots += '<span class="dot-appt"></span>';

      html += '<button type="button" class="cal-cell'+(otherMonth?' other-month':'')+(isToday?' today':'')+(isSelected?' selected':'')+'" data-date="'+dstr+'">' +
        '<span class="cal-daynum">'+dayNum+'</span><span class="cal-dots">'+dots+'</span></button>';
    }
    grid.innerHTML = html;

    if (selectedDay) renderDayDetail(selectedDay);
  }

  function renderDayDetail(dstr){
    selectedDay = dstr;
    var wrap = document.getElementById('dayDetail');
    wrap.style.display = 'block';

    var doses = allDosesFlat();
    var appts = state.appointments.filter(function(a){ return a.date === dstr; });

    var html = '<h3>'+fmtDate(dstr)+'</h3>';

    html += '<div class="section-label" style="margin-top:14px;">Medicine reminders</div>';
    if (doses.length === 0){
      html += '<p class="empty-note">No medicines scheduled.</p>';
    } else {
      doses.forEach(function(d){
        html += '<div class="day-list-item"><span><strong>'+d.time+'</strong> — '+escapeHtml(d.name)+' ('+escapeHtml(d.dosage||'—')+')</span></div>';
      });
    }

    html += '<div class="section-label" style="margin-top:18px;">Appointments</div>';
    if (appts.length === 0){
      html += '<p class="empty-note">No appointments this day.</p>';
    } else {
      appts.forEach(function(a){
        html += '<div class="day-list-item"><span><strong>'+(a.time||'')+'</strong> — '+escapeHtml(a.title)+(a.notes?' <span style="color:var(--ink-soft);">('+escapeHtml(a.notes)+')</span>':'')+'</span>' +
          '<button class="btn btn-danger btn-sm" data-remove-appt="'+a.id+'"><i class="fa-solid fa-trash"></i></button></div>';
      });
    }

    html += '<div class="form-grid" style="margin-top:18px;">' +
      '<div class="field"><label for="aTitle">New appointment title</label><input type="text" id="aTitle" placeholder="e.g. Cardiology check-up"></div>' +
      '<div class="field"><label for="aTime">Time</label><input type="time" id="aTime"></div>' +
      '<div class="field"><label for="aNotes">Notes (optional)</label><input type="text" id="aNotes" placeholder="e.g. Bring insurance card"></div>' +
      '</div>' +
      '<div class="error-text" id="apptError">Please add a title for this appointment.</div>' +
      '<button class="btn btn-primary btn-sm" id="saveApptBtn">Add appointment for '+fmtDate(dstr)+'</button>';

    wrap.innerHTML = html;

    document.getElementById('saveApptBtn').addEventListener('click', function(){
      var title = document.getElementById('aTitle').value.trim();
      var time = document.getElementById('aTime').value;
      var notes = document.getElementById('aNotes').value.trim();
      var errEl = document.getElementById('apptError');
      if (!title){ errEl.style.display = 'block'; return; }
      errEl.style.display = 'none';
      state.appointments.push({ id:uid(), date:dstr, time:time, title:title, notes:notes });
      saveKey('appointments');
      renderCalendar();
      renderGlance();
    });

    wrap.querySelectorAll('[data-remove-appt]').forEach(function(btn){
      btn.addEventListener('click', function(){
        var id = btn.getAttribute('data-remove-appt');
        state.appointments = state.appointments.filter(function(a){ return a.id !== id; });
        saveKey('appointments');
        renderCalendar();
        renderGlance();
      });
    });
  }

  /* ---------------- GUARDIANS ---------------- */

  function renderGuardians(){
    var grid = document.getElementById('guardianGrid');
    if (state.guardians.length === 0){
      grid.innerHTML = '<p class="empty-note">No guardians added yet.</p>';
    } else {
      grid.innerHTML = state.guardians.map(function(g){
        return '<div class="guardian-card">' +
          '<div class="g-name">'+escapeHtml(g.name)+'</div>' +
          '<div class="g-rel">'+escapeHtml(g.relation||'Contact')+'</div>' +
          (g.phone ? '<a class="g-link" href="tel:'+escapeHtml(g.phone)+'"><i class="fa-solid fa-phone"></i> '+escapeHtml(g.phone)+'</a>' : '') +
          (g.email ? '<a class="g-link" href="mailto:'+escapeHtml(g.email)+'"><i class="fa-solid fa-envelope"></i> '+escapeHtml(g.email)+'</a>' : '') +
          '<div class="guardian-actions"><button class="btn btn-danger btn-sm" data-remove-guardian="'+g.id+'"><i class="fa-solid fa-trash"></i> Remove</button></div>' +
          '</div>';
      }).join('');
    }
    renderGlance();
    renderEmergencyCard();
  }

  function saveGuardian(){
    var name = document.getElementById('gName').value.trim();
    var rel = document.getElementById('gRel').value.trim();
    var phone = document.getElementById('gPhone').value.trim();
    var email = document.getElementById('gEmail').value.trim();
    var errEl = document.getElementById('guardianError');

    if (!name || !phone){ errEl.style.display = 'block'; return; }
    errEl.style.display = 'none';

    state.guardians.push({ id:uid(), name:name, relation:rel, phone:phone, email:email });
    saveKey('guardians');

    document.getElementById('gName').value = '';
    document.getElementById('gRel').value = '';
    document.getElementById('gPhone').value = '';
    document.getElementById('gEmail').value = '';
    document.getElementById('addGuardianForm').style.display = 'none';

    renderGuardians();
  }

  /* ---------------- VITALS ---------------- */

  function renderVitals(){
    var chartWrap = document.getElementById('vitalsChartWrap');
    var emptyNote = document.getElementById('vitalsEmpty');
    if (state.vitals.length === 0){
      chartWrap.style.display = 'none';
      emptyNote.style.display = 'block';
      return;
    }
    chartWrap.style.display = 'block';
    emptyNote.style.display = 'none';

    var labels = state.vitals.map(function(v){ return fmtDate(v.date); });
    var systolic = state.vitals.map(function(v){ return v.systolic; });
    var diastolic = state.vitals.map(function(v){ return v.diastolic; });

    var ctx = document.getElementById('vitalsChart').getContext('2d');
    if (vitalsChartInstance) vitalsChartInstance.destroy();
    vitalsChartInstance = new Chart(ctx, {
      type:'line',
      data:{ labels:labels, datasets:[
        { label:'Systolic', data:systolic, borderColor:'#D64545', backgroundColor:'rgba(214,69,69,0.08)', tension:0.3, pointRadius:5, borderWidth:3 },
        { label:'Diastolic', data:diastolic, borderColor:'#4FACFE', backgroundColor:'rgba(79,172,254,0.08)', tension:0.3, pointRadius:5, borderWidth:3 }
      ]},
      options:{ responsive:true, maintainAspectRatio:false, plugins:{ legend:{ position:'top', labels:{ font:{ size:14 } } } }, scales:{ y:{ ticks:{ font:{ size:14 } } }, x:{ ticks:{ font:{ size:13 } } } } }
    });
    renderInsights();
  }

  function addVital(){
    var sys = parseFloat(document.getElementById('vSystolic').value);
    var dia = parseFloat(document.getElementById('vDiastolic').value);
    var sugar = document.getElementById('vSugar').value ? parseFloat(document.getElementById('vSugar').value) : null;
    var errEl = document.getElementById('vitalsError');

    if (isNaN(sys) || isNaN(dia)){ errEl.style.display = 'block'; return; }
    errEl.style.display = 'none';

    state.vitals.push({ date: todayStr(), systolic:sys, diastolic:dia, sugar:sugar });
    saveKey('vitals');

    document.getElementById('vSystolic').value = '';
    document.getElementById('vDiastolic').value = '';
    document.getElementById('vSugar').value = '';

    renderVitals();
    renderTips();
  }

  /* ---------------- GLANCE BANNER ---------------- */

  function renderGlance(){
    var grid = document.getElementById('glanceGrid');
    var items = [];

    var doses = allDosesFlat();
    if (doses.length > 0){
      var now = new Date();
      var nowStr = pad(now.getHours())+':'+pad(now.getMinutes());
      var next = doses.find(function(d){ return d.time >= nowStr; }) || doses[0];
      items.push({ icon:'fa-pills', label: doses.find(function(d){ return d.time >= nowStr; }) ? 'Next dose today' : 'First dose tomorrow', value: next.time+' — '+next.name });
    } else {
      items.push({ icon:'fa-pills', label:'Medicines', value:'None added yet' });
    }

    var upcoming = state.appointments.filter(function(a){ return a.date >= todayStr(); }).sort(function(a,b){ return a.date.localeCompare(b.date); })[0];
    if (upcoming){
      items.push({ icon:'fa-calendar-check', label:'Next appointment', value: fmtDate(upcoming.date)+' — '+upcoming.title });
    } else {
      items.push({ icon:'fa-calendar-check', label:'Appointments', value:'None scheduled' });
    }

    if (state.guardians.length > 0){
      var g = state.guardians[0];
      items.push({ icon:'fa-phone', label:'Call your guardian', value:'<a href="tel:'+escapeHtml(g.phone)+'">'+escapeHtml(g.name)+'</a>' });
    } else {
      items.push({ icon:'fa-phone', label:'Guardians', value:'None added yet' });
    }

    grid.innerHTML = items.map(function(it){
      return '<div class="glance-item"><i class="fa-solid '+it.icon+'"></i><div><div class="g-label">'+it.label+'</div><div class="g-value">'+it.value+'</div></div></div>';
    }).join('');
  }

  /* ---------------- TIPS ---------------- */

  function renderTips(){
    var list = document.getElementById('tipList');
    var tips = [];

    if (state.profile){
      var bmi = computeBmi(state.profile.height, state.profile.weight);
      if (bmi < 18.5) tips.push('Your BMI is below the typical healthy range. A doctor or dietitian can help you build up strength safely.');
      else if (bmi >= 25 && bmi < 30) tips.push('Your BMI is a little above the typical range. Gentle daily walks can help, alongside your doctor\'s guidance.');
      else if (bmi >= 30) tips.push('Your BMI is well above the typical range. It\'s worth discussing a personalized plan with your doctor.');
      else tips.push('Your BMI is within the typical healthy range — keep up your current routine.');

      if (state.profile.age >= 60) tips.push('Fall prevention matters more after 60 — keep walkways clear and consider a grab bar in the bathroom.');
      if (state.profile.allergies) tips.push('Remember to mention your allergies ('+escapeHtml(state.profile.allergies)+') at every new appointment.');
    } else {
      tips.push('Fill in your health profile above to get personalized tips.');
    }

    if (state.vitals.length > 0){
      var latest = state.vitals[state.vitals.length-1];
      if (latest.systolic >= 140 || latest.diastolic >= 90) tips.push('Your latest blood pressure reading is on the higher side. Please share this with your doctor.');
    }

    if (state.medications.length >= 3) tips.push('You\'re managing several medicines — a weekly pill organizer can make this easier.');

    tips.push('Aim for consistent water intake through the day, unless your doctor has told you to limit fluids.');
    tips.push('Try to take medicines at the same times each day — it helps your body and makes side effects easier to notice.');
    tips.push('Good, regular sleep supports blood pressure, mood, and blood sugar control alike.');
    tips.push('Even short daily walks, if your doctor has cleared you for them, support heart and joint health.');
    tips.push('Keep your emergency info card current — update it whenever a medicine, allergy, or contact changes.');
    tips.push('Bring your full medicine list (including over-the-counter items) to every appointment.');

    list.innerHTML = tips.map(function(t){ return '<li><i class="fa-solid fa-circle-check"></i><span>'+t+'</span></li>'; }).join('');
  }

  /* ---------------- TRENDS & INSIGHTS ---------------- */

  function renderInsights(){
    renderAdherenceChart();
    renderInsightCards();
  }

  function renderAdherenceChart(){
    var wrap = document.getElementById('adherenceChartWrap');
    var empty = document.getElementById('adherenceEmpty');
    var totalPerDay = allDosesFlat().length;

    if (totalPerDay === 0){
      wrap.style.display = 'none';
      empty.style.display = 'block';
      return;
    }
    wrap.style.display = 'block';
    empty.style.display = 'none';

    var days = [];
    for (var i=6;i>=0;i--){
      var d = new Date();
      d.setDate(d.getDate()-i);
      days.push(d.getFullYear()+'-'+pad(d.getMonth()+1)+'-'+pad(d.getDate()));
    }
    var labels = days.map(fmtDate);
    var taken = days.map(function(dstr){ return (state.takenLog[dstr]||[]).length; });
    var scheduled = days.map(function(){ return totalPerDay; });

    var ctx = document.getElementById('adherenceChart').getContext('2d');
    if (adherenceChartInstance) adherenceChartInstance.destroy();
    adherenceChartInstance = new Chart(ctx, {
      type:'bar',
      data:{ labels:labels, datasets:[
        { label:'Doses taken', data:taken, backgroundColor:'#22C7A9', borderRadius:6 },
        { label:'Doses scheduled', data:scheduled, backgroundColor:'#E4E7F5', borderRadius:6 }
      ]},
      options:{
        responsive:true, maintainAspectRatio:false,
        plugins:{ legend:{ position:'top', labels:{ font:{ size:13 } } } },
        scales:{ y:{ beginAtZero:true, ticks:{ font:{ size:13 }, stepSize:1 } }, x:{ ticks:{ font:{ size:12 } } } }
      }
    });
  }

  function renderInsightCards(){
    var wrap = document.getElementById('insightCards');
    var cards = [];

    if (state.profile){
      var bmi = computeBmi(state.profile.height, state.profile.weight);
      if (bmi >= 30){
        cards.push({ title:'Weight-related risk factors', text:'In general population data, a BMI in this range is associated with a higher long-term likelihood of conditions such as type 2 diabetes, high blood pressure, and joint strain. This isn\'t a prediction about you — ask your doctor what, if anything, is worth adjusting.' });
      } else if (bmi < 18.5 && state.profile.age >= 60){
        cards.push({ title:'Being underweight in later years', text:'Lower body weight in older adults is sometimes linked to reduced muscle strength and slower recovery from illness. A doctor or dietitian can check whether extra nutrition support would help.' });
      }
      if (state.profile.age >= 65){
        cards.push({ title:'Regular check-ups matter more with age', text:'Many general guidelines suggest more frequent screening for blood pressure, cholesterol, vision, and hearing from the mid-60s onward. Your doctor can confirm what schedule fits you.' });
      }
    }

    if (state.vitals.length){
      var latest = state.vitals[state.vitals.length-1];
      if (latest.systolic >= 140 || latest.diastolic >= 90){
        cards.push({ title:'Blood pressure trend to flag', text:'Readings in this range are, in general, associated with higher long-term risk of heart and kidney strain if they persist. It\'s worth mentioning at your next visit, especially if this has come up more than once.' });
      }
      if (latest.sugar != null && latest.sugar >= 180){
        cards.push({ title:'Elevated blood sugar reading', text:'A single high reading can have many causes (meals, stress, illness). If readings in this range keep showing up, your doctor may want to review your management plan.' });
      }
    }

    if (state.medications.length >= 4){
      cards.push({ title:'Managing multiple medicines', text:'Taking several medicines together can, in general, raise the chance of interactions or overlapping side effects. A pharmacist-led medication review can double-check everything works well together.' });
    }

    var missedRecent = 0;
    var totalPerDay = allDosesFlat().length;
    if (totalPerDay > 0){
      for (var i=1;i<=3;i++){
        var d = new Date(); d.setDate(d.getDate()-i);
        var dstr = d.getFullYear()+'-'+pad(d.getMonth()+1)+'-'+pad(d.getDate());
        var takenCount = (state.takenLog[dstr]||[]).length;
        if (takenCount < totalPerDay) missedRecent++;
      }
      if (missedRecent >= 2){
        cards.push({ title:'A few missed doses recently', text:'Missing doses now and then is common, but gaps can affect how well some medicines work. Turning on reminders above, or using a pill organizer, can help keep things on track.' });
      }
    }

    if (cards.length === 0){
      cards.push({ title:'Nothing flagged right now', text:'Based on what you\'ve logged so far, there\'s nothing in particular to highlight here. Keep tracking to build a fuller picture over time.' });
    }

    wrap.innerHTML = cards.map(function(c){
      return '<div class="insight-card"><div class="i-title"><i class="fa-solid fa-triangle-exclamation"></i>'+c.title+'</div><p>'+c.text+'</p></div>';
    }).join('');
  }

  /* ---------------- EMERGENCY CARD ---------------- */

  function renderEmergencyCard(){
    var card = document.getElementById('emergencyCard');
    if (!state.profile){
      card.innerHTML = '<p class="empty-note">Fill in your health profile to generate your emergency card.</p>';
      return;
    }
    var g = state.guardians[0];
    var medList = state.medications.map(function(m){ return m.name+' ('+(m.dosage||'—')+')'; }).join(', ') || 'None listed';

    card.innerHTML = '<h3><i class="fa-solid fa-triangle-exclamation"></i> Emergency information</h3>' +
      '<div class="emergency-grid">' +
      '<div><div class="e-label">Name</div><div class="e-value">'+escapeHtml(state.profile.name)+'</div></div>' +
      '<div><div class="e-label">Age</div><div class="e-value">'+state.profile.age+' years</div></div>' +
      '<div><div class="e-label">Allergies</div><div class="e-value">'+(escapeHtml(state.profile.allergies)||'None listed')+'</div></div>' +
      '<div><div class="e-label">Conditions</div><div class="e-value">'+(escapeHtml(state.profile.conditions)||'None listed')+'</div></div>' +
      '</div>' +
      '<div class="e-label">Current medicines</div><div class="e-value" style="margin-bottom:14px;">'+escapeHtml(medList)+'</div>' +
      '<div class="e-label">Emergency contact</div><div class="e-value">'+(g ? escapeHtml(g.name)+' ('+escapeHtml(g.relation||'Guardian')+') — '+escapeHtml(g.phone) : 'None listed')+'</div>';
  }

  /* ---------------- TEXT SIZE ---------------- */

  var sizeSteps = [15,17,19,21];
  var sizeIdx = 1;
  function applySize(){ document.documentElement.style.setProperty('--base-size', sizeSteps[sizeIdx]+'px'); }

  /* ---------------- EVENTS ---------------- */

  document.getElementById('saveProfileBtn').addEventListener('click', saveProfile);
  document.getElementById('editProfileBtn').addEventListener('click', function(){
    fillProfileForm();
    document.getElementById('profileFormWrap').style.display = '';
    document.getElementById('profileSummaryWrap').style.display = 'none';
  });

  document.getElementById('chartToggle').addEventListener('click', function(e){
    var btn = e.target.closest('button[data-metric]');
    if (btn) renderChart(btn.dataset.metric);
  });

  document.getElementById('addMedToggle').addEventListener('click', function(){
    var f = document.getElementById('addMedForm');
    f.style.display = f.style.display === 'none' ? 'block' : 'none';
  });
  document.getElementById('saveMedBtn').addEventListener('click', saveMedication);
  document.querySelector('#medTable tbody').addEventListener('click', function(e){
    var removeBtn = e.target.closest('[data-remove-med]');
    if (removeBtn){ removeMedication(removeBtn.getAttribute('data-remove-med')); return; }
    var remindBtn = e.target.closest('[data-toggle-remind]');
    if (remindBtn){ toggleReminder(remindBtn.getAttribute('data-toggle-remind')); return; }
    var infoBtn = e.target.closest('[data-toggle-info]');
    if (infoBtn){ toggleInfo(infoBtn.getAttribute('data-toggle-info')); return; }
  });
  document.getElementById('todaySchedule').addEventListener('change', function(e){
    if (e.target.matches('[data-dose-key]')) toggleDoseTaken(e.target.getAttribute('data-dose-key'));
  });
  document.getElementById('enableNotifBtn').addEventListener('click', enableNotifications);

  document.getElementById('calPrev').addEventListener('click', function(){ calDate.setMonth(calDate.getMonth()-1); renderCalendar(); });
  document.getElementById('calNext').addEventListener('click', function(){ calDate.setMonth(calDate.getMonth()+1); renderCalendar(); });
  document.getElementById('calGrid').addEventListener('click', function(e){
    var cell = e.target.closest('.cal-cell');
    if (cell) renderDayDetail(cell.getAttribute('data-date'));
  });

  document.getElementById('addGuardianToggle').addEventListener('click', function(){
    var f = document.getElementById('addGuardianForm');
    f.style.display = f.style.display === 'none' ? 'block' : 'none';
  });
  document.getElementById('saveGuardianBtn').addEventListener('click', saveGuardian);
  document.getElementById('guardianGrid').addEventListener('click', function(e){
    var btn = e.target.closest('[data-remove-guardian]');
    if (btn){
      var id = btn.getAttribute('data-remove-guardian');
      state.guardians = state.guardians.filter(function(g){ return g.id !== id; });
      saveKey('guardians');
      renderGuardians();
    }
  });

  document.getElementById('addVitalBtn').addEventListener('click', addVital);
  document.getElementById('printCardBtn').addEventListener('click', function(){ window.print(); });

  /* ---------------- INIT ---------------- */

  async function init(){
    await loadAll();
    applySize();
    renderProfile();
    renderMedTable();
    renderGuardians();
    renderVitals();
    renderTips();
    renderGlance();
    renderEmergencyCard();
    renderInsights();
    updateNotifStatus();
    setInterval(checkReminders, 30000);
    setInterval(renderReminderBanner, 60000);
  }

  init();

})();

var tableEl = document.querySelector('#medTable');
tableEl.classList.toggle('has-data', state.medications.length > 0);