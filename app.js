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
const receiptInput = document.getElementById('receiptInput');
const receiptPreview = document.getElementById('receiptPreview');
const receiptImage = document.getElementById('receiptImage');
const receiptName = document.getElementById('receiptName');
const removeReceiptBtn = document.getElementById('removeReceiptBtn');
const cancelExpenseBtn = document.getElementById('cancelExpenseBtn');
const backBtn = document.getElementById('backBtn');
const exitBtn = document.getElementById('exitBtn');
const toast = document.getElementById('toast');
const galleryCard = document.getElementById('galleryCard');
const galleryDateInput = document.getElementById('galleryDateInput');
const galleryCameraInput = document.getElementById('galleryCameraInput');
const galleryFileInput = document.getElementById('galleryFileInput');
const galleryFolders = document.getElementById('galleryFolders');
const galleryEmpty = document.getElementById('galleryEmpty');

let selectedReceipt = null;
let previewUrl = '';

const viewCopy = {
  history: ['Historia', 'Archiwum wydatków', 'Tutaj pojawi się chronologiczna historia zapisanych wydatków i paragonów.'],
  reports: ['Raporty', 'Podsumowania budżetu', 'Tutaj przygotujemy raporty miesięczne, roczne i podział wydatków według kategorii.']
};

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
}

function openHome() {
  contentScreen.hidden = true;
  homeScreen.hidden = false;
  placeholderCard.hidden = true;
  expenseForm.hidden = true;
  galleryCard.hidden = true;
}

function openView(key) {
  homeScreen.hidden = true;
  contentScreen.hidden = false;

  if (key === 'expenses') {
    contentTitle.textContent = 'Wydatki';
    contentSubtitle.textContent = 'Dodaj nowy wydatek';
    placeholderCard.hidden = true;
    galleryCard.hidden = true;
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
    galleryCard.hidden = false;
    if (!galleryDateInput.value) galleryDateInput.value = todayISO();
    renderGallery();
    return;
  }

  const [title, subtitle, text] = viewCopy[key];
  contentTitle.textContent = title;
  contentSubtitle.textContent = subtitle;
  placeholderTitle.textContent = title;
  placeholderText.textContent = text;
  expenseForm.hidden = true;
  galleryCard.hidden = true;
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
    const request = store.add(expense);

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
    transaction.oncomplete = () => db.close();
  });
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

function formatFolderDate(dateStr) {
  const [y, m, d] = dateStr.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  return new Intl.DateTimeFormat('pl-PL', {
    day: '2-digit', month: 'long', year: 'numeric'
  }).format(date);
}

function createPhotoThumb(photo) {
  const wrapper = document.createElement('button');
  wrapper.type = 'button';
  wrapper.className = 'gallery-thumb';
  const img = document.createElement('img');
  const url = URL.createObjectURL(photo.file);
  img.src = url;
  img.alt = photo.name || 'Zdjęcie';
  img.onload = () => URL.revokeObjectURL(url);
  wrapper.appendChild(img);
  wrapper.addEventListener('click', () => {
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
  return wrapper;
}

async function renderGallery() {
  try {
    const photos = await getGalleryPhotos();
    galleryFolders.querySelectorAll('.gallery-folder').forEach(el => el.remove());
    galleryEmpty.hidden = photos.length > 0;
    if (!photos.length) return;

    const groups = photos.reduce((acc, photo) => {
      (acc[photo.date] ||= []).push(photo);
      return acc;
    }, {});

    Object.keys(groups).sort().reverse().forEach(date => {
      const folder = document.createElement('section');
      folder.className = 'gallery-folder';

      const head = document.createElement('button');
      head.type = 'button';
      head.className = 'gallery-folder-head';
      head.innerHTML = `<span class="folder-icon">📁</span><span><strong>${formatFolderDate(date)}</strong><small>${groups[date].length} ${groups[date].length === 1 ? 'zdjęcie' : 'zdjęcia'}</small></span><span class="folder-arrow">⌄</span>`;

      const grid = document.createElement('div');
      grid.className = 'gallery-photo-grid';
      groups[date].sort((a,b) => (b.createdAt || '').localeCompare(a.createdAt || '')).forEach(photo => grid.appendChild(createPhotoThumb(photo)));

      head.addEventListener('click', () => {
        const isClosed = grid.hidden;
        grid.hidden = !isClosed;
        folder.classList.toggle('open', isClosed);
      });

      folder.appendChild(head);
      folder.appendChild(grid);
      galleryFolders.appendChild(folder);
    });
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

  const expense = {
    amount: Math.round(amount * 100) / 100,
    category: categoryInput.value,
    date: dateInput.value,
    receipt: selectedReceipt || null,
    createdAt: new Date().toISOString()
  };

  try {
    await saveExpense(expense);
    resetExpenseForm();
    showToast('Wydatek został zapisany.');
  } catch (error) {
    console.error(error);
    showToast('Nie udało się zapisać wydatku.');
  }
});

document.querySelectorAll('[data-view]').forEach(btn => {
  btn.addEventListener('click', () => openView(btn.dataset.view));
});

backBtn.addEventListener('click', openHome);

cancelExpenseBtn.addEventListener('click', () => {
  resetExpenseForm();
  openHome();
});

exitBtn.addEventListener('click', () => {
  try { window.close(); } catch (_) {}
  showToast('Aby zamknąć aplikację PWA, użyj gestu lub przycisku systemowego.');
});

dateInput.value = todayISO();
galleryDateInput.value = todayISO();

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => navigator.serviceWorker.register('./sw.js'));
}
