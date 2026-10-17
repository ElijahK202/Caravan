// Firebase wiring. When the VITE_FIREBASE_* variables are missing the site runs
// in device-only demo mode (localStorage), exactly like the original prototype.
import { initializeApp } from "firebase/app";
import {
  getAuth, onAuthStateChanged, signInWithPopup, signInWithRedirect, getRedirectResult, GoogleAuthProvider, signOut as fbSignOut,
  sendSignInLinkToEmail, isSignInWithEmailLink, signInWithEmailLink,
} from "firebase/auth";
import {
  initializeFirestore, doc, getDoc, setDoc, updateDoc, deleteDoc,
  collection, query, where, onSnapshot,
} from "firebase/firestore";

const env = import.meta.env;
const config = {
  apiKey: env.VITE_FIREBASE_API_KEY,
  authDomain: env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: env.VITE_FIREBASE_APP_ID,
};

export const enabled = !!(config.apiKey && config.projectId && config.appId);

let auth = null, fs = null;
if (enabled) {
  const app = initializeApp(config);
  auth = getAuth(app);
  fs = initializeFirestore(app, { ignoreUndefinedProperties: true });
}

const EMAIL_KEY = "caravan:signin-email";

/** Resolves with the signed-in user (or null) once Firebase knows. Finishes an email-link sign-in first. */
export async function currentUser() {
  if (!enabled) return null;
  if (isSignInWithEmailLink(auth, location.href)) {
    let email = null; try { email = localStorage.getItem(EMAIL_KEY); } catch (e) {}
    if (!email) email = prompt("Confirm the email address you used to sign in");
    if (email) {
      try { await signInWithEmailLink(auth, email, location.href); } catch (e) { console.warn("email link", e?.code); }
      try { localStorage.removeItem(EMAIL_KEY); } catch (e) {}
    }
    history.replaceState(null, "", location.pathname);
  }
  try { await getRedirectResult(auth); } catch (e) { console.warn("google redirect", e?.code); }
  return new Promise(res => { const off = onAuthStateChanged(auth, u => { off(); res(u); }); });
}

export function onUserChange(cb) { return enabled ? onAuthStateChanged(auth, cb) : () => {}; }
// Popups are often blocked on phones; fall back to a full-page redirect.
export async function signInWithGoogle() {
  const provider = new GoogleAuthProvider();
  try { return await signInWithPopup(auth, provider); }
  catch (e) {
    if (["auth/popup-blocked", "auth/operation-not-supported-in-this-environment"].includes(e?.code)) return signInWithRedirect(auth, provider);
    throw e;
  }
}
export async function sendEmailLink(email) {
  await sendSignInLinkToEmail(auth, email, { url: location.origin + location.pathname, handleCodeInApp: true });
  try { localStorage.setItem(EMAIL_KEY, email); } catch (e) {}
}
export const signOut = () => fbSignOut(auth);

/**
 * Adapter with the same shape the app's Store used for the Claude artifact database:
 * db.doc(path).get/set/update/delete and db.collection(name).where(...).onSnapshot(...).
 */
export function makeDb() {
  const ref = p => doc(fs, p);
  const snapDoc = s => ({ exists: s.exists(), data: () => s.data(), id: s.id });
  return {
    doc: p => ({
      get: () => getDoc(ref(p)).then(snapDoc),
      set: data => setDoc(ref(p), data),
      update: data => updateDoc(ref(p), data),
      delete: () => deleteDoc(ref(p)),
    }),
    collection(name) {
      const filters = [];
      const q = {
        where(f, op, v) { filters.push(where(f, op, v)); return q; },
        onSnapshot(next, error) {
          return onSnapshot(query(collection(fs, name), ...filters),
            s => next({ docs: s.docs.map(d => ({ id: d.id, data: () => d.data() })) }), error);
        },
      };
      return q;
    },
  };
}
