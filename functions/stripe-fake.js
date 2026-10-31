// In-memory stand-in for the Stripe SDK, used only by the emulator tests (STRIPE_FAKE=1).
const sessions = {}, accounts = {};
export const calls = [];
let n = 0;
const id = p => `${p}_fake${++n}`;
export default {
  checkout: { sessions: {
    async create(o) { const s = { id: id("cs"), url: "", payment_status: "unpaid", metadata: o.metadata, o }; s.url = "https://checkout.stripe.test/?next=" + encodeURIComponent(o.success_url.replace("{CHECKOUT_SESSION_ID}", s.id)); sessions[s.id] = s; calls.push(["checkout", o]); return s; },
    // Tests mark a session paid by retrieving it with the "pay" flag via the FAKE_PAID env list.
    // The emulator may run each function in its own process, so unknown ids are rebuilt.
    async retrieve(sid) { const s = sessions[sid] || (sessions[sid] = { id: sid, payment_status: "unpaid", metadata: {} }); if ((process.env.FAKE_PAID || "").split(",").includes("all")) { s.payment_status = "paid"; s.payment_intent = { id: "pi_" + sid, latest_charge: "ch_" + sid }; } return s; },
  } },
  transfers: { async create(o) { calls.push(["transfer", o]); return { id: id("tr") }; } },
  refunds: { async create(o) { calls.push(["refund", o]); return { id: id("re") }; } },
  accounts: {
    async create(o) { if (o.country === "ZM") throw new Error("unsupported country"); const a = { id: id("acct"), payouts_enabled: true }; accounts[a.id] = a; return a; },
    async retrieve(aid) { return accounts[aid] || { id: aid, payouts_enabled: true }; },
  },
  accountLinks: { async create(o) { return { url: "https://connect.stripe.test/?next=" + encodeURIComponent(o.return_url) }; } },
  webhooks: { constructEvent() { throw new Error("no webhooks in fake"); } },
};
