# Caravan

Real people. Real help. From anywhere.

Caravan is a two-sided marketplace that connects busy people and small businesses with remote human assistants ("agents"). Clients post tasks, see ranked matches and fund escrow. Agents apply, log hours and get paid when the client approves them.

## Run it locally

```sh
npm install
npm run dev
```

With no Firebase settings the site runs in **demo mode**: everything is saved in your browser and eight sample agents are preloaded, so you can try the whole flow alone.

## Connect Firebase (shared accounts and data)

1. Create a project at [console.firebase.google.com](https://console.firebase.google.com).
2. **Build > Authentication > Sign-in method:** turn on **Google** and **Email link (passwordless sign-in)**. Under **Settings > Authorized domains**, add your custom domain once you have one.
3. **Build > Firestore Database:** create a database in production mode.
4. **Project settings > Your apps:** add a web app, then copy its config into `.env.production` (or `.env.local` for a different project; see `.env.example`).
5. Install the CLI and deploy the security rules, indexes and site:

   ```sh
   npm install -g firebase-tools
   firebase login
   firebase use --add          # pick your project
   npm run build
   firebase deploy
   ```

## Deploy from GitHub

`.github/workflows/deploy.yml` builds every push and pull request. It also deploys once the secret below is set in the repository settings:

- The Firebase web config lives in `.env.production` and the project id in `.firebaserc`. These are public by design.
- **Secret:** `FIREBASE_SERVICE_ACCOUNT` holds the JSON key of a service account with the *Firebase Admin* role (Google Cloud console > IAM & Admin > Service accounts).

Merges to `main` deploy the live site and the Firestore rules. Pull requests get a 7-day preview link.

## How it's built

- `index.html`: page markup.
- `src/styles.css`: all styles, with dark and light themes.
- `src/app.js`: views, matching, escrow and messaging logic, and the animated globe.
- `src/firebase.js`: sign-in and a small Firestore adapter behind the app's `Store`.
- `firestore.rules`: who can read and write what. Messages, applications, hours and payment history are only visible to the client and agent involved, and emails are kept out of public profiles.

## Before taking real money

Payments are in **test mode**: the escrow screens calculate fees, but no money moves, and escrow amounts are written by the browser. Before going live with payments:

- Move funding, releases and refunds to Cloud Functions (for example with Stripe Connect for agent payouts), and make the money fields read-only for clients in `firestore.rules`.
- Add terms of service, a privacy policy and identity verification for agents.
