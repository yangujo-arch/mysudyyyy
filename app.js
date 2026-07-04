// --- Core State & LocalStorage Manager ---
const STORAGE_KEY = 'study_dashboard_state';

let state = {
  resolve: '',
  japanese: {
    totalDays: 100,
    completedDays: {} // "dayNumber": { date: "YYYY-MM-DD", memo: "memo content" }
  },
  french: {
    completedDates: {} // "YYYY-MM-DD": { completed: true/false, words: "", grammar: "", expressions: "" }
  }
};

// Default State Creator (Safe Fallback)
function getInitialState() {
  return {
    resolve: '',
    japanese: {
      totalDays: 100,
      completedDays: {}
    },
    french: {
      completedDates: {}
    }
  };
}

// Save state to localStorage
function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

// Load state from localStorage
function loadState() {
  const data = localStorage.getItem(STORAGE_KEY);
  if (data) {
    try {
      state = JSON.parse(data);
      // Ensure nested properties exist in case of old storage structures
      if (!state.japanese) state.japanese = { totalDays: 100, completedDays: {} };
      if (!state.japanese.completedDays) state.japanese.completedDays = {};
      if (!state.japanese.totalDays) state.japanese.totalDays = 100;
      if (!state.french) state.french = { completedDates: {} };
      if (!state.french.completedDates) state.french.completedDates = {};
    } catch (e) {
      console.error("Error parsing local storage data, resetting.", e);
      state = getInitialState();
    }
  } else {
    state = getInitialState();
  }
}

// --- Date Helper Functions ---
function getTodayDate() {
  return new Date();
}

function formatDateString(date) {
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

function getTodayString() {
  return formatDateString(getTodayDate());
}

function formatKoreanDate(date) {
  const days = ['일요일', '월요일', '화요일', '수요일', '목요일', '금요일', '토요일'];
  const yyyy = date.getFullYear();
  const mm = date.getMonth() + 1;
  const dd = date.getDate();
  const dayName = days[date.getDay()];
  return `${yyyy}년 ${mm}월 ${dd}일 ${dayName}`;
}

// --- Global variables for UI state ---
let activeFrenchDate = getTodayString();
let calendarYear = getTodayDate().getFullYear();
let calendarMonth = getTodayDate().getMonth(); // 0-11
let editingJaDayNum = null; // For modal editing

// --- DOM elements cache ---
const dom = {
  currentDateDisplay: document.getElementById('current-date-display'),
  resolveInput: document.getElementById('resolve-input'),
  
  // Streak
  streakCount: document.getElementById('streak-count'),
  streakDesc: document.getElementById('streak-desc'),
  
  // Recent Notes
  recentNotesList: document.getElementById('recent-notes-list'),
  
  // Japanese Section
  jaWidget: document.getElementById('japanese-widget'),
  jaHeaderToggle: document.getElementById('ja-header-toggle'),
  jaSectionBody: document.getElementById('ja-section-body'),
  jaTargetDayDisplay: document.getElementById('ja-target-day-display'),
  jaMemoInput: document.getElementById('ja-memo-input'),
  jaCharCount: document.getElementById('ja-char-count'),
  jaCompleteBtn: document.getElementById('ja-complete-btn'),
  jaProgressPercent: document.getElementById('ja-progress-percent'),
  jaProgressRatio: document.getElementById('ja-progress-ratio'),
  jaProgressFill: document.getElementById('ja-progress-fill'),
  toggleSettingsJaBtn: document.getElementById('toggle-settings-ja-btn'),
  jaSettingsBox: document.getElementById('ja-settings-box'),
  jaTotalDaysInput: document.getElementById('ja-total-days-input'),
  saveJaTotalBtn: document.getElementById('save-ja-total-btn'),
  archiveToggleBtn: document.getElementById('archive-toggle-btn'),
  archiveToggleIcon: document.getElementById('archive-toggle-icon'),
  archiveContent: document.getElementById('archive-content'),
  jaArchiveCount: document.getElementById('ja-archive-count'),
  jaArchiveList: document.getElementById('ja-archive-list'),

  // French Section
  frWidget: document.getElementById('french-widget'),
  frHeaderToggle: document.getElementById('fr-header-toggle'),
  frSectionBody: document.getElementById('fr-section-body'),
  frSelectedDateTitle: document.getElementById('fr-selected-date-title'),
  frCompleteCheckbox: document.getElementById('fr-complete-checkbox'),
  tabBtns: document.querySelectorAll('.tab-btn'),
  tabContents: document.querySelectorAll('.tab-content'),
  frWordsInput: document.getElementById('fr-words-input'),
  frGrammarInput: document.getElementById('fr-grammar-input'),
  frExpressionsInput: document.getElementById('fr-expressions-input'),
  frSaveBtn: document.getElementById('fr-save-btn'),
  
  // Calendar Section
  calendarWidget: document.getElementById('calendar-widget'),
  calendarHeaderToggle: document.getElementById('calendar-header-toggle'),
  calendarSectionBody: document.getElementById('calendar-section-body'),
  
  // French Calendar
  prevMonthBtn: document.getElementById('prev-month-btn'),
  nextMonthBtn: document.getElementById('next-month-btn'),
  calendarMonthYearDisplay: document.getElementById('calendar-month-year-display'),
  calendarGridBody: document.getElementById('calendar-grid-body'),

  // Modals
  jaEditModal: document.getElementById('ja-edit-modal'),
  jaModalTitle: document.getElementById('ja-modal-title'),
  jaModalMemoInput: document.getElementById('ja-modal-memo-input'),
  jaModalCloseBtn: document.getElementById('ja-modal-close-btn'),
  jaModalSaveBtn: document.getElementById('ja-modal-save-btn'),

  // Utility Actions
  backupBtn: document.getElementById('backup-btn'),
  restoreBtn: document.getElementById('restore-btn'),
  restoreFileInput: document.getElementById('restore-file-input'),
  resetBtn: document.getElementById('reset-btn')
};

// --- Initialization ---
document.addEventListener('DOMContentLoaded', () => {
  loadState();
  initHeader();
  initResolve();
  initTabs();
  initEventListeners();
  
  // Initial renders
  renderAll();
});

function renderAll() {
  updateStreak();
  renderRecentNotes();
  renderJapaneseSection();
  renderFrenchForm();
  renderFrenchCalendar();
  
  // Recreate Lucide icons for dynamically injected markup
  if (window.lucide) {
    lucide.createIcons();
  }
}

// --- Header & Resolve ---
function initHeader() {
  dom.currentDateDisplay.textContent = formatKoreanDate(getTodayDate());
}

function initResolve() {
  dom.resolveInput.value = state.resolve || '';
  dom.resolveInput.addEventListener('change', () => {
    state.resolve = dom.resolveInput.value.trim();
    saveState();
  });
}

// --- Category Tabs for French Notes ---
function initTabs() {
  dom.tabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      // Remove active from all tabs and contents
      dom.tabBtns.forEach(t => t.classList.remove('active'));
      dom.tabContents.forEach(c => c.classList.add('hidden'));

      // Add active to current
      btn.classList.add('active');
      const targetId = `tab-${btn.dataset.tab}`;
      document.getElementById(targetId).classList.remove('hidden');
    });
  });
}

// --- Event Listeners Setup ---
function initEventListeners() {
  // Japanese widget collapse toggle
  dom.jaHeaderToggle.addEventListener('click', () => {
    const isCollapsed = dom.jaSectionBody.classList.toggle('collapsed');
    if (isCollapsed) {
      dom.jaWidget.classList.remove('expanded');
    } else {
      dom.jaWidget.classList.add('expanded');
    }
  });

  // French widget collapse toggle
  dom.frHeaderToggle.addEventListener('click', () => {
    const isCollapsed = dom.frSectionBody.classList.toggle('collapsed');
    if (isCollapsed) {
      dom.frWidget.classList.remove('expanded');
    } else {
      dom.frWidget.classList.add('expanded');
    }
  });

  // Calendar widget collapse toggle
  dom.calendarHeaderToggle.addEventListener('click', () => {
    const isCollapsed = dom.calendarSectionBody.classList.toggle('collapsed');
    if (isCollapsed) {
      dom.calendarWidget.classList.remove('expanded');
    } else {
      dom.calendarWidget.classList.add('expanded');
    }
  });

  // Japanese character count warning
  dom.jaMemoInput.addEventListener('input', () => {
    const len = dom.jaMemoInput.value.length;
    dom.jaCharCount.textContent = `${len}/150`;
    if (len >= 150) {
      dom.jaCharCount.style.color = 'var(--color-danger)';
    } else {
      dom.jaCharCount.style.color = 'var(--color-text-muted)';
    }
  });

  // Complete Japanese Study Day
  dom.jaCompleteBtn.addEventListener('click', completeJapaneseStudy);

  // Toggle goals settings
  dom.toggleSettingsJaBtn.addEventListener('click', () => {
    dom.jaSettingsBox.classList.toggle('hidden');
    dom.jaTotalDaysInput.value = state.japanese.totalDays;
  });

  // Save Total Japanese Days
  dom.saveJaTotalBtn.addEventListener('click', () => {
    const val = parseInt(dom.jaTotalDaysInput.value, 10);
    if (!isNaN(val) && val > 0) {
      state.japanese.totalDays = val;
      saveState();
      dom.jaSettingsBox.classList.add('hidden');
      renderJapaneseSection();
    }
  });

  // Archive accordion toggler
  dom.archiveToggleBtn.addEventListener('click', () => {
    dom.archiveContent.classList.toggle('hidden');
    dom.archiveToggleIcon.classList.toggle('rotated');
  });

  // French Save Note Button
  dom.frSaveBtn.addEventListener('click', saveFrenchReview);

  // Month navigation for French Calendar
  dom.prevMonthBtn.addEventListener('click', () => {
    calendarMonth--;
    if (calendarMonth < 0) {
      calendarMonth = 11;
      calendarYear--;
    }
    renderFrenchCalendar();
    if (window.lucide) lucide.createIcons();
  });

  dom.nextMonthBtn.addEventListener('click', () => {
    calendarMonth++;
    if (calendarMonth > 11) {
      calendarMonth = 0;
      calendarYear++;
    }
    renderFrenchCalendar();
    if (window.lucide) lucide.createIcons();
  });

  // Modal Editing Action Buttons
  dom.jaModalCloseBtn.addEventListener('click', () => {
    dom.jaEditModal.classList.add('hidden');
    editingJaDayNum = null;
  });

  dom.jaModalSaveBtn.addEventListener('click', saveJaModalMemo);

  // Modal backdrop click to close
  dom.jaEditModal.addEventListener('click', (e) => {
    if (e.target === dom.jaEditModal) {
      dom.jaEditModal.classList.add('hidden');
      editingJaDayNum = null;
    }
  });

  // Backup & Restore & Reset
  dom.backupBtn.addEventListener('click', exportBackupFile);
  
  dom.restoreBtn.addEventListener('click', () => {
    dom.restoreFileInput.click();
  });

  dom.restoreFileInput.addEventListener('change', importBackupFile);

  dom.resetBtn.addEventListener('click', resetAllData);
}

// --- Japanese Study Workflow ---

// Calculate next Day number to study (first Day that is not marked completed)
function getNextDayToStudy() {
  let day = 1;
  while (state.japanese.completedDays[day]) {
    day++;
  }
  return day;
}

function completeJapaneseStudy() {
  const currentDay = getNextDayToStudy();
  const memoText = dom.jaMemoInput.value.trim();
  const todayStr = getTodayString();

  // Save completion
  state.japanese.completedDays[currentDay] = {
    date: todayStr,
    memo: memoText
  };

  saveState();
  
  // Reset form
  dom.jaMemoInput.value = '';
  dom.jaCharCount.textContent = '0/150';
  
  // Refresh layout
  renderAll();
}

function renderJapaneseSection() {
  const nextDay = getNextDayToStudy();
  dom.jaTargetDayDisplay.textContent = `Day ${nextDay}`;
  
  // Progress Bar
  const completedKeys = Object.keys(state.japanese.completedDays);
  const completedCount = completedKeys.length;
  const totalDays = state.japanese.totalDays;
  
  const percentage = Math.min(Math.round((completedCount / totalDays) * 100), 100);
  dom.jaProgressPercent.textContent = `${percentage}%`;
  dom.jaProgressRatio.textContent = `${completedCount} / ${totalDays} Days`;
  dom.jaProgressFill.style.width = `${percentage}%`;

  // Archive count
  dom.jaArchiveCount.textContent = completedCount;

  // Render Archive List
  dom.jaArchiveList.innerHTML = '';
  if (completedCount === 0) {
    dom.jaArchiveList.innerHTML = '<li class="empty-state">완료한 학습 내역이 없습니다. 첫 진도를 완료해 보세요!</li>';
    return;
  }

  // Sort Completed Days descending
  const sortedDays = completedKeys.map(Number).sort((a, b) => b - a);

  sortedDays.forEach(dayNum => {
    const item = state.japanese.completedDays[dayNum];
    const li = document.createElement('li');
    li.className = 'archive-list-item';
    li.innerHTML = `
      <div class="archive-item-header">
        <span class="archive-day-label">Day ${dayNum}</span>
        <span class="archive-date-label">${item.date}</span>
      </div>
      <div class="archive-item-body">
        ${item.memo ? escapeHtml(item.memo) : '<span style="color: var(--color-text-muted); font-style: italic;">기록된 학습 메모가 없습니다.</span>'}
      </div>
      <div class="archive-item-footer">
        <button class="action-btn edit-btn" onclick="openJaEditModal(${dayNum})" title="메모 수정">
          <i data-lucide="edit-3"></i>
        </button>
        <button class="action-btn delete-btn" onclick="deleteJaDay(${dayNum})" title="학습 취소">
          <i data-lucide="trash-2"></i>
        </button>
      </div>
    `;
    dom.jaArchiveList.appendChild(li);
  });
}

// Modal handling
window.openJaEditModal = function(dayNum) {
  const item = state.japanese.completedDays[dayNum];
  if (!item) return;

  editingJaDayNum = dayNum;
  dom.jaModalTitle.textContent = `Day ${dayNum} 메모 수정`;
  dom.jaModalMemoInput.value = item.memo || '';
  
  dom.jaEditModal.classList.remove('hidden');
  dom.jaModalMemoInput.focus();
  if (window.lucide) lucide.createIcons();
};

function saveJaModalMemo() {
  if (editingJaDayNum === null) return;
  
  const item = state.japanese.completedDays[editingJaDayNum];
  if (item) {
    item.memo = dom.jaModalMemoInput.value.trim();
    saveState();
    dom.jaEditModal.classList.add('hidden');
    editingJaDayNum = null;
    renderAll();
  }
}

window.deleteJaDay = function(dayNum) {
  if (confirm(`Day ${dayNum} 학습 기록을 정말 삭제하시겠습니까?`)) {
    delete state.japanese.completedDays[dayNum];
    saveState();
    renderAll();
  }
};

// --- French Study Workflow ---

function renderFrenchForm() {
  dom.frSelectedDateTitle.textContent = `${activeFrenchDate} 복습 노트`;
  
  const record = state.french.completedDates[activeFrenchDate] || { completed: false, words: '', grammar: '', expressions: '' };
  
  dom.frCompleteCheckbox.checked = !!record.completed;
  dom.frWordsInput.value = record.words || '';
  dom.frGrammarInput.value = record.grammar || '';
  dom.frExpressionsInput.value = record.expressions || '';
}

function saveFrenchReview() {
  const words = dom.frWordsInput.value.trim();
  const grammar = dom.frGrammarInput.value.trim();
  const expressions = dom.frExpressionsInput.value.trim();
  const completed = dom.frCompleteCheckbox.checked;

  if (completed || words || grammar || expressions) {
    state.french.completedDates[activeFrenchDate] = {
      completed: completed,
      words: words,
      grammar: grammar,
      expressions: expressions
    };
  } else {
    // If all inputs are empty and checkbox is false, clean up storage key
    delete state.french.completedDates[activeFrenchDate];
  }

  saveState();
  renderAll();
  
  // Show standard success feedback
  const oldText = dom.frSaveBtn.innerHTML;
  dom.frSaveBtn.innerHTML = `<i data-lucide="check"></i> 저장 완료!`;
  dom.frSaveBtn.style.backgroundColor = 'var(--color-success)';
  if (window.lucide) lucide.createIcons();
  
  setTimeout(() => {
    dom.frSaveBtn.innerHTML = oldText;
    dom.frSaveBtn.style.backgroundColor = '';
    if (window.lucide) lucide.createIcons();
  }, 1500);
}

// --- French Calendar Engine ---

function renderFrenchCalendar() {
  dom.calendarMonthYearDisplay.textContent = `${calendarYear}년 ${calendarMonth + 1}월`;
  dom.calendarGridBody.innerHTML = '';

  // Get total days in month and starting day index
  const firstDayIndex = new Date(calendarYear, calendarMonth, 1).getDay(); // 0 (Sun) - 6 (Sat)
  const totalDaysInMonth = new Date(calendarYear, calendarMonth + 1, 0).getDate();

  // Draw empty cells for offset
  for (let i = 0; i < firstDayIndex; i++) {
    const spacer = document.createElement('div');
    spacer.className = 'calendar-day empty';
    dom.calendarGridBody.appendChild(spacer);
  }

  const todayStr = getTodayString();

  // Create set of Japanese completed dates for this month to optimize lookup
  const jaCompletedDates = new Set();
  Object.values(state.japanese.completedDays).forEach(item => {
    if (item.date) jaCompletedDates.add(item.date);
  });

  // Render month days
  for (let day = 1; day <= totalDaysInMonth; day++) {
    const cellDateStr = `${calendarYear}-${String(calendarMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    
    const dayCell = document.createElement('div');
    dayCell.className = 'calendar-day';
    dayCell.textContent = day;

    // Check review completion of French
    const frRecord = state.french.completedDates[cellDateStr];
    if (frRecord && frRecord.completed) {
      dayCell.classList.add('completed-fr');
    }

    // Check Japanese completion on this date
    if (jaCompletedDates.has(cellDateStr)) {
      const dot = document.createElement('span');
      dot.className = 'ja-dot';
      dayCell.appendChild(dot);
    }

    // Highlight Active Selection
    if (cellDateStr === activeFrenchDate) {
      dayCell.classList.add('selected');
    }

    // Highlight Today
    if (cellDateStr === todayStr) {
      dayCell.classList.add('today');
    }

    // Click handler to load that day's notes
    dayCell.addEventListener('click', () => {
      activeFrenchDate = cellDateStr;
      
      // Update selected class in visual calendar
      document.querySelectorAll('.calendar-day').forEach(el => el.classList.remove('selected'));
      dayCell.classList.add('selected');

      renderFrenchForm();
    });

    dom.calendarGridBody.appendChild(dayCell);
  }
}

// --- Study Streak Calculation Logic ---

function updateStreak() {
  // 1. Gather all unique completed dates (Japanese or French)
  const studyDates = new Set();

  // Add Japanese study completion dates
  Object.values(state.japanese.completedDays).forEach(item => {
    if (item.date) studyDates.add(item.date);
  });

  // Add French study completion dates (only where checkbox was checked)
  Object.keys(state.french.completedDates).forEach(dateStr => {
    if (state.french.completedDates[dateStr].completed) {
      studyDates.add(dateStr);
    }
  });

  if (studyDates.size === 0) {
    dom.streakCount.textContent = '0';
    dom.streakDesc.textContent = '아직 공부 기록이 없습니다. 오늘 학습을 기록해 스트릭을 시작해 보세요!';
    return;
  }

  // 2. Count streak backwards starting from today or yesterday
  const today = getTodayDate();
  const todayStr = getTodayString();
  
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = formatDateString(yesterday);

  let streak = 0;
  let currentCheckDate = null;

  if (studyDates.has(todayStr)) {
    // If today is active, start from today
    currentCheckDate = today;
  } else if (studyDates.has(yesterdayStr)) {
    // If today is not active but yesterday was, start from yesterday (streak is preserved today)
    currentCheckDate = yesterday;
  } else {
    // Neither today nor yesterday is active, streak is broken
    dom.streakCount.textContent = '0';
    dom.streakDesc.textContent = '마지막 학습 이후 시간이 지났습니다. 오늘 다시 시작해 볼까요?';
    return;
  }

  // Loop backwards day by day to count the continuous days
  while (true) {
    const dateStr = formatDateString(currentCheckDate);
    if (studyDates.has(dateStr)) {
      streak++;
      // Move to previous day
      currentCheckDate.setDate(currentCheckDate.getDate() - 1);
    } else {
      break;
    }
  }

  // 3. UI Display Update
  dom.streakCount.textContent = streak;

  if (streak > 0) {
    if (studyDates.has(todayStr)) {
      dom.streakDesc.textContent = `🔥 오늘 공부를 완료하셨습니다! 내일도 스트릭을 계속 이어가세요.`;
    } else {
      dom.streakDesc.textContent = `⚡ 어제까지 연속 ${streak}일 공부 완료! 오늘 공부를 기록하면 불꽃이 유지됩니다.`;
    }
  }
}

// --- Recent Notes Preview Feed ---

function renderRecentNotes() {
  dom.recentNotesList.innerHTML = '';
  
  const notes = [];

  // Gather Japanese notes
  Object.keys(state.japanese.completedDays).forEach(dayNum => {
    const item = state.japanese.completedDays[dayNum];
    if (item.memo) {
      notes.push({
        type: 'ja',
        title: `일본어 Day ${dayNum}`,
        date: item.date,
        content: item.memo,
        rawDate: new Date(item.date)
      });
    }
  });

  // Gather French notes
  Object.keys(state.french.completedDates).forEach(dateStr => {
    const item = state.french.completedDates[dateStr];
    let noteParts = [];
    if (item.words) noteParts.push(`단어: ${item.words}`);
    if (item.grammar) noteParts.push(`문법: ${item.grammar}`);
    if (item.expressions) noteParts.push(`표현: ${item.expressions}`);

    if (noteParts.length > 0) {
      notes.push({
        type: 'fr',
        title: '프랑스어 복습',
        date: dateStr,
        content: noteParts.join(' | '),
        rawDate: new Date(dateStr)
      });
    }
  });

  if (notes.length === 0) {
    dom.recentNotesList.innerHTML = '<li class="empty-state">아직 기록된 공부 메모가 없습니다.</li>';
    return;
  }

  // Sort notes by date descending
  notes.sort((a, b) => b.rawDate - a.rawDate || (b.type === 'ja' ? 1 : -1));

  // Take top 4 notes
  const recentNotes = notes.slice(0, 4);

  recentNotes.forEach(note => {
    const li = document.createElement('li');
    li.className = note.type === 'ja' ? 'ja-item' : 'fr-item';
    
    // Format date simple (MM-DD)
    let displayDate = note.date;
    try {
      const dateParts = note.date.split('-');
      displayDate = `${dateParts[1]}/${dateParts[2]}`;
    } catch(e) {}

    li.innerHTML = `
      <span class="note-meta">${note.title}</span>
      <span class="note-text" title="${escapeHtml(note.content)}">${escapeHtml(note.content)}</span>
      <span class="note-date">${displayDate}</span>
    `;
    dom.recentNotesList.appendChild(li);
  });
}

// --- Backup, Restore, and Reset handlers ---

function exportBackupFile() {
  const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(state, null, 2));
  const downloadAnchor = document.createElement('a');
  downloadAnchor.setAttribute("href", dataStr);
  downloadAnchor.setAttribute("download", `study_dashboard_backup_${getTodayString()}.json`);
  document.body.appendChild(downloadAnchor);
  downloadAnchor.click();
  downloadAnchor.remove();
}

function importBackupFile(event) {
  const fileReader = new FileReader();
  const file = event.target.files[0];
  
  if (!file) return;

  fileReader.onload = function(e) {
    try {
      const parsedData = JSON.parse(e.target.result);
      
      // Basic Validation
      if (parsedData && (parsedData.japanese || parsedData.french || typeof parsedData.resolve === 'string')) {
        state = parsedData;
        
        // Sanity checks on restored data structure
        if (!state.japanese) state.japanese = { totalDays: 100, completedDays: {} };
        if (!state.japanese.completedDays) state.japanese.completedDays = {};
        if (!state.french) state.french = { completedDates: {} };
        if (!state.french.completedDates) state.french.completedDates = {};

        saveState();
        
        // Reset dynamic visual states
        activeFrenchDate = getTodayString();
        calendarYear = getTodayDate().getFullYear();
        calendarMonth = getTodayDate().getMonth();
        
        // Redraw page
        initResolve();
        renderAll();
        
        alert("데이터가 성공적으로 복원되었습니다!");
      } else {
        alert("올바르지 않은 백업 파일 형식입니다.");
      }
    } catch (err) {
      alert("백업 파일 읽기 중 오류가 발생했습니다.");
      console.error(err);
    }
  };

  fileReader.readAsText(file);
  // Clear file input value to allow uploading the same file again
  dom.restoreFileInput.value = '';
}

function resetAllData() {
  if (confirm("정말로 모든 학습 진도와 복습 기록을 초기화하시겠습니까?\n이 작업은 되돌릴 수 없습니다.")) {
    state = getInitialState();
    saveState();

    // Reset date view state
    activeFrenchDate = getTodayString();
    calendarYear = getTodayDate().getFullYear();
    calendarMonth = getTodayDate().getMonth();

    initResolve();
    renderAll();
    alert("데이터가 완전히 초기화되었습니다.");
  }
}

// --- Utilities ---
function escapeHtml(str) {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
