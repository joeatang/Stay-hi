document.addEventListener('DOMContentLoaded', () => {
  if (window.hiNavSystem) {
    window.hiNavSystem.updateAppState('ready');
    window.hiNavSystem.trackNavigation('welcome_page');
  }
});
