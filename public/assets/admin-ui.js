// Admin UI Module
// Tesla-grade: Pure rendering, no business logic
(function() {
  'use strict';

  // Render stats dashboard
  function renderStats(stats) {
    const container = document.getElementById('admin-stats');
    if (!container) return;

    container.innerHTML = `
      <div class="stat-card">
        <div class="stat-number">${stats.total}</div>
        <div class="stat-label">Total Codes</div>
      </div>
      <div class="stat-card">
        <div class="stat-number">${stats.active}</div>
        <div class="stat-label">Active</div>
      </div>
      <div class="stat-card">
        <div class="stat-number">${stats.expired}</div>
        <div class="stat-label">Expired</div>
      </div>
      <div class="stat-card">
        <div class="stat-number">${stats.totalUses}</div>
        <div class="stat-label">Total Uses</div>
      </div>
    `;
  }

  // Show generated code result
  function showGeneratedCode(code) {
    const container = document.getElementById('code-result');
    if (!container) return;

    container.style.display = 'block';
    container.innerHTML = `
      <div class="code-display">${code}</div>
      <button class="copy-btn" onclick="AdminUI.copyCode('${code}')">
        📋 Copy Code
      </button>
    `;

    // Auto-hide after 10 seconds
    setTimeout(() => {
      container.style.display = 'none';
    }, 10000);
  }

  // Render codes table
  function renderCodesTable(codes) {
    const container = document.getElementById('codes-table');
    if (!container) return;

    if (codes.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <p>No invite codes yet</p>
          <p class="muted">Generate your first code using the form above</p>
        </div>
      `;
      return;
    }

    const now = new Date();
    
    const rows = codes.map(code => {
      const isExpired = code.expires_at && new Date(code.expires_at) < now;
      const isUsedUp = code.current_uses >= code.max_uses;
      const isActive = code.is_active && !isExpired && !isUsedUp;
      
      let statusClass = 'status-active';
      let statusText = 'Active';
      
      if (!code.is_active) {
        statusClass = 'status-deactivated';
        statusText = 'Deactivated';
      } else if (isExpired) {
        statusClass = 'status-expired';
        statusText = 'Expired';
      } else if (isUsedUp) {
        statusClass = 'status-used';
        statusText = 'Used Up';
      }

      const expiresText = code.expires_at 
        ? new Date(code.expires_at).toLocaleDateString()
        : 'Never';

      return `
        <tr>
          <td><code class="code-text">${code.code}</code></td>
          <td>${code.code_type}</td>
          <td><span class="status ${statusClass}">${statusText}</span></td>
          <td>${code.current_uses} / ${code.max_uses}</td>
          <td>${expiresText}</td>
          <td>${new Date(code.created_at).toLocaleDateString()}</td>
          <td>
            <button class="action-btn" onclick="AdminUI.copyCode('${code.code}')">Copy</button>
            ${isActive ? `<button class="action-btn-danger" onclick="AdminUI.confirmDeactivate('${code.id}')">Deactivate</button>` : ''}
          </td>
        </tr>
      `;
    }).join('');

    container.innerHTML = `
      <table class="codes-table">
        <thead>
          <tr>
            <th>Code</th>
            <th>Type</th>
            <th>Status</th>
            <th>Uses</th>
            <th>Expires</th>
            <th>Created</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          ${rows}
        </tbody>
      </table>
    `;
  }

  // Copy code to clipboard
  async function copyCode(code) {
    try {
      await navigator.clipboard.writeText(code);
      showToast('✅ Code copied to clipboard!', 'success');
    } catch (error) {
      console.error('[admin-ui] Copy failed:', error);
      showToast('❌ Failed to copy code', 'error');
    }
  }

  // Show toast notification
  function showToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.textContent = message;
    document.body.appendChild(toast);

    setTimeout(() => toast.classList.add('show'), 100);
    setTimeout(() => {
      toast.classList.remove('show');
      setTimeout(() => document.body.removeChild(toast), 300);
    }, 3000);
  }

  // Confirm deactivation
  function confirmDeactivate(codeId) {
    if (confirm('Are you sure you want to deactivate this invite code?')) {
      window.dispatchEvent(new CustomEvent('admin-deactivate-code', { detail: { codeId } }));
    }
  }

  // Show loading state
  function setLoading(buttonId, loading) {
    const button = document.getElementById(buttonId);
    if (!button) return;

    if (loading) {
      button.disabled = true;
      button.dataset.originalText = button.textContent;
      button.textContent = '⏳ Loading...';
    } else {
      button.disabled = false;
      button.textContent = button.dataset.originalText || button.textContent;
    }
  }

  // Expose API
  window.AdminUI = {
    renderStats,
    showGeneratedCode,
    renderCodesTable,
    copyCode,
    showToast,
    confirmDeactivate,
    setLoading
  };

  console.log('[admin-ui] Module loaded');
})();
