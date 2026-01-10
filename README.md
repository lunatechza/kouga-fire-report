# Kouga Fire Report (PWA)

A fully static, GitHub Pages–compatible wildfire reporting web app for Kouga Municipality. It lets residents send reports via WhatsApp or email, and logs a best‑effort copy to Firebase Firestore for cross‑referencing.

## How it works
- Users fill in visible signs, severity, size, spread, and optional notes.
- GPS is optional; if unavailable, the nearest town/area is required.
- Reports can be sent via WhatsApp or email, or copied to the clipboard.
- A best‑effort Firestore log is created on WhatsApp/Email clicks.

## Repository status (current)
- **Active static PWA**: everything is served from the repo root (no build step).
- **Entry points**: `index.html` (main UI), `privacy.html`, `terms.html`, `disclaimer.html`.
- **Runtime behavior**: best‑effort logging to Firestore, optional geolocation, and offline caching via `service-worker.js`.
- **Dependencies**: browser APIs + Firebase web SDK (loaded at runtime), with all config captured in `app.js`.

## GitHub Pages setup
1. Push the repo to GitHub.
2. Go to **Settings → Pages**.
3. Under **Build and deployment**, select **Deploy from a branch**.
4. Choose **Branch: main** and **Folder: /** (root), then **Save**.
5. Wait for Pages to publish, then open: `https://lunatechza.github.io/kouga-fire-report/`.

> GitHub Pages serves over HTTPS, which is required for geolocation and Firebase.

## Firebase + Firestore setup (logging)
1. Create a Firebase project in the Firebase Console.
2. Create a Firestore database (start in production or test mode as needed).
3. Add a **Web app** in Firebase and copy the config values.
4. Paste the config into `app.js`:
   ```js
   const firebaseConfig = {
     apiKey: "...",
     authDomain: "...",
     projectId: "...",
     appId: "..."
   };
   ```
5. Publish Firestore rules (see snippet below).

> Anonymous Auth is **not required** right now. Enable it later only if you want authenticated reads from the app.

### Firestore security rules (snippet)
```txt
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /fire_reports/{docId} {
      allow create: if true;
      allow read: if request.auth != null;
    }
  }
}
```

## Legal pages
The app includes static pages at:
- `privacy.html`
- `terms.html`
- `disclaimer.html`

Link to these from the main footer and header. Keep them in the repo root for GitHub Pages subpath compatibility.

## Operational notes
- All links are relative (e.g. `./privacy.html`) so the app works under `/<repo>/`.
- Replace the “Hosted at” placeholder in the footer once hosting is confirmed.
- If you need to contact Lunatech about this app, open a GitHub issue at `https://github.com/lunatechza/kouga-fire-report/issues`.
- Keep static assets in the repo root to preserve GitHub Pages compatibility.

## Troubleshooting
- If the app looks stale, do a hard refresh (Ctrl/Cmd+Shift+R).
- Clear site data if the service worker or cache feels stuck (DevTools → Application → Clear storage).
- After updates, unregister the old service worker or wait for it to refresh on the next load.

## iOS install instructions
1. Open the site in Safari.
2. Tap **Share**.
3. Tap **Add to Home Screen**.
