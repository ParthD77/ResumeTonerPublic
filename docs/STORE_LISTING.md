# Chrome Web Store Listing Draft

## Single purpose

Capture a user-selected technical job listing and help the user review evidence-grounded resume changes before exporting a tailored PDF.

## Permission explanations

- **activeTab:** reads the current job page only after the user clicks the extension.
- **scripting:** runs the bundled extraction function in that active tab.
- **storage:** stores the user's key setting and protects it from content-script access; structured data uses local IndexedDB.
- **generativelanguage.googleapis.com:** sends user-approved BYOK requests directly to Gemini.

## Data disclosure summary

The product handles resume identity/contact data, career history, job listing content, and a user-provided API key. Structured data remains on-device. Analyze and Compact send disclosed content directly to Google Gemini. Resume Toner collects no analytics and operates no application backend.

## Test instructions

Install the extension, open Settings, load the fictional example, add a test Gemini key, accept cloud consent, open a public technical job listing, click the toolbar action, review capture, analyze, resolve proposals, and export a PDF.

