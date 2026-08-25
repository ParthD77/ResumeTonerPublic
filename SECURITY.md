# Security Policy

Do not report API keys, resumes, application content, or exploitable details in a public issue. Use the private security/support email listed on the Chrome Web Store page.

The extension stores a user-provided Gemini key in trusted `chrome.storage.local`. It is excluded from synchronization and backups, but local browser-profile access may expose it. Users should create a dedicated key restricted to the Gemini API, set quota/billing alerts, and revoke it if compromise is suspected.

Supported releases are the latest Chrome Web Store version. Security fixes are distributed through signed Store updates.

