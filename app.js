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
const reportCount = document.getElementById('reportCount');
const reportAverage = document.getElementById('reportAverage');
const reportCategories = document.getElementById('reportCategories');
const reportMonths = document.getElementById('reportMonths');

let selectedReceipt = null;
let previewUrl = '';
let activeGalleryDate = null;
let suppressGalleryClick = false;
let editingExpenseId = null;
let editingExpenseCreatedAt = null;
let editingExpenseReceipt = null;

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

async function renderReports() {
  try {
    const expenses = await getExpenses();
    const total = expenses.reduce((sum, item) => sum + (Number(item.amount) || 0), 0);
    reportTotal.textContent = formatMoney(total);
    reportCount.textContent = String(expenses.length);
    reportAverage.textContent = formatMoney(expenses.length ? total / expenses.length : 0);
    const categories = {}; const months = {};
    for (const item of expenses) {
      const amount = Number(item.amount) || 0;
      const cat = item.category || 'Bez kategorii'; categories[cat] = (categories[cat] || 0) + amount;
      const month = (item.date || '').slice(0,7) || 'Brak daty'; months[month] = (months[month] || 0) + amount;
    }
    const categoryEntries = Object.entries(categories).sort((a,b)=>b[1]-a[1]);
    const monthEntries = Object.entries(months).sort((a,b)=>b[0].localeCompare(a[0]));
    renderReportBars(reportCategories, categoryEntries, total);
    renderReportBars(reportMonths, monthEntries, total, label => {
      if (label === 'Brak daty') return label;
      const [y,m] = label.split('-').map(Number);
      return new Intl.DateTimeFormat('pl-PL',{month:'long',year:'numeric'}).format(new Date(y,m-1,1));
    });
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
      const registration = await navigator.serviceWorker.register('./sw.js?v=1018');
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
