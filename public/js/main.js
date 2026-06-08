// ===== CONFIG =====
// Render deploy URL - replace with your actual Render URL after deploy
const API_BASE = window.location.hostname === "localhost"
  ? "http://localhost:3000"
  : "https://prompt-vault-xxxx.onrender.com";; // ← CHANGE THIS after Render deploy

// ===== STATE =====
let allPrompts = [];
let activeCategory = "all";
let searchQuery = "";

// ===== INIT =====
document.addEventListener("DOMContentLoaded", () => {
  loadPrompts();
  document.getElementById("searchInput").addEventListener("input", e => {
    searchQuery = e.target.value.toLowerCase();
    renderPrompts();
  });
});

// ===== FETCH PROMPTS =====
async function loadPrompts() {
  try {
    const res = await fetch(`${API_BASE}/api/prompts`);
    allPrompts = await res.json();
    buildCategories();
    renderPrompts();
    animateCount(allPrompts.length);
  } catch (err) {
    document.getElementById("promptsGrid").innerHTML = `
      <div class="empty-state">
        <h3>⚡ Server Starting</h3>
        <p>Please refresh in a moment. Render server may be waking up.</p>
      </div>
    `;
  }
}

// ===== BUILD CATEGORY FILTERS =====
function buildCategories() {
  const cats = ["all", ...new Set(allPrompts.map(p => p.category).filter(Boolean))];
  const container = document.getElementById("catFilter");
  container.innerHTML = cats.map(cat => `
    <button class="cat-btn ${cat === "all" ? "active" : ""}"
      data-cat="${cat}"
      onclick="setCategory('${cat}')">
      ${cat === "all" ? "✨ All" : cat}
    </button>
  `).join("");
}

// ===== CATEGORY FILTER =====
function setCategory(cat) {
  activeCategory = cat;
  document.querySelectorAll(".cat-btn").forEach(b => {
    b.classList.toggle("active", b.dataset.cat === cat);
  });
  renderPrompts();
}

// ===== RENDER PROMPTS =====
function renderPrompts() {
  const grid = document.getElementById("promptsGrid");
  const countEl = document.getElementById("resultsCount");

  let filtered = allPrompts;

  if (activeCategory !== "all") {
    filtered = filtered.filter(p => p.category === activeCategory);
  }

  if (searchQuery) {
    filtered = filtered.filter(p =>
      p.title?.toLowerCase().includes(searchQuery) ||
      p.prompt?.toLowerCase().includes(searchQuery) ||
      p.category?.toLowerCase().includes(searchQuery) ||
      p.label?.toLowerCase().includes(searchQuery)
    );
  }

  countEl.textContent = `${filtered.length} prompt${filtered.length !== 1 ? "s" : ""}`;

  if (filtered.length === 0) {
    grid.innerHTML = `
      <div class="empty-state">
        <h3>No prompts found</h3>
        <p>Try a different search or category.</p>
      </div>
    `;
    return;
  }

  // Reverse so newest appears first
  grid.innerHTML = [...filtered].reverse().map((p, i) => `
    <div class="prompt-card" style="animation-delay:${i * 0.04}s">
      <div class="card-top">
        <div class="card-title">${escHtml(p.title)}</div>
        <span class="card-label ${getLabelClass(p.label)}">${escHtml(p.label || "Prompt")}</span>
      </div>
      <div class="card-category">📁 ${escHtml(p.category || "General")}</div>
      <div class="card-prompt">${escHtml(p.prompt)}</div>
      <div class="card-actions">
        <button class="copy-btn" onclick="copyPrompt(this, \`${escAttr(p.prompt)}\`)">
          📋 Copy Prompt
        </button>
      </div>
    </div>
  `).join("");
}

// ===== COPY =====
function copyPrompt(btn, text) {
  navigator.clipboard.writeText(text).then(() => {
    btn.textContent = "✅ Copied!";
    setTimeout(() => btn.textContent = "📋 Copy Prompt", 2000);
    showToast();
  });
}

function showToast() {
  const t = document.getElementById("toast");
  t.classList.add("show");
  setTimeout(() => t.classList.remove("show"), 2500);
}

// ===== ANIMATE COUNT =====
function animateCount(target) {
  const el = document.getElementById("totalCount");
  let current = 0;
  const step = Math.max(1, Math.floor(target / 40));
  const timer = setInterval(() => {
    current = Math.min(current + step, target);
    el.textContent = current;
    if (current >= target) clearInterval(timer);
  }, 30);
}

// ===== HELPERS =====
function getLabelClass(label) {
  if (!label) return "label-default";
  const l = label.toLowerCase();
  if (l.includes("trend")) return "label-trending";
  if (l.includes("new"))   return "label-new";
  if (l.includes("free"))  return "label-free";
  return "label-default";
}

function escHtml(str = "") {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function escAttr(str = "") {
  return String(str).replace(/`/g, "\\`").replace(/\$/g, "\\$");
}
