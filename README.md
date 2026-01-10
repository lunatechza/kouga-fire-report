# Kouga Fire Report (PWA)

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

Admin/ops reads can use the Firebase Console or a later authenticated admin tool.

## GitHub Pages setup
1. Push the repo to GitHub.
2. Go to **Settings → Pages**.
3. Under **Build and deployment**, select **Deploy from a branch**.
4. Choose **Branch: main** and **Folder: /** (root), then **Save**.
5. Wait for Pages to publish, then open: `https://<user>.github.io/<repo>/`.

> GitHub Pages serves over HTTPS, which is required for geolocation and Firebase.

## Troubleshooting
- If the app looks stale, do a hard refresh (Ctrl/Cmd+Shift+R).
- Clear site data if the service worker or cache feels stuck (DevTools → Application → Clear storage).
- After updates, unregister the old service worker or wait for it to refresh on the next load.

## iOS install instructions
1. Open the site in Safari.
2. Tap **Share**.
3. Tap **Add to Home Screen**.
