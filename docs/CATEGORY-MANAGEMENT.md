# Categories and specialist treatments

The category update is deployed in `/srv/naijaspa/releases/20261031-categories-v2`, selected by `/srv/naijaspa/current`. The previous release is retained for rollback. The live database and Nginx configuration were not replaced.

1. Sign in at `https://naijaspa.com/login/admin`, then open **Categories** (`/admin/categories`).
2. Click **New category**. Enter the name; the URL slug can be left blank to generate it from the name. Add a description and optional search/SEO information, then click **Create category**.
3. The new category is selected automatically and starts inactive. Add an image if wanted, then click **Activate**. Active categories become available to specialists and in the public filters.
4. Specialists open **Services** (`https://naijaspa.com/vendor/services`) and click **New service**. Choose a category, then enter their actual treatment name, description, price, duration, offered settings and home/hotel add-ons.

Changing an existing treatment's category now persists correctly. Missing/inactive destination categories return a clear error. A treatment may keep its existing category if that category is subsequently deactivated. Errors remain visible in the editor so the specialist can correct them and retry.

Creating or cancelling a category no longer inserts an immediate `New category` placeholder. Category activation does not approve a specialist's application or invent prices, working hours, reviews or verification.

Validation: 243 unit tests, TypeScript, ESLint and the production build passed in the isolated VPS release. Private desktop/mobile browser checks covered cancel, create, automatic selection, activation requests and treatment-category save/error recovery; category and treatment writes were mocked. Public health checks for NaijaSpa and PadiCheck passed after the switch.
