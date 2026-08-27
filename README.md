# Resume Toner

Resume Toner is a local-first Chrome extension for tailoring English technical resumes to a job listing. It captures the active listing, uses your own Gemini API key to create evidence-linked suggestions, lets you review every change, recalculates transparent match scores, and exports an ATS-friendly PDF.

There is no Resume Toner account, hosted application backend, telemetry, or shared API key. Structured resume and application data stays in Chrome-managed storage on your device. When you choose **Analyze** or **Compact**, the extension sends your entire resume and full job listing directly to Google Gemini with your key.

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

Read [Privacy](docs/PRIVACY.md), [Security](SECURITY.md), and [Terms](docs/TERMS.md). Never post API keys, resumes, or job-application details in a public issue. Use the private support email shown on the Chrome Web Store listing for sensitive reports.

## Licence

Source code is available under the Mozilla Public License 2.0. See [LICENSE](LICENSE).
