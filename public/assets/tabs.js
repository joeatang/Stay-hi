// public/assets/tabs.js
(function () {
  const active = document.body.dataset.tab || "today";
  const el = document.createElement("nav");
  el.className = "tabs";
  el.innerHTML = `
    <a href="index.html" data-tab="today" class="tab">
      <span class="ico">⭘</span><span>Today</span>
    </a>
    <a href="hi-island.html" data-tab="island" class="tab">
      <span class="ico">🧭</span><span>Hi Island</span>
    </a>
    <a href="account.html" data-tab="account" class="tab">
      <span class="ico">📈</span><span>Hi Account</span>
    </a>
    <a href="profile.html" data-tab="me" class="tab">
      <span class="ico">👤</span><span>Me</span>
    </a>
  `;
  document.body.appendChild(el);
  el.querySelectorAll(".tab").forEach((a) => {
    if (a.dataset.tab === active) a.classList.add("active");
  });
})();
