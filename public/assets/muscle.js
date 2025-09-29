/* Build Your Hi Muscle – standalone client script
   Works offline (file://). If API calls fail, it saves to localStorage and shows a toast.
*/

(function () {
  const EMOTIONS = {
    hi: [
      { emoji: "🤩", label: "Excited" },
      { emoji: "😊", label: "Joyful" },
      { emoji: "💪", label: "Confident" },
      { emoji: "🙏", label: "Grateful" },
    ],
    neutral: [
      { emoji: "🙂", label: "Calm" },
      { emoji: "😌", label: "Content" },
      { emoji: "🎯", label: "Focused" },
      { emoji: "⚖️", label: "Balanced" },
    ],
    opportunity: [
      { emoji: "😴", label: "Tired" },
      { emoji: "😥", label: "Stressed" },
      { emoji: "😢", label: "Sad" },
      { emoji: "😟", label: "Anxious" },
    ],
  };

  const $ = (sel) => document.querySelector(sel);
  const $$ = (sel) => Array.from(document.querySelectorAll(sel));

  const currentGrid = $("#currentGrid");
  const desiredGrid = $("#desiredGrid");
  const journal = $("#journal");
  const jc = $("#jc");
  const submitBtn = $("#submitBtn");

  let activeTab = "hi";
  let currentEmotion = null;
  let desiredEmotion = null;

  // ----- helpers
  function toast(msg) {
    const t = document.createElement("div");
    t.className = "toast";
    t.textContent = msg;
    document.body.appendChild(t);
    setTimeout(() => t.remove(), 1800);
  }

  function renderGrid(which, gridEl) {
    gridEl.innerHTML = "";
    const set = EMOTIONS[activeTab] || [];
    set.forEach((item) => {
      const b = document.createElement("button");
      b.type = "button";
      b.className = "chip";
      b.innerHTML = `<div class="emoji">${item.emoji}</div><div class="label">${item.label}</div>`;
      b.setAttribute("aria-pressed", "false");
      b.addEventListener("click", () => {
        // clear previous selection within this grid
        gridEl.querySelectorAll(".chip[aria-pressed='true']").forEach((n) => n.setAttribute("aria-pressed", "false"));
        b.setAttribute("aria-pressed", "true");
        if (which === "current") currentEmotion = item;
        else desiredEmotion = item;
        validate();
      });
      gridEl.appendChild(b);
    });
  }

  function setActiveTab(tab) {
    activeTab = tab;
    // update tab UI
    $$(".tab").forEach((t) => {
      const on = t.dataset.tab === tab;
      t.setAttribute("aria-current", on ? "true" : "false");
      t.setAttribute("aria-selected", on ? "true" : "false");
    });
    // re-render the grids for this category
    renderGrid("current", currentGrid);
    renderGrid("desired", desiredGrid);
    // reset selections for clarity when switching categories
    currentEmotion = null;
    desiredEmotion = null;
    validate();
  }

  function validate() {
    submitBtn.disabled = !(currentEmotion && desiredEmotion && journal.value.trim().length > 0);
  }

  // ----- init tabs
  $$(".tab").forEach((t) => t.addEventListener("click", () => setActiveTab(t.dataset.tab)));
  setActiveTab("hi");

  // ----- journal counter
  journal.addEventListener("input", () => {
    jc.textContent = String(journal.value.length);
    validate();
  });

  // ----- submit
  submitBtn.addEventListener("click", async () => {
    const payload = {
      currentEmoji: currentEmotion.emoji,
      currentLabel: currentEmotion.label,
      desiredEmoji: desiredEmotion.emoji,
      desiredLabel: desiredEmotion.label,
      note: journal.value.trim(),
      timestamp: new Date().toISOString(),
    };

    // Optimistic local save
    try {
      const key = "hi.lastShare";
      const list = JSON.parse(localStorage.getItem(key) || "[]");
      list.unshift(payload);
      localStorage.setItem(key, JSON.stringify(list.slice(0, 50)));
    } catch {}

    // Fire-and-forget API calls (optional; will fail on file:// which is OK)
    async function post(url, body) {
      try {
        const r = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        return r.ok;
      } catch { return false; }
    }

    const okArchive = await post("/api/my-archive", { action: "add", ...payload });
    const okShare   = await post("/api/shares",     { action: "create", ...payload });

    if (okShare || okArchive) {
      toast("Hi dropped! ✨");
    } else {
      toast("Saved locally (offline preview) ✅");
    }

    // reset
    journal.value = "";
    jc.textContent = "0";
    currentEmotion = null;
    desiredEmotion = null;
    currentGrid.querySelectorAll(".chip[aria-pressed]").forEach((n) => n.setAttribute("aria-pressed", "false"));
    desiredGrid.querySelectorAll(".chip[aria-pressed]").forEach((n) => n.setAttribute("aria-pressed", "false"));
    validate();
  });
})();
