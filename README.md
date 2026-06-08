# ⚡ PromptVault

AI Prompt Library Website with Admin Panel.

## Project Structure

```
prompt-library/
├── server.js           ← Node.js backend (Express)
├── package.json
├── data/
│   └── prompts.json    ← Database (auto-created)
└── public/
    ├── index.html      ← User-facing website
    ├── admin.html      ← Admin panel
    ├── css/
    │   ├── style.css
    │   └── admin.css
    └── js/
        ├── main.js
        └── admin.js
```

## Local Setup

```bash
npm install
node server.js
```

Then open:
- User Site: http://localhost:3000
- Admin: http://localhost:3000/admin.html

## Admin Password

Default: `admin123`

To change it, open `public/js/admin.js` and edit line 3:
```js
const ADMIN_PASSWORD = "your-new-password";
```

## Deploy to Render

1. Push this project to GitHub
2. Go to https://render.com → New Web Service
3. Connect your GitHub repo
4. Settings:
   - Build Command: `npm install`
   - Start Command: `node server.js`
   - Environment: Node
5. After deploy, copy your Render URL

## Connect Frontend to Render Backend

After deploying to Render, open `public/js/main.js` and update line 3:
```js
const API_BASE = "https://YOUR-APP-NAME.onrender.com";
```

## Features

### User Side
- View all prompts
- Search prompts
- Filter by category
- Copy prompt to clipboard
- Animated prompt counter
- Responsive design

### Admin Side
- 30-second server countdown (Render free tier)
- Password login
- Add prompts (Title + Category + Label + Prompt text)
- Edit prompts
- Delete prompts
- Stats dashboard
- Search/filter in manage view
