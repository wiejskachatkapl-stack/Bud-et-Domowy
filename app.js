const homeScreen = document.getElementById('homeScreen');
const contentScreen = document.getElementById('contentScreen');
const contentTitle = document.getElementById('contentTitle');
const contentSubtitle = document.getElementById('contentSubtitle');
const placeholderCard = document.getElementById('placeholderCard');
const placeholderTitle = document.getElementById('placeholderTitle');
const placeholderText = document.getElementById('placeholderText');
const expenseForm = document.getElementById('expenseForm');
const amountInput = document.getElementById('amountInput');
const categoryInput = document.getElementById('categoryInput');
const dateInput = document.getElementById('dateInput');
const notesInput = document.getElementById('notesInput');
const receiptInput = document.getElementById('receiptInput');
const receiptPreview = document.getElementById('receiptPreview');
const receiptImage = document.getElementById('receiptImage');
const receiptName = document.getElementById('receiptName');
const removeReceiptBtn = document.getElementById('removeReceiptBtn');
const cancelExpenseBtn = document.getElementById('cancelExpenseBtn');
const saveExpenseBtn = document.getElementById('saveExpenseBtn');
const backBtn = document.getElementById('backBtn');
const exitBtn = document.getElementById('exitBtn');
const toast = document.getElementById('toast');
const galleryCard = document.getElementById('galleryCard');
const galleryDateInput = document.getElementById('galleryDateInput');
const galleryCameraInput = document.getElementById('galleryCameraInput');
const galleryFileInput = document.getElementById('galleryFileInput');
const galleryFolders = document.getElementById('galleryFolders');
const galleryEmpty = document.getElementById('galleryEmpty');
const historyCard = document.getElementById('historyCard');
const historyList = document.getElementById('historyList');
const historyTotal = document.getElementById('historyTotal');
const historyCount = document.getElementById('historyCount');
const reportsCard = document.getElementById('reportsCard');
const reportTotal = document.getElementById('reportTotal');
const reportCategories = document.getElementById('reportCategories');
const reportMonths = document.getElementById('reportMonths');
const reportMonthDetails = document.getElementById('reportMonthDetails');
const reportMonthTitle = document.getElementById('reportMonthTitle');
const reportMonthTotal = document.getElementById('reportMonthTotal');
const reportMonthExpenses = document.getElementById('reportMonthExpenses');
const reportMonthClose = document.getElementById('reportMonthClose');
const downloadReportPdfBtn = document.getElementById('downloadReportPdfBtn');
const downloadGalleryZipBtn = document.getElementById('downloadGalleryZipBtn');

let selectedReceipt = null;
let previewUrl = '';
let activeGalleryDate = null;
let suppressGalleryClick = false;
let editingExpenseId = null;
let editingExpenseCreatedAt = null;
let editingExpenseReceipt = null;
let reportExpensesCache = [];

const viewCopy = {};

function todayISO() {
  const now = new Date();
  const local = new Date(now.getTime() - now.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 10);
}

function showToast(message) {
  toast.textContent = message;
  toast.classList.add('show');
  window.clearTimeout(showToast.timer);
  showToast.timer = window.setTimeout(() => toast.classList.remove('show'), 2600);
}

function resetReceipt() {
  selectedReceipt = null;
  receiptInput.value = '';
  receiptPreview.hidden = true;
  receiptName.textContent = '';
  receiptImage.removeAttribute('src');
  if (previewUrl) {
    URL.revokeObjectURL(previewUrl);
    previewUrl = '';
  }
}

function resetExpenseForm() {
  expenseForm.reset();
  dateInput.value = todayISO();
  resetReceipt();
  editingExpenseId = null;
  editingExpenseCreatedAt = null;
  editingExpenseReceipt = null;
  if (saveExpenseBtn) saveExpenseBtn.textContent = 'Dodaj';
}

function openHome() {
  contentScreen.hidden = true;
  homeScreen.hidden = false;
  placeholderCard.hidden = true;
  expenseForm.hidden = true;
  galleryCard.hidden = true;
  historyCard.hidden = true;
  reportsCard.hidden = true;
}

function openView(key) {
  homeScreen.hidden = true;
  contentScreen.hidden = false;

  if (key === 'expenses') {
    contentTitle.textContent = 'Wydatki';
    contentSubtitle.textContent = 'Dodaj nowy wydatek';
    placeholderCard.hidden = true;
    galleryCard.hidden = true;
    historyCard.hidden = true;
    reportsCard.hidden = true;
    expenseForm.hidden = false;
    if (!dateInput.value) dateInput.value = todayISO();
    window.setTimeout(() => amountInput.focus(), 80);
    return;
  }

  if (key === 'gallery') {
    contentTitle.textContent = 'Galeria';
    contentSubtitle.textContent = 'Zdjęcia pogrupowane według dat';
    expenseForm.hidden = true;
    placeholderCard.hidden = true;
    historyCard.hidden = true;
    reportsCard.hidden = true;
    galleryCard.hidden = false;
    activeGalleryDate = null;
    if (!galleryDateInput.value) galleryDateInput.value = todayISO();
    renderGallery();
    return;
  }

  if (key === 'history') {
    contentTitle.textContent = 'Historia';
    contentSubtitle.textContent = 'Wszystkie zapisane wydatki';
    expenseForm.hidden = true;
    galleryCard.hidden = true;
    reportsCard.hidden = true;
    placeholderCard.hidden = true;
    historyCard.hidden = false;
    renderHistory();
    return;
  }

  if (key === 'reports') {
    contentTitle.textContent = 'Raporty';
    contentSubtitle.textContent = 'Podsumowanie remontu i budowy';
    expenseForm.hidden = true;
    galleryCard.hidden = true;
    historyCard.hidden = true;
    placeholderCard.hidden = true;
    reportsCard.hidden = false;
    if (reportMonthDetails) reportMonthDetails.hidden = true;
    renderReports();
    return;
  }

  const [title, subtitle, text] = viewCopy[key] || ['Budżet domowy', '', ''];
  contentTitle.textContent = title;
  contentSubtitle.textContent = subtitle;
  placeholderTitle.textContent = title;
  placeholderText.textContent = text;
  expenseForm.hidden = true;
  galleryCard.hidden = true;
  historyCard.hidden = true;
  reportsCard.hidden = true;
  placeholderCard.hidden = false;
}

function openDatabase() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('BudzetDomowyDB', 2);

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains('expenses')) {
        const store = db.createObjectStore('expenses', { keyPath: 'id', autoIncrement: true });
        store.createIndex('date', 'date', { unique: false });
        store.createIndex('category', 'category', { unique: false });
      }
      if (!db.objectStoreNames.contains('galleryPhotos')) {
        const galleryStore = db.createObjectStore('galleryPhotos', { keyPath: 'id', autoIncrement: true });
        galleryStore.createIndex('date', 'date', { unique: false });
        galleryStore.createIndex('createdAt', 'createdAt', { unique: false });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function saveExpense(expense) {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction('expenses', 'readwrite');
    const store = transaction.objectStore('expenses');
    const request = expense.id ? store.put(expense) : store.add(expense);

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
    transaction.oncomplete = () => db.close();
  });
}

async function deleteExpense(id) {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction('expenses', 'readwrite');
    const store = transaction.objectStore('expenses');
    const request = store.delete(id);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
    transaction.oncomplete = () => db.close();
  });
}

function startExpenseEdit(item) {
  editingExpenseId = item.id;
  editingExpenseCreatedAt = item.createdAt || new Date().toISOString();
  editingExpenseReceipt = item.receipt || null;

  homeScreen.hidden = true;
  contentScreen.hidden = false;
  placeholderCard.hidden = true;
  galleryCard.hidden = true;
  historyCard.hidden = true;
  reportsCard.hidden = true;
  expenseForm.hidden = false;
  contentTitle.textContent = 'Edytuj wydatek';
  contentSubtitle.textContent = 'Zmień dane i zapisz';

  amountInput.value = item.amount ?? '';
  categoryInput.value = item.category || '';
  dateInput.value = item.date || todayISO();
  notesInput.value = item.notes || '';
  resetReceipt();
  editingExpenseReceipt = item.receipt || null;
  if (item.receipt) {
    selectedReceipt = item.receipt;
    previewUrl = URL.createObjectURL(item.receipt);
    receiptImage.src = previewUrl;
    receiptName.textContent = 'Zapisany paragon';
    receiptPreview.hidden = false;
  }
  if (saveExpenseBtn) saveExpenseBtn.textContent = 'Zapisz zmiany';
  window.setTimeout(() => amountInput.focus(), 80);
}

async function getExpenses() {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction('expenses', 'readonly');
    const store = transaction.objectStore('expenses');
    const request = store.getAll();
    request.onsuccess = () => resolve(request.result || []);
    request.onerror = () => reject(request.error);
    transaction.oncomplete = () => db.close();
  });
}

function formatMoney(value) {
  return new Intl.NumberFormat('pl-PL', { style: 'currency', currency: 'PLN' }).format(Number(value) || 0);
}

function formatExpenseDate(dateStr) {
  if (!dateStr) return '';
  const [y,m,d] = dateStr.split('-').map(Number);
  return new Intl.DateTimeFormat('pl-PL', { day:'2-digit', month:'2-digit', year:'numeric' }).format(new Date(y,m-1,d));
}

function openImageBlob(blob, alt = 'Paragon') {
  if (!blob) return;
  const url = URL.createObjectURL(blob);
  const overlay = document.createElement('div');
  overlay.className = 'gallery-lightbox';
  overlay.innerHTML = '<button type="button" class="gallery-lightbox-close" aria-label="Zamknij">×</button>';
  const img = document.createElement('img');
  img.src = url; img.alt = alt; overlay.appendChild(img);
  const close = () => { URL.revokeObjectURL(url); overlay.remove(); };
  overlay.querySelector('.gallery-lightbox-close').addEventListener('click', close);
  overlay.addEventListener('click', e => { if (e.target === overlay) close(); });
  document.body.appendChild(overlay);
}

async function renderHistory() {
  try {
    const expenses = await getExpenses();
    expenses.sort((a,b) => ((b.date || '') + (b.createdAt || '')).localeCompare((a.date || '') + (a.createdAt || '')));
    historyList.innerHTML = '';
    const total = expenses.reduce((sum, item) => sum + (Number(item.amount) || 0), 0);
    historyTotal.textContent = formatMoney(total);
    historyCount.textContent = String(expenses.length);
    if (!expenses.length) {
      historyList.innerHTML = '<div class="history-empty"><span>🧾</span><strong>Brak zapisanych wydatków</strong><small>Dodane wydatki pojawią się tutaj automatycznie.</small></div>';
      return;
    }
    expenses.forEach(item => {
      const row = document.createElement('article');
      row.className = 'history-item';
      const note = (item.notes || '').trim();
      row.innerHTML = `<div class="history-main"><div class="history-category">${escapeHtml(item.category || 'Bez kategorii')}</div><div class="history-date">${formatExpenseDate(item.date)}</div>${note ? `<div class="history-note">${escapeHtml(note)}</div>` : ''}</div><div class="history-side"><strong>${formatMoney(item.amount)}</strong><div class="history-actions"></div></div>`;

      const actions = row.querySelector('.history-actions');
      if (item.receipt) {
        const receiptBtn = document.createElement('button');
        receiptBtn.type='button';
        receiptBtn.className='history-receipt-btn';
        receiptBtn.textContent='📷 Paragon';
        receiptBtn.addEventListener('click', () => openImageBlob(item.receipt, `Paragon – ${item.category || ''}`));
        actions.appendChild(receiptBtn);
      }

      const editBtn = document.createElement('button');
      editBtn.type = 'button';
      editBtn.className = 'history-edit-btn';
      editBtn.textContent = 'Edytuj';
      editBtn.addEventListener('click', () => startExpenseEdit(item));
      actions.appendChild(editBtn);

      const deleteBtn = document.createElement('button');
      deleteBtn.type = 'button';
      deleteBtn.className = 'history-delete-btn';
      deleteBtn.textContent = 'Usuń';
      deleteBtn.addEventListener('click', async () => {
        const label = item.category || 'ten wydatek';
        if (!window.confirm(`Usunąć wpis „${label}” z dnia ${formatExpenseDate(item.date)}?`)) return;
        try {
          await deleteExpense(item.id);
          await renderHistory();
          showToast('Wydatek został usunięty.');
        } catch (error) {
          console.error(error);
          showToast('Nie udało się usunąć wydatku.');
        }
      });
      actions.appendChild(deleteBtn);

      historyList.appendChild(row);
    });
  } catch (error) { console.error(error); showToast('Nie udało się wczytać historii.'); }
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[ch]));
}

function renderReportBars(container, entries, total, formatter = v => v) {
  container.innerHTML = '';
  if (!entries.length) {
    container.innerHTML = '<div class="report-empty">Brak danych do raportu.</div>';
    return;
  }
  entries.forEach(([label, value]) => {
    const percent = total > 0 ? Math.max(2, (value / total) * 100) : 0;
    const row = document.createElement('div');
    row.className='report-bar-row';
    row.innerHTML=`<div class="report-bar-label"><span>${escapeHtml(formatter(label))}</span><strong>${formatMoney(value)}</strong></div><div class="report-bar-track"><span style="width:${percent}%"></span></div>`;
    container.appendChild(row);
  });
}

function formatReportMonthLabel(label) {
  if (label === 'Brak daty') return label;
  const [y,m] = label.split('-').map(Number);
  return new Intl.DateTimeFormat('pl-PL', { month:'long', year:'numeric' }).format(new Date(y,m-1,1));
}

function renderMonthExpenses(monthKey) {
  const items = reportExpensesCache
    .filter(item => (((item.date || '').slice(0,7) || 'Brak daty') === monthKey))
    .sort((a,b) => ((b.date || '') + (b.createdAt || '')).localeCompare((a.date || '') + (a.createdAt || '')));

  const total = items.reduce((sum,item) => sum + (Number(item.amount) || 0), 0);
  reportMonthTitle.textContent = formatReportMonthLabel(monthKey);
  reportMonthTotal.textContent = formatMoney(total);
  reportMonthExpenses.innerHTML = '';

  if (!items.length) {
    reportMonthExpenses.innerHTML = '<div class="report-empty">Brak wydatków w tym miesiącu.</div>';
  } else {
    items.forEach(item => {
      const row = document.createElement('article');
      row.className = 'report-month-expense';
      const note = (item.notes || '').trim();
      row.innerHTML = `<div class="report-month-expense-main"><strong>${escapeHtml(item.category || 'Bez kategorii')}</strong><span>${formatExpenseDate(item.date)}</span>${note ? `<p>${escapeHtml(note)}</p>` : ''}</div><div class="report-month-expense-amount">${formatMoney(item.amount)}</div>`;
      reportMonthExpenses.appendChild(row);
    });
  }

  reportMonthDetails.hidden = false;
  reportMonthDetails.scrollIntoView({ behavior:'smooth', block:'start' });
}

function renderReportMonths(entries, total) {
  reportMonths.innerHTML = '';
  if (!entries.length) {
    reportMonths.innerHTML = '<div class="report-empty">Brak danych do raportu.</div>';
    return;
  }

  entries.forEach(([label,value]) => {
    const percent = total > 0 ? Math.max(2, (value / total) * 100) : 0;
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'report-bar-row report-month-row';
    button.innerHTML = `<div class="report-bar-label"><span>${escapeHtml(formatReportMonthLabel(label))}</span><strong>${formatMoney(value)}</strong></div><div class="report-bar-track"><span style="width:${percent}%"></span></div><div class="report-month-open">Zobacz wydatki ›</div>`;
    button.addEventListener('click', () => renderMonthExpenses(label));
    reportMonths.appendChild(button);
  });
}

async function renderReports() {
  try {
    const expenses = await getExpenses();
    reportExpensesCache = expenses;
    const total = expenses.reduce((sum, item) => sum + (Number(item.amount) || 0), 0);
    reportTotal.textContent = formatMoney(total);
    const categories = {}; const months = {};
    for (const item of expenses) {
      const amount = Number(item.amount) || 0;
      const cat = item.category || 'Bez kategorii'; categories[cat] = (categories[cat] || 0) + amount;
      const month = (item.date || '').slice(0,7) || 'Brak daty'; months[month] = (months[month] || 0) + amount;
    }
    const categoryEntries = Object.entries(categories).sort((a,b)=>b[1]-a[1]);
    const monthEntries = Object.entries(months).sort((a,b)=>b[0].localeCompare(a[0]));
    renderReportBars(reportCategories, categoryEntries, total);
    renderReportMonths(monthEntries, total);
  } catch (error) { console.error(error); showToast('Nie udało się przygotować raportów.'); }
}

async function saveGalleryPhoto(file, date) {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction('galleryPhotos', 'readwrite');
    const store = transaction.objectStore('galleryPhotos');
    const request = store.add({
      date,
      file,
      name: file.name || 'zdjęcie',
      type: file.type || 'image/jpeg',
      createdAt: new Date().toISOString()
    });
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
    transaction.oncomplete = () => db.close();
  });
}

async function getGalleryPhotos() {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction('galleryPhotos', 'readonly');
    const store = transaction.objectStore('galleryPhotos');
    const request = store.getAll();
    request.onsuccess = () => resolve(request.result || []);
    request.onerror = () => reject(request.error);
    transaction.oncomplete = () => db.close();
  });
}


async function deleteGalleryPhoto(id) {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction('galleryPhotos', 'readwrite');
    const store = transaction.objectStore('galleryPhotos');
    const request = store.delete(id);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
    transaction.oncomplete = () => db.close();
  });
}

async function deleteGalleryFolder(date) {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction('galleryPhotos', 'readwrite');
    const store = transaction.objectStore('galleryPhotos');
    const index = store.index('date');
    const request = index.openCursor(IDBKeyRange.only(date));

    request.onsuccess = () => {
      const cursor = request.result;
      if (cursor) {
        cursor.delete();
        cursor.continue();
      }
    };
    request.onerror = () => reject(request.error);
    transaction.oncomplete = () => {
      db.close();
      resolve();
    };
    transaction.onerror = () => reject(transaction.error);
  });
}

function formatFolderDate(dateStr) {
  const [y, m, d] = dateStr.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  return new Intl.DateTimeFormat('pl-PL', {
    day: '2-digit', month: 'long', year: 'numeric'
  }).format(date);
}

function attachLongPress(target, onLongPress) {
  let timer = null;
  let startX = 0;
  let startY = 0;

  const clear = () => {
    if (timer) window.clearTimeout(timer);
    timer = null;
  };

  target.addEventListener('pointerdown', event => {
    if (event.pointerType === 'mouse' && event.button !== 0) return;
    startX = event.clientX;
    startY = event.clientY;
    clear();
    timer = window.setTimeout(() => {
      suppressGalleryClick = true;
      onLongPress();
      if (navigator.vibrate) navigator.vibrate(25);
      window.setTimeout(() => { suppressGalleryClick = false; }, 450);
    }, 700);
  });

  target.addEventListener('pointermove', event => {
    if (Math.abs(event.clientX - startX) > 10 || Math.abs(event.clientY - startY) > 10) clear();
  });
  target.addEventListener('pointerup', clear);
  target.addEventListener('pointercancel', clear);
  target.addEventListener('pointerleave', clear);
  target.addEventListener('contextmenu', event => event.preventDefault());
}

function clearDeleteModes(except = null) {
  document.querySelectorAll('.gallery-folder.delete-mode, .gallery-thumb-item.delete-mode').forEach(el => {
    if (el !== except) el.classList.remove('delete-mode');
  });
}

function createPhotoThumb(photo) {
  const item = document.createElement('div');
  item.className = 'gallery-thumb-item';

  const wrapper = document.createElement('button');
  wrapper.type = 'button';
  wrapper.className = 'gallery-thumb';
  wrapper.setAttribute('aria-label', `Otwórz zdjęcie ${photo.name || ''}`.trim());

  const img = document.createElement('img');
  const url = URL.createObjectURL(photo.file);
  img.src = url;
  img.alt = photo.name || 'Zdjęcie';
  img.onload = () => URL.revokeObjectURL(url);
  wrapper.appendChild(img);

  wrapper.addEventListener('click', () => {
    if (suppressGalleryClick || item.classList.contains('delete-mode')) return;
    const fullUrl = URL.createObjectURL(photo.file);
    const overlay = document.createElement('div');
    overlay.className = 'gallery-lightbox';
    overlay.innerHTML = '<button type="button" class="gallery-lightbox-close" aria-label="Zamknij">×</button>';
    const full = document.createElement('img');
    full.src = fullUrl;
    full.alt = photo.name || 'Zdjęcie';
    overlay.appendChild(full);
    const close = () => {
      URL.revokeObjectURL(fullUrl);
      overlay.remove();
    };
    overlay.querySelector('.gallery-lightbox-close').addEventListener('click', close);
    overlay.addEventListener('click', e => { if (e.target === overlay) close(); });
    document.body.appendChild(overlay);
  });

  attachLongPress(wrapper, () => {
    clearDeleteModes(item);
    item.classList.add('delete-mode');
  });

  const deleteBtn = document.createElement('button');
  deleteBtn.type = 'button';
  deleteBtn.className = 'gallery-photo-delete';
  deleteBtn.textContent = 'Usuń';
  deleteBtn.setAttribute('aria-label', `Usuń zdjęcie ${photo.name || ''}`.trim());
  deleteBtn.addEventListener('click', async event => {
    event.stopPropagation();
    if (!window.confirm('Usunąć to zdjęcie z galerii?')) return;
    try {
      await deleteGalleryPhoto(photo.id);
      await renderGallery();
      showToast('Zdjęcie zostało usunięte.');
    } catch (error) {
      console.error(error);
      showToast('Nie udało się usunąć zdjęcia.');
    }
  });

  item.appendChild(wrapper);
  item.appendChild(deleteBtn);
  return item;
}

function renderFolderList(groups) {
  Object.keys(groups).sort().reverse().forEach(date => {
    const folder = document.createElement('section');
    folder.className = 'gallery-folder';

    const head = document.createElement('div');
    head.className = 'gallery-folder-head';

    const openBtn = document.createElement('button');
    openBtn.type = 'button';
    openBtn.className = 'gallery-folder-toggle';
    openBtn.innerHTML = `<span class="folder-icon">📁</span><span><strong>${formatFolderDate(date)}</strong><small>${groups[date].length} ${groups[date].length === 1 ? 'zdjęcie' : 'zdjęcia'}</small></span><span class="folder-arrow">›</span>`;
    openBtn.setAttribute('aria-label', `Otwórz katalog ${formatFolderDate(date)}`);

    openBtn.addEventListener('click', async () => {
      if (suppressGalleryClick || folder.classList.contains('delete-mode')) return;
      activeGalleryDate = date;
      await renderGallery();
    });

    attachLongPress(openBtn, () => {
      clearDeleteModes(folder);
      folder.classList.add('delete-mode');
    });

    const deleteFolderBtn = document.createElement('button');
    deleteFolderBtn.type = 'button';
    deleteFolderBtn.className = 'gallery-folder-delete';
    deleteFolderBtn.textContent = 'Usuń katalog';
    deleteFolderBtn.setAttribute('aria-label', `Usuń katalog ${formatFolderDate(date)}`);
    deleteFolderBtn.addEventListener('click', async event => {
      event.stopPropagation();
      const count = groups[date].length;
      const message = count === 1
        ? `Usunąć katalog z dnia ${formatFolderDate(date)} razem z 1 zdjęciem?`
        : `Usunąć katalog z dnia ${formatFolderDate(date)} razem ze wszystkimi ${count} zdjęciami?`;
      if (!window.confirm(message)) return;
      try {
        await deleteGalleryFolder(date);
        folder.classList.remove('delete-mode');
        await renderGallery();
        showToast('Katalog został usunięty.');
      } catch (error) {
        console.error(error);
        showToast('Nie udało się usunąć katalogu.');
      }
    });

    head.appendChild(openBtn);
    head.appendChild(deleteFolderBtn);
    folder.appendChild(head);
    galleryFolders.appendChild(folder);
  });
}

function renderOpenFolder(date, photos) {
  const view = document.createElement('section');
  view.className = 'gallery-open-folder';

  const top = document.createElement('div');
  top.className = 'gallery-open-folder-head';

  const back = document.createElement('button');
  back.type = 'button';
  back.className = 'gallery-folder-back';
  back.innerHTML = '<span>←</span><span>Foldery</span>';
  back.addEventListener('click', async () => {
    activeGalleryDate = null;
    await renderGallery();
  });

  const title = document.createElement('div');
  title.className = 'gallery-open-folder-title';
  title.innerHTML = `<strong>${formatFolderDate(date)}</strong><small>${photos.length} ${photos.length === 1 ? 'zdjęcie' : 'zdjęcia'}</small>`;

  top.appendChild(back);
  top.appendChild(title);

  const grid = document.createElement('div');
  grid.className = 'gallery-photo-grid';
  photos
    .sort((a,b) => (b.createdAt || '').localeCompare(a.createdAt || ''))
    .forEach(photo => grid.appendChild(createPhotoThumb(photo)));

  view.appendChild(top);
  view.appendChild(grid);
  galleryFolders.appendChild(view);
}

async function renderGallery() {
  try {
    const photos = await getGalleryPhotos();
    galleryFolders.querySelectorAll('.gallery-folder, .gallery-open-folder').forEach(el => el.remove());
    galleryEmpty.hidden = photos.length > 0;
    if (!photos.length) {
      activeGalleryDate = null;
      return;
    }

    const groups = photos.reduce((acc, photo) => {
      (acc[photo.date] ||= []).push(photo);
      return acc;
    }, {});

    if (activeGalleryDate && groups[activeGalleryDate]) {
      renderOpenFolder(activeGalleryDate, groups[activeGalleryDate]);
    } else {
      activeGalleryDate = null;
      renderFolderList(groups);
    }
  } catch (error) {
    console.error(error);
    showToast('Nie udało się wczytać galerii.');
  }
}

async function addGalleryFiles(fileList) {
  const files = [...(fileList || [])].filter(file => file.type.startsWith('image/'));
  if (!files.length) return;
  const date = galleryDateInput.value || todayISO();
  try {
    for (const file of files) await saveGalleryPhoto(file, date);
    galleryCameraInput.value = '';
    galleryFileInput.value = '';
    await renderGallery();
    showToast(files.length === 1 ? 'Zdjęcie zostało dodane.' : `Dodano ${files.length} zdjęcia.`);
  } catch (error) {
    console.error(error);
    showToast('Nie udało się zapisać zdjęcia.');
  }
}

galleryCameraInput.addEventListener('change', () => addGalleryFiles(galleryCameraInput.files));
galleryFileInput.addEventListener('change', () => addGalleryFiles(galleryFileInput.files));

receiptInput.addEventListener('change', () => {
  const file = receiptInput.files?.[0];
  if (!file) {
    resetReceipt();
    return;
  }

  selectedReceipt = file;
  if (previewUrl) URL.revokeObjectURL(previewUrl);
  previewUrl = URL.createObjectURL(file);
  receiptImage.src = previewUrl;
  receiptName.textContent = file.name || 'zdjęcie paragonu';
  receiptPreview.hidden = false;
});

removeReceiptBtn.addEventListener('click', resetReceipt);

expenseForm.addEventListener('submit', async event => {
  event.preventDefault();

  if (!expenseForm.reportValidity()) return;

  const amount = Number(amountInput.value);
  if (!Number.isFinite(amount) || amount <= 0) {
    showToast('Wpisz prawidłową kwotę wydatku.');
    amountInput.focus();
    return;
  }

  const isEditing = editingExpenseId !== null;
  const expense = {
    amount: Math.round(amount * 100) / 100,
    category: categoryInput.value,
    date: dateInput.value,
    notes: notesInput.value.trim(),
    receipt: selectedReceipt || null,
    createdAt: isEditing ? (editingExpenseCreatedAt || new Date().toISOString()) : new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
  if (isEditing) expense.id = editingExpenseId;

  try {
    await saveExpense(expense);
    resetExpenseForm();
    if (isEditing) {
      showToast('Zmiany zostały zapisane.');
      openView('history');
    } else {
      showToast('Wydatek został zapisany.');
    }
  } catch (error) {
    console.error(error);
    showToast(isEditing ? 'Nie udało się zapisać zmian.' : 'Nie udało się zapisać wydatku.');
  }
});


function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 2000);
}

function safeFileName(name) {
  return String(name || 'zdjecie')
    .replace(/[\\/:*?"<>|]+/g, '_')
    .replace(/\s+/g, ' ')
    .trim() || 'zdjecie';
}

function concatBytes(parts) {
  const total = parts.reduce((sum, part) => sum + part.length, 0);
  const out = new Uint8Array(total);
  let offset = 0;
  for (const part of parts) {
    out.set(part, offset);
    offset += part.length;
  }
  return out;
}

function le16(value) {
  const out = new Uint8Array(2);
  new DataView(out.buffer).setUint16(0, value, true);
  return out;
}

function le32(value) {
  const out = new Uint8Array(4);
  new DataView(out.buffer).setUint32(0, value >>> 0, true);
  return out;
}

let crcTable = null;
function getCrcTable() {
  if (crcTable) return crcTable;
  crcTable = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
    crcTable[n] = c >>> 0;
  }
  return crcTable;
}

function crc32(bytes) {
  const table = getCrcTable();
  let crc = 0xFFFFFFFF;
  for (let i = 0; i < bytes.length; i++) crc = table[(crc ^ bytes[i]) & 0xFF] ^ (crc >>> 8);
  return (crc ^ 0xFFFFFFFF) >>> 0;
}

function dosDateTime(value) {
  const d = value ? new Date(value) : new Date();
  const year = Math.max(1980, d.getFullYear());
  const time = ((d.getHours() & 31) << 11) | ((d.getMinutes() & 63) << 5) | ((Math.floor(d.getSeconds() / 2)) & 31);
  const date = (((year - 1980) & 127) << 9) | (((d.getMonth() + 1) & 15) << 5) | (d.getDate() & 31);
  return { time, date };
}

function buildZip(entries) {
  const encoder = new TextEncoder();
  const localParts = [];
  const centralParts = [];
  let localOffset = 0;

  for (const entry of entries) {
    const nameBytes = encoder.encode(entry.name);
    const data = entry.data;
    const crc = crc32(data);
    const stamp = dosDateTime(entry.lastModified);
    const flags = 0x0800;

    const localHeader = concatBytes([
      le32(0x04034B50), le16(20), le16(flags), le16(0), le16(stamp.time), le16(stamp.date),
      le32(crc), le32(data.length), le32(data.length), le16(nameBytes.length), le16(0), nameBytes
    ]);
    localParts.push(localHeader, data);

    const centralHeader = concatBytes([
      le32(0x02014B50), le16(20), le16(20), le16(flags), le16(0), le16(stamp.time), le16(stamp.date),
      le32(crc), le32(data.length), le32(data.length), le16(nameBytes.length), le16(0), le16(0),
      le16(0), le16(0), le32(0), le32(localOffset), nameBytes
    ]);
    centralParts.push(centralHeader);
    localOffset += localHeader.length + data.length;
  }

  const local = concatBytes(localParts);
  const central = concatBytes(centralParts);
  const end = concatBytes([
    le32(0x06054B50), le16(0), le16(0), le16(entries.length), le16(entries.length),
    le32(central.length), le32(local.length), le16(0)
  ]);
  return new Blob([local, central, end], { type: 'application/zip' });
}

async function downloadAllGalleryZip() {
  if (!downloadGalleryZipBtn) return;
  const original = downloadGalleryZipBtn.innerHTML;
  try {
    downloadGalleryZipBtn.disabled = true;
    downloadGalleryZipBtn.innerHTML = '<span>⏳</span><strong>Tworzę ZIP...</strong>';
    const photos = await getGalleryPhotos();
    if (!photos.length) {
      showToast('Galeria jest pusta.');
      return;
    }

    const counters = {};
    const entries = [];
    for (const photo of photos.sort((a,b) => ((a.date || '') + (a.createdAt || '')).localeCompare((b.date || '') + (b.createdAt || '')))) {
      const folder = photo.date || 'bez-daty';
      counters[folder] = (counters[folder] || 0) + 1;
      const index = String(counters[folder]).padStart(3, '0');
      let name = safeFileName(photo.name || `zdjecie_${index}.jpg`);
      if (!/\.[a-z0-9]{2,5}$/i.test(name)) {
        const ext = (photo.type || '').includes('png') ? '.png' : (photo.type || '').includes('webp') ? '.webp' : '.jpg';
        name += ext;
      }
      const bytes = new Uint8Array(await photo.file.arrayBuffer());
      entries.push({ name: `${folder}/${index}_${name}`, data: bytes, lastModified: photo.createdAt || Date.now() });
    }

    const zip = buildZip(entries);
    downloadBlob(zip, `galeria_dom_przy_wisniowa_9_${todayISO()}.zip`);
    showToast(`Przygotowano ZIP: ${photos.length} zdjęć.`);
  } catch (error) {
    console.error(error);
    showToast('Nie udało się przygotować pliku ZIP.');
  } finally {
    downloadGalleryZipBtn.disabled = false;
    downloadGalleryZipBtn.innerHTML = original;
  }
}

function wrapCanvasText(ctx, text, maxWidth) {
  const paragraphs = String(text || '').split(/\n/);
  const lines = [];
  for (const paragraph of paragraphs) {
    const words = paragraph.split(/\s+/).filter(Boolean);
    if (!words.length) { lines.push(''); continue; }
    let line = words.shift();
    for (const word of words) {
      const candidate = `${line} ${word}`;
      if (ctx.measureText(candidate).width <= maxWidth) line = candidate;
      else { lines.push(line); line = word; }
    }
    lines.push(line);
  }
  return lines;
}

function createReportCanvases(expenses) {
  const W = 1240, H = 1754, M = 88;
  const pages = [];
  let canvas, ctx, y;

  function newPage() {
    canvas = document.createElement('canvas');
    canvas.width = W; canvas.height = H;
    ctx = canvas.getContext('2d');
    ctx.fillStyle = '#ffffff'; ctx.fillRect(0,0,W,H);
    ctx.fillStyle = '#12263d';
    ctx.textBaseline = 'top';
    pages.push(canvas);
    y = M;
  }

  function ensure(height) {
    if (y + height > H - 110) newPage();
  }

  function text(value, size=34, weight=400, indent=0, maxWidth=W-M*2-indent, lineGap=1.25, color='#12263d') {
    ctx.font = `${weight} ${size}px Arial, sans-serif`;
    ctx.fillStyle = color;
    const lines = wrapCanvasText(ctx, value, maxWidth);
    const lineH = Math.ceil(size * lineGap);
    ensure(lines.length * lineH + 8);
    for (const line of lines) { ctx.fillText(line, M + indent, y); y += lineH; }
    return lines.length * lineH;
  }

  function rule() {
    ensure(24); y += 8; ctx.strokeStyle='#d7dee7'; ctx.lineWidth=2; ctx.beginPath(); ctx.moveTo(M,y); ctx.lineTo(W-M,y); ctx.stroke(); y += 18;
  }

  function amountRow(label, amount, indent=0) {
    ctx.font='600 28px Arial, sans-serif';
    const amountText = formatMoney(amount);
    const rightW = ctx.measureText(amountText).width;
    const maxLabel = W - M*2 - indent - rightW - 34;
    const lines = wrapCanvasText(ctx,label,maxLabel);
    const h=Math.max(36,lines.length*34);
    ensure(h+8);
    ctx.fillStyle='#263b52';
    lines.forEach((line,i)=>ctx.fillText(line,M+indent,y+i*34));
    ctx.font='700 28px Arial, sans-serif'; ctx.fillStyle='#12263d'; ctx.fillText(amountText,W-M-rightW,y);
    y += h+8;
  }

  newPage();
  text('Budżet domowy - Dom przy Wiśniowa 9', 42, 800);
  text('Zbiorczy raport wydatków', 54, 800, 0, W-M*2, 1.08, '#17395f');
  text(`Wygenerowano: ${new Intl.DateTimeFormat('pl-PL', {dateStyle:'long'}).format(new Date())}`, 24, 400, 0, W-M*2, 1.2, '#607386');
  rule();

  const total = expenses.reduce((sum,item)=>sum+(Number(item.amount)||0),0);
  text('Łączne wydatki', 26, 700, 0, W-M*2, 1.2, '#607386');
  text(formatMoney(total), 54, 800, 0, W-M*2, 1.1, '#17395f');
  y += 18;

  const categories = {};
  const months = {};
  expenses.forEach(item=>{
    const amount=Number(item.amount)||0;
    const cat=item.category||'Bez kategorii'; categories[cat]=(categories[cat]||0)+amount;
    const month=(item.date||'').slice(0,7)||'Brak daty'; months[month]=(months[month]||0)+amount;
  });

  text('Podsumowanie według kategorii', 34, 800);
  y += 8;
  Object.entries(categories).sort((a,b)=>b[1]-a[1]).forEach(([label,value])=>amountRow(label,value));
  rule();

  text('Podsumowanie według miesięcy', 34, 800);
  y += 8;
  Object.entries(months).sort((a,b)=>b[0].localeCompare(a[0])).forEach(([label,value])=>amountRow(formatReportMonthLabel(label),value));
  rule();

  text('Szczegółowa lista wydatków', 34, 800);
  y += 12;
  const sorted=[...expenses].sort((a,b)=>((a.date||'')+(a.createdAt||'')).localeCompare((b.date||'')+(b.createdAt||'')));
  sorted.forEach((item,index)=>{
    const note=(item.notes||'').trim();
    const title=`${index+1}. ${formatExpenseDate(item.date)} - ${item.category||'Bez kategorii'}`;
    ctx.font='700 28px Arial, sans-serif';
    const titleLines=wrapCanvasText(ctx,title,W-M*2-240);
    ctx.font='400 23px Arial, sans-serif';
    const noteLines=note?wrapCanvasText(ctx,note,W-M*2-35):[];
    const h=titleLines.length*34+(noteLines.length?noteLines.length*29+10:0)+28;
    ensure(h+16);
    ctx.fillStyle='#f4f7fa'; ctx.fillRect(M-14,y-10,W-M*2+28,h+8);
    ctx.font='700 28px Arial, sans-serif'; ctx.fillStyle='#12263d';
    titleLines.forEach((line,i)=>ctx.fillText(line,M,y+i*34));
    const amountText=formatMoney(item.amount); const aw=ctx.measureText(amountText).width;
    ctx.fillText(amountText,W-M-aw,y);
    let noteY=y+titleLines.length*34+6;
    if(noteLines.length){ ctx.font='400 23px Arial, sans-serif'; ctx.fillStyle='#526579'; noteLines.forEach((line,i)=>ctx.fillText(line,M,noteY+i*29)); }
    y += h+14;
  });

  pages.forEach((page,i)=>{
    const c=page.getContext('2d');
    c.font='400 20px Arial, sans-serif'; c.fillStyle='#7d8b99'; c.textBaseline='top';
    c.fillText('Copyright Mariusz Gębka', M, H-58);
    const p=`Strona ${i+1} / ${pages.length}`; const pw=c.measureText(p).width; c.fillText(p,W-M-pw,H-58);
  });
  return pages;
}

function canvasJpeg(canvas) {
  return new Promise((resolve,reject)=>canvas.toBlob(async blob=>{
    if(!blob){ reject(new Error('Nie udało się utworzyć obrazu PDF.')); return; }
    resolve({ bytes:new Uint8Array(await blob.arrayBuffer()), width:canvas.width, height:canvas.height });
  },'image/jpeg',0.88));
}

function asciiBytes(text) { return new TextEncoder().encode(text); }

function buildPdfFromJpegs(images) {
  const parts=[];
  const offsets=[0];
  let length=0;
  const push=bytes=>{ parts.push(bytes); length+=bytes.length; };
  push(asciiBytes('%PDF-1.4\n%\xE2\xE3\xCF\xD3\n'));
  const pageRefs=[];
  images.forEach((_,i)=>pageRefs.push(3+i*3));
  const objects=[];
  objects[1]=asciiBytes('<< /Type /Catalog /Pages 2 0 R >>');
  objects[2]=asciiBytes(`<< /Type /Pages /Count ${images.length} /Kids [${pageRefs.map(n=>`${n} 0 R`).join(' ')}] >>`);
  images.forEach((img,i)=>{
    const pageObj=3+i*3, imageObj=4+i*3, contentObj=5+i*3;
    objects[pageObj]=asciiBytes(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595.28 841.89] /Resources << /XObject << /Im0 ${imageObj} 0 R >> >> /Contents ${contentObj} 0 R >>`);
    const imgHead=asciiBytes(`<< /Type /XObject /Subtype /Image /Width ${img.width} /Height ${img.height} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${img.bytes.length} >>\nstream\n`);
    objects[imageObj]=concatBytes([imgHead,img.bytes,asciiBytes('\nendstream')]);
    const stream='q\n595.28 0 0 841.89 0 0 cm\n/Im0 Do\nQ';
    objects[contentObj]=asciiBytes(`<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`);
  });
  const maxObj=objects.length-1;
  for(let i=1;i<=maxObj;i++){
    offsets[i]=length;
    push(asciiBytes(`${i} 0 obj\n`)); push(objects[i]); push(asciiBytes('\nendobj\n'));
  }
  const xrefOffset=length;
  let xref=`xref\n0 ${maxObj+1}\n0000000000 65535 f \n`;
  for(let i=1;i<=maxObj;i++) xref+=`${String(offsets[i]).padStart(10,'0')} 00000 n \n`;
  xref+=`trailer\n<< /Size ${maxObj+1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;
  push(asciiBytes(xref));
  return new Blob(parts,{type:'application/pdf'});
}

async function downloadSummaryPdf() {
  if (!downloadReportPdfBtn) return;
  const original=downloadReportPdfBtn.innerHTML;
  try {
    downloadReportPdfBtn.disabled=true;
    downloadReportPdfBtn.innerHTML='<span>⏳</span><strong>Tworzę PDF...</strong>';
    const expenses=await getExpenses();
    if(!expenses.length){ showToast('Brak wydatków do raportu.'); return; }
    const canvases=createReportCanvases(expenses);
    const images=[];
    for(const canvas of canvases) images.push(await canvasJpeg(canvas));
    const pdf=buildPdfFromJpegs(images);
    downloadBlob(pdf,`raport_budzet_domowy_${todayISO()}.pdf`);
    showToast('Raport PDF został przygotowany.');
  } catch(error){
    console.error(error);
    showToast('Nie udało się przygotować raportu PDF.');
  } finally {
    downloadReportPdfBtn.disabled=false;
    downloadReportPdfBtn.innerHTML=original;
  }
}

if (downloadReportPdfBtn) downloadReportPdfBtn.addEventListener('click', downloadSummaryPdf);
if (downloadGalleryZipBtn) downloadGalleryZipBtn.addEventListener('click', downloadAllGalleryZip);

if (reportMonthClose) {
  reportMonthClose.addEventListener('click', () => {
    reportMonthDetails.hidden = true;
    document.querySelector('.reports-card')?.scrollIntoView({ behavior:'smooth', block:'start' });
  });
}

document.querySelectorAll('[data-view]').forEach(btn => {
  btn.addEventListener('click', () => openView(btn.dataset.view));
});

backBtn.addEventListener('click', async () => {
  if (!galleryCard.hidden && activeGalleryDate) {
    activeGalleryDate = null;
    await renderGallery();
    return;
  }
  if (editingExpenseId !== null) {
    resetExpenseForm();
    openView('history');
    return;
  }
  openHome();
});

cancelExpenseBtn.addEventListener('click', () => {
  const wasEditing = editingExpenseId !== null;
  resetExpenseForm();
  if (wasEditing) openView('history');
  else openHome();
});

exitBtn.addEventListener('click', () => {
  try { window.close(); } catch (_) {}
  showToast('Aby zamknąć aplikację PWA, użyj gestu lub przycisku systemowego.');
});

dateInput.value = todayISO();
galleryDateInput.value = todayISO();

if ('serviceWorker' in navigator) {
  window.addEventListener('load', async () => {
    try {
      const registration = await navigator.serviceWorker.register('./sw.js?v=1022');
      await registration.update();

      let refreshing = false;
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        if (refreshing) return;
        refreshing = true;
        window.location.reload();
      });
    } catch (error) {
      console.error('Błąd aktualizacji PWA:', error);
    }
  });
}
