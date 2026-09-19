const homeScreen = document.getElementById('homeScreen');
const contentScreen = document.getElementById('contentScreen');
const contentTitle = document.getElementById('contentTitle');
const placeholderTitle = document.getElementById('placeholderTitle');
const placeholderText = document.getElementById('placeholderText');
const backBtn = document.getElementById('backBtn');
const exitBtn = document.getElementById('exitBtn');
const toast = document.getElementById('toast');

const viewCopy = {
  expenses: ['Wydatki', 'Tu dodamy formularz nowych wydatków domu, kategorie, kwoty i sposób płatności.'],
  history: ['Historia', 'Tu pojawi się chronologiczna historia wszystkich zapisanych wydatków i zmian.'],
  reports: ['Raporty', 'Tu przygotujemy raporty miesięczne, roczne, kategorie wydatków oraz podsumowania.']
};

function openView(key) {
  const [title, text] = viewCopy[key];
  contentTitle.textContent = title;
  placeholderTitle.textContent = title;
  placeholderText.textContent = text;
  homeScreen.hidden = true;
  contentScreen.hidden = false;
}

document.querySelectorAll('[data-view]').forEach(btn => {
  btn.addEventListener('click', () => openView(btn.dataset.view));
});

backBtn.addEventListener('click', () => {
  contentScreen.hidden = true;
  homeScreen.hidden = false;
});

exitBtn.addEventListener('click', () => {
  try { window.close(); } catch (_) {}
  toast.textContent = 'Aby zamknąć aplikację PWA, użyj gestu lub przycisku systemowego.';
  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), 2800);
});

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => navigator.serviceWorker.register('./sw.js'));
}
