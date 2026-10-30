# NaijaSpa credential setup

Put provider-issued values directly in the local `.env`. Keep the private values out of chat and source control. Restart the app after changing its environment.

## Google login

1. Open https://console.cloud.google.com/ and select or create a project called **NaijaSpa**.
2. Open **Google Auth Platform → Branding**. If prompted, click **Get Started**. Enter **NaijaSpa** as the app name, choose your support email, select **External** for the audience, and enter your developer contact email. Save the configuration.
3. Under **Audience**, add the Google account you will use for testing to **Test users** while configuring the app.
4. Under **Data Access**, use the basic sign-in scopes `openid`, `email`, and `profile`. These match the application's existing OAuth request.
5. Under **Clients**, click **Create client**, choose **Web application**, and name it **NaijaSpa Web**.
6. Add these **Authorized JavaScript origins**:

   ```text
   http://localhost:3000
   http://127.0.0.1:3101
   ```

7. Add these **Authorized redirect URIs**, including the callback path:

   ```text
   http://localhost:3000/api/auth/google/callback
   http://127.0.0.1:3101/api/auth/google/callback
   ```

   The first matches the current `.env` `APP_URL`. The second matches the integration-test server's explicit `APP_URL` override. The browser host, port, and callback must match an entry in Google Cloud.

8. Create the client. Copy the **Client ID** and **Client secret** into the existing `.env` entries:

   ```dotenv
   GOOGLE_CLIENT_ID="paste the issued client ID here"
   GOOGLE_CLIENT_SECRET="paste the issued client secret here"
   ```

   Those example strings are instructions, not working credentials. Use the actual Google-issued values.

9. Save `.env`, then restart the app and test the **Continue with Google** button. Google login cannot be tested until both values are saved.

For production, add the origin and matching `/api/auth/google/callback` URI for each production domain you actually use. For example, using `https://naijaspa.ng` requires `https://naijaspa.ng/api/auth/google/callback`. Keep the deployment's `APP_URL` consistent with its domain.

Sources: [Create a web OAuth client](https://developers.google.com/workspace/guides/create-credentials), [Google's web-server OAuth flow and redirect validation](https://developers.google.com/identity/protocols/oauth2/web-server).

## Email

The SMTP credentials have been configured. Authentication passed, and the test email reached the Google-login mailbox on 30 October 2026, landing in Spam. Inbox placement is still under investigation.

Gmail's original headers confirmed **DKIM PASS** (selector `smarthost`), **DMARC PASS**, and **SPF SOFTFAIL**. The observed outbound relay `185.113.249.158` was not authorized by the published SPF record. In cPanel → Email Deliverability → Manage, review the suggested SPF record and confirm with Truehost which relay include/IP range applies to this mailbox. Merge that authorization into the existing single SPF TXT record at the authoritative DNS provider. Do not replace unrelated sending authorizations or publish a second SPF record. Do not weaken the passing DKIM/DMARC configuration. After DNS updates, send a new test and inspect fresh Gmail authentication results; a passing SPF result does not guarantee Inbox placement.

When ready, open **cPanel → Email Accounts → Connect Devices** for the existing mailbox. Confirm the secure outgoing server settings, then put that mailbox's password into `SMTP_PASS` in `.env`. The existing port 465 setup uses `SMTP_SECURE="true"`.

Run `node scripts/check-integrations.mjs --only=smtp` to verify connection and authentication. This check does not send an email. Sending a test message needs a recipient specified by you.

Source: [cPanel mail client settings](https://docs.cpanel.net/cpanel/email/set-up-mail-client/).

## AI search

Open **Admin → AI** (`/admin/ai`) to choose **Google Gemini**, **OpenAI**, or **Local search**, set each provider's model ID, save, and test the connection. Only roles with `ai.manage` can change settings or run provider tests; analytics roles can view them. Provider/model selections are stored in `SystemConfig`; API keys remain in server environment variables. Provider errors, quotas, invalid JSON, missing keys, and timeouts fall back to local search.

For Gemini testing, create an API key in [Google AI Studio](https://aistudio.google.com/apikey), then save it directly as `GEMINI_API_KEY` in `.env`. The initial Gemini model is `gemini-3.5-flash-lite`. Google lists a free tier for this model; access and limits depend on your project's quota and billing tier. Restart the server after adding the key, then use **Test connection** in Admin → AI. The test makes a small real request with a synthetic spa search and does not treat local fallback as a provider success.

```dotenv
AI_PROVIDER="gemini"
GEMINI_API_KEY="paste your issued Gemini key here"
GEMINI_MODEL="gemini-3.5-flash-lite"
```

For OpenAI, create a project API key at https://platform.openai.com/api-keys and put it into `OPENAI_API_KEY` in `.env`. The existing default model is `gpt-4o-mini`. The OpenAI Developers plugin is also available for project-key setup if installed and connected.

Environment defaults apply until an admin saves selections. A saved provider choice overrides `AI_PROVIDER`; each saved model overrides its corresponding environment model. Search calls only the selected provider and uses the local parser on failure. It does not automatically switch to another paid provider.

Gemini sources: [API keys](https://ai.google.dev/gemini-api/docs/api-key), [Generate Content API](https://ai.google.dev/api/generate-content), [pricing and free-tier availability](https://ai.google.dev/gemini-api/docs/pricing).

Sources: [OpenAI API quickstart](https://developers.openai.com/api/docs/quickstart), [API authentication](https://developers.openai.com/api/reference/overview), [OpenAI Developers plugin](https://developers.openai.com/learn/developers-codex-plugin).

## Push notifications

A fresh P-256 VAPID key pair was generated and saved directly into `VAPID_PUBLIC_KEY` and `VAPID_PRIVATE_KEY` in `.env`. Its public/private correspondence and key lengths were validated without printing the keys. The existing `VAPID_SUBJECT` was preserved.

Browser registration, service-worker notifications, server delivery, persistent preferences, and a notification job are implemented. Apply migrations on each deployment with `npm run db:migrate`.

To enable push, sign in at `/account/settings`, click **Enable notifications**, allow the browser prompt, then click **Send test notification**. HTTPS is required on deployed sites; localhost works for development. On iPhone/iPad, install the app on the Home Screen first. Device notification settings and Do Not Disturb can suppress visible alerts even when the push service accepts delivery.

**Test on this device** bypasses remote delivery and creates a notification through the service worker. Use it to separate device display issues from provider delivery. Enable and test actions update the service worker first, so an old installed app worker cannot silently miss the new push handler.

Run `node scripts/notification-worker.mjs` alongside the local server for queued notifications and appointment reminders. In production, schedule an authenticated request to `/api/jobs/notifications` every minute using `Authorization: Bearer <CRON_SECRET>` or the configured `INTERNAL_JOB_SECRET`. Do not put job secrets in URLs. A successful provider response confirms acceptance, not that the user saw the notification.

Check readiness without revealing credentials:

```sh
node scripts/setup-credentials.mjs
```

`node scripts/setup-credentials.mjs --generate-push` generates keys only if both keys are absent. It preserves existing keys.

## Cloudflare R2 uploads

1. In the Cloudflare dashboard, select **R2 Object Storage → Overview** and activate R2 if prompted.
2. Create the private bucket `naijaspa-uploads`, using the default jurisdiction.
3. Under **Account Details**, copy the Account ID. Open **Manage** beside **API Tokens**.
4. Choose **Create Account API token**, name it `NaijaSpa uploads`, select **Object Read & Write**, and restrict it to this bucket.
5. Copy the issued Access Key ID and Secret Access Key; the secret is shown only once. Save these locally:

```dotenv
UPLOAD_STORAGE="r2"
R2_ACCOUNT_ID="your account ID"
R2_ACCESS_KEY_ID="your access key ID"
R2_SECRET_ACCESS_KEY="your secret access key"
R2_BUCKET_NAME="naijaspa-uploads"
```

Restart the application. Gallery and category uploads use R2; their existing app media URLs continue to serve images from the private bucket. Existing database/local images remain readable. Existing files are not automatically migrated. No public bucket domain or browser CORS setup is required for these server uploads.

Run `npx tsx scripts/test-r2.ts` for an isolated temporary upload/read/delete check. The live credentials passed this check and the app gallery upload/read/delete test on 30 October 2026. Keep the same environment values on the deployment server.

Source: [Cloudflare R2 token setup](https://developers.cloudflare.com/r2/api/tokens/).

## Paystack sandbox payouts

Use TEST keys and the **Paystack Test Bank** (`001`) with account `0000000000` for the sandbox account resolver. Only this explicit test fixture maps to the published Zenith transfer bank (`057`); live keys preserve the selected bank. Transfer requests explicitly send NGN and use lowercase references.

The retained test booking's ₦90 payout was accepted with status `otp` on 30 October 2026. The earning remains pending until Paystack confirms success. In **Admin → Finance → Payouts**, enter the actual OTP issued by Paystack and select **Confirm OTP**, or select **Verify transfer** after approval in Paystack. Do not use **Retry transfer** for an in-progress payout. Ambiguous network failures retain the reserved reference for verification before any retry. Transfers below Paystack's ₦50 minimum remain pending for finance review.
