# Google sign-in and registration

Google login no longer creates missing customer or vendor accounts. The user must select Create account to register with Google. Both account types use the same rules; administrators can never self-register through Google.

The Google start handler signs a login/register intent into the OAuth state. The callback uses only that verified intent, ignoring any registration flags added to the callback URL. States issued without intent default to login. Errors preserve registration parameters such as `asVendor=1`.

Explicit registration creates the account and customer/business profile in one database transaction, then establishes the session. Existing accounts receive a sign-in message on registration; suspended accounts, wrong vendor roles, and mismatched linked Google identities cannot sign in. Existing vendor login defaults to Dashboard; new vendor registration opens Onboarding.

Password login already rejected unknown addresses and wrong passwords. Existing accounts, including accounts created by the previous combined Google flow, remain registered. No database migration or account deletion is performed.
