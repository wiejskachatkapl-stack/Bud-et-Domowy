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
}

function openView(key) {
  homeScreen.hidden = true;
  contentScreen.hidden = false;

  if (key === 'expenses') {
    contentTitle.textContent = 'Wydatki';
    contentSubtitle.textContent = 'Dodaj nowy wydatek';
    placeholderCard.hidden = true;
    expenseForm.hidden = false;
    if (!dateInput.value) dateInput.value = todayISO();
    window.setTimeout(() => amountInput.focus(), 80);
    return;
  }

  const [title, subtitle, text] = viewCopy[key];
  contentTitle.textContent = title;
  contentSubtitle.textContent = subtitle;
  placeholderTitle.textContent = title;
  placeholderText.textContent = text;
  expenseForm.hidden = true;
  placeholderCard.hidden = false;
}

function openDatabase() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('BudzetDomowyDB', 1);

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains('expenses')) {
        const store = db.createObjectStore('expenses', { keyPath: 'id', autoIncrement: true });
        store.createIndex('date', 'date', { unique: false });
        store.createIndex('category', 'category', { unique: false });
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

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => navigator.serviceWorker.register('./sw.js'));
}
