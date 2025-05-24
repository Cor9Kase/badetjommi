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
