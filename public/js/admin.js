// ===== CONFIG =====
const API_BASE = ""; // Same origin — server serves admin.html too
const ADMIN_PASSWORD = "admin123"; // CHANGE THIS to your password!

// ===== SERVER STATUS (small sidebar widget) =====
let serverReady = false;
let cdInterval = null;
let cdSeconds = 30;

function startServerStatus() {
  updateStatus("pinging", "Connecting...", cdSeconds);

  // Try immediately
  pingServer();

  cdInterval = setInterval(() => {
    if (serverReady) return;
    cdSeconds = Math.max(0, cdSeconds - 1);
    pingServer();
    updateStatus("pinging", "Server waking up...", cdSeconds);
    if (cdSeconds <= 0) clearInterval(cdInterval);
  }, 1000);
}

async function pingServer() {
  if (serverReady) return;
  try {
    const res = await fetch("/api/prompts");
    if (res.ok) {
      serverReady = true;
      clearInterval(cdInterval);
      updateStatus("ready", "Server ready ✓", 0);
      // Hide status after 4 seconds once ready
      setTimeout(() => {
        const el = document.getElementById("serverStatus");
        if (el) el.style.opacity = "0";
      }, 4000);
    }
  } catch (e) { /* still waking */ }
}

function updateStatus(state, label, secs) {
  const dot   = document.getElementById("ssDot");
  const lbl   = document.getElementById("ssLabel");
  const bar   = document.getElementById("ssBar");
  const timer = document.getElementById("ssTimer");
  if (!dot) return;

  lbl.textContent = label;

  if (state === "ready") {
    dot.className = "ss-dot ready";
    bar.style.width = "100%";
    bar.style.background = "var(--success)";
    timer.textContent = "";
  } else {
    dot.className = "ss-dot pinging";
    bar.style.width = `${((30 - secs) / 30) * 100}%`;
    timer.textContent = secs > 0 ? `~${secs}s` : "";
  }
}

// ===== LOGIN =====
function doLogin() {
  const pass = document.getElementById("loginPass").value;
  if (pass === ADMIN_PASSWORD) {
    document.getElementById("loginScreen").style.display = "none";
    const panel = document.getElementById("adminPanel");
    panel.style.display = "flex";
    startServerStatus(); // Start status check after login
    loadManage();
    loadStats();
  } else {
    document.getElementById("loginError").textContent = "❌ Wrong password. Try again.";
  }
}

document.addEventListener("DOMContentLoaded", () => {
  document.getElementById("loginPass")?.addEventListener("keydown", e => {
    if (e.key === "Enter") doLogin();
  });
});

function doLogout() {
  serverReady = false;
  cdSeconds = 30;
  clearInterval(cdInterval);
  const statusEl = document.getElementById("serverStatus");
  if (statusEl) statusEl.style.opacity = "1";
  document.getElementById("adminPanel").style.display = "none";
  document.getElementById("loginScreen").style.display = "flex";
  document.getElementById("loginPass").value = "";
}

// ===== TABS =====
function showTab(name, el, isMobile) {
  // Tab content switch
  document.querySelectorAll(".tab-content").forEach(t => t.classList.remove("active"));
  document.getElementById(`tab-${name}`).classList.add("active");

  // Desktop sidebar active
  document.querySelectorAll(".side-link").forEach(l => l.classList.remove("active"));
  // Mobile bottom nav active
  document.querySelectorAll(".mobile-nav-btn").forEach(l => l.classList.remove("active"));

  if (el) el.classList.add("active");

  // Sync both navs
  const mnavEl = document.getElementById(`mnav-${name}`);
  if (mnavEl) mnavEl.classList.add("active");

  if (name === "manage") loadManage();
  if (name === "stats")  loadStats();
}

// ===== SAVE PROMPT =====
async function savePrompt() {
  const title    = document.getElementById("promptTitle").value.trim();
  const category = document.getElementById("promptCategory").value.trim();
  const label    = document.getElementById("promptLabel").value.trim();
  const prompt   = document.getElementById("promptText").value.trim();
  const msgEl    = document.getElementById("saveMsg");

  if (!title || !prompt) {
    msgEl.style.color = "#ff6b6b";
    msgEl.textContent = "⚠️ Title and Prompt are required.";
    return;
  }

  try {
    const res = await fetch("/api/prompts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title, category, label, prompt })
    });
    const data = await res.json();

    if (data.success) {
      msgEl.style.color = "#32d74b";
      msgEl.textContent = "✅ Prompt saved successfully!";
      clearForm();
      loadStats();
      setTimeout(() => msgEl.textContent = "", 3000);
    }
  } catch (e) {
    msgEl.style.color = "#ff6b6b";
    msgEl.textContent = "❌ Error saving. Is server running?";
  }
}

function clearForm() {
  ["promptTitle", "promptCategory", "promptLabel", "promptText"].forEach(id => {
    document.getElementById(id).value = "";
  });
}

// ===== LOAD MANAGE LIST =====
let allPromptsAdmin = [];

async function loadManage() {
  const res = await fetch("/api/prompts");
  allPromptsAdmin = await res.json();
  renderManage(allPromptsAdmin);
}

function filterManage() {
  const q = document.getElementById("manageSearch").value.toLowerCase();
  const filtered = allPromptsAdmin.filter(p =>
    p.title?.toLowerCase().includes(q) ||
    p.category?.toLowerCase().includes(q)
  );
  renderManage(filtered);
}

function renderManage(prompts) {
  const list = document.getElementById("manageList");
  if (prompts.length === 0) {
    list.innerHTML = `<p style="color:var(--text2);text-align:center;padding:40px">No prompts found.</p>`;
    return;
  }

  list.innerHTML = [...prompts].reverse().map(p => `
    <div class="manage-item">
      <div class="manage-info">
        <div class="manage-title">${escHtml(p.title)}</div>
        <div class="manage-meta">
          <span class="manage-cat">📁 ${escHtml(p.category || "General")}</span>
          <span class="manage-label-badge">${escHtml(p.label || "—")}</span>
        </div>
      </div>
      <div class="manage-actions">
        <button class="btn-edit" onclick="openEdit(${p.id})">✏️ Edit</button>
        <button class="btn-danger" onclick="deletePrompt(${p.id})">🗑 Delete</button>
      </div>
    </div>
  `).join("");
}

// ===== DELETE =====
async function deletePrompt(id) {
  if (!confirm("Delete this prompt?")) return;
  await fetch(`/api/prompts/${id}`, { method: "DELETE" });
  loadManage();
  loadStats();
}

// ===== EDIT =====
function openEdit(id) {
  const p = allPromptsAdmin.find(x => x.id === id);
  if (!p) return;
  document.getElementById("editId").value = p.id;
  document.getElementById("editTitle").value = p.title || "";
  document.getElementById("editCategory").value = p.category || "";
  document.getElementById("editLabel").value = p.label || "";
  document.getElementById("editText").value = p.prompt || "";
  document.getElementById("editModal").style.display = "flex";
}

function closeModal() {
  document.getElementById("editModal").style.display = "none";
}

async function updatePrompt() {
  const id       = parseInt(document.getElementById("editId").value);
  const title    = document.getElementById("editTitle").value.trim();
  const category = document.getElementById("editCategory").value.trim();
  const label    = document.getElementById("editLabel").value.trim();
  const prompt   = document.getElementById("editText").value.trim();

  await fetch(`/api/prompts/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ title, category, label, prompt })
  });

  closeModal();
  loadManage();
  loadStats();
}

// ===== STATS =====
async function loadStats() {
  const res = await fetch("/api/prompts");
  const prompts = await res.json();

  const cats = {};
  prompts.forEach(p => {
    const c = p.category || "General";
    cats[c] = (cats[c] || 0) + 1;
  });

  const grid = document.getElementById("statsGrid");
  const catCards = Object.entries(cats)
    .sort((a, b) => b[1] - a[1])
    .map(([cat, count]) => `
      <div class="stat-card">
        <div class="stat-num">${count}</div>
        <div class="stat-label">${escHtml(cat)}</div>
      </div>
    `).join("");

  grid.innerHTML = `
    <div class="stat-card">
      <div class="stat-num">${prompts.length}</div>
      <div class="stat-label">Total Prompts</div>
    </div>
    <div class="stat-card">
      <div class="stat-num">${Object.keys(cats).length}</div>
      <div class="stat-label">Categories</div>
    </div>
    ${catCards}
  `;
}

// ===== HELPERS =====
function escHtml(str = "") {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}
