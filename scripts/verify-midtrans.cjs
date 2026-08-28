/**
 * Verify Midtrans Server Key against Sandbox + Production Snap APIs.
 * Usage (from backend-ez-trip-x):
 *   node scripts/verify-midtrans.mjs
 */
const fs = require("fs");
const path = require("path");

function loadEnv(filePath) {
  if (!fs.existsSync(filePath)) return {};
  const out = {};
  for (const line of fs.readFileSync(filePath, "utf8").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq < 0) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    value = value.replace(/^["']|["']$/g, "");
    out[key] = value;
  }
  return out;
}

async function trySnap(baseUrl, serverKey, label) {
  const orderId = `verify-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
  const res = await fetch(`${baseUrl}/snap/v1/transactions`, {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      Authorization:
        "Basic " + Buffer.from(`${serverKey}:`).toString("base64"),
    },
    body: JSON.stringify({
      transaction_details: {
        order_id: orderId,
        gross_amount: 10000,
      },
    }),
  });
  const text = await res.text();
  let body;
  try {
    body = JSON.parse(text);
  } catch {
    body = text;
  }
  console.log(`\n[${label}] HTTP ${res.status}`);
  console.log(typeof body === "string" ? body : JSON.stringify(body, null, 2));
  return res.status;
}

async function main() {
  const envPath = path.join(__dirname, "..", ".env");
  const env = loadEnv(envPath);
  const serverKey = (env.MIDTRANS_SERVER_KEY || "").trim();
  const isProductionFlag = (env.MIDTRANS_IS_PRODUCTION || "false")
    .trim()
    .toLowerCase();

  console.log("Env file:", envPath);
  console.log(
    "Server key prefix:",
    serverKey ? `${serverKey.slice(0, 14)}… (len=${serverKey.length})` : "(empty)",
  );
  console.log("MIDTRANS_IS_PRODUCTION:", isProductionFlag);

  if (!serverKey) {
    console.error("MIDTRANS_SERVER_KEY missing in .env");
    process.exit(1);
  }

  const sandbox = await trySnap(
    "https://app.sandbox.midtrans.com",
    serverKey,
    "Sandbox",
  );
  const production = await trySnap(
    "https://app.midtrans.com",
    serverKey,
    "Production",
  );

  console.log("\n---");
  if (sandbox === 201) {
    console.log("OK: use MIDTRANS_IS_PRODUCTION=false");
    process.exit(0);
  }
  if (production === 201) {
    console.log("OK: this key works on Production → set MIDTRANS_IS_PRODUCTION=true");
    process.exit(0);
  }
  console.error(
    "FAIL: key rejected on both environments.\n" +
      "Copy Server Key again from Midtrans Dashboard → Settings → Access Keys\n" +
      "(use the copy button; do not type from a screenshot).",
  );
  process.exit(1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
