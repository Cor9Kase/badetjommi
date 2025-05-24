# Firebase Studio

This project uses Firebase for database services but is deployed through [Vercel](https://vercel.com/).

## Getting Started

1. Install dependencies

   ```bash
   npm install
   ```

2. Copy `env.local` to `.env.local` and fill in your Firebase credentials.

3. Run the development server

   ```bash
   npm run dev
   ```

## Notes

Only `firestore.rules` is used for security rules. The file `firebase.rules` is kept for reference and is not deployed.

## Deploying Firestore Rules and Indexes

Use the Firebase CLI to push security rules and indexes to your project.

Deploy both rules and indexes:

```bash
firebase deploy --only firestore
```

To deploy just the indexes:

```bash
firebase deploy --only firestore:indexes
```

After deployment, new indexes can take a while to build before related queries start working.

## Leaderboard Caching

The leaderboard data is fetched in real time from Firestore. To provide a quick
fallback when the network is slow, the last fetched leaderboard is now stored in
`localStorage`. If available, this cached data is displayed immediately while
new data is being loaded.
