// const express = require("express");
// const fs      = require("fs");
// const path    = require("path");

// const app  = express();
// const PORT = process.env.PORT || 3000;
// const DB   = path.join(__dirname, "data", "prompts.json");

// // ===== MIDDLEWARE =====
// app.use(express.json());
// app.use(express.static(path.join(__dirname, "public")));

// // ===== HELPERS =====
// function readDB() {
//   if (!fs.existsSync(DB)) {
//     fs.mkdirSync(path.dirname(DB), { recursive: true });
//     fs.writeFileSync(DB, "[]");
//   }
//   return JSON.parse(fs.readFileSync(DB, "utf-8"));
// }

// function writeDB(data) {
//   fs.writeFileSync(DB, JSON.stringify(data, null, 2));
// }

// // ===== CORS (needed if GitHub Pages frontend calls Render backend) =====
// app.use((req, res, next) => {
//   res.setHeader("Access-Control-Allow-Origin", "*");
//   res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
//   res.setHeader("Access-Control-Allow-Headers", "Content-Type");
//   if (req.method === "OPTIONS") return res.sendStatus(200);
//   next();
// });

// // ===== ROUTES =====

// // GET all prompts
// app.get("/api/prompts", (req, res) => {
//   const data = readDB();
//   res.json(data);
// });

// // POST - add new prompt
// app.post("/api/prompts", (req, res) => {
//   const { title, category, label, prompt } = req.body;

//   if (!title || !prompt) {
//     return res.status(400).json({ success: false, error: "Title and prompt required" });
//   }

//   const data = readDB();
//   const item = {
//     id:       Date.now(),
//     title:    title.trim(),
//     category: (category || "General").trim(),
//     label:    (label || "").trim(),
//     prompt:   prompt.trim(),
//     date:     new Date().toISOString()
//   };

//   data.push(item);
//   writeDB(data);

//   console.log(`✅ New prompt added: "${item.title}"`);
//   res.json({ success: true, item });
// });

// // PUT - update existing prompt
// app.put("/api/prompts/:id", (req, res) => {
//   const id   = parseInt(req.params.id);
//   const data = readDB();
//   const idx  = data.findIndex(p => p.id === id);

//   if (idx === -1) return res.status(404).json({ success: false, error: "Not found" });

//   const { title, category, label, prompt } = req.body;
//   data[idx] = {
//     ...data[idx],
//     title:    (title    || data[idx].title).trim(),
//     category: (category || data[idx].category).trim(),
//     label:    (label    !== undefined ? label : data[idx].label).trim(),
//     prompt:   (prompt   || data[idx].prompt).trim(),
//     updatedAt: new Date().toISOString()
//   };

//   writeDB(data);
//   console.log(`✏️  Updated prompt: "${data[idx].title}"`);
//   res.json({ success: true, item: data[idx] });
// });

// // DELETE - remove prompt
// app.delete("/api/prompts/:id", (req, res) => {
//   const id   = parseInt(req.params.id);
//   let data   = readDB();
//   const prev = data.length;
//   data       = data.filter(p => p.id !== id);

//   if (data.length === prev) {
//     return res.status(404).json({ success: false, error: "Not found" });
//   }

//   writeDB(data);
//   console.log(`🗑  Deleted prompt ID: ${id}`);
//   res.json({ success: true });
// });

// // Fallback — serve index.html for any unknown route
// app.get("*", (req, res) => {
//   res.sendFile(path.join(__dirname, "public", "index.html"));
// });

// // ===== START =====
// app.listen(PORT, () => {
//   console.log(`⚡ PromptVault server running on http://localhost:${PORT}`);
//   console.log(`📋 User site: http://localhost:${PORT}`);
//   console.log(`🔐 Admin:     http://localhost:${PORT}/admin.html`);
// });









const express = require("express");
const path    = require("path");

const app  = express();
const PORT = process.env.PORT || 3000;

// GitHub config from environment variables
const GH_TOKEN = process.env.GITHUB_TOKEN;
const GH_OWNER = process.env.GITHUB_OWNER;
const GH_REPO  = process.env.GITHUB_REPO;
const GH_FILE  = process.env.GITHUB_FILE || "data/prompts.json";
const GH_API   = `https://api.github.com/repos/${GH_OWNER}/${GH_REPO}/contents/${GH_FILE}`;

// ===== MIDDLEWARE =====
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

// CORS
app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.sendStatus(200);
  next();
});

// ===== GITHUB HELPERS =====

// GitHub thi prompts.json read karo
async function readFromGitHub() {
  const res = await fetch(GH_API, {
    headers: {
      Authorization: `Bearer ${GH_TOKEN}`,
      Accept: "application/vnd.github+json"
    }
  });

  if (!res.ok) {
    if (res.status === 404) return { data: [], sha: null };
    throw new Error(`GitHub read failed: ${res.status}`);
  }

  const json = await res.json();
  const content = Buffer.from(json.content, "base64").toString("utf-8");
  return { data: JSON.parse(content), sha: json.sha };
}

// GitHub par prompts.json write karo
async function writeToGitHub(data, sha) {
  const content = Buffer.from(JSON.stringify(data, null, 2)).toString("base64");

  const body = {
    message: `Update prompts.json [${new Date().toISOString()}]`,
    content,
    ...(sha ? { sha } : {})
  };

  const res = await fetch(GH_API, {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${GH_TOKEN}`,
      Accept: "application/vnd.github+json",
      "Content-Type": "application/json"
    },
    body: JSON.stringify(body)
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`GitHub write failed: ${res.status} — ${err}`);
  }

  return await res.json();
}

// ===== ROUTES =====

// GET all prompts
app.get("/api/prompts", async (req, res) => {
  try {
    const { data } = await readFromGitHub();
    res.json(data);
  } catch (e) {
    console.error("GET error:", e.message);
    res.status(500).json({ error: e.message });
  }
});

// POST - add new prompt
app.post("/api/prompts", async (req, res) => {
  const { title, category, label, prompt } = req.body;

  if (!title || !prompt) {
    return res.status(400).json({ success: false, error: "Title and prompt required" });
  }

  try {
    const { data, sha } = await readFromGitHub();

    const item = {
      id:       Date.now(),
      title:    title.trim(),
      category: (category || "General").trim(),
      label:    (label || "").trim(),
      prompt:   prompt.trim(),
      date:     new Date().toISOString()
    };

    data.push(item);
    await writeToGitHub(data, sha);

    console.log(`✅ Added: "${item.title}"`);
    res.json({ success: true, item });
  } catch (e) {
    console.error("POST error:", e.message);
    res.status(500).json({ success: false, error: e.message });
  }
});

// PUT - update prompt
app.put("/api/prompts/:id", async (req, res) => {
  const id = parseInt(req.params.id);

  try {
    const { data, sha } = await readFromGitHub();
    const idx = data.findIndex(p => p.id === id);

    if (idx === -1) return res.status(404).json({ success: false, error: "Not found" });

    const { title, category, label, prompt } = req.body;
    data[idx] = {
      ...data[idx],
      title:     (title    || data[idx].title).trim(),
      category:  (category || data[idx].category).trim(),
      label:     (label    !== undefined ? label : data[idx].label).trim(),
      prompt:    (prompt   || data[idx].prompt).trim(),
      updatedAt: new Date().toISOString()
    };

    await writeToGitHub(data, sha);

    console.log(`✏️ Updated: "${data[idx].title}"`);
    res.json({ success: true, item: data[idx] });
  } catch (e) {
    console.error("PUT error:", e.message);
    res.status(500).json({ success: false, error: e.message });
  }
});

// DELETE - remove prompt
app.delete("/api/prompts/:id", async (req, res) => {
  const id = parseInt(req.params.id);

  try {
    let { data, sha } = await readFromGitHub();
    const prev = data.length;
    data = data.filter(p => p.id !== id);

    if (data.length === prev) {
      return res.status(404).json({ success: false, error: "Not found" });
    }

    await writeToGitHub(data, sha);

    console.log(`🗑 Deleted ID: ${id}`);
    res.json({ success: true });
  } catch (e) {
    console.error("DELETE error:", e.message);
    res.status(500).json({ success: false, error: e.message });
  }
});

// Fallback
app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

// ===== START =====
app.listen(PORT, () => {
  console.log(`⚡ PromptVault running on port ${PORT}`);
  console.log(`📦 GitHub: ${GH_OWNER}/${GH_REPO}/${GH_FILE}`);
  if (!GH_TOKEN) console.warn("⚠️  GITHUB_TOKEN not set!");
});
