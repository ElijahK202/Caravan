// Turns on Google APIs that `firebase deploy --only functions` needs but doesn't enable itself
// (it checks billing through the Cloud Billing API). Needs the Service Usage Admin role.
import { GoogleAuth } from "google-auth-library";

const [project, ...apis] = process.argv.slice(2);
if (!project || !apis.length) { console.error("usage: node scripts/enable-apis.mjs <project-id> <api>..."); process.exit(1); }
const client = await new GoogleAuth({ scopes: ["https://www.googleapis.com/auth/cloud-platform"] }).getClient();
const r = await client.request({ url: `https://serviceusage.googleapis.com/v1/projects/${project}/services:batchEnable`, method: "POST", data: { serviceIds: apis }, validateStatus: () => true });
if (r.status >= 300) { console.error("Couldn't enable APIs:", r.status, JSON.stringify(r.data)); process.exit(1); }
console.log("Enabled", apis.join(", "));
