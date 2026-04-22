# StyleSnap

StyleSnap is a lightweight wardrobe assistant that helps you catalog your clothing and generate outfit recommendations.

## What it does

- Add clothing items with photo, category, color, season, style, and preferred occasions.
- Store your closet locally in the browser (no backend required).
- Display a homepage style lookbook with fashion model photography.
- Generate outfit suggestions based on:
  - occasion
  - season
  - style preference
  - color coordination

## Easiest way for non-coders

You **do not** need a full web builder for this app.

Because StyleSnap is a static site (`index.html`, `styles.css`, `app.js`), the simplest approach is to upload these files to a static hosting service:

### Option A (easiest): Netlify Drop

1. Zip the project folder.
2. Go to <https://app.netlify.com/drop>.
3. Drag and drop the zip file.
4. Netlify gives you a public link instantly.

### Option B: GitHub Pages

1. Create a GitHub repository and upload all files.
2. In **Settings → Pages**, set source to `main` branch root.
3. Save and wait a minute or two.
4. Visit the generated `https://<username>.github.io/<repo>` URL.

### Option C: Vercel

1. Create a free account at <https://vercel.com/>.
2. Import your GitHub repo.
3. Keep default settings (no build command needed).
4. Click Deploy.

## Local quick start

If you want to run it on your own computer first:

### Option 1: Python

```bash
python3 -m http.server 8080
```

Then open <http://localhost:8080>.

### Option 2: VS Code Live Server

Open the folder and run **"Open with Live Server"** on `index.html`.

## Current scope

This is an MVP implementation focused on core closet tracking + recommendation flow.
