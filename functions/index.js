// Server side of Caravan's escrow. Everything that moves money runs here, so the
// browser can never mark escrow as funded, release pay or issue refunds itself.
//
// Flow: the client funds escrow through Stripe Checkout (money lands in Caravan's
// Stripe balance). Approving hours transfers the agent's share to their Stripe
// Express account; agents Stripe can't pay out to are recorded as owed and paid
// by hand. Closing a task refunds the unused escrow to the client's card.
import { initializeApp } from "firebase-admin/app";
import { getFirestore, FieldValue } from "firebase-admin/firestore";
import { onCall, onRequest, HttpsError } from "firebase-functions/v2/https";
import { setGlobalOptions } from "firebase-functions/v2";
import Stripe from "stripe";

initializeApp();
setGlobalOptions({ region: "us-central1", maxInstances: 10 });
const db = getFirestore();

const SERVICE_FEE = 0.10;              // charged to the client on top of agent pay
const CARD_PCT = 0.029, CARD_FIXED = 0.30; // shown to clients as the processing estimate
const ORIGINS = ["https://hirecaravan.org", "https://www.hirecaravan.org", "https://caravan-6717f.web.app", "https://caravan-6717f.firebaseapp.com", "http://localhost:5173", "http://localhost:4173", "http://localhost:4177"];

let stripeClient = null;
async function stripe() {
  if (stripeClient) return stripeClient;
  if (process.env.STRIPE_FAKE === "1") return (stripeClient = (await import("./stripe-fake.js")).default);
  if (!process.env.STRIPE_SECRET_KEY) throw new HttpsError("failed-precondition", "Payments aren't set up yet (missing Stripe key).");
  return (stripeClient = new Stripe(process.env.STRIPE_SECRET_KEY));
}

const r2 = n => Math.round((+n || 0) * 100) / 100;
const cents = n => Math.round(r2(n) * 100);
const now = () => new Date().toISOString();
const isSample = id => String(id || "").startsWith("sample-");
const short = n => { const p = String(n || "").trim().split(/\s+/); return p.length > 1 ? `${p[0]} ${p[p.length - 1][0]}.` : p[0] || ""; };
function quote(sub) {
  sub = r2(sub); const service = r2(sub * SERVICE_FEE); const proc = r2((sub + service) * CARD_PCT + CARD_FIXED);
  return { sub, service, proc, total: r2(sub + service + proc) };
}
function originOf(req) {
  const o = String(req.data?.origin || "");
  return ORIGINS.includes(o) ? o : ORIGINS[0];
}
function uidOf(req) {
  if (!req.auth?.uid) throw new HttpsError("unauthenticated", "Sign in first.");
  return req.auth.uid;
}
async function loadTask(taskId) {
  const s = await db.doc(`tasks/${String(taskId)}`).get();
  if (!s.exists) throw new HttpsError("not-found", "Task not found.");
  return { id: s.id, ...s.data() };
}
// Same arithmetic as taskMoney() in the browser, from the server's own records.
async function taskMoney(t) {
  const hs = (await db.collection("hours").where("taskId", "==", t.id).get()).docs.map(d => ({ id: d.id, ...d.data() }));
  const sum = st => r2(hs.filter(h => h.status === st).reduce((a, h) => a + (+h.amount || 0), 0));
  const approved = sum("approved"), pending = sum("pending");
  const balance = r2((+t.funded || 0) - approved - (+t.refunded || 0));
  return { approved, pending, balance, free: r2(balance - pending) };
}
async function ledger(entry) { await db.collection("ledger").add({ ...entry, at: now() }); }

/* ---------- escrow funding ---------- */

export const startCheckout = onCall(async req => {
  const uid = uidOf(req);
  const t = await loadTask(req.data?.taskId);
  const amount = r2(req.data?.amount);
  if (t.clientId !== uid) throw new HttpsError("permission-denied", "Only the client who posted this task can fund it.");
  if (isSample(t.agentId)) throw new HttpsError("failed-precondition", "Sample agents use test mode.");
  if (!["awaiting_funding", "active"].includes(t.status)) throw new HttpsError("failed-precondition", "This task isn't ready to fund.");
  if (!(amount >= 1 && amount <= 20000)) throw new HttpsError("invalid-argument", "Enter an amount between $1 and $20,000.");
  const q = quote(amount), origin = originOf(req), st = await stripe();
  const line = (name, v) => ({ quantity: 1, price_data: { currency: "usd", unit_amount: cents(v), product_data: { name } } });
  const session = await st.checkout.sessions.create({
    mode: "payment",
    line_items: [line(`Escrow for “${String(t.title).slice(0, 80)}” (${short(t.agentName)})`, q.sub), line("Caravan service fee (10%)", q.service), line("Payment processing", q.proc)],
    payment_intent_data: { transfer_group: t.id, metadata: { taskId: t.id } },
    metadata: { taskId: t.id, clientId: uid, agentId: t.agentId, amount: String(q.sub) },
    success_url: `${origin}/task/${encodeURIComponent(t.id)}?checkout={CHECKOUT_SESSION_ID}`,
    cancel_url: `${origin}/task/${encodeURIComponent(t.id)}`,
  });
  await db.doc(`payments/${session.id}`).set({ taskId: t.id, clientId: uid, agentId: t.agentId, amount: q.sub, service: q.service, proc: q.proc, total: q.total, used: 0, status: "open", createdAt: now() });
  return { url: session.url };
});

// Records a paid Checkout session exactly once (called from the return page and the webhook).
async function applyPaid(sessionId) {
  const st = await stripe();
  const s = await st.checkout.sessions.retrieve(sessionId, { expand: ["payment_intent"] });
  if (s.payment_status !== "paid") return { paid: false };
  const pi = s.payment_intent, chargeId = typeof pi === "object" ? pi.latest_charge : null;
  const payRef = db.doc(`payments/${sessionId}`);
  const applied = await db.runTransaction(async tx => {
    const p = await tx.get(payRef);
    if (!p.exists || p.data().status === "paid") return false;
    const d = p.data(), tRef = db.doc(`tasks/${d.taskId}`), t = (await tx.get(tRef)).data();
    tx.update(payRef, { status: "paid", paidAt: now(), chargeId: typeof chargeId === "string" ? chargeId : chargeId?.id || null, paymentIntent: typeof pi === "object" ? pi.id : pi });
    tx.update(tRef, { funded: r2((+t.funded || 0) + d.amount), payMethod: "card", fundedAt: now(), ...(t.status === "awaiting_funding" ? { status: "active" } : {}) });
    tx.create(db.collection("ledger").doc(), { type: "fund", taskId: d.taskId, taskTitle: t.title, clientId: d.clientId, agentId: d.agentId, amount: d.amount, fees: r2(d.service + d.proc), total: d.total, method: "card", stripe: true, at: now() });
    return true;
  });
  return { paid: true, applied, taskId: s.metadata?.taskId };
}

export const confirmCheckout = onCall(async req => {
  const uid = uidOf(req), id = String(req.data?.sessionId || "");
  const p = await db.doc(`payments/${id}`).get();
  if (!p.exists || p.data().clientId !== uid) throw new HttpsError("not-found", "Payment not found.");
  return applyPaid(id);
});

// Optional backup for clients who close the tab before returning from Stripe.
// Point a Stripe webhook (checkout.session.completed) here and set STRIPE_WEBHOOK_SECRET.
export const stripeWebhook = onRequest(async (req, res) => {
  if (!process.env.STRIPE_WEBHOOK_SECRET) { res.status(501).send("Webhook not configured"); return; }
  let ev;
  try { ev = (await stripe()).webhooks.constructEvent(req.rawBody, req.get("stripe-signature"), process.env.STRIPE_WEBHOOK_SECRET); }
  catch (e) { res.status(400).send("Bad signature"); return; }
  if (ev.type === "checkout.session.completed") await applyPaid(ev.data.object.id);
  res.json({ received: true });
});

/* ---------- moving escrowed money: transfers to agents, refunds to clients ---------- */

// Reserves `amount` against the task's paid charges and calls fn(chargeId, part) for each slice.
// A slice whose Stripe call fails is released again, and the shortfall is returned.
async function spend(taskId, amount, fn) {
  let rem = cents(amount);
  const pays = (await db.collection("payments").where("taskId", "==", taskId).get()).docs
    .filter(d => d.data().status === "paid" && d.data().chargeId).sort((a, b) => String(a.data().paidAt).localeCompare(String(b.data().paidAt)));
  for (const p of pays) {
    if (rem <= 0) break;
    const part = await db.runTransaction(async tx => {
      const d = (await tx.get(p.ref)).data(), avail = cents(d.amount) - cents(d.used);
      const take = Math.min(avail, rem); if (take > 0) tx.update(p.ref, { used: r2((cents(d.used) + take) / 100) });
      return take;
    });
    if (part <= 0) continue;
    try { await fn(p.data().chargeId, part, p.id); rem -= part; }
    catch (e) { console.error("stripe", e?.message); await p.ref.update({ used: FieldValue.increment(-part / 100) }); }
  }
  return r2(rem / 100);
}

async function payoutAccount(agentId) {
  const s = await db.doc(`payouts/${agentId}`).get();
  return s.exists && s.data().payoutsEnabled ? s.data().accountId : null;
}

// Sends an approved hours entry to the agent, or leaves it marked as owed.
async function payHours(h) {
  const acct = await payoutAccount(h.agentId);
  const ref = db.doc(`hours/${h.id}`);
  if (!acct) { await ref.update({ payout: "owed" }); return "owed"; }
  const st = await stripe();
  const left = await spend(h.taskId, r2(h.amount - (+h.paidOut || 0)), (charge, part, payId) =>
    st.transfers.create({ amount: part, currency: "usd", destination: acct, source_transaction: charge, transfer_group: h.taskId, metadata: { hoursId: h.id } }, { idempotencyKey: `release-${h.id}-${payId}-${part}` })
      .then(() => ref.update({ paidOut: FieldValue.increment(part / 100) })));
  await ref.update({ payout: left > 0 ? "owed" : "paid" });
  return left > 0 ? "owed" : "paid";
}

async function refundTask(t, amount) {
  if (!(amount > 0)) return 0;
  const st = await stripe();
  const left = await spend(t.id, amount, (charge, part) => st.refunds.create({ charge, amount: part, metadata: { taskId: t.id } }));
  return r2(amount - left);
}

export const approveHours = onCall(async req => {
  const uid = uidOf(req), hid = String(req.data?.hoursId || "");
  const ref = db.doc(`hours/${hid}`);
  const hs = await ref.get();
  if (!hs.exists) throw new HttpsError("not-found", "Hours not found.");
  const h = { id: hid, ...hs.data() };
  if (h.clientId !== uid) throw new HttpsError("permission-denied", "Only the client can approve hours.");
  const t = await loadTask(h.taskId);
  const m = await taskMoney(t);
  if (h.status !== "pending") throw new HttpsError("failed-precondition", "These hours were already decided.");
  if (h.amount > m.balance + 0.001) throw new HttpsError("failed-precondition", "Not enough in escrow. Add funds first.");
  await db.runTransaction(async tx => {
    const cur = await tx.get(ref);
    if (cur.data().status !== "pending") throw new HttpsError("failed-precondition", "These hours were already decided.");
    tx.update(ref, { status: "approved", decidedAt: now(), payout: "processing" });
  });
  const payout = await payHours(h);
  await ledger({ type: "release", taskId: t.id, taskTitle: t.title, clientId: t.clientId, agentId: t.agentId, amount: h.amount, hours: h.hours, payout, stripe: true });
  return { payout };
});

export const rejectHours = onCall(async req => {
  const uid = uidOf(req), hid = String(req.data?.hoursId || "");
  const ref = db.doc(`hours/${hid}`);
  const hs = await ref.get();
  if (!hs.exists) throw new HttpsError("not-found", "Hours not found.");
  const h = hs.data();
  if (h.clientId !== uid) throw new HttpsError("permission-denied", "Only the client can reject hours.");
  if (h.status !== "pending") throw new HttpsError("failed-precondition", "These hours were already decided.");
  await ref.update({ status: "rejected", decidedAt: now() });
  const t = await loadTask(h.taskId);
  if (t.status !== "active") { // contract is closed: return the held amount
    const done = await refundTask(t, h.amount);
    await db.doc(`tasks/${t.id}`).update({ refunded: FieldValue.increment(done) });
    if (done > 0) await ledger({ type: "refund", taskId: t.id, taskTitle: t.title, clientId: t.clientId, agentId: t.agentId, amount: done, method: "card", stripe: true });
  }
  return { ok: true };
});

// kind: "complete" or "end". Refunds whatever escrow isn't needed for approved or pending hours.
export const closeTask = onCall(async req => {
  const uid = uidOf(req), kind = req.data?.kind;
  const t = await loadTask(req.data?.taskId);
  if (t.clientId !== uid) throw new HttpsError("permission-denied", "Only the client can close this task.");
  if (t.status !== "active") throw new HttpsError("failed-precondition", "This task isn't in progress.");
  if (!["complete", "end"].includes(kind)) throw new HttpsError("invalid-argument", "Unknown action.");
  const m = await taskMoney(t);
  if (kind === "complete" && m.pending > 0) throw new HttpsError("failed-precondition", "Approve or reject pending hours first.");
  const upd = kind === "complete" ? { status: "completed", completedAt: now() }
    : { status: "ended", endedAt: now(), endReason: String(req.data?.reason || "").slice(0, 200), endNote: String(req.data?.note || "").slice(0, 2000) };
  await db.doc(`tasks/${t.id}`).update(upd);
  const done = await refundTask(t, Math.max(0, m.free));
  if (done > 0) {
    await db.doc(`tasks/${t.id}`).update({ refunded: FieldValue.increment(done) });
    await ledger({ type: "refund", taskId: t.id, taskTitle: t.title, clientId: t.clientId, agentId: t.agentId, amount: done, method: "card", stripe: true });
  }
  return { refunded: done, shortfall: r2(Math.max(0, m.free) - done) };
});

/* ---------- agent payouts (Stripe Connect Express) ---------- */

const ISO = { "Argentina":"AR","Australia":"AU","Bangladesh":"BD","Bolivia":"BO","Brazil":"BR","Cambodia":"KH","Canada":"CA","Chile":"CL","China":"CN","Colombia":"CO","Costa Rica":"CR","Dominican Republic":"DO","Ecuador":"EC","Egypt":"EG","El Salvador":"SV","Ethiopia":"ET","France":"FR","Georgia":"GE","Germany":"DE","Ghana":"GH","Guatemala":"GT","Honduras":"HN","India":"IN","Indonesia":"ID","Ireland":"IE","Italy":"IT","Jamaica":"JM","Japan":"JP","Jordan":"JO","Kenya":"KE","Mexico":"MX","Morocco":"MA","Nepal":"NP","Netherlands":"NL","Nicaragua":"NI","Nigeria":"NG","Pakistan":"PK","Peru":"PE","Philippines":"PH","Poland":"PL","Portugal":"PT","Rwanda":"RW","Senegal":"SN","Singapore":"SG","South Africa":"ZA","South Korea":"KR","Spain":"ES","Sri Lanka":"LK","Switzerland":"CH","Tanzania":"TZ","Thailand":"TH","Tunisia":"TN","Turkey":"TR","Uganda":"UG","Ukraine":"UA","United Arab Emirates":"AE","United Kingdom":"GB","United States":"US","Uzbekistan":"UZ","Venezuela":"VE","Vietnam":"VN","Zambia":"ZM","Zimbabwe":"ZW" };

export const connectPayouts = onCall(async req => {
  const uid = uidOf(req), origin = originOf(req), st = await stripe();
  const a = (await db.doc(`agents/${uid}`).get()).data();
  if (!a) throw new HttpsError("failed-precondition", "Create an agent profile first.");
  const ref = db.doc(`payouts/${uid}`);
  let p = (await ref.get()).data() || {};
  if (!p.accountId) {
    const country = ISO[a.country];
    if (!country) throw new HttpsError("failed-precondition", "Stripe can't pay out to your country yet. Caravan will pay you with your chosen payout method instead.");
    try {
      const acct = await st.accounts.create({
        type: "express", country, business_type: "individual",
        capabilities: { transfers: { requested: true } },
        ...(country === "US" ? {} : { tos_acceptance: { service_agreement: "recipient" } }),
        metadata: { uid },
      });
      p = { accountId: acct.id, country, payoutsEnabled: false, createdAt: now() };
      await ref.set(p);
    } catch (e) {
      console.warn("connect create", country, e?.message);
      await ref.set({ unsupported: true, country, checkedAt: now() });
      throw new HttpsError("failed-precondition", `Stripe can't pay out to ${a.country} yet. Caravan will pay you with your chosen payout method (${a.payout || "PayPal or Wise"}) instead.`);
    }
  }
  const link = await st.accountLinks.create({ account: p.accountId, type: "account_onboarding", refresh_url: `${origin}/payments?connect=retry`, return_url: `${origin}/payments?connect=done` });
  return { url: link.url };
});

// Refreshes the agent's payout status from Stripe and pays anything owed to them.
export const payoutStatus = onCall(async req => {
  const uid = uidOf(req), ref = db.doc(`payouts/${uid}`);
  const p = (await ref.get()).data();
  if (!p?.accountId) return { status: p?.unsupported ? "unsupported" : "none" };
  const acct = await (await stripe()).accounts.retrieve(p.accountId);
  const enabled = !!(acct.payouts_enabled || acct.capabilities?.transfers === "active");
  await ref.update({ payoutsEnabled: enabled, checkedAt: now() });
  let paid = 0;
  if (enabled) {
    const owed = (await db.collection("hours").where("agentId", "==", uid).get()).docs
      .map(d => ({ id: d.id, ...d.data() })).filter(h => h.status === "approved" && h.payout === "owed");
    for (const h of owed) if (await payHours(h) === "paid") paid++;
  }
  return { status: enabled ? "enabled" : "pending", paid };
});
