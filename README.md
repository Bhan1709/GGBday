# 💖 Romantic Birthday Website for Your Fiancée

A beautiful, responsive, and animated birthday website featuring interactive birthday cake candle blowout, 3D wax-sealed love letter, a random 3D photo collage, background music player, and a **12-Claim Birthday Gift Card Transfer System** (valid until August 13th, 2027) with email notification integration.

---

## 🚀 Features

- **Hero & Particles Canvas**: Floating glowing hearts, star dust sparkles, and celebration confetti explosion cannons.
- **Interactive Birthday Cake 🎂**: 3D candles with flickering flames that can be blown out (clicked), triggering smoke animations, confetti, and wish box reveal.
- **3D Wax-Sealed Love Letter ✉️**: Interactive wax seal envelope that unfolds into a parchment paper love letter with smooth typewriter text animation.
- **Random 3D Photo Collage 📸**: A Three.js scatter of polaroid-style photos — hover to lift a picture, click to bring it front-and-center, or hit Shuffle to re-scatter them.
- **12 Birthday Gift Card Transfers 💳**:
  - Live 12/12 claims counter.
  - Interactive gift vouchers allowing her to request money transfers for anything she wants throughout the year (until August 13th, 2027).
  - Stores claim history in `localStorage`.
  - Dispatches transfer request email to your inbox automatically!
- **Floating Music Player 🎵**: Audio bar with disc rotation, equalizer audio waves, volume control, and royalty-free romantic synth melody + MP3 fallback.
- **100% GitHub Pages Hostable**: Built with standard Vite static HTML/CSS/JS (no server required).

---

## 🛠️ How to Customize

All personal settings are stored in `src/config.js`:

### 1. Change Names & Dates
Open [`src/config.js`](file:///C:/Users/bhans/.gemini/antigravity/scratch/birthday-website/src/config.js) and update:
- `fianceName`: Her name or nickname.
- `notificationEmail`: Your email address to receive transfer claim requests.
- `loveLetter`: Customize the paragraphs in the love letter.

### 2. Add Your Photos to the Collage
Drop your favorite pictures into `public/photos/` and list the filenames in `src/config.js`:
- Rename your images to `photo-1.jpg`, `photo-2.jpg`, ... (matching the `photos` array) — or edit the array to use your own names.
- Until a file exists, a pretty placeholder shows in its place automatically.

### 3. Change Background Song
Drop your favorite romantic track into `public/music.mp3`. The music player will automatically detect and play it!

---

## 🌐 How to Host on GitHub Pages (Free)

1. **Initialize Git & Push to GitHub**:
   ```bash
   git init
   git add .
   git commit -m "Initial commit for birthday website"
   git branch -M main
   git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO_NAME.git
   git push -u origin main
   ```

2. **Deploy to GitHub Pages**:
   - Go to your GitHub Repository -> **Settings** -> **Pages**.
   - Under **Source**, select `Deploy from a branch` or set up **GitHub Actions** (Vite static deployment).
   - Alternatively, install `gh-pages`:
     ```bash
     npm install -D gh-pages
     ```
     Add script to `package.json`: `"deploy": "gh-pages -d dist"`
     And run: `npm run build && npm run deploy`

3. **Share the Link!** 🎉
   Your website will be live at `https://YOUR_USERNAME.github.io/YOUR_REPO_NAME/`.

---

## 💻 Local Development

```bash
# Install dependencies
npm install

# Start local server
npm run dev

# Build production bundle
npm run build
```
