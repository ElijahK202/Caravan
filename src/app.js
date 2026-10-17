import * as FB from "./firebase.js";

/* ================= helpers ================= */
const $ = (s, r=document) => r.querySelector(s);
const $$ = (s, r=document) => [...r.querySelectorAll(s)];
const sleep = ms => new Promise(r => setTimeout(r, ms));
const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const r2 = n => Math.round((+n || 0) * 100) / 100;
const money = n => (n < 0 ? "−$" : "$") + Math.abs(r2(n)).toLocaleString(undefined,{minimumFractionDigits:2, maximumFractionDigits:2});
const rid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
const short = n => { const p = String(n || "").trim().split(/\s+/); return p.length > 1 ? `${p[0]} ${p[p.length-1][0]}.` : (p[0] || "Someone"); };
const inits = n => String(n || "?").trim().split(/\s+/).map(w => w[0]).slice(0,2).join("").toUpperCase();
const today = () => new Date().toISOString().slice(0,10);
const now = () => new Date().toISOString();
const fmtDate = s => { if(!s) return "—"; const d = new Date(s); return isNaN(d) ? esc(s) : d.toLocaleDateString(undefined,{month:"short",day:"numeric",year:"numeric"}); };
const fmtTime = s => { const d = new Date(s); return isNaN(d) ? "" : d.toLocaleString(undefined,{month:"short",day:"numeric",hour:"numeric",minute:"2-digit"}); };
const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;

/* ================= reference data ================= */
const COUNTRIES = ["Argentina","Australia","Bangladesh","Bolivia","Brazil","Cambodia","Canada","Chile","China","Colombia","Costa Rica","Dominican Republic","Ecuador","Egypt","El Salvador","Ethiopia","France","Georgia","Germany","Ghana","Guatemala","Honduras","India","Indonesia","Ireland","Italy","Jamaica","Japan","Jordan","Kenya","Mexico","Morocco","Nepal","Netherlands","Nicaragua","Nigeria","Pakistan","Peru","Philippines","Poland","Portugal","Rwanda","Senegal","Singapore","South Africa","South Korea","Spain","Sri Lanka","Switzerland","Tanzania","Thailand","Tunisia","Turkey","Uganda","Ukraine","United Arab Emirates","United Kingdom","United States","Uzbekistan","Venezuela","Vietnam","Zambia","Zimbabwe","Other"];
const TASKS = ["Email & inbox","Scheduling","Data entry","Web research","Customer support","Social media","Translation","Bookkeeping","Transcription","Travel booking","Lead generation","Online orders & returns"];
const LANGS = ["English","Spanish","Portuguese","French","Arabic","Hindi","Tagalog","Swahili","Mandarin","Vietnamese","Russian","German"];
const SHIFTS = ["Early morning","Daytime","Evening","Overnight","Weekends"];
const TYPICAL_HOURS = {"Email & inbox":5,"Scheduling":3,"Data entry":10,"Web research":6,"Customer support":15,"Social media":6,"Translation":8,"Bookkeeping":5,"Transcription":8,"Travel booking":2,"Lead generation":10,"Online orders & returns":4};
// Typical local hourly earnings for comparable informal work, USD (rough, for orientation only)
const LOCAL = {India:[0.37,1.25],Philippines:[0.9,1.8],Bangladesh:[0.3,0.9],Pakistan:[0.35,1.0],Kenya:[0.5,1.5],Nigeria:[0.4,1.2],Guatemala:[1.0,2.0],Colombia:[1.2,2.2],Peru:[1.2,2.3],Vietnam:[0.8,1.8],Cambodia:[0.7,1.5],Egypt:[0.5,1.2],Morocco:[0.9,1.8],Uganda:[0.3,0.9],Ghana:[0.5,1.3],Nepal:[0.4,1.0],Honduras:[1.0,2.0],Venezuela:[0.4,1.2]};
const SERVICE_FEE = 0.10; // charged to the client; agents keep 100% of their rate
// Processing fees are estimates for planning; real rates depend on the provider contract.
const METHODS = [
  {id:"card",g:"Cards and wallets",name:"Credit card",sub:"Visa, Mastercard, Amex, Discover, JCB",pct:2.9,fixed:.30},
  {id:"debit",g:"Cards and wallets",name:"Debit card",sub:"Visa Debit, Mastercard Debit, Maestro",pct:2.9,fixed:.30},
  {id:"applepay",g:"Cards and wallets",name:"Apple Pay",sub:"Billed at card rates",pct:2.9,fixed:.30},
  {id:"googlepay",g:"Cards and wallets",name:"Google Pay",sub:"Billed at card rates",pct:2.9,fixed:.30},
  {id:"link",g:"Cards and wallets",name:"Link",sub:"Saved cards and banks",pct:2.9,fixed:.30},
  {id:"paypal",g:"PayPal and payment apps",name:"PayPal",sub:"Balance, card or bank",pct:3.49,fixed:.49},
  {id:"venmo",g:"PayPal and payment apps",name:"Venmo",sub:"United States",pct:3.49,fixed:.49},
  {id:"cashapp",g:"PayPal and payment apps",name:"Cash App Pay",sub:"United States",pct:2.75,fixed:.15},
  {id:"ach",g:"Bank transfer",name:"ACH bank debit",sub:"US bank accounts, capped fee",pct:.8,fixed:0,cap:5},
  {id:"sepa",g:"Bank transfer",name:"SEPA Direct Debit",sub:"Euro bank accounts, capped fee",pct:.8,fixed:0,cap:5},
  {id:"wire",g:"Bank transfer",name:"Wire transfer",sub:"Any bank, 1–3 days",pct:0,fixed:15},
  {id:"wise",g:"Bank transfer",name:"Wise",sub:"Multi-currency transfer",pct:.6,fixed:0},
  {id:"upi",g:"Local methods",name:"UPI",sub:"India",pct:2,fixed:0},
  {id:"pix",g:"Local methods",name:"Pix",sub:"Brazil",pct:1.2,fixed:0},
  {id:"mercadopago",g:"Local methods",name:"Mercado Pago",sub:"Latin America",pct:3.5,fixed:.25},
  {id:"oxxo",g:"Local methods",name:"OXXO",sub:"Mexico, pay in cash",pct:3.6,fixed:.20},
  {id:"mpesa",g:"Local methods",name:"M-Pesa",sub:"Kenya, Tanzania",pct:1.5,fixed:0},
  {id:"gcash",g:"Local methods",name:"GCash",sub:"Philippines",pct:2.5,fixed:0},
  {id:"alipay",g:"Local methods",name:"Alipay",sub:"China",pct:3,fixed:0},
  {id:"wechat",g:"Local methods",name:"WeChat Pay",sub:"China",pct:3,fixed:0},
  {id:"ideal",g:"Local methods",name:"iDEAL",sub:"Netherlands",pct:0,fixed:.35},
  {id:"bancontact",g:"Local methods",name:"Bancontact",sub:"Belgium",pct:1.4,fixed:.25},
  {id:"usdc",g:"Crypto",name:"USDC",sub:"Ethereum, Solana, Base",pct:1,fixed:0},
  {id:"usdt",g:"Crypto",name:"USDT",sub:"Tron, Ethereum",pct:1,fixed:0},
  {id:"btc",g:"Crypto",name:"Bitcoin",sub:"On-chain or Lightning",pct:1,fixed:0},
  {id:"eth",g:"Crypto",name:"Ether",sub:"Ethereum",pct:1,fixed:0},
  {id:"sol",g:"Crypto",name:"Solana",sub:"SOL",pct:1,fixed:0},
];
const M = Object.fromEntries(METHODS.map(m => [m.id, m]));
const PAYOUTS = ["PayPal","Wise","Payoneer","Bank transfer","M-Pesa","GCash","UPI","Pix","Mercado Pago","USDC (crypto)","USDT (crypto)"];
const END_REASONS = ["Poor quality of work","Missed deadlines","Unresponsive","Didn't follow instructions","Confidentiality concern","Project no longer needed","Other"];
const STATUS = {open:"Open",offered:"Offer sent",awaiting_funding:"Awaiting escrow",active:"In progress",completed:"Completed",ended:"Contract ended",cancelled:"Cancelled"};

// Sample profiles: used to seed the on-device demo store only
const SAMPLE_AGENTS = [
  {id:"sample-amina",name:"Amina Kabbaj",country:"Morocco",city:"Casablanca",timezone:"Africa/Casablanca",skills:["Email & inbox","Translation","Customer support","Scheduling"],languages:["Arabic","French","English"],englishLevel:"Fluent",rate:4,hoursPerWeek:"20–30",shifts:["Daytime","Evening"],equipment:"Laptop or desktop",payout:"Payoneer",pastJobs:41,bio:"Former hotel front-desk lead. I keep inboxes at zero and reply in English, French or Arabic."},
  {id:"sample-rafael",name:"Rafael Mejía",country:"Colombia",city:"Medellín",timezone:"America/Bogota",skills:["Customer support","Lead generation","Web research","Data entry"],languages:["Spanish","English"],englishLevel:"Fluent",rate:5,hoursPerWeek:"30–40",shifts:["Daytime"],equipment:"Laptop or desktop",payout:"Wise",pastJobs:36,bio:"Three years of bilingual customer support for US online shops."},
  {id:"sample-mei",name:"Mei Lan Tran",country:"Vietnam",city:"Hanoi",timezone:"Asia/Ho_Chi_Minh",skills:["Data entry","Bookkeeping","Transcription"],languages:["Vietnamese","English"],englishLevel:"Conversational",rate:3,hoursPerWeek:"20–30",shifts:["Daytime","Overnight"],equipment:"Laptop or desktop",payout:"Payoneer",pastJobs:28,bio:"Accounting graduate. Careful with spreadsheets, receipts and invoices."},
  {id:"sample-priya",name:"Priya Sharma",country:"India",city:"Pune",timezone:"Asia/Kolkata",skills:["Email & inbox","Scheduling","Travel booking","Web research"],languages:["Hindi","English"],englishLevel:"Fluent",rate:3.5,hoursPerWeek:"30–40",shifts:["Evening","Overnight"],equipment:"Both",payout:"UPI",pastJobs:52,bio:"Executive assistant to two startup founders: calendars, travel and research."},
  {id:"sample-joseph",name:"Joseph Otieno",country:"Kenya",city:"Nairobi",timezone:"Africa/Nairobi",skills:["Social media","Lead generation","Data entry"],languages:["Swahili","English"],englishLevel:"Fluent",rate:3,hoursPerWeek:"20–30",shifts:["Daytime","Weekends"],equipment:"Laptop or desktop",payout:"M-Pesa",pastJobs:19,bio:"I schedule posts, answer comments and build lead lists for small businesses."},
  {id:"sample-ana",name:"Ana Lucía Gómez",country:"Guatemala",city:"Guatemala City",timezone:"America/Guatemala",skills:["Customer support","Online orders & returns","Email & inbox"],languages:["Spanish","English"],englishLevel:"Conversational",rate:3.5,hoursPerWeek:"10–20",shifts:["Daytime","Evening"],equipment:"Laptop or desktop",payout:"PayPal",pastJobs:14,bio:"Handled returns and order issues for an online shoe store. Same time zone as Chicago."},
  {id:"sample-luka",name:"Luka Beridze",country:"Georgia",city:"Tbilisi",timezone:"Asia/Tbilisi",skills:["Web research","Data entry","Translation"],languages:["Russian","English","German"],englishLevel:"Fluent",rate:4.5,hoursPerWeek:"10–20",shifts:["Daytime","Evening"],equipment:"Laptop or desktop",payout:"Wise",pastJobs:23,bio:"Economics graduate. Fast, sourced research summaries."},
  {id:"sample-maria",name:"Maria Santos",country:"Philippines",city:"Cebu",timezone:"Asia/Manila",skills:["Email & inbox","Customer support","Social media","Scheduling"],languages:["Tagalog","English"],englishLevel:"Fluent",rate:4,hoursPerWeek:"40+",shifts:["Overnight","Evening"],equipment:"Laptop or desktop",payout:"GCash",pastJobs:64,bio:"Virtual assistant since 2021. Overnight coverage for US clients."},
].map(a => ({...a, email:"", consent:true, sample:true, createdAt:"2026-09-01T00:00:00Z"}));
const SAMPLE_REVIEWS = [
  ["sample-amina",5,"Replied to every guest email within the hour, in three languages."],["sample-amina",5,"Organized, polite and fast."],
  ["sample-rafael",5,"Took over our support inbox and our response time halved."],["sample-rafael",4,"Great work; needed a couple of reminders on formatting."],
  ["sample-mei",5,"Spotless bookkeeping and clear questions when something was off."],
  ["sample-priya",5,"Booked a four-city trip without a single mistake."],["sample-priya",5,"Feels like having a full-time EA."],["sample-priya",4,"Very reliable."],
  ["sample-joseph",4,"Solid lead lists, good communication."],
  ["sample-ana",5,"Handled our returns backlog over a weekend."],
  ["sample-luka",5,"Research briefs were thorough and well sourced."],
  ["sample-maria",5,"Covered our overnight support for three months."],["sample-maria",5,"Proactive and friendly with customers."],
].map(([agentId,rating,text],i) => ({id:"sample-r"+i, agentId, rating, text, clientName:"Sample client", sample:true, at:"2026-09-15T00:00:00Z"}));

/* ================= store: shared db when available, device-only fallback ================= */
const Store = (() => {
  let db = null, mode = "local", watchers = [];
  let local = {}; try { local = JSON.parse(localStorage.getItem("caravan:db") || "{}"); } catch(e) {}
  const persist = () => { try { localStorage.setItem("caravan:db", JSON.stringify(local)); } catch(e) {} };
  const inColl = (p, c) => p.startsWith(c + "/") && !p.slice(c.length + 1).includes("/");
  const test = (d, [f, op, v]) => op === "array-contains" ? (d[f] || []).includes(v) : d[f] === v;
  const list = (c, w) => { const ws = !w ? [] : Array.isArray(w[0]) ? w : [w]; return Object.keys(local).filter(p => inColl(p, c)).map(p => ({...local[p], id:p.split("/").pop()})).filter(d => ws.every(f => test(d, f))); };
  const notify = p => watchers.forEach(w => { if (inColl(p, w.c)) w.cb(list(w.c, w.w)); });
  const clone = o => JSON.parse(JSON.stringify(o));
  async function retry(fn){ try { return await fn(); } catch(e) { if (e?.code === "unavailable") { await sleep(500 + Math.random()*700); return fn(); } throw e; } }
  return {
    get mode(){ return mode; },
    useDb(d){ db = d; mode = "shared"; },
    async get(p){ if (db) { const s = await db.doc(p).get(); return s.exists ? s.data() : null; } return local[p] ? clone(local[p]) : null; },
    async set(p, data){ if (db) return retry(() => db.doc(p).set(data)); local[p] = clone(data); persist(); notify(p); },
    async update(p, data){ if (db) return retry(() => db.doc(p).update(data)); local[p] = {...(local[p] || {}), ...clone(data)}; persist(); notify(p); },
    async del(p){ if (db) return retry(() => db.doc(p).delete()); delete local[p]; persist(); notify(p); },
    watch(c, cb, w){
      const ws = !w ? [] : Array.isArray(w[0]) ? w : [w];
      if (db) { let q = db.collection(c); ws.forEach(f => { q = q.where(f[0], f[1], f[2]); });
        return q.onSnapshot(s => cb(s.docs.map(d => ({...d.data(), id:d.id}))), e => console.warn("watch", c, e?.code)); }
      const x = {c, cb, w}; watchers.push(x); cb(list(c, w)); return () => { watchers = watchers.filter(y => y !== x); };
    },
    localCount(c){ return list(c).length; },
  };
})();

/* ================= state ================= */
const COLLS = ["agents","clients","tasks","applications","reviews","threads","hours","ledger"];
const S = Object.fromEntries(COLLS.map(c => [c, []]));
let UID = "me", READY = false, USER = null;
const NEXT_KEY = "caravan:next";
let PREFS = {favorites:[], blocked:[], method:"card"};
let ACT = (() => { try { return localStorage.getItem("caravan:act") || ""; } catch(e) { return ""; } })();
const meClient = () => S.clients.find(c => c.id === UID) || null;
const meAgent = () => S.agents.find(a => a.id === UID) || null;
function role(){ const c = !!meClient(), a = !!meAgent(); if (c && a) return ACT === "agent" ? "agent" : "client"; return c ? "client" : a ? "agent" : "guest"; }
const agentById = id => S.agents.find(a => a.id === id);
const clientById = id => S.clients.find(c => c.id === id);
const taskById = id => S.tasks.find(t => t.id === id);
const prefsPath = () => `data/users/${UID}/prefs`;
async function savePrefs(){ try { await Store.set(prefsPath(), PREFS); } catch(e) { console.warn(e); } }

function agentStats(id){
  const rv = S.reviews.filter(r => r.agentId === id);
  const avg = rv.length ? rv.reduce((s, r) => s + (+r.rating || 0), 0) / rv.length : 0;
  const a = agentById(id);
  const jobs = S.tasks.filter(t => t.agentId === id && t.status === "completed").length + (+a?.pastJobs || 0);
  return {avg, count:rv.length, jobs, reviews:rv.sort((x,y) => String(y.at).localeCompare(String(x.at)))};
}
function taskMoney(t){
  const hs = S.hours.filter(h => h.taskId === t.id).sort((a,b) => String(b.date+b.at).localeCompare(String(a.date+a.at)));
  const sum = (st, k) => r2(hs.filter(h => h.status === st).reduce((a, h) => a + (+h[k] || 0), 0));
  const approved = sum("approved","amount"), pending = sum("pending","amount");
  const funded = +t.funded || 0, refunded = +t.refunded || 0;
  const balance = r2(funded - approved - refunded);
  return {hs, approved, pending, approvedHrs:sum("approved","hours"), pendingHrs:sum("pending","hours"), funded, refunded, balance, free:r2(balance - pending)};
}
function procFee(amount, m){ let f = amount * m.pct / 100 + m.fixed; if (m.cap) f = Math.min(f, m.cap); return r2(f); }
function quote(sub, mid){ const m = M[mid] || M.card; sub = r2(sub); const service = r2(sub * SERVICE_FEE); const proc = procFee(sub + service, m); return {sub, service, proc, total:r2(sub + service + proc), m}; }
function quoteHTML(q){ return `<div class="quote">
  <div><span>Agent pay</span><b>${money(q.sub)}</b></div>
  <div><span>Caravan service fee (10%)</span><b>${money(q.service)}</b></div>
  <div><span>Processing, ${esc(q.m.name)} (estimated)</span><b>${money(q.proc)}</b></div>
  <div class="total"><span>Total</span><b>${money(q.total)}</b></div></div>`; }
function methodOptions(sel){ return [...new Set(METHODS.map(m => m.g))].map(g => `<optgroup label="${g}">${METHODS.filter(m => m.g === g).map(m => `<option value="${m.id}"${m.id === sel ? " selected" : ""}>${m.name} — ${m.sub}</option>`).join("")}</optgroup>`).join(""); }

function match(t, a){
  let s = 0; const why = [];
  if ((a.skills || []).includes(t.category)) { s += 40; why.push(t.category); }
  const L = t.languages || [], common = L.filter(l => (a.languages || []).includes(l));
  if (L.length) { s += 25 * common.length / L.length; if (common.length) why.push("Speaks " + common.join(", ")); } else s += 25;
  const r = +a.rate, max = +t.budgetMax || 0;
  if (r <= max) { s += 20; why.push("Within budget"); } else s += Math.max(0, 20 - (r - max) * 6);
  const st = agentStats(a.id); s += st.count ? 15 * st.avg / 5 : 10;
  if (st.count && st.avg >= 4.5) why.push(st.avg.toFixed(1) + " rating");
  if (PREFS.favorites.includes(a.id)) { s += 5; why.push("Favorite"); }
  return {score:Math.min(100, Math.round(s)), why};
}
const matchesFor = (t, n=6) => S.agents.filter(a => !PREFS.blocked.includes(a.id) && a.id !== t.clientId).map(a => ({a, ...match(t, a)})).sort((x,y) => y.score - x.score).slice(0, n);

function threadIdFor(clientId, agentId){ return `${clientId}__${agentId}`; }
async function ensureThread(clientId, agentId){
  const id = threadIdFor(clientId, agentId);
  if (!S.threads.find(t => t.id === id)) await Store.set(`threads/${id}`, {clientId, agentId, participants:[clientId, agentId], lastText:"", lastAt:now(), createdAt:now()});
  return id;
}
async function postMessage(threadId, text, sys=false){
  await Store.set(`messages/${rid()}`, {threadId, participants:threadId.split("__"), from: sys ? "system" : UID, text, at:now()});
  await Store.update(`threads/${threadId}`, {lastText:text.slice(0,140), lastAt:now(), lastFrom: sys ? "system" : UID});
}
async function ledger(entry){ await Store.set(`ledger/${rid()}`, {...entry, at:now()}); }

/* ================= dialogs ================= */
const dlg = $("#dlg");
function openDlg(html, bind){
  dlg.innerHTML = `<div class="dlg">${html}</div>`;
  $$("[data-close]", dlg).forEach(b => b.onclick = () => dlg.close());
  if (!dlg.open) dlg.showModal();
  bind && bind(dlg);
  const f = $("input:not([type=hidden]):not([type=radio]),select,textarea", dlg); if (f) f.focus();
}
function infoDlg(title, body){ openDlg(`<h3 id="dlgTitle">${title}</h3><p>${body}</p><div class="dlgactions"><button class="btn primary" data-close>OK</button></div>`); }
function confirmDlg(title, body, ok, danger){
  return new Promise(res => {
    let v = false;
    openDlg(`<h3 id="dlgTitle">${title}</h3><p>${body}</p><div class="dlgactions"><button class="btn ghost" data-close>Cancel</button><button class="btn ${danger ? "danger solid" : "primary"}" data-ok>${ok}</button></div>`,
      el => { $("[data-ok]", el).onclick = () => { v = true; dlg.close(); }; });
    dlg.addEventListener("close", () => res(v), {once:true});
  });
}
function needProfile(r, what){
  openDlg(`<h3 id="dlgTitle">Create ${r === "client" ? "a client" : "an agent"} profile first</h3><p>You need ${r === "client" ? "a client" : "an agent"} profile to ${what}. It takes about two minutes.</p>
    <div class="dlgactions"><button class="btn ghost" data-close>Not now</button><button class="btn primary" data-reg>Create profile</button></div>`,
    el => { $("[data-reg]", el).onclick = () => { dlg.close(); setRole(r); go("register"); }; });
}
function requireRole(r, what){
  if (r === "client" && !meClient()) { needProfile("client", what); return false; }
  if (r === "agent" && !meAgent()) { needProfile("agent", what); return false; }
  if (role() !== r) { ACT = r; try { localStorage.setItem("caravan:act", r); } catch(e) {} renderNav(); }
  return true;
}

// Turns Firebase Auth error codes into something a visitor (or the site owner) can act on.
function authError(err, fallback){
  console.warn("sign-in", err?.code, err?.message);
  const code = String(err?.code || "").replace("auth/", "");
  const msg = {
    "configuration-not-found": "Sign-in isn't set up for this site yet.",
    "operation-not-allowed": "This sign-in method isn't turned on for this site yet.",
    "unauthorized-domain": "Sign-in isn't allowed from this web address yet.",
    "unauthorized-continue-uri": "Sign-in isn't allowed from this web address yet.",
    "invalid-email": "That email address doesn't look right.",
    "network-request-failed": "Couldn't reach the sign-in service. Check your connection and try again.",
    "too-many-requests": "Too many attempts. Wait a minute and try again.",
  }[code] || fallback;
  return code ? `${msg} (${code})` : msg;
}
function signInDlg(next){
  try { localStorage.setItem(NEXT_KEY, JSON.stringify(next)); } catch(e) {}
  openDlg(`<h3 id="dlgTitle">Sign in to Caravan</h3><p>Continue with Google, or get a one-time sign-in link by email. New here? This creates your account.</p>
    <button class="btn primary" type="button" data-google>Continue with Google</button>
    <div class="fields"><div class="full"><label for="si_email">Or use your email</label><input type="email" id="si_email" autocomplete="email"><div class="err">Enter a valid email address.</div></div></div>
    <p class="status" id="si_status" aria-live="polite"></p>
    <div class="dlgactions"><button class="btn ghost" data-close>Cancel</button><button class="btn ghost" data-link>Email me a link</button></div>`, el => {
      const status = $("#si_status", el);
      $("[data-google]", el).onclick = async e => {
        e.target.disabled = true;
        try { await FB.signInWithGoogle(); } catch(err) { e.target.disabled = false; status.textContent = err?.code === "auth/popup-closed-by-user" ? "" : authError(err, "Google sign-in didn't work. Try the email link instead."); }
      };
      $("[data-link]", el).onclick = async e => {
        const i = $("#si_email", el), v = i.value.trim(), bad = !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
        i.parentElement.classList.toggle("invalid", bad); if (bad) { i.focus(); return; }
        e.target.disabled = true;
        try { await FB.sendEmailLink(v); status.textContent = `Check ${v} for a sign-in link.`; } catch(err) { e.target.disabled = false; status.textContent = authError(err, "Couldn't send the link. Check the address and try again."); }
      };
    });
}

/* ---- hire / offer ---- */
function dlgHire(agentId){
  if (!requireRole("client", "hire an agent")) return;
  const a = agentById(agentId); if (!a) return;
  const open = S.tasks.filter(t => t.clientId === UID && t.status === "open");
  openDlg(`<h3 id="dlgTitle">Hire ${esc(short(a.name))}</h3><p>Offer one of your open tasks, or post a new task just for ${esc(a.name.split(" ")[0])}.</p>
    <div class="fields">
      <div class="full"><label for="h_task">Task</label><select id="h_task">${open.map(t => `<option value="${esc(t.id)}">${esc(t.title)}</option>`).join("")}<option value="__new">Post a new task for ${esc(a.name.split(" ")[0])}</option></select></div>
      <div class="full" id="h_ratewrap"><label for="h_rate">Hourly rate (USD)</label><div class="money"><input type="number" id="h_rate" min="1" step="0.25" value="${+a.rate}"></div><div class="hint">${esc(short(a.name))} asks ${money(a.rate)}/hr.</div></div>
    </div>
    <div class="dlgactions"><button class="btn ghost" data-close>Cancel</button><button class="btn primary" data-ok>Send offer</button></div>`, el => {
      const sel = $("#h_task", el), ok = $("[data-ok]", el);
      const sync = () => { const n = sel.value === "__new"; $("#h_ratewrap", el).hidden = n; ok.textContent = n ? "Continue" : "Send offer"; };
      sel.onchange = sync; sync();
      ok.onclick = async () => {
        if (sel.value === "__new") { dlg.close(); go("post", {direct:agentId}); return; }
        const rate = r2($("#h_rate", el).value); if (!(rate >= 1)) return;
        ok.disabled = true; await offerTask(taskById(sel.value), a, rate); dlg.close(); go("task", {id:sel.value});
      };
    });
}
async function offerTask(t, a, rate){
  const status = a.sample ? "awaiting_funding" : "offered";
  await Store.update(`tasks/${t.id}`, {agentId:a.id, agentName:a.name, agentSample:!!a.sample, rate:r2(rate), status, offeredAt:now()});
  const th = await ensureThread(t.clientId, a.id);
  await postMessage(th, `Offer sent: “${t.title}” at ${money(rate)}/hr.` + (a.sample ? " (Sample agent accepted automatically.)" : ""), true);
}
function dlgApply(taskId){
  if (!requireRole("agent", "apply to tasks")) return;
  const t = taskById(taskId), me = meAgent();
  openDlg(`<h3 id="dlgTitle">Apply to “${esc(t.title)}”</h3><p>The client's budget is ${money(t.budgetMin)}–${money(t.budgetMax)} per hour for about ${+t.estHours} hours.</p>
    <div class="fields">
      <div class="full"><label for="ap_rate">Your rate for this task (USD/hr)</label><div class="money"><input type="number" id="ap_rate" min="1" step="0.25" value="${+me.rate}"></div></div>
      <div class="full"><label for="ap_note">Why you're a good fit</label><textarea id="ap_note" placeholder="Relevant experience, when you can start, any questions."></textarea></div>
    </div>
    <div class="dlgactions"><button class="btn ghost" data-close>Cancel</button><button class="btn primary" data-ok>Send application</button></div>`, el => {
      $("[data-ok]", el).onclick = async () => {
        const rate = r2($("#ap_rate", el).value); if (!(rate >= 1)) { $("#ap_rate", el).focus(); return; }
        await Store.set(`applications/${t.id}__${UID}`, {taskId:t.id, agentId:UID, agentName:me.name, clientId:t.clientId, rate, note:$("#ap_note", el).value.trim(), at:now()});
        dlg.close();
      };
    });
}

/* ---- escrow ---- */
function dlgFund(taskId){
  const t = taskById(taskId), m = taskMoney(t);
  const need = r2(Math.max(+t.estHours * +t.rate - m.balance, +t.rate * 2));
  openDlg(`<h3 id="dlgTitle">${m.funded ? "Add funds to escrow" : "Fund escrow"}</h3>
    <p>Money is held by Caravan and released to ${esc(short(t.agentName))} only when you approve logged hours. Unused funds are refunded.</p>
    <div class="fields">
      <div><label for="f_amt">Amount for agent pay (USD)</label><div class="money"><input type="number" id="f_amt" min="1" step="1" value="${need}"></div><div class="hint">${(need / t.rate).toFixed(1)} hours at ${money(t.rate)}/hr</div></div>
      <div><label for="f_m">Payment method</label><select id="f_m">${methodOptions(t.payMethod || PREFS.method)}</select></div>
      <div class="full" id="f_q"></div>
      <div class="full banner"><b>Test mode.</b> In the live product you'd finish checkout with your chosen provider here. No real money moves in this prototype.</div>
    </div>
    <div class="dlgactions"><button class="btn ghost" data-close>Cancel</button><button class="btn primary" data-ok>Pay into escrow</button></div>`, el => {
      const amt = $("#f_amt", el), meth = $("#f_m", el);
      const upd = () => { const v = r2(amt.value); $("#f_q", el).innerHTML = v >= 1 ? quoteHTML(quote(v, meth.value)) : ""; $(".hint", el).textContent = v >= 1 ? `${(v / t.rate).toFixed(1)} hours at ${money(t.rate)}/hr` : "Enter at least $1."; };
      amt.oninput = upd; meth.onchange = upd; upd();
      $("[data-ok]", el).onclick = async e => {
        const v = r2(amt.value); if (!(v >= 1)) { amt.focus(); return; }
        e.target.disabled = true;
        const q = quote(v, meth.value);
        await Store.update(`tasks/${t.id}`, {funded:r2((+t.funded || 0) + v), payMethod:meth.value, status: t.status === "awaiting_funding" ? "active" : t.status, fundedAt:now()});
        await ledger({type:"fund", taskId:t.id, taskTitle:t.title, clientId:t.clientId, agentId:t.agentId, amount:v, fees:r2(q.service + q.proc), total:q.total, method:meth.value});
        if (PREFS.method !== meth.value) { PREFS.method = meth.value; savePrefs(); }
        dlg.close();
      };
    });
}
function dlgLogHours(taskId, onBehalf){
  const t = taskById(taskId);
  openDlg(`<h3 id="dlgTitle">Log hours</h3><p>${onBehalf ? "Test mode: you're logging hours on behalf of a sample agent so you can try the approval flow." : `Hours are paid at ${money(t.rate)}/hr once the client approves them.`}</p>
    <div class="fields">
      <div><label for="l_date">Date</label><input type="date" id="l_date" value="${today()}"></div>
      <div><label for="l_hrs">Hours</label><input type="number" id="l_hrs" min="0.25" max="16" step="0.25" value="2"></div>
      <div class="full"><label for="l_note">What you did</label><textarea id="l_note" placeholder="e.g. Cleared 140 emails, drafted 12 replies, flagged 3 urgent items."></textarea></div>
      <div class="full hint" id="l_amt"></div>
    </div>
    <div class="dlgactions"><button class="btn ghost" data-close>Cancel</button><button class="btn primary" data-ok>Submit hours</button></div>`, el => {
      const hrs = $("#l_hrs", el), upd = () => { $("#l_amt", el).textContent = `${money(r2(hrs.value) * t.rate)} at ${money(t.rate)}/hr`; };
      hrs.oninput = upd; upd();
      $("[data-ok]", el).onclick = async () => {
        const h = r2(hrs.value), note = $("#l_note", el).value.trim();
        if (!(h > 0 && h <= 16)) { hrs.focus(); return; }
        if (!note) { $("#l_note", el).focus(); return; }
        await Store.set(`hours/${rid()}`, {taskId:t.id, agentId:t.agentId, clientId:t.clientId, date:$("#l_date", el).value || today(), hours:h, amount:r2(h * t.rate), note, status:"pending", at:now()});
        dlg.close();
      };
    });
}
async function approveHours(hid){
  const h = S.hours.find(x => x.id === hid), t = taskById(h.taskId), m = taskMoney(t);
  if (h.amount > m.balance + 0.001) {
    openDlg(`<h3 id="dlgTitle">Not enough in escrow</h3><p>Approving these hours releases ${money(h.amount)}, but escrow holds ${money(m.balance)}. Add funds first.</p>
      <div class="dlgactions"><button class="btn ghost" data-close>Cancel</button><button class="btn primary" data-fund>Add funds</button></div>`, el => { $("[data-fund]", el).onclick = () => dlgFund(t.id); });
    return;
  }
  await Store.update(`hours/${hid}`, {status:"approved", decidedAt:now()});
  await ledger({type:"release", taskId:t.id, taskTitle:t.title, clientId:t.clientId, agentId:t.agentId, amount:h.amount, hours:h.hours});
}
async function rejectHours(hid){
  const h = S.hours.find(x => x.id === hid), t = taskById(h.taskId);
  if (!await confirmDlg("Reject these hours?", `${h.hours} h (${money(h.amount)}) won't be paid. Tell ${esc(short(t.agentName))} why in Messages so they can fix it.`, "Reject hours", true)) return;
  await Store.update(`hours/${hid}`, {status:"rejected", decidedAt:now()});
  if (t.status !== "active") { // contract is closed: return the held amount
    await Store.update(`tasks/${t.id}`, {refunded:r2((+t.refunded || 0) + h.amount)});
    await ledger({type:"refund", taskId:t.id, taskTitle:t.title, clientId:t.clientId, agentId:t.agentId, amount:h.amount, method:t.payMethod});
  }
}
async function completeTask(taskId){
  const t = taskById(taskId), m = taskMoney(t);
  if (m.pending > 0) { infoDlg("Review pending hours first", `There ${m.pendingHrs === 1 ? "is 1 hour" : `are ${m.pendingHrs} hours`} waiting for your decision. Approve or reject them before closing the task.`); return; }
  if (!await confirmDlg("Mark task complete?", `${esc(short(t.agentName))} has been paid ${money(m.approved)}. ${m.free > 0 ? `The unused ${money(m.free)} in escrow goes back to your ${esc(M[t.payMethod]?.name || "payment method")}.` : ""}`, "Mark complete")) return;
  await Store.update(`tasks/${t.id}`, {status:"completed", completedAt:now(), refunded:r2((+t.refunded || 0) + Math.max(0, m.free))});
  if (m.free > 0) await ledger({type:"refund", taskId:t.id, taskTitle:t.title, clientId:t.clientId, agentId:t.agentId, amount:m.free, method:t.payMethod});
  dlgReview(t.id);
}
function dlgEnd(taskId){
  const t = taskById(taskId), m = taskMoney(t), first = esc(String(t.agentName).split(" ")[0]);
  openDlg(`<h3 id="dlgTitle">End contract with ${esc(short(t.agentName))}</h3>
    <p>${first} stops working on “${esc(t.title)}” right away. Approved hours stay paid${m.pending ? `; ${m.pendingHrs} pending hours (${money(m.pending)}) stay in escrow until you approve or reject them` : ""}. ${m.free > 0 ? `${money(m.free)} is refunded to your ${esc(M[t.payMethod]?.name || "payment method")}.` : ""}</p>
    <div class="fields">
      <div class="full"><label for="e_reason">Reason</label><select id="e_reason">${END_REASONS.map(r => `<option>${r}</option>`).join("")}</select></div>
      <div class="full"><label for="e_note">Note to ${first} (optional)</label><textarea id="e_note" placeholder="Specific, factual feedback helps agents improve."></textarea></div>
      <div class="full"><label class="check"><input type="checkbox" id="e_block"> Don't match me with ${first} again</label></div>
    </div>
    <div class="dlgactions"><button class="btn ghost" data-close>Keep working together</button><button class="btn danger solid" data-ok>End contract</button></div>`, el => {
      $("[data-ok]", el).onclick = async e => {
        e.target.disabled = true;
        const reason = $("#e_reason", el).value, note = $("#e_note", el).value.trim(), block = $("#e_block", el).checked;
        const mm = taskMoney(taskById(taskId)), refund = Math.max(0, mm.free);
        await Store.update(`tasks/${t.id}`, {status:"ended", endedAt:now(), endReason:reason, endNote:note, refunded:r2((+t.refunded || 0) + refund)});
        if (refund > 0) await ledger({type:"refund", taskId:t.id, taskTitle:t.title, clientId:t.clientId, agentId:t.agentId, amount:refund, method:t.payMethod});
        const th = await ensureThread(t.clientId, t.agentId);
        await postMessage(th, `Contract ended for “${t.title}”. Reason: ${reason}.${note ? " Note: " + note : ""}`, true);
        if (block && !PREFS.blocked.includes(t.agentId)) { PREFS.blocked.push(t.agentId); PREFS.favorites = PREFS.favorites.filter(x => x !== t.agentId); await savePrefs(); }
        dlgReview(t.id);
      };
    });
}
function dlgReview(taskId){
  const t = taskById(taskId), ex = S.reviews.find(r => r.id === taskId);
  let val = ex?.rating || 0;
  openDlg(`<h3 id="dlgTitle">Rate ${esc(short(t.agentName))}</h3><p>Your review appears on their public profile and helps other clients choose.</p>
    <div class="starpick" role="radiogroup" aria-label="Rating">${[1,2,3,4,5].map(n => `<label><input type="radio" name="rv" value="${n}"${n === val ? " checked" : ""} aria-label="${n} star${n > 1 ? "s" : ""}"><span>★</span></label>`).join("")}</div>
    <div class="fields"><div class="full"><label for="rv_text">Review</label><textarea id="rv_text" placeholder="What went well? What could be better?">${esc(ex?.text || "")}</textarea></div></div>
    <div class="dlgactions"><button class="btn ghost" data-close>Skip</button><button class="btn primary" data-ok>Post review</button></div>`, el => {
      const paint = () => $$(".starpick label", el).forEach((l, i) => l.classList.toggle("on", i < val));
      $$(".starpick input", el).forEach(i => i.onchange = () => { val = +i.value; paint(); });
      paint();
      $("[data-ok]", el).onclick = async () => {
        if (!val) { $(".starpick input", el).focus(); return; }
        await Store.set(`reviews/${taskId}`, {taskId, agentId:t.agentId, clientId:UID, clientName:short(meClient()?.name), rating:val, text:$("#rv_text", el).value.trim(), at:now()});
        dlg.close();
      };
    });
}
async function toggleFav(id){ if (!requireRole("client", "save favorite agents")) return; PREFS.favorites = PREFS.favorites.includes(id) ? PREFS.favorites.filter(x => x !== id) : [...PREFS.favorites, id]; await savePrefs(); refresh(); }
async function toggleBlock(id){
  const blocked = PREFS.blocked.includes(id);
  if (!blocked && !await confirmDlg("Stop matching with this agent?", "They'll be hidden from your matches and the directory. You can undo this from My agents.", "Don't match again", true)) return;
  PREFS.blocked = blocked ? PREFS.blocked.filter(x => x !== id) : [...PREFS.blocked, id];
  if (!blocked) PREFS.favorites = PREFS.favorites.filter(x => x !== id);
  await savePrefs(); refresh();
}
async function openThreadWith(otherId){
  const r = role();
  if (r === "guest") { needProfile("client", "send messages"); return; }
  const id = r === "client" ? await ensureThread(UID, otherId) : await ensureThread(otherId, UID);
  go("messages", {id});
}

/* ================= navigation ================= */
const STATIC = ["home","register","done"];
let current = {view:"home", params:{}};
const hdr = $("#hdr"), menuBtn = $("#menuBtn");
menuBtn.onclick = () => { const o = !hdr.classList.contains("open"); hdr.classList.toggle("open", o); menuBtn.setAttribute("aria-expanded", o); };
const closeMenu = () => { hdr.classList.remove("open"); menuBtn.setAttribute("aria-expanded", "false"); };

function navItems(){
  const r = role();
  if (r === "client") return [["home","Home"],["agents","Find agents"],["tasks","My tasks"],["myagents","My agents"],["messages","Messages"],["payments","Payments"],["pricing","Pricing"]];
  if (r === "agent") return [["home","Home"],["tasks","Find work"],["agents","Agents"],["messages","Messages"],["payments","Earnings"],["pricing","Pricing"]];
  return [["home","Home"],["how","How it works"],["agents","Find agents"],["tasks","Open tasks"],["pricing","Pricing"]];
}
function renderNav(){
  const v = current.view === "agent" ? "agents" : current.view === "task" || current.view === "post" ? "tasks" : current.view;
  $("#navlinks").innerHTML = navItems().map(([k, l]) => `<button type="button" data-go="${k}"${k === v ? ' aria-current="page"' : ""}>${l}</button>`).join("");
  const r = role(), both = !!meClient() && !!meAgent();
  $("#actAs").hidden = !both;
  $$("[data-act-as]").forEach(b => b.setAttribute("aria-pressed", b.dataset.actAs === r));
  const signBtn = !FB.enabled ? "" : USER ? `<button class="btn ghost sm hide-sm" data-act="signout">Sign out</button>` : `<button class="btn ghost sm" data-act="signin">Sign in</button>`;
  $("#authBtns").innerHTML = r === "guest"
    ? `${USER ? "" : `<button class="btn ghost sm hide-sm" data-go="register" data-role="agent">Become an agent</button>`}${signBtn}<button class="btn primary sm" data-go="register" data-role="client">Get started</button>`
    : `${r === "client" ? `<button class="btn primary sm hide-sm" data-go="post">Post a task</button>` : ""}<button class="btn ghost sm" data-go="profile" aria-label="Your profile"><span class="avatar sm" style="width:22px;height:22px;font-size:10px">${esc(inits((r === "client" ? meClient() : meAgent()).name))}</span>Profile</button>`;
}
$$("[data-act-as]").forEach(b => b.onclick = () => { ACT = b.dataset.actAs; try { localStorage.setItem("caravan:act", ACT); } catch(e) {} renderNav(); if (!STATIC.includes(current.view)) mountApp(); });

let unmount = null;
const NEEDS_ACCOUNT = ["register","post","messages","payments","myagents","profile"];
function go(view, params={}){
  if (FB.enabled && !USER && NEEDS_ACCOUNT.includes(view)) { signInDlg({view, params, role:regRole}); return; }
  if (view === "how") { go("home"); setTimeout(() => $("#how").scrollIntoView({behavior: reduceMotion ? "auto" : "smooth"}), 0); return; }
  if (view === "profile") { const r = role(); if (r === "guest") { go("register"); return; } setRole(r); renderDone(r, r === "client" ? meClient() : meAgent()); view = "done"; }
  if (view === "register") { const p = regRole === "client" ? meClient() : meAgent(); if (p && !params.edit) { renderDone(regRole, p); view = "done"; } }
  if (unmount) { unmount(); unmount = null; }
  current = {view, params};
  closeMenu();
  STATIC.forEach(v => $("#view-" + v).hidden = v !== view);
  $("#view-app").hidden = STATIC.includes(view);
  if (!STATIC.includes(view)) mountApp();
  renderNav();
  window.scrollTo({top:0});
}
document.addEventListener("click", e => {
  const b = e.target.closest("[data-go]");
  if (b && !b.closest("dialog")) { e.preventDefault(); if (b.dataset.role) setRole(b.dataset.role); const p = {}; if (b.dataset.id) p.id = b.dataset.id; go(b.dataset.go, p); return; }
  const a = e.target.closest("[data-act]"); if (!a) return;
  const id = a.dataset.id;
  ({
    fav: () => toggleFav(id), block: () => toggleBlock(id), msg: () => openThreadWith(id), hire: () => dlgHire(id),
    apply: () => dlgApply(id),
    withdraw: async () => { if (await confirmDlg("Withdraw application?", "The client will no longer see it.", "Withdraw", true)) Store.del(`applications/${id}__${UID}`); },
    offer: () => { const t = taskById(a.dataset.task), ag = agentById(id); if (requireRole("client","hire")) offerTask(t, ag, +a.dataset.rate || +ag.rate); },
    accept: async () => { const t = taskById(id); await Store.update(`tasks/${id}`, {status:"awaiting_funding", acceptedAt:now()}); await postMessage(threadIdFor(t.clientId, t.agentId), `${short(meAgent().name)} accepted the offer for “${t.title}”.`, true); },
    decline: async () => { const t = taskById(id); if (!await confirmDlg("Decline this offer?", "The task goes back to the client's open list.", "Decline", true)) return; await Store.update(`tasks/${id}`, {status:"open", agentId:null, agentName:null, rate:null}); await postMessage(threadIdFor(t.clientId, UID), `${short(meAgent().name)} declined the offer for “${t.title}”.`, true); },
    unoffer: async () => { if (!await confirmDlg("Withdraw your offer?", "The task goes back to open.", "Withdraw offer", true)) return; await Store.update(`tasks/${id}`, {status:"open", agentId:null, agentName:null, rate:null}); },
    cancel: async () => { if (await confirmDlg("Cancel this task?", "Agents can no longer apply.", "Cancel task", true)) Store.update(`tasks/${id}`, {status:"cancelled"}); },
    fund: () => dlgFund(id), log: () => dlgLogHours(id, a.dataset.behalf === "1"),
    approve: () => approveHours(id), reject: () => rejectHours(id),
    complete: () => completeTask(id), end: () => dlgEnd(id), review: () => dlgReview(id),
    rehire: () => { if (requireRole("client", "rehire agents")) go("post", {direct:id}); },
    method: async () => { PREFS.method = id; await savePrefs(); refresh(); },
    tab: () => { current.params.tab = id; mountApp(); },
    signin: () => signInDlg({view:current.view, params:current.params}),
    signout: async () => { if (await confirmDlg("Sign out?", "You can sign back in any time.", "Sign out")) FB.signOut(); },
  }[a.dataset.act] || (() => {}))();
});

/* ================= app views ================= */
const app = $("#view-app");
const V = {};
function mountApp(){
  const v = V[current.view]; if (!v) { go("home"); return; }
  if (!READY) { app.innerHTML = `<div class="wrap page"><p class="muted">Loading…</p></div>`; return; }
  v.mount(app, current.params || {});
}
function refresh(){
  if (STATIC.includes(current.view)) { if (current.view === "done") { const r = role(); const p = regRole === "client" ? meClient() : meAgent(); if (p) renderDone(regRole, p); } return; }
  if (!READY) return;
  const v = V[current.view]; if (!v) return;
  v.update ? v.update(app, current.params) : v.mount(app, current.params);
}
const head = (title, sub, actions="", back="") => `${back}<div class="pagehead"><div><h2>${title}</h2>${sub ? `<p>${sub}</p>` : ""}</div><div class="btnrow">${actions}</div></div>`;
const backBtn = (to, label) => `<button class="back" data-go="${to}">← ${label}</button>`;
const pill = s => `<span class="pill ${esc(s)}">${esc(STATUS[s] || s)}</span>`;
const ratingTxt = st => st.count ? `<span class="stars" aria-hidden="true">★</span> ${st.avg.toFixed(1)} <span class="muted">(${st.count})</span>` : `<span class="muted">New</span>`;
const emptyBox = (msg, btn="") => `<div class="empty"><p>${msg}</p>${btn}</div>`;

function agentCard(a, extra=""){
  const st = agentStats(a.id), r = role(), fav = PREFS.favorites.includes(a.id), mine = a.id === UID;
  const skills = (a.skills || []);
  return `<article class="card">
    <div class="agenthead"><div class="avatar">${esc(inits(a.name))}</div>
      <div><h3>${esc(short(a.name))} ${mine ? '<span class="tag">You</span>' : ""}${a.sample ? ' <span class="tag sample">Sample</span>' : ""}</h3><div class="muted sm">${esc(a.city)}, ${esc(a.country)}</div></div>
      ${r === "client" && !mine ? `<button class="iconbtn" data-act="fav" data-id="${esc(a.id)}" aria-pressed="${fav}" aria-label="${fav ? "Remove from" : "Add to"} favorites">★</button>` : ""}</div>
    <div class="meta"><span>${ratingTxt(st)}</span><span>${st.jobs} jobs</span><span class="price">${money(a.rate)}/hr</span></div>
    <div class="taglist">${skills.slice(0,3).map(s => `<span class="tag">${esc(s)}</span>`).join("")}${skills.length > 3 ? `<span class="tag">+${skills.length - 3}</span>` : ""}</div>
    <div class="muted sm">${esc((a.languages || []).join(", "))}</div>
    ${extra}
    <div class="cardfoot"><button class="btn ghost xs" data-go="agent" data-id="${esc(a.id)}">View profile</button>${!mine ? `<button class="btn ghost xs" data-act="msg" data-id="${esc(a.id)}">Message</button>${r !== "agent" ? `<button class="btn primary xs" data-act="hire" data-id="${esc(a.id)}">Hire</button>` : ""}` : ""}</div>
  </article>`;
}

/* ---- directory ---- */
const F = {q:"", skill:"", lang:"", max:"", country:"", sort:"rating", favs:false};
V.agents = {
  mount(el){
    const countries = [...new Set(S.agents.map(a => a.country))].sort();
    el.innerHTML = `<div class="wrap page">${head("Find an agent", "Real people with verified skills, rated by the clients they've worked for.", role() === "client" ? `<button class="btn primary sm" data-go="post">Post a task instead</button>` : "")}
      <div class="toolbar">
        <input type="search" id="f_q" placeholder="Search names, skills, introductions" value="${esc(F.q)}" aria-label="Search agents">
        <select id="f_skill" aria-label="Skill"><option value="">Any skill</option>${TASKS.map(t => `<option${t === F.skill ? " selected" : ""}>${t}</option>`).join("")}</select>
        <select id="f_lang" aria-label="Language"><option value="">Any language</option>${LANGS.map(t => `<option${t === F.lang ? " selected" : ""}>${t}</option>`).join("")}</select>
        <select id="f_country" aria-label="Country"><option value="">Any country</option>${countries.map(t => `<option${t === F.country ? " selected" : ""}>${esc(t)}</option>`).join("")}</select>
        <div class="money"><input type="number" id="f_max" min="1" step="0.5" placeholder="Max rate" value="${esc(F.max)}" aria-label="Maximum hourly rate"></div>
        <select id="f_sort" aria-label="Sort by"><option value="rating">Top rated</option><option value="rate">Lowest rate</option><option value="jobs">Most jobs</option><option value="new">Newest</option></select>
      </div>
      ${role() === "client" ? `<label class="check sm" style="margin:0 0 20px"><input type="checkbox" id="f_favs"${F.favs ? " checked" : ""}> Favorites only</label>` : '<div style="height:12px"></div>'}
      <div id="agentList"></div></div>`;
    $("#f_sort").value = F.sort;
    const bind = (id, k, ev="input") => { const i = $(id); if (i) i.addEventListener(ev, () => { F[k] = i.type === "checkbox" ? i.checked : i.value; this.update(); }); };
    bind("#f_q","q"); bind("#f_skill","skill","change"); bind("#f_lang","lang","change"); bind("#f_country","country","change"); bind("#f_max","max"); bind("#f_sort","sort","change"); bind("#f_favs","favs","change");
    this.update();
  },
  update(){
    const box = $("#agentList"); if (!box) return;
    const q = F.q.trim().toLowerCase();
    let list = S.agents.filter(a => !PREFS.blocked.includes(a.id))
      .filter(a => !q || [a.name, a.bio, a.city, a.country, ...(a.skills || [])].join(" ").toLowerCase().includes(q))
      .filter(a => !F.skill || (a.skills || []).includes(F.skill))
      .filter(a => !F.lang || (a.languages || []).includes(F.lang))
      .filter(a => !F.country || a.country === F.country)
      .filter(a => !F.max || +a.rate <= +F.max)
      .filter(a => !F.favs || PREFS.favorites.includes(a.id));
    const st = Object.fromEntries(list.map(a => [a.id, agentStats(a.id)]));
    const sorters = {rating:(x,y) => (st[y.id].avg - st[x.id].avg) || (st[y.id].count - st[x.id].count), rate:(x,y) => x.rate - y.rate, jobs:(x,y) => st[y.id].jobs - st[x.id].jobs, new:(x,y) => String(y.createdAt).localeCompare(String(x.createdAt))};
    list.sort(sorters[F.sort] || sorters.rating);
    const hidden = PREFS.blocked.length;
    box.innerHTML = (list.length ? `<p class="muted sm" style="margin:0 0 14px">${list.length} agent${list.length === 1 ? "" : "s"}${hidden ? `, ${hidden} hidden because you chose not to match with them` : ""}</p><div class="grid">${list.map(a => agentCard(a)).join("")}</div>`
      : emptyBox(S.agents.length ? "No agents match these filters. Try a different skill or a higher maximum rate." : "No agents have registered yet.", `<button class="btn primary sm" data-go="register" data-role="agent">Register as an agent</button>`));
  }
};

/* ---- agent profile ---- */
V.agent = { mount(el, p){
  const a = agentById(p.id);
  if (!a) { el.innerHTML = `<div class="wrap page">${backBtn("agents","All agents")}${emptyBox("This agent profile isn't available.")}</div>`; return; }
  const st = agentStats(a.id), r = role(), fav = PREFS.favorites.includes(a.id), blocked = PREFS.blocked.includes(a.id), mine = a.id === UID;
  const together = S.tasks.filter(t => t.clientId === UID && t.agentId === a.id);
  el.innerHTML = `<div class="wrap page">${backBtn("agents","All agents")}
    <div class="cols"><div class="stack">
      <div class="card"><div class="agenthead"><div class="avatar lg">${esc(inits(a.name))}</div>
        <div><h2 style="margin:0">${esc(short(a.name))}</h2><div class="muted">${esc(a.city)}, ${esc(a.country)} · ${esc(a.timezone || "")}</div>
        <div class="taglist" style="margin-top:8px">${a.sample ? '<span class="tag sample">Sample profile</span>' : ""}${fav ? '<span class="tag fav">Favorite</span>' : ""}${blocked ? '<span class="tag block">Not matched with you</span>' : ""}${mine ? '<span class="tag">You</span>' : ""}</div></div></div>
        ${a.bio ? `<p class="desc" style="margin-top:6px">${esc(a.bio)}</p>` : ""}
        <dl class="dl" style="margin:8px 0 0">
          <dt>Skills</dt><dd>${esc((a.skills || []).join(", "))}</dd>
          <dt>Languages</dt><dd>${esc((a.languages || []).join(", "))} <span class="muted">(English: ${esc(String(a.englishLevel || "").toLowerCase())})</span></dd>
          <dt>Availability</dt><dd>${esc(a.hoursPerWeek)} hrs/week${(a.shifts || []).length ? ", " + esc(a.shifts.join(", ").toLowerCase()) : ""}</dd>
          <dt>Equipment</dt><dd>${esc(a.equipment || "—")}</dd>
        </dl></div>
      <div class="card"><h3>Reviews</h3>${st.reviews.length ? st.reviews.map(rv => `<div style="border-top:1px solid var(--line);padding-top:12px"><div class="meta"><span class="stars" aria-label="${rv.rating} out of 5">${"★".repeat(rv.rating)}<span style="color:var(--line2)">${"★".repeat(5 - rv.rating)}</span></span><span>${esc(rv.clientName || "Client")}</span><span class="muted">${fmtDate(rv.at)}</span></div>${rv.text ? `<p class="desc" style="margin-top:6px">${esc(rv.text)}</p>` : ""}</div>`).join("") : '<p class="muted">No reviews yet.</p>'}</div>
    </div>
    <div class="stack"><div class="card">
      <div class="stats"><div class="stat"><span>Rate</span><b>${money(a.rate)}/hr</b></div><div class="stat"><span>Rating</span><b>${st.count ? st.avg.toFixed(1) : "New"}</b></div><div class="stat"><span>Jobs done</span><b>${st.jobs}</b></div></div>
      ${!mine ? `<div class="btnrow">${r !== "agent" ? `<button class="btn primary sm" data-act="hire" data-id="${esc(a.id)}">${together.length ? "Rehire" : "Hire"}</button>` : ""}<button class="btn ghost sm" data-act="msg" data-id="${esc(a.id)}">Message</button>
        ${r === "client" ? `<button class="btn ghost sm" data-act="fav" data-id="${esc(a.id)}">${fav ? "Remove favorite" : "Add to favorites"}</button><button class="btn ${blocked ? "ghost" : "danger"} sm" data-act="block" data-id="${esc(a.id)}">${blocked ? "Match with me again" : "Don't match me"}</button>` : ""}</div>` : `<button class="btn ghost sm" data-go="register" data-role="agent">Edit your profile</button>`}
      ${a.sample ? `<p class="muted xs" style="margin:0">Sample profiles let you try the whole flow. They accept offers automatically and won't reply to messages.</p>` : ""}
    </div>
    ${together.length ? `<div class="card"><h3>Your work together</h3>${together.map(t => `<div class="meta"><button class="link" data-go="task" data-id="${esc(t.id)}">${esc(t.title)}</button>${pill(t.status)}</div>`).join("")}</div>` : ""}
    </div></div></div>`;
}};

/* ---- tasks list ---- */
function taskRow(t, opts={}){
  const m = taskMoney(t), est = +t.estHours * (+t.rate || +t.budgetMax);
  return `<tr class="click" data-go="task" data-id="${esc(t.id)}"><td><b style="font-weight:500">${esc(t.title)}</b><div class="muted xs">${esc(t.category)}${opts.client ? ` · ${esc(t.clientName ? short(t.clientName) : "Client")}` : ""}</div></td>
    <td>${pill(t.status)}</td><td>${t.agentName ? esc(short(t.agentName)) : `<span class="muted">${S.applications.filter(a => a.taskId === t.id).length} applicants</span>`}</td>
    <td class="num">${t.rate ? money(t.rate) + "/hr" : `${money(t.budgetMin)}–${money(t.budgetMax)}`}</td>
    <td class="num">${t.funded ? money(m.balance) : `<span class="muted">~${money(est)}</span>`}</td><td class="muted sm">${fmtDate(t.createdAt)}</td></tr>`;
}
V.tasks = { mount(el, p){
  const r = role();
  if (r === "client") {
    const mine = S.tasks.filter(t => t.clientId === UID).sort((a,b) => String(b.createdAt).localeCompare(String(a.createdAt)));
    const live = mine.filter(t => ["open","offered","awaiting_funding","active"].includes(t.status)), past = mine.filter(t => !live.includes(t));
    const tbl = list => `<div class="card tablewrap" style="padding:8px 12px"><table class="t"><thead><tr><th>Task</th><th>Status</th><th>Agent</th><th class="num">Rate</th><th class="num">Escrow</th><th>Posted</th></tr></thead><tbody>${list.map(t => taskRow(t)).join("")}</tbody></table></div>`;
    el.innerHTML = `<div class="wrap page">${head("My tasks", "Post work, review applicants and manage escrow.", `<button class="btn primary sm" data-go="post">Post a task</button>`)}
      ${mine.length ? `${live.length ? `<h3>Active</h3>${tbl(live)}` : ""}${past.length ? `<h3 style="margin-top:32px">Past</h3>${tbl(past)}` : ""}` : emptyBox("You haven't posted a task yet. Describe the work and we'll show you matched agents and a price estimate.", `<button class="btn primary sm" data-go="post">Post your first task</button>`)}</div>`;
    return;
  }
  const open = S.tasks.filter(t => t.status === "open").sort((a,b) => String(b.createdAt).localeCompare(String(a.createdAt)));
  if (r === "guest") {
    el.innerHTML = `<div class="wrap page">${head("Open tasks", "Work clients have posted. Register as an agent to apply.", `<button class="btn primary sm" data-go="register" data-role="agent">Register as an agent</button>`)}
      ${open.length ? `<div class="card tablewrap" style="padding:8px 12px"><table class="t"><thead><tr><th>Task</th><th>Status</th><th>Agent</th><th class="num">Budget</th><th class="num">Est. value</th><th>Posted</th></tr></thead><tbody>${open.map(t => taskRow(t, {client:true})).join("")}</tbody></table></div>` : emptyBox("No open tasks right now.")}</div>`;
    return;
  }
  const me = meAgent(), tab = p.tab || "find";
  const myWork = S.tasks.filter(t => t.agentId === UID).sort((a,b) => String(b.offeredAt).localeCompare(String(a.offeredAt)));
  const myApps = S.applications.filter(a => a.agentId === UID);
  const offers = myWork.filter(t => t.status === "offered").length;
  let body = "";
  if (tab === "find") {
    const ranked = open.map(t => ({t, ...match(t, me)})).sort((x,y) => y.score - x.score);
    body = ranked.length ? `<div class="grid">${ranked.map(({t, score, why}) => {
      const applied = myApps.some(a => a.taskId === t.id), own = t.clientId === UID;
      return `<article class="card"><div class="meta"><span>${esc(t.category)}</span><span class="price">${money(t.budgetMin)}–${money(t.budgetMax)}/hr</span></div>
        <h3>${esc(t.title)}</h3><p class="muted sm" style="display:-webkit-box;-webkit-line-clamp:3;-webkit-box-orient:vertical;overflow:hidden">${esc(t.description)}</p>
        <div><div class="meta" style="margin-bottom:6px"><span>${score}% match</span><span class="muted">~${+t.estHours} hrs, ${esc(t.arrangement || "")}</span></div><div class="bar"><i style="width:${score}%"></i></div><div class="why" style="margin-top:6px">${esc(why.join(" · "))}</div></div>
        <div class="cardfoot"><button class="btn ghost xs" data-go="task" data-id="${esc(t.id)}">View</button>${own ? '<span class="tag">Your task</span>' : applied ? '<span class="tag">Applied</span>' : `<button class="btn primary xs" data-act="apply" data-id="${esc(t.id)}">Apply</button>`}</div></article>`;
    }).join("")}</div>` : emptyBox("No open tasks right now. New tasks that match your skills will appear here.");
  } else if (tab === "work") {
    body = myWork.length ? `<div class="card tablewrap" style="padding:8px 12px"><table class="t"><thead><tr><th>Task</th><th>Status</th><th>Agent</th><th class="num">Rate</th><th class="num">Escrow</th><th>Posted</th></tr></thead><tbody>${myWork.map(t => taskRow(t)).join("")}</tbody></table></div>` : emptyBox("No work yet. Apply to open tasks to get hired.");
  } else {
    body = myApps.length ? `<div class="card tablewrap" style="padding:8px 12px"><table class="t"><thead><tr><th>Task</th><th class="num">Your rate</th><th>Sent</th><th></th></tr></thead><tbody>${myApps.map(ap => { const t = taskById(ap.taskId); return t ? `<tr><td><button class="link" data-go="task" data-id="${esc(t.id)}">${esc(t.title)}</button></td><td class="num">${money(ap.rate)}</td><td class="muted sm">${fmtDate(ap.at)}</td><td>${t.status === "open" ? `<button class="btn ghost xs" data-act="withdraw" data-id="${esc(t.id)}">Withdraw</button>` : (t.agentId === UID ? pill(t.status) : '<span class="pill cancelled">Closed</span>')}</td></tr>` : ""; }).join("")}</tbody></table></div>` : emptyBox("You haven't applied to anything yet.");
  }
  el.innerHTML = `<div class="wrap page">${head("Find work", `Open tasks ranked by how well they fit your skills, languages and rate.`)}
    <div class="tabs" role="tablist"><button role="tab" data-act="tab" data-id="find" aria-selected="${tab === "find"}">Open tasks (${open.length})</button><button role="tab" data-act="tab" data-id="work" aria-selected="${tab === "work"}">My work${offers ? ` · ${offers} new offer${offers > 1 ? "s" : ""}` : ""}</button><button role="tab" data-act="tab" data-id="apps" aria-selected="${tab === "apps"}">Applications (${myApps.length})</button></div>
    ${body}</div>`;
}};

/* ---- task detail ---- */
V.task = { mount(el, p){
  const t = taskById(p.id);
  if (!t) { el.innerHTML = `<div class="wrap page">${backBtn("tasks","Tasks")}${emptyBox("This task isn't available.")}</div>`; return; }
  const r = role(), isClient = t.clientId === UID && r === "client", isAgent = t.agentId === UID && r === "agent";
  const m = taskMoney(t), apps = S.applications.filter(a => a.taskId === t.id);
  const estLo = quote(+t.estHours * +t.budgetMin, t.payMethod || PREFS.method), estHi = quote(+t.estHours * (+t.rate || +t.budgetMax), t.payMethod || PREFS.method);
  const first = n => esc(String(n || "").split(" ")[0]);
  let actions = "", side = "";

  if (isClient) {
    if (t.status === "open") actions = `<button class="btn danger sm" data-act="cancel" data-id="${esc(t.id)}">Cancel task</button>`;
    if (t.status === "offered") actions = `<button class="btn ghost sm" data-act="unoffer" data-id="${esc(t.id)}">Withdraw offer</button>`;
    if (t.status === "awaiting_funding") actions = `<button class="btn primary sm" data-act="fund" data-id="${esc(t.id)}">Fund escrow</button><button class="btn ghost sm" data-act="unoffer" data-id="${esc(t.id)}">Withdraw offer</button>`;
    if (t.status === "active") actions = `<button class="btn ghost sm" data-act="fund" data-id="${esc(t.id)}">Add funds</button><button class="btn primary sm" data-act="complete" data-id="${esc(t.id)}">Mark complete</button><button class="btn danger sm" data-act="end" data-id="${esc(t.id)}">End contract</button>`;
    if (["completed","ended"].includes(t.status)) actions = `<button class="btn primary sm" data-act="rehire" data-id="${esc(t.agentId)}">Rehire ${first(t.agentName)}</button><button class="btn ghost sm" data-act="review" data-id="${esc(t.id)}">${S.reviews.some(x => x.id === t.id) ? "Edit review" : "Leave review"}</button>`;
    if (t.agentId) actions += `<button class="btn ghost sm" data-act="msg" data-id="${esc(t.agentId)}">Message</button>`;
  } else if (isAgent) {
    if (t.status === "offered") actions = `<button class="btn primary sm" data-act="accept" data-id="${esc(t.id)}">Accept offer</button><button class="btn ghost sm" data-act="decline" data-id="${esc(t.id)}">Decline</button>`;
    if (t.status === "active") actions = `<button class="btn primary sm" data-act="log" data-id="${esc(t.id)}">Log hours</button>`;
    actions += `<button class="btn ghost sm" data-act="msg" data-id="${esc(t.clientId)}">Message client</button>`;
  } else if (t.status === "open" && r !== "client") {
    const applied = apps.some(a => a.agentId === UID);
    actions = applied ? `<span class="tag">Applied</span><button class="btn ghost sm" data-act="withdraw" data-id="${esc(t.id)}">Withdraw</button>` : `<button class="btn primary sm" data-act="apply" data-id="${esc(t.id)}">Apply</button>`;
  }

  const banner = {
    offered: isClient ? `Waiting for <b>${esc(short(t.agentName))}</b> to accept your offer at ${money(t.rate)}/hr.` : isAgent ? `<b>You've been offered this task</b> at ${money(t.rate)}/hr. Accept to start once the client funds escrow.` : "",
    awaiting_funding: isClient ? `<b>${esc(short(t.agentName))} accepted.</b> Fund escrow so they can start. You'll only pay for hours you approve.` : isAgent ? "You accepted. Work starts once the client funds escrow." : "",
    active: isClient && m.pending ? `<b>${m.pendingHrs} hours waiting for approval</b> (${money(m.pending)}).` : isAgent ? `Escrow holds ${money(m.balance)}. Log hours as you work; they're paid when the client approves.` : "",
    ended: t.endReason ? `Contract ended ${fmtDate(t.endedAt)}. Reason: ${esc(t.endReason)}.${t.endNote ? " " + esc(t.endNote) : ""}` : "",
  }[t.status] || "";

  // escrow + hours
  let money_ = "";
  if (t.agentId && (isClient || isAgent)) {
    const behalf = isClient && t.agentSample && t.status === "active";
    money_ = `<div class="card"><div class="meta"><h3 style="margin:0">Escrow and hours</h3>${behalf ? `<button class="btn ghost xs" style="margin-left:auto" data-act="log" data-id="${esc(t.id)}" data-behalf="1">Log hours for sample agent (test)</button>` : ""}</div>
      <div class="stats"><div class="stat"><span>Funded</span><b>${money(m.funded)}</b></div><div class="stat"><span>Paid to agent</span><b>${money(m.approved)}</b></div><div class="stat"><span>Pending approval</span><b>${money(m.pending)}</b></div><div class="stat"><span>${["completed","ended"].includes(t.status) ? "Refunded" : "Available"}</span><b>${money(["completed","ended"].includes(t.status) ? m.refunded : m.free)}</b></div></div>
      ${m.hs.length ? `<div class="tablewrap"><table class="t"><thead><tr><th>Date</th><th>Work</th><th class="num">Hours</th><th class="num">Amount</th><th>Status</th>${isClient ? "<th></th>" : ""}</tr></thead><tbody>${m.hs.map(h => `<tr><td class="sm">${fmtDate(h.date)}</td><td class="sm" style="max-width:280px">${esc(h.note)}</td><td class="num">${+h.hours}</td><td class="num">${money(h.amount)}</td><td><span class="pill ${esc(h.status)}">${esc(h.status[0].toUpperCase() + h.status.slice(1))}</span></td>${isClient ? `<td>${h.status === "pending" ? `<div class="btnrow" style="flex-wrap:nowrap"><button class="btn primary xs" data-act="approve" data-id="${esc(h.id)}">Approve</button><button class="btn ghost xs" data-act="reject" data-id="${esc(h.id)}">Reject</button></div>` : ""}</td>` : ""}</tr>`).join("")}</tbody></table></div>` : `<p class="muted sm" style="margin:0">No hours logged yet.</p>`}
    </div>`;
  }

  // applicants & matches for the client on open tasks
  let hiring = "";
  if (isClient && t.status === "open") {
    const appRows = apps.map(ap => { const a = agentById(ap.agentId); if (!a) return ""; const mm = match(t, a); return `<tr><td><div class="agenthead"><div class="avatar sm">${esc(inits(a.name))}</div><div><button class="link" data-go="agent" data-id="${esc(a.id)}">${esc(short(a.name))}</button><div class="muted xs">${esc(a.country)}</div></div></div></td><td class="sm" style="max-width:260px">${esc(ap.note) || '<span class="muted">No note</span>'}</td><td class="num">${mm.score}%</td><td class="num">${money(ap.rate)}</td><td><div class="btnrow" style="flex-wrap:nowrap"><button class="btn primary xs" data-act="offer" data-task="${esc(t.id)}" data-id="${esc(a.id)}" data-rate="${+ap.rate}">Hire</button><button class="btn ghost xs" data-act="msg" data-id="${esc(a.id)}">Message</button></div></td></tr>`; }).join("");
    hiring = `<div class="card"><h3>Applicants (${apps.length})</h3>${apps.length ? `<div class="tablewrap"><table class="t"><thead><tr><th>Agent</th><th>Note</th><th class="num">Match</th><th class="num">Rate</th><th></th></tr></thead><tbody>${appRows}</tbody></table></div>` : '<p class="muted sm" style="margin:0">No applications yet. You can also offer the task to one of your top matches below.</p>'}</div>
      <div><h3>Top matches</h3><div class="grid">${matchesFor(t).map(({a, score, why}) => agentCard(a, `<div><div class="meta" style="margin-bottom:6px"><span>${score}% match</span></div><div class="bar"><i style="width:${score}%"></i></div><div class="why" style="margin-top:6px">${esc(why.join(" · "))}</div></div>`).replace(`data-act="hire" data-id="${esc(a.id)}">Hire`, `data-act="offer" data-task="${esc(t.id)}" data-id="${esc(a.id)}" data-rate="${+a.rate}">Offer task`)).join("") || '<p class="muted">No agents registered yet.</p>'}</div></div>`;
  }

  side = `<div class="card"><h3>Details</h3><dl class="dl" style="grid-template-columns:120px 1fr;margin:0">
    <dt>Client</dt><dd>${esc(short(t.clientName))}${clientById(t.clientId) ? `, ${esc(clientById(t.clientId).country)}` : ""}</dd>
    <dt>Agent</dt><dd>${t.agentId ? `<button class="link" data-go="agent" data-id="${esc(t.agentId)}">${esc(short(t.agentName))}</button>` : "Not hired yet"}</dd>
    <dt>${t.rate ? "Rate" : "Budget"}</dt><dd>${t.rate ? money(t.rate) + "/hr" : `${money(t.budgetMin)}–${money(t.budgetMax)}/hr`}</dd>
    <dt>Estimate</dt><dd>~${+t.estHours} hours, ${esc(String(t.arrangement || "").toLowerCase())}</dd>
    <dt>Languages</dt><dd>${esc((t.languages || []).join(", ") || "Any")}</dd>
    <dt>Deadline</dt><dd>${t.deadline ? fmtDate(t.deadline) : "Flexible"}</dd>
    ${t.payMethod ? `<dt>Paid with</dt><dd>${esc(M[t.payMethod]?.name || t.payMethod)}</dd>` : ""}</dl></div>
    ${isClient && !t.funded ? `<div class="card"><h3>Price estimate</h3><p class="muted sm">${t.rate ? `${+t.estHours} hrs at ${money(t.rate)}/hr` : `${+t.estHours} hrs at ${money(t.budgetMin)}–${money(t.budgetMax)}/hr`}, paid by ${esc(estHi.m.name)}</p>${t.rate ? quoteHTML(estHi) : `<div class="quote"><div class="total"><span>Total</span><b>${money(estLo.total)}–${money(estHi.total)}</b></div><div><span>Includes 10% service fee and estimated processing</span></div></div>`}</div>` : ""}`;

  el.innerHTML = `<div class="wrap page">${backBtn("tasks", r === "agent" ? "Find work" : "My tasks")}
    <div class="pagehead"><div><div class="meta" style="margin-bottom:8px">${pill(t.status)}<span>${esc(t.category)}</span><span class="muted">Posted ${fmtDate(t.createdAt)}</span></div><h2>${esc(t.title)}</h2></div><div class="btnrow">${actions}</div></div>
    ${banner ? `<div class="banner" style="margin-bottom:20px">${banner}</div>` : ""}
    <div class="cols"><div class="stack"><div class="card"><h3>Description</h3><p class="desc">${esc(t.description) || '<span class="muted">No description.</span>'}</p></div>${money_}${hiring}</div><div class="stack">${side}</div></div></div>`;
}};

/* ---- post a task ---- */
V.post = { mount(el, p){
  if (!meClient()) { el.innerHTML = `<div class="wrap page">${emptyBox("Create a client profile to post tasks.", `<button class="btn primary sm" data-go="register" data-role="client">Create client profile</button>`)}</div>`; return; }
  if (role() !== "client") { ACT = "client"; renderNav(); }
  const me = meClient(), direct = p.direct ? agentById(p.direct) : null;
  const last = direct ? S.tasks.filter(t => t.clientId === UID && t.agentId === direct.id).sort((a,b) => String(b.createdAt).localeCompare(String(a.createdAt)))[0] : null;
  const base = last || {category:(me.tasks || [])[0] || TASKS[0], languages:me.languages || ["English"], budgetMin:me.budgetMin || 4, budgetMax:me.budgetMax || 10, arrangement:me.arrangement || "Ongoing", estHours:TYPICAL_HOURS[(me.tasks || [])[0]] || 5, description:"", title:""};
  const pool = S.agents.filter(a => !PREFS.blocked.includes(a.id) && a.id !== UID);
  const past = new Set(S.tasks.filter(t => t.clientId === UID && t.agentId).map(t => t.agentId));
  const opt = a => `<option value="${esc(a.id)}"${direct?.id === a.id ? " selected" : ""}>${esc(short(a.name))}, ${money(a.rate)}/hr${PREFS.favorites.includes(a.id) ? " ★" : ""}</option>`;
  el.innerHTML = `<div class="wrap page">${backBtn("tasks","My tasks")}${head(direct ? `Rehire ${esc(short(direct.name))}` : "Post a task", direct ? `This task goes straight to ${esc(direct.name.split(" ")[0])} as an offer.` : "Describe the work. You'll see matched agents and can offer it directly or wait for applications.")}
    <form class="reg" id="postForm" novalidate>
      <fieldset><div class="legendcol"><legend>The work</legend><p>Clear instructions get better results.</p></div><div class="fields">
        <div class="full"><label for="p_title">Task title</label><input type="text" id="p_title" name="title" required maxlength="90" value="${esc(last ? last.title : "")}" placeholder="e.g. Daily inbox triage for a design studio"><div class="err">Give the task a title.</div></div>
        <div><label for="p_cat">Type of work</label><select id="p_cat" name="category">${TASKS.map(t => `<option${t === base.category ? " selected" : ""}>${t}</option>`).join("")}</select></div>
        <div><label for="p_deadline">Deadline (optional)</label><input type="date" id="p_deadline" name="deadline" min="${today()}"></div>
        <div class="full"><label for="p_desc">Instructions</label><textarea id="p_desc" name="description" required placeholder="What needs doing, how often, which tools or accounts are involved, and what “done” looks like.">${esc(last ? last.description : "")}</textarea><div class="err">Add instructions so agents know what to expect.</div><div class="hint">Never paste passwords here. Share account access through each service's delegate or team-member settings after you hire.</div></div>
        <div class="full" data-group="langs"><label>Languages needed</label><div class="chips">${LANGS.map(l => `<label class="chip"><input type="checkbox" name="languages" value="${l}"${(base.languages || []).includes(l) ? " checked" : ""}><span>${l}</span></label>`).join("")}</div><div class="err">Pick at least one language.</div></div>
      </div></fieldset>
      <fieldset><div class="legendcol"><legend>Budget and estimate</legend><p>See the full cost before you post.</p></div><div class="fields">
        <div data-group="budget"><label>Hourly budget (USD)</label><div class="range2"><div class="money"><input type="number" name="budgetMin" id="p_min" min="1" step="0.5" value="${+base.budgetMin}" aria-label="Minimum hourly budget"></div><span>to</span><div class="money"><input type="number" name="budgetMax" id="p_max" min="1" step="0.5" value="${+base.budgetMax}" aria-label="Maximum hourly budget"></div></div><div class="err">Maximum must be at least the minimum.</div></div>
        <div data-group="hrs"><label for="p_hrs">Estimated hours</label><input type="number" id="p_hrs" name="estHours" min="0.5" step="0.5" value="${+base.estHours}"><div class="hint" id="p_hint"></div><div class="err">Enter at least half an hour.</div></div>
        <div><label>Arrangement</label><div class="seg">${["One-off","Ongoing"].map(v => `<label class="chip"><input type="radio" name="arrangement" value="${v}"${v === base.arrangement ? " checked" : ""}><span>${v === "One-off" ? "One-off task" : "Ongoing"}</span></label>`).join("")}</div></div>
        <div><label for="p_method">Estimate with</label><select id="p_method" name="payMethod">${methodOptions(PREFS.method)}</select></div>
        <div class="full card" style="background:var(--bg2)" id="p_est"></div>
      </div></fieldset>
      <fieldset><div class="legendcol"><legend>Who can take it</legend><p>Post publicly, or offer it to someone you know.</p></div><div class="fields">
        <div class="full"><label for="p_to">Send to</label><select id="p_to" name="directTo"><option value="">Everyone. Agents apply and I choose.</option>
          ${PREFS.favorites.length ? `<optgroup label="Favorites">${pool.filter(a => PREFS.favorites.includes(a.id)).map(opt).join("")}</optgroup>` : ""}
          ${past.size ? `<optgroup label="Worked with before">${pool.filter(a => past.has(a.id) && !PREFS.favorites.includes(a.id)).map(opt).join("")}</optgroup>` : ""}
          <optgroup label="All agents">${pool.filter(a => !past.has(a.id) && !PREFS.favorites.includes(a.id)).map(opt).join("")}</optgroup></select></div>
      </div></fieldset>
      <div class="submitrow"><span class="status" data-status></span><button class="btn primary" type="submit">${direct ? "Send offer" : "Post task"}</button></div>
    </form></div>`;
  const f = $("#postForm");
  const upd = () => {
    const lo = +$("#p_min").value || 0, hi = +$("#p_max").value || 0, hrs = +$("#p_hrs").value || 0, mid = $("#p_method").value;
    const to = agentById($("#p_to").value);
    $("#p_hint").textContent = `Typical for ${$("#p_cat").value.toLowerCase()}: about ${TYPICAL_HOURS[$("#p_cat").value]} hrs a week.`;
    if (!(hrs > 0 && lo > 0)) { $("#p_est").innerHTML = '<p class="muted sm">Enter hours and budget to see an estimate.</p>'; return; }
    if (to) { $("#p_est").innerHTML = `<p class="muted sm" style="margin:0 0 10px">${hrs} hrs at ${esc(short(to.name))}'s rate of ${money(to.rate)}/hr</p>${quoteHTML(quote(hrs * to.rate, mid))}`; return; }
    const a = quote(hrs * lo, mid), b = quote(hrs * Math.max(lo, hi), mid);
    $("#p_est").innerHTML = `<p class="muted sm" style="margin:0 0 10px">${hrs} hrs at ${money(lo)}–${money(Math.max(lo,hi))}/hr</p><div class="quote">
      <div><span>Agent pay</span><b>${money(a.sub)}–${money(b.sub)}</b></div><div><span>Caravan service fee (10%)</span><b>${money(a.service)}–${money(b.service)}</b></div>
      <div><span>Processing, ${esc(a.m.name)} (estimated)</span><b>${money(a.proc)}–${money(b.proc)}</b></div><div class="total"><span>Estimated total</span><b>${money(a.total)}–${money(b.total)}</b></div></div>
      <p class="muted xs" style="margin:10px 0 0">You only pay for hours you approve. Unused escrow is refunded.</p>`;
  };
  f.addEventListener("input", e => { const g = e.target.closest(".invalid"); if (g) g.classList.remove("invalid"); upd(); });
  f.addEventListener("change", upd); upd();
  f.addEventListener("submit", async e => {
    e.preventDefault();
    const fd = new FormData(f), o = {}; for (const [k, v] of fd.entries()) { if (k === "languages") (o[k] ||= []).push(v); else o[k] = String(v).trim(); }
    o.languages ||= [];
    let ok = true; const mark = (sel, bad) => { $(sel).closest("[data-group]")?.classList.toggle("invalid", bad) ?? $(sel).parentElement.classList.toggle("invalid", bad); if (bad) ok = false; };
    $("#p_title").parentElement.classList.toggle("invalid", !o.title); if (!o.title) ok = false;
    $("#p_desc").parentElement.classList.toggle("invalid", !o.description); if (!o.description) ok = false;
    mark("#p_min", !(+o.budgetMin >= 1) || +o.budgetMax < +o.budgetMin);
    mark("#p_hrs", !(+o.estHours >= 0.5));
    $("[data-group=langs]", f).classList.toggle("invalid", !o.languages.length); if (!o.languages.length) ok = false;
    if (!ok) { $("[data-status]", f).textContent = "Fix the highlighted fields to continue."; $(".invalid input, .invalid textarea", f)?.focus(); return; }
    const btn = $("button[type=submit]", f); btn.disabled = true; $("[data-status]", f).textContent = "Saving…";
    const id = rid();
    const task = {clientId:UID, clientName:me.name, title:o.title, category:o.category, description:o.description, languages:o.languages, budgetMin:r2(o.budgetMin), budgetMax:r2(o.budgetMax), estHours:r2(o.estHours), arrangement:o.arrangement, deadline:o.deadline || "", payMethod:"", status:"open", funded:0, refunded:0, createdAt:now()};
    await Store.set(`tasks/${id}`, task);
    const to = agentById(o.directTo);
    if (to) { await sleep(50); await offerTask({...task, id}, to, to.rate); }
    go("task", {id});
  });
}};

/* ---- messages ---- */
let msgUnsub = null, MSGS = [];
V.messages = {
  mount(el, p){
    if (role() === "guest") { el.innerHTML = `<div class="wrap page">${emptyBox("Create a profile to message clients and agents.", `<button class="btn primary sm" data-go="register" data-role="client">Get started</button>`)}</div>`; return; }
    el.innerHTML = `<div class="wrap page">${head("Messages", "Keep all work conversations here so there's a record if anything goes wrong.")}
      <div class="inbox${p.id ? " has-thread" : ""}" id="inbox"><div class="threads" id="threadList"></div>
      <div class="convo">${p.id ? `<div class="convohead" id="convoHead"></div><div class="msglist" id="msgList" aria-live="polite"></div>
        <form class="composer" id="composer"><textarea id="msgText" placeholder="Write a message" aria-label="Message"></textarea><button class="btn primary sm" type="submit">Send</button></form>` : `<div class="empty" style="margin:auto;border:0">Choose a conversation.</div>`}</div></div>
      <p class="muted xs" style="margin-top:10px">${Store.mode === "shared" ? "Only you and the other person in a conversation can read it." : "Demo mode: messages are saved in this browser only."}</p></div>`;
    if (msgUnsub) { msgUnsub(); msgUnsub = null; }
    MSGS = [];
    if (p.id) {
      // One array-contains filter needs no composite index; the thread is picked out here.
      msgUnsub = Store.watch("messages", list => { MSGS = list.filter(m => m.threadId === p.id).sort((a,b) => String(a.at).localeCompare(String(b.at))); this.renderMsgs(p.id); }, ["participants","array-contains",UID]);
      unmount = () => { if (msgUnsub) { msgUnsub(); msgUnsub = null; } };
      const ta = $("#msgText");
      ta.addEventListener("keydown", e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); $("#composer").requestSubmit(); } });
      $("#composer").addEventListener("submit", async e => { e.preventDefault(); const v = ta.value.trim(); if (!v) return; ta.value = ""; await postMessage(p.id, v); });
    }
    this.update(el, p);
  },
  update(el, p){
    const list = $("#threadList"); if (!list) return;
    const mine = S.threads.filter(t => (t.participants || []).includes(UID)).sort((a,b) => String(b.lastAt).localeCompare(String(a.lastAt)));
    const other = t => { const oid = t.clientId === UID ? t.agentId : t.clientId; const prof = oid === t.agentId ? agentById(oid) : clientById(oid); return {oid, name:prof?.name || "Unknown", sample:prof?.sample}; };
    list.innerHTML = mine.length ? mine.map(t => { const o = other(t); return `<button class="thread" data-go="messages" data-id="${esc(t.id)}" aria-current="${t.id === p.id}"><div class="avatar sm">${esc(inits(o.name))}</div><div><b>${esc(short(o.name))}${o.sample ? ' <span class="tag sample">Sample</span>' : ""}</b><span>${esc(t.lastText || "No messages yet")}</span></div></button>`; }).join("") : `<p class="muted sm" style="padding:16px">No conversations yet. Message an agent from the directory or a task.</p>`;
    if (p.id) {
      const t = S.threads.find(x => x.id === p.id), h = $("#convoHead");
      if (t && h) { const o = other(t); h.innerHTML = `<button class="back" data-go="messages" style="margin:0" aria-label="All conversations">←</button><div class="avatar sm">${esc(inits(o.name))}</div><div><b style="font-weight:500">${esc(short(o.name))}</b>${o.sample ? '<div class="muted xs">Sample profile, won\'t reply</div>' : ""}</div>${agentById(o.oid) && o.oid === t.agentId ? `<button class="btn ghost xs" style="margin-left:auto" data-go="agent" data-id="${esc(o.oid)}">View profile</button>` : ""}`; }
    }
  },
  renderMsgs(){
    const box = $("#msgList"); if (!box) return;
    const atBottom = box.scrollHeight - box.scrollTop - box.clientHeight < 60;
    box.innerHTML = MSGS.length ? MSGS.map(m => `<div class="bubble ${m.from === "system" ? "sys" : m.from === UID ? "me" : ""}">${esc(m.text)}<time>${fmtTime(m.at)}</time></div>`).join("") : `<p class="muted sm" style="margin:auto">Say hello. Agree on scope and timing before work starts.</p>`;
    if (atBottom || box.dataset.init !== "1") { box.scrollTop = box.scrollHeight; box.dataset.init = "1"; }
  }
};

/* ---- payments ---- */
function ledgerTable(rows, who){
  const lbl = {fund:"Paid into escrow", release:"Released to agent", refund:"Refunded"};
  return rows.length ? `<div class="tablewrap"><table class="t"><thead><tr><th>Date</th><th>Activity</th><th>Task</th><th>Method</th><th class="num">Amount</th></tr></thead><tbody>${rows.map(l => `<tr><td class="sm">${fmtDate(l.at)}</td><td>${who === "agent" && l.type === "release" ? "Paid to you" : lbl[l.type] || esc(l.type)}${l.hours ? ` <span class="muted xs">${+l.hours} h</span>` : ""}</td><td class="sm"><button class="link" data-go="task" data-id="${esc(l.taskId)}">${esc(l.taskTitle || "Task")}</button></td><td class="sm">${esc(M[l.method]?.name || (l.type === "release" ? "Escrow" : "—"))}</td><td class="num">${money(l.amount)}${l.fees ? `<div class="muted xs">+${money(l.fees)} fees</div>` : ""}</td></tr>`).join("")}</tbody></table></div>` : '<p class="muted sm" style="margin:0">No payments yet.</p>';
}
V.payments = { mount(el){
  const r = role();
  if (r === "guest") { el.innerHTML = `<div class="wrap page">${emptyBox("Create a profile to see payments.", `<button class="btn primary sm" data-go="register" data-role="client">Get started</button>`)}</div>`; return; }
  const sum = (arr, k="amount") => r2(arr.reduce((a, x) => a + (+x[k] || 0), 0));
  if (r === "client") {
    const L = S.ledger.filter(l => l.clientId === UID).sort((a,b) => String(b.at).localeCompare(String(a.at)));
    const tasks = S.tasks.filter(t => t.clientId === UID && t.funded);
    const held = r2(tasks.reduce((a, t) => a + taskMoney(t).balance, 0));
    el.innerHTML = `<div class="wrap page">${head("Payments", "Escrow balances, payment history and how you pay.")}
      <div class="stats" style="margin-bottom:20px"><div class="stat"><span>Paid into escrow</span><b>${money(sum(L.filter(l => l.type === "fund")))}</b></div><div class="stat"><span>Released to agents</span><b>${money(sum(L.filter(l => l.type === "release")))}</b></div><div class="stat"><span>Held in escrow</span><b>${money(held)}</b></div><div class="stat"><span>Refunded</span><b>${money(sum(L.filter(l => l.type === "refund")))}</b></div><div class="stat"><span>Fees paid</span><b>${money(sum(L.filter(l => l.type === "fund"), "fees"))}</b></div></div>
      <div class="cols"><div class="stack">
        <div class="card"><h3>Escrow by task</h3>${tasks.length ? `<div class="tablewrap"><table class="t"><thead><tr><th>Task</th><th>Agent</th><th class="num">Funded</th><th class="num">Released</th><th class="num">Held</th><th>Status</th></tr></thead><tbody>${tasks.map(t => { const m = taskMoney(t); return `<tr class="click" data-go="task" data-id="${esc(t.id)}"><td>${esc(t.title)}</td><td>${esc(short(t.agentName))}</td><td class="num">${money(m.funded)}</td><td class="num">${money(m.approved)}</td><td class="num">${money(m.balance)}</td><td>${pill(t.status)}</td></tr>`; }).join("")}</tbody></table></div>` : '<p class="muted sm" style="margin:0">Nothing in escrow yet.</p>'}</div>
        <div class="card"><h3>History</h3>${ledgerTable(L, "client")}</div>
      </div><div class="stack"><div class="card"><h3>Default payment method</h3><p class="muted sm" style="margin:0">Used for estimates and pre-selected at checkout. Fees shown are estimates.</p>${methodPicker(PREFS.method)}</div></div></div></div>`;
    return;
  }
  const me = meAgent();
  const L = S.ledger.filter(l => l.agentId === UID && l.type === "release").sort((a,b) => String(b.at).localeCompare(String(a.at)));
  const pend = S.hours.filter(h => h.agentId === UID && h.status === "pending");
  const myTasks = S.tasks.filter(t => t.agentId === UID && t.status === "active");
  el.innerHTML = `<div class="wrap page">${head("Earnings", "What you've been paid and what's waiting for approval.", `<button class="btn ghost sm" data-go="register" data-role="agent">Change payout method</button>`)}
    <div class="stats" style="margin-bottom:20px"><div class="stat"><span>Paid to you</span><b>${money(sum(L))}</b></div><div class="stat"><span>Waiting for approval</span><b>${money(sum(pend))}</b></div><div class="stat"><span>Funded in your active tasks</span><b>${money(myTasks.reduce((a,t) => a + taskMoney(t).free, 0))}</b></div><div class="stat"><span>Payout method</span><b style="font-size:17px">${esc(me.payout || "Not set")}</b></div></div>
    <div class="banner" style="margin-bottom:20px">You keep 100% of your rate. Clients pay Caravan's service fee and card or wallet fees. Your payout provider may charge its own transfer fee.</div>
    <div class="card"><h3>Payment history</h3>${ledgerTable(L, "agent")}</div></div>`;
}};
function methodPicker(sel){
  return `<div class="methods">${[...new Set(METHODS.map(m => m.g))].map(g => `<div><h4>${g}</h4><div class="mgrid">${METHODS.filter(m => m.g === g).map(m => `<button class="mbtn" type="button" data-act="method" data-id="${m.id}" aria-pressed="${m.id === sel}"><b>${m.name}</b><span>${m.sub}<br>${m.pct ? m.pct + "%" : ""}${m.pct && m.fixed ? " + " : ""}${m.fixed ? money(m.fixed) : ""}${m.cap ? `, max ${money(m.cap)}` : ""}${!m.pct && !m.fixed ? "No fee" : ""}</span></button>`).join("")}</div></div>`).join("")}</div>`;
}

/* ---- pricing & estimator ---- */
const PE = {cat:"Email & inbox", hrs:5, weeks:4, rate:4, method:"card"};
V.pricing = {
  mount(el){
    PE.method = PREFS.method || PE.method;
    el.innerHTML = `<div class="wrap page">${head("Pricing", "Agents set their own rates. You pay their rate plus a 10% service fee and your payment provider's processing fee. Agents keep 100% of their rate.")}
      <div class="cols"><div class="card"><h3>Estimate a job</h3><div class="fields">
        <div><label for="pe_cat">Type of work</label><select id="pe_cat">${TASKS.map(t => `<option${t === PE.cat ? " selected" : ""}>${t}</option>`).join("")}</select></div>
        <div><label for="pe_rate">Agent rate (USD/hr)</label><div class="money"><input type="number" id="pe_rate" min="1" step="0.25" value="${PE.rate}"></div></div>
        <div><label for="pe_hrs">Hours per week</label><input type="number" id="pe_hrs" min="0.5" step="0.5" value="${PE.hrs}"></div>
        <div><label for="pe_weeks">Number of weeks</label><input type="number" id="pe_weeks" min="1" step="1" value="${PE.weeks}"></div>
        <div class="full"><label for="pe_m">Payment method</label><select id="pe_m">${methodOptions(PE.method)}</select></div>
      </div><div id="pe_out" style="margin-top:20px"></div></div>
      <div class="card"><h3>Compare payment methods</h3><p class="muted sm" id="pe_cmp_sub" style="margin:0"></p><div class="tablewrap" id="pe_cmp"></div></div></div>
      <h3 style="margin-top:40px">Every way to pay</h3><p class="muted sm">Fees are planning estimates and depend on the provider and your country. Crypto network fees are extra.</p>
      <div class="card">${methodPicker(PE.method).replace(/data-act="method"/g, 'data-pe')}</div></div>`;
    const ids = ["#pe_cat","#pe_rate","#pe_hrs","#pe_weeks","#pe_m"];
    $("#pe_cat").addEventListener("change", () => { $("#pe_hrs").value = TYPICAL_HOURS[$("#pe_cat").value]; this.calc(); });
    ids.forEach(i => $(i).addEventListener("input", () => this.calc()));
    $$("[data-pe]", el).forEach(b => b.addEventListener("click", () => { $("#pe_m").value = b.dataset.id; $$("[data-pe]", el).forEach(x => x.setAttribute("aria-pressed", x === b)); this.calc(); }));
    this.calc();
  },
  update(){},
  calc(){
    PE.cat = $("#pe_cat").value; PE.rate = +$("#pe_rate").value || 0; PE.hrs = +$("#pe_hrs").value || 0; PE.weeks = Math.max(1, Math.round(+$("#pe_weeks").value || 1)); PE.method = $("#pe_m").value;
    const sub = PE.rate * PE.hrs * PE.weeks;
    if (!(sub > 0)) { $("#pe_out").innerHTML = '<p class="muted sm">Enter a rate and hours.</p>'; $("#pe_cmp").innerHTML = ""; return; }
    const q = quote(sub, PE.method);
    $("#pe_out").innerHTML = `<p class="muted sm" style="margin:0 0 10px">${PE.hrs} hrs/week × ${PE.weeks} week${PE.weeks > 1 ? "s" : ""} at ${money(PE.rate)}/hr</p>${quoteHTML(q)}<p class="muted sm" style="margin:12px 0 0">About ${money(q.total / PE.weeks)} per week, or ${money(q.total / (PE.hrs * PE.weeks))} per hour all-in.</p>`;
    $("#pe_cmp_sub").textContent = `Processing fee on ${money(sub * (1 + SERVICE_FEE))} (agent pay plus service fee), cheapest first.`;
    $("#pe_cmp").innerHTML = `<table class="t"><thead><tr><th>Method</th><th class="num">Fee</th><th class="num">Total</th></tr></thead><tbody>${METHODS.map(m => ({m, q:quote(sub, m.id)})).sort((a,b) => a.q.proc - b.q.proc).map(({m, q}) => `<tr${m.id === PE.method ? ' style="background:var(--bg2)"' : ""}><td>${m.name} <span class="muted xs">${m.sub}</span></td><td class="num">${money(q.proc)}</td><td class="num">${money(q.total)}</td></tr>`).join("")}</tbody></table>`;
  }
};

/* ---- my agents: rehire, favorite, end, block ---- */
V.myagents = { mount(el){
  if (!meClient()) { el.innerHTML = `<div class="wrap page">${emptyBox("Create a client profile to keep track of agents you've worked with.", `<button class="btn primary sm" data-go="register" data-role="client">Create client profile</button>`)}</div>`; return; }
  const mine = S.tasks.filter(t => t.clientId === UID && t.agentId);
  const ids = [...new Set([...mine.map(t => t.agentId), ...PREFS.favorites])].filter(id => !PREFS.blocked.includes(id) && agentById(id));
  const row = id => {
    const a = agentById(id), ts = mine.filter(t => t.agentId === id), active = ts.find(t => t.status === "active");
    const pendingOffer = ts.find(t => ["offered","awaiting_funding"].includes(t.status));
    const paid = r2(ts.reduce((s, t) => s + taskMoney(t).approved, 0)), hrs = r2(ts.reduce((s, t) => s + taskMoney(t).approvedHrs, 0));
    const myRv = S.reviews.filter(r => r.agentId === id && r.clientId === UID).sort((x,y) => String(y.at).localeCompare(String(x.at)))[0];
    const fav = PREFS.favorites.includes(id);
    return `<article class="card"><div class="agenthead"><div class="avatar">${esc(inits(a.name))}</div><div><h3>${esc(short(a.name))}${a.sample ? ' <span class="tag sample">Sample</span>' : ""}</h3><div class="muted sm">${esc(a.country)}, ${money(a.rate)}/hr</div></div><button class="iconbtn" data-act="fav" data-id="${esc(id)}" aria-pressed="${fav}" aria-label="${fav ? "Remove from" : "Add to"} favorites">★</button></div>
      <div class="stats"><div class="stat"><span>Tasks</span><b>${ts.length}</b></div><div class="stat"><span>Hours</span><b>${hrs}</b></div><div class="stat"><span>Paid</span><b>${money(paid)}</b></div></div>
      <div class="meta">${myRv ? `<span>Your rating: <span class="stars">${"★".repeat(myRv.rating)}</span></span>` : '<span class="muted">Not rated yet</span>'}${active ? `<span>Working on <button class="link" data-go="task" data-id="${esc(active.id)}">${esc(active.title)}</button></span>` : pendingOffer ? `<span>${pill(pendingOffer.status)}</span>` : ""}</div>
      <div class="cardfoot">${active ? `<button class="btn danger xs" data-act="end" data-id="${esc(active.id)}">End contract</button>` : `<button class="btn primary xs" data-act="rehire" data-id="${esc(id)}">Rehire</button>`}<button class="btn ghost xs" data-act="msg" data-id="${esc(id)}">Message</button><button class="btn ghost xs" data-go="agent" data-id="${esc(id)}">Profile</button><button class="btn ghost xs" data-act="block" data-id="${esc(id)}">Don't match again</button></div></article>`;
  };
  const blocked = PREFS.blocked.map(agentById).filter(Boolean);
  el.innerHTML = `<div class="wrap page">${head("My agents", "Rehire people you liked, end contracts that aren't working, and keep favorites close.", `<button class="btn ghost sm" data-go="agents">Find more agents</button>`)}
    ${ids.length ? `<div class="grid">${ids.sort((x,y) => PREFS.favorites.includes(y) - PREFS.favorites.includes(x)).map(row).join("")}</div>` : emptyBox("Agents you hire or favorite will appear here.", `<button class="btn primary sm" data-go="agents">Browse agents</button>`)}
    ${blocked.length ? `<h3 style="margin-top:40px">Not matched with you</h3><p class="muted sm">These agents are hidden from your directory and matches.</p><div class="card" style="padding:8px 16px">${blocked.map(a => `<div class="meta" style="padding:10px 0;border-bottom:1px solid var(--line)"><span>${esc(short(a.name))}</span><span class="muted">${esc(a.country)}</span><button class="btn ghost xs" style="margin-left:auto" data-act="block" data-id="${esc(a.id)}">Match with me again</button></div>`).join("")}</div>` : ""}</div>`;
}};

/* ================= registration (preserved) ================= */
let TZS = [];
try { TZS = Intl.supportedValuesOf("timeZone"); } catch(e) { TZS = ["UTC","America/New_York","America/Guatemala","America/Bogota","America/Argentina/Buenos_Aires","Europe/Madrid","Africa/Nairobi","Asia/Kolkata","Asia/Manila"]; }
const myTz = (() => { try { return Intl.DateTimeFormat().resolvedOptions().timeZone; } catch(e) { return "UTC"; } })();
const chipHTML = (name, val, type="checkbox") => `<label class="chip"><input type="${type}" name="${name}" value="${val}"><span>${val}</span></label>`;
$$("[data-countries]").forEach(s => s.innerHTML = `<option value="">Select country</option>` + COUNTRIES.map(c => `<option>${c}</option>`).join(""));
$$("[data-tz]").forEach(s => { s.innerHTML = TZS.map(t => `<option${t === myTz ? " selected" : ""}>${t}</option>`).join(""); });
$$("[data-tasks]").forEach(d => d.innerHTML = TASKS.map(t => chipHTML(d.dataset.tasks, t)).join(""));
$$("[data-langs]").forEach(d => d.innerHTML = LANGS.map(t => chipHTML("languages", t)).join(""));
$$("[data-shifts]").forEach(d => d.innerHTML = SHIFTS.map(t => chipHTML("shifts", t)).join(""));
$$("[data-payouts]").forEach(s => s.innerHTML = PAYOUTS.map(p => `<option>${p}</option>`).join(""));
$$('#form-client input[name=languages][value=English], #form-agent input[name=languages][value=English]').forEach(i => i.checked = true);

let regRole = "client";
function setRole(r){
  regRole = r;
  $("#form-client").hidden = r !== "client"; $("#form-agent").hidden = r !== "agent";
  $$("[data-role-btn]").forEach(b => b.setAttribute("aria-pressed", b.dataset.roleBtn === r));
  const has = r === "client" ? meClient() : meAgent();
  $("#regTitle").textContent = (has ? "Edit your " : "Register as ") + (r === "client" ? (has ? "client profile" : "a client") : (has ? "agent profile" : "an agent"));
  $("#regSub").textContent = r === "client" ? "Tell agents where you are and what you need done." : "Tell clients where you are, what you do well, and what you charge.";
  if (has) fill(r, has);
}
$$("[data-role-btn]").forEach(b => b.addEventListener("click", () => { setRole(b.dataset.roleBtn); const p = regRole === "client" ? meClient() : meAgent(); if (p && current.view === "register" && !current.params.edit) { renderDone(regRole, p); go("done"); } }));
$$('#form-client input[name=accountType]').forEach(r => r.addEventListener("change", () => { $("[data-biz]").hidden = $('#form-client input[name=accountType]:checked').value !== "Business"; }));

function updateCompare(){
  const c = $("#a_country").value, rate = parseFloat($("#a_rate").value), box = $("#rateCompare");
  if (!LOCAL[c] || !(rate > 0)) { box.style.display = "none"; return; }
  const [lo, hi] = LOCAL[c];
  box.style.display = "block";
  box.innerHTML = `Typical local pay for similar work in ${c} is roughly <b>$${lo.toFixed(2)}–$${hi.toFixed(2)}/hr</b>. Your rate of <b>$${rate.toFixed(2)}/hr</b> is about <b>${(rate / ((lo + hi) / 2)).toFixed(1)}×</b> that. Clients on Caravan commonly budget $4–$12/hr.`;
}
$("#a_country").addEventListener("change", updateCompare); $("#a_rate").addEventListener("input", updateCompare);

function collect(form){
  const fd = new FormData(form), o = {};
  for (const [k, v] of fd.entries()) { if (["tasks","skills","languages","shifts"].includes(k)) (o[k] ||= []).push(v); else o[k] = typeof v === "string" ? v.trim() : v; }
  ["tasks","skills","languages","shifts"].forEach(k => { if (form.querySelector(`[name=${k}]`) && !o[k]) o[k] = []; });
  return o;
}
function validate(form, o){
  let ok = true;
  const mark = (el, bad) => { const g = el.closest("[data-group]") || el.parentElement.closest("div"); g.classList.toggle("invalid", bad); if (bad) ok = false; };
  $$("input[required],select[required]", form).forEach(el => {
    if (el.type === "checkbox") mark(el, !el.checked);
    else if (el.type === "email") mark(el, !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(el.value.trim()));
    else if (el.type === "number") mark(el, !(parseFloat(el.value) >= 1));
    else mark(el, !el.value.trim());
  });
  const sk = o.tasks || o.skills || [];
  $("[data-group=tasks]", form).classList.toggle("invalid", !sk.length); if (!sk.length) ok = false;
  $("[data-group=langs]", form).classList.toggle("invalid", !(o.languages || []).length); if (!(o.languages || []).length) ok = false;
  const bg = $("[data-group=budget]", form);
  if (bg) { const bad = !(+o.budgetMin >= 1) || +o.budgetMax < +o.budgetMin; bg.classList.toggle("invalid", bad); if (bad) ok = false; }
  if (!ok) $(".invalid input, .invalid select, .invalid textarea", form)?.focus();
  return ok;
}
$$("form.reg").forEach(f => f.addEventListener("input", e => { const g = e.target.closest(".invalid"); if (g) g.classList.remove("invalid"); }));

$$("#form-client, #form-agent").forEach(form => form.addEventListener("submit", async e => {
  e.preventDefault();
  const r = form.id === "form-client" ? "client" : "agent";
  const o = collect(form);
  if (!validate(form, o)) { $("[data-status]", form).textContent = "Fix the highlighted fields to continue."; return; }
  const btn = $("button[type=submit]", form), st = $("[data-status]", form);
  btn.disabled = true; st.textContent = "Saving…";
  if (r === "client") { o.budgetMin = +o.budgetMin; o.budgetMax = +o.budgetMax; } else { o.rate = +o.rate; o.consent = true; }
  const prev = r === "client" ? meClient() : meAgent();
  const rec = {...o, role:r, updatedAt:now(), createdAt:prev?.createdAt || now()};
  let saved = true;
  if (Store.mode === "shared") { delete rec.email; try { await Store.set(`data/users/${UID}/private`, {email:o.email, updatedAt:now()}); } catch(err) { console.warn(err); } }
  try { await Store.set(`${r === "client" ? "clients" : "agents"}/${UID}`, rec); } catch(err) { saved = false; }
  btn.disabled = false; st.textContent = saved ? "" : "Couldn't save. Check your connection and try again.";
  if (!saved) return;
  ACT = r; try { localStorage.setItem("caravan:act", r); } catch(e) {}
  // reflect immediately even before the snapshot arrives
  const coll = r === "client" ? S.clients : S.agents, i = coll.findIndex(x => x.id === UID);
  if (i >= 0) coll[i] = {...rec, id:UID}; else coll.push({...rec, id:UID});
  renderDone(r, {...rec, id:UID});
  current.params = {};
  go("done");
}));

function renderDone(r, p){
  if (!p) return;
  $("#doneBadge").textContent = r === "client" ? "Client profile" : "Agent profile";
  $("#doneTitle").textContent = `Welcome, ${String(p.name).split(" ")[0]}.`;
  $("#doneSub").textContent = r === "client" ? "We use this to match you with agents who fit your tasks, language and budget." : "Clients looking for your skills and hours can find you in the directory.";
  const rows = r === "client" ? [
    ["Account", p.accountType + (p.company ? ` — ${p.company}` : "")],["Location", `${p.city}, ${p.country}`],["Time zone", p.timezone],
    ["Tasks", (p.tasks || []).join(", ")],["Languages", (p.languages || []).join(", ")],["Budget", `$${p.budgetMin}–$${p.budgetMax} per hour`],
    ["Hours", `${p.hoursPerWeek} per week, ${String(p.arrangement).toLowerCase()}`],["Details", p.description || "—"]
  ] : [
    ["Location", `${p.city}, ${p.country}`],["Time zone", p.timezone],["Skills", (p.skills || []).join(", ")],
    ["Languages", (p.languages || []).join(", ") + ` (English: ${String(p.englishLevel).toLowerCase()})`],["Rate", `$${Number(p.rate).toFixed(2)} per hour`],
    ["Availability", `${p.hoursPerWeek} hrs/week` + ((p.shifts || []).length ? `, ${p.shifts.join(", ").toLowerCase()}` : "")],["Equipment", p.equipment],["Payout", p.payout || "—"],["Introduction", p.bio || "—"]
  ];
  $("#doneList").innerHTML = rows.map(([k, v]) => `<dt>${esc(k)}</dt><dd>${esc(v)}</dd>`).join("");
  const other = r === "client" ? (meAgent() ? "" : `<button class="btn ghost" data-go="register" data-role="agent">Also work as an agent</button>`) : (meClient() ? "" : `<button class="btn ghost" data-go="register" data-role="client">Also hire agents</button>`);
  $("#doneCtas").innerHTML = (r === "client" ? `<button class="btn primary" data-go="post">Post a task</button><button class="btn ghost" data-go="agents">Find agents</button>` : `<button class="btn primary" data-go="tasks">Find work</button>`)
    + `<button class="btn ghost" id="editBtn">Edit profile</button>${other}${USER ? `<button class="btn ghost" data-act="signout">Sign out</button>` : ""}`;
  $("#editBtn").onclick = () => { setRole(r); fill(r, p); go("register", {edit:true}); };
  $("#storeNotice").textContent = Store.mode === "shared" ? "" : "Demo mode: saved in this browser only. Connect Firebase so profiles are shared with everyone.";
}
function fill(r, p){
  const f = $(r === "client" ? "#form-client" : "#form-agent");
  $$("input,select,textarea", f).forEach(el => {
    const v = p[el.name]; if (v === undefined) return;
    if (el.type === "checkbox") el.checked = Array.isArray(v) ? v.includes(el.value) : !!v;
    else if (el.type === "radio") el.checked = el.value === v;
    else el.value = v;
  });
  if (r === "client") $("[data-biz]").hidden = p.accountType !== "Business";
  if (r === "agent") updateCompare();
}

/* ================= theme ================= */
const themeBtn = $("#themeBtn");
function applyTheme(t){ document.documentElement.dataset.theme = t; themeBtn.textContent = t === "dark" ? "Light theme" : "Dark theme"; try { localStorage.setItem("caravan:theme", t); } catch(e) {} }
let savedTheme = null; try { savedTheme = localStorage.getItem("caravan:theme"); } catch(e) {}
applyTheme(savedTheme || "dark");
themeBtn.onclick = () => applyTheme(document.documentElement.dataset.theme === "dark" ? "light" : "dark");

/* ================= start-up ================= */
let refreshQueued = false;
function onData(){ if (refreshQueued) return; refreshQueued = true; requestAnimationFrame(() => { refreshQueued = false; renderNav(); refresh(); }); }
// With Firebase, threads, applications, hours and ledger rows are private to the
// people involved, so they are read through one query per role and merged.
const SCOPED = {threads:[["participants","array-contains"]], applications:[["clientId","=="],["agentId","=="]], hours:[["clientId","=="],["agentId","=="]], ledger:[["clientId","=="],["agentId","=="]]};
const SHOW_SAMPLES = import.meta.env.VITE_SHOW_SAMPLE_AGENTS !== "false";
function withSamples(c, list){
  if (Store.mode !== "shared" || !SHOW_SAMPLES) return list;
  const extra = c === "agents" ? SAMPLE_AGENTS : c === "reviews" ? SAMPLE_REVIEWS : [];
  return [...extra.filter(x => !list.some(d => d.id === x.id)), ...list];
}
function watchColl(c){
  const sc = Store.mode === "shared" && SCOPED[c];
  if (!sc) { S[c] = withSamples(c, []); Store.watch(c, list => { S[c] = withSamples(c, list); onData(); }); return; }
  if (!USER) return;
  const parts = sc.map(() => []);
  sc.forEach(([f, op], i) => Store.watch(c, list => {
    parts[i] = list; const m = new Map(); parts.flat().forEach(d => m.set(d.id, d)); S[c] = [...m.values()]; onData();
  }, [f, op, UID]));
}
async function init(){
  if (FB.enabled) {
    try { USER = await FB.currentUser(); } catch(e) { console.warn("auth", e); }
    UID = USER ? USER.uid : "";
    Store.useDb(FB.makeDb());
    FB.onUserChange(u => { if ((u?.uid || "") !== UID) location.reload(); });
    if (USER?.email) $$("#c_email, #a_email").forEach(i => { if (!i.value) i.value = USER.email; });
  }
  if (Store.mode === "local" && (!Store.localCount("agents") || !(await Store.get("agents/sample-amina")))) {
    for (const a of SAMPLE_AGENTS) { const {id, ...rest} = a; await Store.set(`agents/${id}`, rest); }
    for (const rv of SAMPLE_REVIEWS) { const {id, ...rest} = rv; await Store.set(`reviews/${id}`, rest); }
  }
  if (UID) try { const p = await Store.get(prefsPath()); if (p) PREFS = {favorites:[], blocked:[], method:"card", ...p}; } catch(e) {}
  COLLS.forEach(watchColl);
  READY = true;
  renderNav();
  let next = null; try { next = JSON.parse(localStorage.getItem(NEXT_KEY) || "null"); localStorage.removeItem(NEXT_KEY); } catch(e) {}
  if (next && USER) { if (next.role) setRole(next.role); go(next.view, next.params || {}); return; }
  if (!STATIC.includes(current.view)) mountApp();
}
renderNav();
init();
/* ---------- globe ---------- */
const cv = $("#globe"), ctx = cv.getContext("2d"), ratesEl = $("#rates");
const CITIES = {
  "New York":[40.7,-74],"Madrid":[40.4,-3.7],"Buenos Aires":[-34.6,-58.4],"London":[51.5,-0.1],"Dubai":[25.2,55.3],"Singapore":[1.35,103.8],"Toronto":[43.7,-79.4],
  "Guatemala City":[14.6,-90.5],"Mumbai":[19.1,72.9],"Manila":[14.6,121],"Nairobi":[-1.3,36.8],"Lagos":[6.5,3.4],"Bogotá":[4.7,-74.1],"Hanoi":[21,105.8],"Lima":[-12,-77],"Casablanca":[33.6,-7.6],"Dhaka":[23.8,90.4],"Tbilisi":[41.7,44.8]
};
const AGENTS = {"Guatemala City":"$3/hr","Mumbai":"$2.50/hr","Manila":"$3/hr","Nairobi":"$2.50/hr","Lagos":"$2/hr","Bogotá":"$3.50/hr","Hanoi":"$2.50/hr","Lima":"$3/hr","Casablanca":"$3/hr","Dhaka":"$2/hr","Tbilisi":"$3.50/hr"};
const LINKS = [["New York","Guatemala City"],["New York","Bogotá"],["Madrid","Lima"],["Madrid","Casablanca"],["Buenos Aires","Manila"],["London","Mumbai"],["London","Nairobi"],["Dubai","Dhaka"],["Singapore","Hanoi"],["Toronto","Manila"],["Buenos Aires","Lagos"],["Madrid","Tbilisi"],["New York","Lagos"],["Dubai","Mumbai"]];
const rad = d => d*Math.PI/180;
const vec = ([lat,lon]) => [Math.cos(rad(lat))*Math.sin(rad(lon)), Math.sin(rad(lat)), Math.cos(rad(lat))*Math.cos(rad(lon))];
// fibonacci sphere texture points
const DOTS = []; const N=1400; for(let i=0;i<N;i++){ const y=1-2*(i+.5)/N, r=Math.sqrt(1-y*y), t=i*2.39996; DOTS.push([r*Math.cos(t),y,r*Math.sin(t)]); }
function slerp(a,b,t){ const d=Math.acos(Math.min(1,a[0]*b[0]+a[1]*b[1]+a[2]*b[2])); if(d<1e-6) return a; const s=Math.sin(d), k1=Math.sin((1-t)*d)/s, k2=Math.sin(t*d)/s; return [a[0]*k1+b[0]*k2,a[1]*k1+b[1]*k2,a[2]*k1+b[2]*k2]; }
const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
let W=0,H=0,R=0,dpr=1, rot=rad(-30); const tilt=rad(-18);
function resize(){ const b=cv.getBoundingClientRect(); dpr=Math.min(2,devicePixelRatio||1); W=b.width; H=b.height; cv.width=W*dpr; cv.height=H*dpr; R=Math.min(W,H)*0.40; }
new ResizeObserver(resize).observe(cv); resize();
function proj(v){ // rotate around Y by rot, then X by tilt
  let [x,y,z]=v; const c=Math.cos(rot), s=Math.sin(rot);
  let x1=x*c+z*s, z1=-x*s+z*c; const ct=Math.cos(tilt), st=Math.sin(tilt);
  let y2=y*ct-z1*st, z2=y*st+z1*ct;
  return [W/2+x1*R, H/2-y2*R, z2];
}
const labels = {};
Object.keys(AGENTS).forEach(k => { const el=document.createElement("div"); el.className="rate"; el.innerHTML=`<b>${k}</b>${AGENTS[k]}`; ratesEl.appendChild(el); labels[k]=el; });
const showLabels = ["Guatemala City","Manila","Nairobi","Mumbai","Lima","Bogotá","Hanoi"];
function css(v){ return getComputedStyle(document.documentElement).getPropertyValue(v).trim(); }
let t0=performance.now();
function frame(now){
  const t=Math.max(0,(now-t0)/1000); if(!reduce) rot=rad(-30)+t*0.08;
  const glow=css("--glow"), ink=css("--ink"), light=document.documentElement.dataset.theme==="light";
  ctx.setTransform(dpr,0,0,dpr,0,0); ctx.clearRect(0,0,W,H);
  // halo
  const g=ctx.createRadialGradient(W/2,H/2,R*.85,W/2,H/2,R*1.35); g.addColorStop(0,light?"rgba(61,109,245,.18)":"rgba(90,133,255,.22)"); g.addColorStop(1,"rgba(90,133,255,0)");
  ctx.fillStyle=g; ctx.beginPath(); ctx.arc(W/2,H/2,R*1.35,0,7); ctx.fill();
  // body
  const b=ctx.createRadialGradient(W/2-R*.35,H/2-R*.45,R*.1,W/2,H/2,R); b.addColorStop(0,light?"#e6ecfb":"#13203d"); b.addColorStop(1,light?"#cdd7f1":"#060a14");
  ctx.fillStyle=b; ctx.beginPath(); ctx.arc(W/2,H/2,R,0,7); ctx.fill();
  ctx.strokeStyle=light?"rgba(61,109,245,.35)":"rgba(127,164,255,.35)"; ctx.lineWidth=1; ctx.stroke();
  // dots
  for(const d of DOTS){ const [x,y,z]=proj(d); if(z<=0) continue; ctx.fillStyle=light?`rgba(40,60,120,${.12+z*.25})`:`rgba(170,195,255,${.05+z*.22})`; ctx.fillRect(x,y,1.3,1.3); }
  // arcs
  LINKS.forEach(([a,c],i)=>{
    const A=vec(CITIES[a]), C=vec(CITIES[c]); ctx.beginPath(); let started=false;
    const pts=[]; for(let k=0;k<=40;k++){ const s=k/40; const p=slerp(A,C,s), lift=1+0.16*Math.sin(Math.PI*s); pts.push(proj([p[0]*lift,p[1]*lift,p[2]*lift])); }
    for(const [x,y,z] of pts){ if(z>0){ started?ctx.lineTo(x,y):ctx.moveTo(x,y); started=true; } else started=false; }
    ctx.strokeStyle=light?"rgba(61,109,245,.45)":"rgba(127,164,255,.42)"; ctx.lineWidth=1.1; ctx.stroke();
    // pulse
    const ph=(((t*0.35+i*0.137)%1)+1)%1, idx=Math.min(40,Math.max(0,Math.floor(ph*40))), [px,py,pz]=pts[idx];
    if(pz>0 && !reduce){ ctx.fillStyle=light?"#3d6df5":"#cfe0ff"; ctx.shadowColor=glow; ctx.shadowBlur=10; ctx.beginPath(); ctx.arc(px,py,2.1,0,7); ctx.fill(); ctx.shadowBlur=0; }
  });
  // nodes
  for(const k in CITIES){ const [x,y,z]=proj(vec(CITIES[k])); if(z<=0) continue; const ag=!!AGENTS[k];
    ctx.fillStyle=ag?(light?"#3d6df5":"#e6eeff"):(light?"#0d1424":"#7fa4ff"); ctx.shadowColor=glow; ctx.shadowBlur=ag?14:6; ctx.beginPath(); ctx.arc(x,y,ag?3:2.4,0,7); ctx.fill(); ctx.shadowBlur=0; }
  // labels
  for(const k in labels){ const [x,y,z]=proj(vec(CITIES[k])); const el=labels[k]; const vis = z>0.35 && showLabels.includes(k);
    el.style.opacity = vis?1:0; el.style.left=x+"px"; el.style.top=y+"px"; }
  if(!reduce) requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
if(reduce) new ResizeObserver(()=>requestAnimationFrame(frame)).observe(cv);
themeBtn.addEventListener("click",()=>{ if(reduce) requestAnimationFrame(frame); });
