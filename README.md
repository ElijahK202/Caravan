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
- **Secret:** `FIREBASE_SERVICE_ACCOUNT` holds the JSON key of a service account with the *Firebase Hosting Admin* and *Firebase Rules Admin* roles (Google Cloud console > IAM & Admin > Service accounts).

Merges to `main` deploy the live site and the Firestore rules. Pull requests get a 7-day preview link.

## How it's built

- `index.html`: page markup.
- `src/styles.css`: all styles, with dark and light themes.
- `src/app.js`: views, matching, escrow and messaging logic, and the animated globe.
- `src/firebase.js`: sign-in and a small Firestore adapter behind the app's `Store`.
- `firestore.rules`: who can read and write what. Messages, applications, hours and payment history are only visible to the client and agent involved, and emails are kept out of public profiles.

## Payments

Tasks with real agents are paid through Stripe. Tasks with the sample agents stay in test mode, and no money moves for them.

- **Funding escrow:** the client pays on Stripe Checkout (card, Apple Pay or Google Pay). The money is held in Caravan's Stripe balance.
- **Approving hours:** the agent's share is transferred to their Stripe Express account, which agents set up from their Earnings page. If an agent hasn't set one up, or Stripe can't pay out to their country, the pay is marked as owed. It's sent automatically once they connect, or you can pay it by hand.
- **Completing or ending a task:** unused escrow is refunded to the client's card. The service and processing fees aren't refunded.

All of this runs in `functions/index.js` (Cloud Functions). `firestore.rules` stops browsers from changing escrow amounts, approving hours or writing payment history for real agents.

To switch it on:

1. Upgrade the Firebase project to the **Blaze** plan. Cloud Functions need it.
2. Add the Stripe secret key (`sk_test_…` while testing, `sk_live_…` for real money) as the GitHub secret `STRIPE_SECRET_KEY`. The next deploy publishes the functions and turns on Stripe checkout on the site.
3. In Stripe, turn on **Connect** (Express accounts) so agents can receive payouts.
4. Optional: add a webhook for `checkout.session.completed` pointing at the `stripeWebhook` function URL, and save its signing secret as `STRIPE_WEBHOOK_SECRET`. This records payments even when a client closes the tab before returning from Stripe.

The deploy service account needs the *Cloud Functions Admin* and *Service Account User* roles, on top of the Hosting and Rules roles.

Before taking live money, add terms of service, a privacy policy and identity verification for agents.
