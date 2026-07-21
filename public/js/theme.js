const THEMES = ['purple', 'blue', 'red', 'green', 'cyan', 'orange'];

function initTheme() {
  const saved = localStorage.getItem('punch-theme') || 'purple';
  applyTheme(saved);

  document.querySelectorAll('#themePicker button').forEach((btn) => {
    btn.classList.toggle('active', btn.dataset.theme === saved);
    btn.addEventListener('click', () => {
      applyTheme(btn.dataset.theme);
      localStorage.setItem('punch-theme', btn.dataset.theme);
      document.querySelectorAll('#themePicker button').forEach((b) => {
        b.classList.toggle('active', b.dataset.theme === btn.dataset.theme);
      });
    });
  });
}

function applyTheme(name) {
  if (THEMES.includes(name)) {
    document.body.dataset.theme = name;
  }
}

initTheme();
