# Kouga Fire Report (PWA)

## GitHub Pages setup
1. Push the repo to GitHub.
2. Go to **Settings → Pages**.
3. Under **Build and deployment**, select **Deploy from a branch**.
4. Choose **Branch: main** and **Folder: /** (root), then **Save**.
5. Wait for Pages to publish, then open: `https://<user>.github.io/<repo>/`.

## Troubleshooting
- If the app looks stale, do a hard refresh (Ctrl/Cmd+Shift+R).
- Clear site data if the service worker or cache feels stuck (DevTools → Application → Clear storage).
- After updates, unregister the old service worker or wait for it to refresh on the next load.

## iOS install instructions
1. Open the site in Safari.
2. Tap **Share**.
3. Tap **Add to Home Screen**.
