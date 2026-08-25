import type { JobCapture } from "./domain";

export function extractJobFromPage(): Omit<JobCapture, "capturedAt"> {
  const clean = (value: unknown) =>
    String(value ?? "")
      .replace(/\u00a0/g, " ")
      .replace(/[ \t]+/g, " ")
      .replace(/\n\s*\n\s*\n+/g, "\n\n")
      .trim();
  const text = (selector: string) =>
    clean(
      document.querySelector<HTMLElement>(selector)?.innerText ||
        document.querySelector(selector)?.textContent,
    );
  const meta = (name: string) =>
    clean(
      document.querySelector<HTMLMetaElement>(
        `meta[property="${name}"],meta[name="${name}"]`,
      )?.content,
    );
  const firstText = (selectors: string[]) => {
    for (const selector of selectors) {
      const value = text(selector);
      if (value) return value;
    }
    return "";
  };
  const findPosting = (value: unknown): Record<string, any> | null => {
    if (!value || typeof value !== "object") return null;
    if (Array.isArray(value)) {
      for (const child of value) {
        const hit = findPosting(child);
        if (hit) return hit;
      }
      return null;
    }
    const obj = value as Record<string, any>,
      type = obj["@type"];
    if (
      type === "JobPosting" ||
      (Array.isArray(type) && type.includes("JobPosting"))
    )
      return obj;
    return obj["@graph"] ? findPosting(obj["@graph"]) : null;
  };
  let structured: Record<string, any> | null = null;
  for (const node of document.querySelectorAll(
    'script[type="application/ld+json"]',
  )) {
    try {
      structured = findPosting(JSON.parse(node.textContent ?? ""));
      if (structured) break;
    } catch {
      /* Ignore invalid third-party metadata. */
    }
  }
  const selected = clean(window.getSelection()?.toString()),
    known = [
      '[data-testid="job-description"]',
      '[data-testid*="jobDescription"]',
      '[data-testid*="job-description"]',
      '[class*="job-description"]',
      '[class*="jobDescription"]',
      "#job-description",
      ".job-description",
      '[itemprop="description"]',
      "article",
      "main",
      '[role="main"]',
    ];
  const structuredDescription = Boolean(structured?.description);
  let description = clean(structured?.description ?? ""),
    source = description ? "json-ld" : "generic";
  if (!description && selected.length >= 100) {
    description = selected;
    source = "selection";
  }
  if (!description) description = firstText(known);
  if (!description || description.length < 100) {
    const candidates = [
      ...document.querySelectorAll<HTMLElement>(
        'main,article,section,[role="main"],div',
      ),
    ]
      .map((el) => clean(el.innerText))
      .filter((v) => v.length >= 150 && v.length <= 100000)
      .map((value) => ({
        value,
        score:
          [
            "responsibilities",
            "requirements",
            "qualifications",
            "experience",
            "about the role",
            "what you",
          ].reduce((n, k) => n + (value.toLowerCase().includes(k) ? 3 : 0), 0) +
          Math.min(value.length / 1000, 10),
      }))
      .sort((a, b) => b.score - a.score);
    if (candidates[0]) description = candidates[0].value;
  }
  const stripHtml = (value: string) => {
    const div = document.createElement("div");
    div.innerHTML = value;
    return clean(div.textContent);
  };
  if (structuredDescription) description = stripHtml(description);
  const org = structured?.hiringOrganization,
    address =
      structured?.jobLocation?.address ??
      structured?.applicantLocationRequirements?.name;
  const company = clean(
    (typeof org === "object" ? org?.name : org) ||
      firstText([
        '[data-testid*="company"]',
        '[class*="company-name"]',
        '[class*="companyName"]',
        '[itemprop="hiringOrganization"]',
      ]) ||
      meta("og:site_name"),
  );
  const role = clean(
    structured?.title ||
      firstText([
        "h1",
        '[data-testid*="job-title"]',
        '[class*="job-title"]',
        '[class*="jobTitle"]',
        '[itemprop="title"]',
      ]) ||
      meta("og:title"),
  );
  const locationText =
    typeof address === "object"
      ? [address.addressLocality, address.addressRegion, address.addressCountry]
          .filter(Boolean)
          .join(", ")
      : address;
  return {
    company: company.slice(0, 300),
    role: role.slice(0, 300),
    location: clean(
      locationText ||
        firstText([
          '[data-testid*="location"]',
          '[class*="job-location"]',
          '[class*="jobLocation"]',
          '[itemprop="jobLocation"]',
        ]),
    ).slice(0, 300),
    description: description.slice(0, 100000),
    url: location.href,
    source,
  };
}
