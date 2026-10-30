// Inspect credential readiness without printing secrets. Optionally create a
// fresh VAPID pair only when neither key is configured.
import { createRequire } from "node:module";
import { readFile, writeFile } from "node:fs/promises";
import crypto from "node:crypto";
const require = createRequire(import.meta.url);
require("@next/env").loadEnvConfig(process.cwd());
let envText = await readFile(".env", "utf8");
const present = (key) => Boolean(process.env[key]?.trim());
const publicKey = process.env.VAPID_PUBLIC_KEY?.trim() || "";
const privateKey = process.env.VAPID_PRIVATE_KEY?.trim() || "";

if (process.argv.includes("--prepare-r2")) {
  const newline = envText.includes("\r\n") ? "\r\n" : "\n";
  const added = [];
  for (const [key, value] of Object.entries({ UPLOAD_STORAGE: "local", R2_ACCOUNT_ID: "", R2_ACCESS_KEY_ID: "", R2_SECRET_ACCESS_KEY: "", R2_BUCKET_NAME: "" })) {
    if (!new RegExp(`^\\s*(?:export\\s+)?${key}\\s*=`, "m").test(envText)) {
      envText += `${envText.endsWith("\n") ? "" : newline}${key}="${value}"${newline}`;
      process.env[key] = value; added.push(key);
    }
  }
  if (added.length) await writeFile(".env", envText);
  console.log(JSON.stringify({ check: "r2-setup", addedVariables: added, secretsPrinted: false }));
}

if (process.argv.includes("--prepare-gemini")) {
  const newline = envText.includes("\r\n") ? "\r\n" : "\n";
  const added = [];
  for (const [key, value] of Object.entries({ AI_PROVIDER: "gemini", GEMINI_API_KEY: "", GEMINI_MODEL: "gemini-3.5-flash-lite" })) {
    const pattern = new RegExp(`^\\s*(?:export\\s+)?${key}\\s*=`, "m");
    if (!pattern.test(envText)) {
      envText += `${envText.endsWith("\n") ? "" : newline}${key}="${value}"${newline}`;
      process.env[key] = value;
      added.push(key);
    }
  }
  if (added.length) await writeFile(".env", envText);
  console.log(JSON.stringify({ check: "gemini-setup", addedVariables: added, secretsPrinted: false }));
}

if (process.argv.includes("--generate-push")) {
  if (publicKey || privateKey) {
    console.log(JSON.stringify({ check: "push-key-generation", changed: false, reason: "Existing keys preserved" }));
  } else {
    const ecdh = crypto.createECDH("prime256v1");
    ecdh.generateKeys();
    const pair = { VAPID_PUBLIC_KEY: ecdh.getPublicKey().toString("base64url"), VAPID_PRIVATE_KEY: ecdh.getPrivateKey().toString("base64url") };
    const newline = envText.includes("\r\n") ? "\r\n" : "\n";
    for (const [key, value] of Object.entries(pair)) {
      const pattern = new RegExp(`^([ \\t]*(?:export[ \\t]+)?${key}[ \\t]*=)[^\\r\\n]*`, "m");
      if (pattern.test(envText)) envText = envText.replace(pattern, (_, prefix) => `${prefix}"${value}"`);
      else envText += `${envText.endsWith("\n") ? "" : newline}${key}="${value}"${newline}`;
      process.env[key] = value;
    }
    await writeFile(".env", envText);
    console.log(JSON.stringify({ check: "push-key-generation", changed: true, file: ".env", secretsPrinted: false }));
  }
}

let validPushPair = false;
if (present("VAPID_PUBLIC_KEY") && present("VAPID_PRIVATE_KEY")) {
  try {
    const privateBytes = Buffer.from(process.env.VAPID_PRIVATE_KEY, "base64url");
    const publicBytes = Buffer.from(process.env.VAPID_PUBLIC_KEY, "base64url");
    const verifier = crypto.createECDH("prime256v1");
    verifier.setPrivateKey(privateBytes);
    validPushPair = privateBytes.length === 32 && publicBytes.length === 65 && verifier.getPublicKey().equals(publicBytes);
  } catch { /* Report invalid without printing key material. */ }
}
const names = ["SMTP_HOST", "SMTP_PORT", "SMTP_SECURE", "SMTP_USER", "SMTP_PASS", "MAIL_FROM", "MAIL_REPLY_TO", "RESEND_API_KEY",
  "GOOGLE_CLIENT_ID", "GOOGLE_CLIENT_SECRET", "OPENAI_API_KEY", "GEMINI_API_KEY", "VAPID_PUBLIC_KEY", "VAPID_PRIVATE_KEY", "VAPID_SUBJECT",
  "R2_ACCOUNT_ID", "R2_ACCESS_KEY_ID", "R2_SECRET_ACCESS_KEY", "R2_BUCKET_NAME"];
console.log(JSON.stringify({ check: "credential-readiness", variables: Object.fromEntries(names.map((key) => [key, present(key)])),
  validPushPair, appUrl: process.env.APP_URL || "http://localhost:3000", aiProvider: process.env.AI_PROVIDER || "openai",
  aiModels: { openai: process.env.OPENAI_MODEL || "gpt-4o-mini", gemini: process.env.GEMINI_MODEL || "gemini-3.5-flash-lite" } }));
const seen = new Map();
for (const line of envText.split(/\r?\n/)) {
  const match = line.match(/^\s*(?:export\s+)?([A-Z][A-Z0-9_]*)\s*=/);
  if (match) seen.set(match[1], (seen.get(match[1]) || 0) + 1);
}
console.log(JSON.stringify({ check: "duplicate-env-keys", duplicates: [...seen].filter(([, count]) => count > 1).map(([key]) => key) }));
