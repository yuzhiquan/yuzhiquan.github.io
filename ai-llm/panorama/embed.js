/* Same-origin lesson integration; all model calculations stay in this document. */
(() => {
  const button = document.querySelector('#immersive');
  const setImmersive = active => {
    document.body.classList.toggle('immersive', active);
    button.textContent = active ? '✕ 退出沉浸' : '⛶ 沉浸模式';
    button.setAttribute('aria-pressed', String(active));
  };
  button.onclick = async () => {
    if (document.body.classList.contains('immersive')) {
      if (document.fullscreenElement) await document.exitFullscreen();
      setImmersive(false);
    } else {
      setImmersive(true);
      try { await document.documentElement.requestFullscreen(); }
      catch { /* Inline immersive mode remains available without Fullscreen API. */ }
    }
  };
  document.addEventListener('fullscreenchange', () => setImmersive(Boolean(document.fullscreenElement)));
})();
