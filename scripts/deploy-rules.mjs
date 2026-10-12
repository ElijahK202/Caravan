// Deploys firestore.rules and firestore.indexes.json through the Firebase Rules
// and Firestore Admin REST APIs. Used by CI instead of `firebase deploy --only firestore`,
// which first checks enabled APIs and needs extra Service Usage permissions.
// Credentials come from GOOGLE_APPLICATION_CREDENTIALS (a service account JSON key).
import { readFileSync } from "node:fs";
import { GoogleAuth } from "google-auth-library";

const project = process.argv[2];
if (!project) { console.error("usage: node scripts/deploy-rules.mjs <project-id>"); process.exit(1); }

const auth = new GoogleAuth({ scopes: ["https://www.googleapis.com/auth/cloud-platform"] });
const client = await auth.getClient();
const call = (url, method = "GET", data) => client.request({ url, method, data, validateStatus: () => true });

// 1. Upload the rules as a new ruleset.
const rulesBase = `https://firebaserules.googleapis.com/v1/projects/${project}`;
const source = readFileSync(new URL("../firestore.rules", import.meta.url), "utf8");
const rs = await call(`${rulesBase}/rulesets`, "POST", { source: { files: [{ name: "firestore.rules", content: source }] } });
if (rs.status >= 300) { console.error("Creating ruleset failed:", rs.status, JSON.stringify(rs.data)); process.exit(1); }
const rulesetName = rs.data.name;
console.log("Uploaded ruleset", rulesetName);

// 2. Point the Firestore release at it (create the release if the project has none yet).
const releaseName = `projects/${project}/releases/cloud.firestore`;
let rel = await call(`${rulesBase}/releases/cloud.firestore`, "PATCH", { release: { name: releaseName, rulesetName } });
if (rel.status === 404) rel = await call(`${rulesBase}/releases`, "POST", { name: releaseName, rulesetName });
if (rel.status >= 300) { console.error("Releasing rules failed:", rel.status, JSON.stringify(rel.data)); process.exit(1); }
console.log("Firestore rules released");

// 3. Create composite indexes. An index that already exists is fine.
const { indexes = [] } = JSON.parse(readFileSync(new URL("../firestore.indexes.json", import.meta.url), "utf8"));
const fsBase = `https://firestore.googleapis.com/v1/projects/${project}/databases/(default)/collectionGroups`;
for (const ix of indexes) {
  const r = await call(`${fsBase}/${ix.collectionGroup}/indexes`, "POST", { queryScope: ix.queryScope, fields: ix.fields });
  if (r.status === 409) console.log(`Index on ${ix.collectionGroup} already exists`);
  else if (r.status >= 300) { console.error(`Creating index on ${ix.collectionGroup} failed:`, r.status, JSON.stringify(r.data)); process.exit(1); }
  else console.log(`Index on ${ix.collectionGroup} is building`);
}
