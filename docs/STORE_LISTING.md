# Chrome Web Store Listing Draft

## Single purpose

Capture a user-selected technical job listing and help the user review evidence-grounded resume changes before exporting a tailored PDF.

## Permission explanations

- **activeTab:** reads the current job page only after the user clicks the extension.
- **scripting:** runs the bundled extraction function in that active tab.
- **storage:** stores the user's key setting and protects it from content-script access; structured data uses local IndexedDB.
- **downloads:** saves a user-approved PDF with a consistent filename and overwrites the prior same-named export instead of creating numbered duplicate copies.
- **generativelanguage.googleapis.com:** sends user-approved BYOK requests directly to Gemini.

## Data disclosure summary

The product handles resume identity/contact data, career history, user-selected PDF content, optional user-confirmed chatbot context, job listing content and URL, and a user-provided API key. Structured data and source PDFs remain on-device. PDF import, Analyze, and Compact send the disclosed content directly to Google Gemini only after the user invokes the feature. Resume Toner collects no analytics and operates no application backend.

## Test instructions

Install the extension, open Settings, load the fictional example, add a test Gemini key, accept cloud consent, open a public technical job listing, click the toolbar action, review capture, analyze, resolve proposals, and export a PDF.
