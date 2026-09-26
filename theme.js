// Applies the saved color theme and light/dark appearance before the page draws, so it never flashes the defaults.
try {
  const prefs = JSON.parse(localStorage.getItem('cht.prefs.v1') || '{}');
  const root = document.documentElement;
  if (prefs.theme && prefs.theme !== 'blue') root.dataset.theme = prefs.theme;
  const mode = prefs.appearance || 'light';
  if (mode === 'dark' || (mode === 'system' && matchMedia('(prefers-color-scheme: dark)').matches)) root.dataset.mode = 'dark';
} catch { /* storage blocked: use the defaults */ }
