// Quick diagnostic to check tier badge state
setTimeout(() => {
  const indicator = document.getElementById('hi-tier-indicator');
  if (indicator) {
    console.log('=== TIER BADGE DIAGNOSTIC ===');
    console.log('Element HTML:', indicator.outerHTML);
    console.log('Text content:', indicator.textContent);
    console.log('Inner HTML:', indicator.innerHTML);
    console.log('Children count:', indicator.children.length);
    console.log('data-auth-loading:', indicator.dataset.authLoading);
    Array.from(indicator.children).forEach((child, i) => {
      console.log(`Child ${i}:`, child.tagName, child.className, child.textContent);
    });
    console.log('==========================');
  }
}, 6000); // Run after all tier updates
