// HI DEV: Tesla-Grade HiMedallion Component mount
import { mountHiMedallion } from './ui/HiMedallion/HiMedallion.js';

document.addEventListener('DOMContentLoaded', () => {
  const medallionContainer = document.getElementById('hiMedallionContainer');
  if (medallionContainer) {
    mountHiMedallion(medallionContainer, {
      onTap: () => {
        location.href = './hi-dashboard.html?source=medallion';
      }
    });
  }
});
