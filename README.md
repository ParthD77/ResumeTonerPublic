# Resume Toner

Resume Toner is a local-first Chrome extension for tailoring English technical resumes to a job listing. It captures the active listing, uses your own Gemini API key to create evidence-linked suggestions, lets you review every change, recalculates transparent match scores, and exports an ATS-friendly PDF.

There is no Resume Toner account, hosted application backend, telemetry, or shared API key. Structured resume and application data stays in Chrome-managed storage on your device. When you choose **Analyze** or **Compact**, the extension sends your entire resume and full job listing directly to Google Gemini with your key.

## Quick setup

### 1. Create a Gemini API key

Resume Toner uses a key from your own Google AI Studio account. There is no shared developer key, Resume Toner subscription, or Resume Toner account.

1. Open the [Google AI Studio API Keys page](https://aistudio.google.com/app/apikey) and sign in with your Google account.
2. Accept Google's terms if prompted. For a new account, AI Studio normally creates a default Google Cloud project and key automatically.
3. If no key is available, select **Create API key** and choose or create a project.
4. Copy the key. Treat it like a password: do not post it in an issue, include it in a screenshot, or commit it to Git.
5. After installing Resume Toner, open its Settings page, paste the key into **Gemini API key**, and select **Verify and save key**.
6. Resume Toner makes a small live request to confirm that the key and selected model work. The key is saved only after verification succeeds.

New AI Studio keys are currently authorization keys restricted to the Gemini API by default. If an older key is labelled **Unrestricted**, use AI Studio's restriction control to restrict it to the Gemini API. Consider using a dedicated key and setting quota or billing alerts.

#### Is Gemini free?

Google currently provides a free Gemini API tier with free input and output tokens within model-specific rate limits. You do not have to enable billing merely to create a free-tier key. Paid service is optional and provides different models, limits, and features.

There is an important data-use difference:

- Google says content submitted through free-tier services may be used to improve its products, including machine-learning technologies.
- Google says content submitted through paid services is not used to improve its products.

Resumes can contain names, contact information, education, and employment history. Review the current [Gemini pricing and data-use table](https://ai.google.dev/gemini-api/docs/pricing) and [Gemini API terms](https://ai.google.dev/gemini-api/terms) before choosing a tier. Resume Toner cannot change Google's terms or account settings and never receives your Google billing information.

### 2. Install Resume Toner

Choose one of the following installation methods. Chrome extensions run on desktop Chrome; managed work or school devices may prevent installation.

#### Option A: Chrome Web Store

This will be the recommended method after the public listing is approved because Chrome handles installation and updates.

1. Open the Resume Toner Chrome Web Store listing when it becomes available.
2. Select **Add to Chrome**.
3. Review the requested permissions and select **Add extension**.
4. Select Chrome's Extensions puzzle icon, find Resume Toner, and select the pin icon for easier access.
5. Open Resume Toner and continue through the guided setup.

Until the Store listing is published, use the manual method below.

#### Option B: Manual release ZIP

1. Open the [visual setup and download page](https://parthd77.github.io/ResumeTonerPublic/).
2. Select **Download manual ZIP**.
3. Extract the ZIP into a permanent folder. Do not try to load the ZIP itself, and do not delete or move the extracted folder while the extension is installed.
4. Enter `chrome://extensions` in Chrome's address bar.
5. Turn on **Developer mode** in the upper-right corner.
6. Select **Load unpacked**.
7. Choose the extracted folder that directly contains `manifest.json`.
8. Confirm that the Resume Toner card appears and is enabled, then pin it from Chrome's Extensions menu.

Manual installations do not receive automatic Store updates. To update, download and extract the new release, replace the old extracted files, and select the reload icon on the Resume Toner card at `chrome://extensions`.

### 3. Complete onboarding

1. Open Resume Toner Settings and verify your Gemini key.
2. Read and accept the cloud-transfer disclosure. PDF import, **Analyze**, and **Compact** send the disclosed resume and job information directly to Google Gemini only after you invoke those actions.
3. Upload a text-based resume PDF. Resume Toner extracts its text locally, sends that text to Gemini for structured import, and shows the complete result for review before saving.
4. Check your name, contact details, education, dates, employers, projects, links, skills, bullets, technologies, and metrics. Correct any extraction mistakes before confirming the base resume.
5. Optionally add career evidence or user-confirmed context. Resume Toner uses this information to check whether proposed claims are supported.

### 4. Tailor and export a resume

1. Open a technical job listing in Chrome.
2. Select the Resume Toner toolbar icon to capture the active page, or paste the listing manually in the workspace.
3. Choose a one- or two-page target and a tailoring mode.
4. Select **Analyze and tailor**. Resume Toner sends the full resume, saved evidence, optional confirmed context, and job listing to Gemini using your key.
5. Review every proposal. Accept, reject, or edit it; nothing is silently added to the exported resume.
6. If the preview exceeds the page target, use **Compact with Gemini** and review the resulting shortening proposals.
7. Select **Export PDF**. Resume Toner generates a fresh ATS-friendly US Letter PDF containing only the final reviewed profile. It does not cover or reuse hidden text from the uploaded source PDF.

### How data and the API key are handled

- Resume profiles, source PDFs, evidence, listings, tailoring runs, decisions, and history remain in Chrome-managed storage on the device until deleted or the extension is uninstalled.
- The Gemini key is stored separately in `chrome.storage.local`, is excluded from JSON backups, and is not synchronized by Resume Toner.
- Chrome extension storage is not encrypted. Someone with access to an unlocked Chrome profile may be able to recover local information.
- Resume Toner has no application backend, developer-accessible user database, analytics, advertising, or telemetry.
- Gemini requests go directly from the extension to Google's Gemini API using the user's key.
- Exported JSON backups never contain the Gemini key. Downloaded PDFs and backups remain wherever the user saves them.

See the [full visual onboarding guide](https://parthd77.github.io/ResumeTonerPublic/) for annotated screen examples. If installation fails, confirm that you are using desktop Chrome, are not in Guest or Incognito mode, selected the extracted folder rather than the ZIP, and are not blocked by a device administrator.

## Current V1 scope

- Chrome desktop and Manifest V3
- English software and technical roles
- Gemini BYOK (`gemini-3.5-flash-lite` by default)
- Evidence-only, conservative extrapolation, and gated diagnostic stress modes
- One ATS-friendly US Letter template with one- or two-page targets
- Local history, versioned JSON backup, and direct PDF export

Application-answer drafting and local models are not part of V1.

## Local development

Requirements: Node.js 20 or newer and current Chrome.

```powershell
npm install
npm test
npm run build
```

Then open `chrome://extensions`, enable Developer mode, select **Load unpacked**, and choose the generated `dist` directory. Developer mode is for development; public releases are distributed through the Chrome Web Store.

Create a release ZIP and run the privacy/release audit:

```powershell
npm run audit:release
npm run package
```

## Privacy and security

Read [Privacy](docs/PRIVACY.md), [Security](SECURITY.md), and [Terms](docs/TERMS.md). Never post API keys, resumes, or job-application details in a public issue. Send private privacy or security reports to [parthdhroovji1@gmail.com](mailto:parthdhroovji1@gmail.com).

## Licence

Source code is available under the Mozilla Public License 2.0. See [LICENSE](LICENSE).
