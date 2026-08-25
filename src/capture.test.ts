// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest";
import { extractJobFromPage } from "./capture";
afterEach(() => {
  document.head.innerHTML = "";
  document.body.innerHTML = "";
});
describe("active-page capture", () => {
  it("prefers JobPosting JSON-LD", () => {
    document.head.innerHTML =
      '<script type="application/ld+json">{"@type":"JobPosting","title":"Platform Engineer","description":"<p>Required experience building reliable TypeScript and PostgreSQL services for a growing product team.</p>","hiringOrganization":{"name":"Fictional Systems"},"jobLocation":{"address":{"addressLocality":"Example City","addressRegion":"ON"}}}</script>';
    const result = extractJobFromPage();
    expect(result.source).toBe("json-ld");
    expect(result.role).toBe("Platform Engineer");
    expect(result.description).toContain("TypeScript");
  });
  it("falls back to a semantic main region", () => {
    document.title = "Developer - Example";
    document.body.innerHTML =
      "<main><h1>Developer</h1><p>Responsibilities include designing APIs. Requirements include JavaScript, testing, Docker, and collaboration across engineering teams in a reliable production environment.</p></main>";
    const result = extractJobFromPage();
    expect(result.description.length).toBeGreaterThan(100);
    expect(result.role).toBe("Developer");
  });
});
