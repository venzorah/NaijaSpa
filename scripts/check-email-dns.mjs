import { createRequire } from "node:module";
import { resolveTxt } from "node:dns/promises";
const require = createRequire(import.meta.url);
require("@next/env").loadEnvConfig(process.cwd());
const domain = ((process.env.MAIL_FROM || "noreply@naijaspa.ng").match(/@([a-z0-9.-]+)/i) || [])[1];
if (!domain) throw new Error("Sender domain missing");
for (const [check, name] of [["spf", domain], ["dmarc", `_dmarc.${domain}`], ["cpanel-default-dkim", `default._domainkey.${domain}`]]) {
  try {
    const records = (await resolveTxt(name)).map((r) => r.join("")).filter((v) => /^v=(spf1|DMARC1|DKIM1)/i.test(v));
    console.log(JSON.stringify({ check, domain, records }));
  } catch (error) { console.log(JSON.stringify({ check, domain, status: error.code })); }
}
