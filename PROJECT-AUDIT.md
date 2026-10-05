# Project Audit

**Audited:** 2026-09-26, on branch `dev` (then labeled "version 9", now 1.0.0 under semantic versioning; versions 10 and 11 became 1.0.1 and 1.0.2). **Method:** reading the source, pattern searches over every file, comparing the served pages to the repository, and one browser session with network monitoring. **Not a legal review and not a penetration test.** Where something couldn't be established, it says so.

Classification used below: **VERIFIED** (checked in code or by observation), **NEEDS MANUAL REVIEW** (a decision or outside fact only you can settle), **POTENTIAL ISSUE** (a real weakness or risk), **NOT APPLICABLE**.

## 1. Repository Overview

VERIFIED. A static PWA in plain HTML, CSS and JavaScript. No package manager, no build step, no tests, no GitHub Actions, no `.env` files, no config for a bundler.

| File | Purpose |
|---|---|
| `index.html`, `styles.css` | Markup, styles, Content Security Policy |
| `app.js` (~3,200 lines) | All app logic |
| `importer.js` | Reads .xlsx, CSV and pasted rows (own code) |
| `theme.js` | Applies saved theme before first paint |
| `sw.js`, `manifest.webmanifest`, `icons/` | Offline and install support |
| `fonts/` | Geist font files and `OFL.txt` |
| `assets/banner.svg` | README illustration (drawn, not a screenshot) |
| `_headers` | Beta branch only: `X-Robots-Tag: noindex` |
| `README.md`, `SECURITY.md`, `THIRD-PARTY-NOTICES.md`, `PROJECT-AUDIT.md` | Documentation |

Deployment: `main` is served by GitHub Pages (`bicklabs.github.io/hours-tracker`). `dev` is served by Cloudflare Workers Builds at an unlisted `workers.dev` address. Cloudflare Access is **not** enabled. There is one committer identity (`bicklabs`, a GitHub noreply address). GitHub has secret scanning and push protection enabled.

## 2. Data Architecture

VERIFIED. All user data is in `localStorage` (via a wrapper in `app.js` around line 158). No IndexedDB, sessionStorage or cookies are used. Nothing is encrypted. Everything below is plain JSON.

| Data (key) | Contents | Why | In backup | In CSV export | In reports | User can edit / delete |
|---|---|---|---|---|---|---|
| Entries (`cht.entries.v1`) | Category, location, optional project name (up to 60 characters, only on categories that track projects), start, end, notes, Highlight flag, source, import id, timestamps | Core hours log | Yes | Date, location, times, duration only. No notes or category | Highlighted notes appear in the Application Packet | Edit and delete, with Undo after delete |
| Active shift (`cht.active.v1`) | Category, location, start time | Clocked-in state | Yes | No | No | Clock out or discard |
| Saved locations (`cht.customLocations.v1`) | Location names per category | Quick pick lists | Yes | No | Names appear | Remove |
| Location details (`cht.locationDetails.v1`) | Organization, experience type, contact name, title, email, phone, city, description (max 700 characters) | Application details | Yes | No | Yes, in the Application Packet | Edit, or clear all fields |
| Categories (`cht.categories.v1`) | Name, icon, color, goal, hidden flag | Personalization | Yes | No | Names appear | Edit, hide, delete when empty |
| Reports (`cht.reports.v1`) | Full HTML snapshot of each report, up to 30 (older ones are dropped silently when a 31st is made) | Saved snapshots | Yes | No | Is the report | Delete one at a time |
| Import history (`cht.imports.v1`) | Import id, source name, date, entry count, hours, and any categories or locations the import added | Undo an import | Yes | No | No | Undo |
| Settings (`cht.prefs.v1`) | Theme, appearance, Pre-Health Track, last-used location, backup date, snooze and welcome flags, year months | Preferences | Yes | No | Track affects layout | Change; Erase All Data |

Not present: server database, third-party storage, account data. The service worker's cache (`clinical-hours-v9`) holds only the app's own files, never user data.

**Sensitive content:** notes, third-party contact names, emails and phone numbers, and employer and location names can be personal. They sit unencrypted in browser storage and in every backup and saved report.

## 3. Network Behavior

VERIFIED by three methods:
1. **Code search.** No `fetch`, `XMLHttpRequest`, `WebSocket`, `EventSource`, `sendBeacon`, `importScripts` or dynamic `import()` in app code. The only `fetch` is in `sw.js` and re-requests the same request, for same-origin GET only. The only URL in the source is an XML namespace label in `importer.js` (never requested). There are no `<iframe>`, external links or external assets in `index.html` or `styles.css`.
2. **Served pages.** The HTML served by GitHub Pages and by Cloudflare is byte-identical to `index.html` in the repo (hash compared). Neither injects an analytics script.
3. **Live session.** In a browser session (Clock, Calendar, History, both reports, Copy Rows, Import paste screen) the only requests were the page, `styles.css`, `theme.js`, `importer.js`, `app.js` and the font, all to the same origin.

The Content Security Policy in `index.html` is `default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self'; connect-src 'self'; manifest-src 'self'; worker-src 'self'; object-src 'none'; base-uri 'none'; form-action 'none'`, and the referrer policy is `no-referrer`.

**A. Requests needed to load the app:** the files above, plus `manifest.webmanifest`, icons and `sw.js`. **B. Requests carrying user data:** none found.

Things that can move data out, by the user's choice: `navigator.share` (share sheet) for backups and CSV files, the download link fallback, `navigator.clipboard.writeText` for Copy Rows, and `window.print()` for PDFs. These are user-initiated and hand data to the operating system.

**What this does not prove (NEEDS MANUAL REVIEW):**
- Static inspection and one session can't prove behavior in every browser, or forever. Future changes to the code or hosting could change it.
- Hosting providers see request metadata (IP address, user agent, requested files). GitHub and Cloudflare privacy statements apply; this audit did not review them.
- **Cloudflare adds `report-to` and `nel` (Network Error Logging) response headers on the beta site.** These let a browser send network-failure reports to Cloudflare (`success_fraction` was 0.0, so only failures). They carry no app data, and the app's CSP doesn't govern them. GitHub Pages did not send them.
- Browser extensions, the OS, and phone-level backups (iCloud, Google) are outside the app.

## 4. Storage Mechanisms and Data Loss

VERIFIED from code:
- **Clear site data / delete the PWA:** storage is erased. No server copy exists.
- **Different browser, or browser vs. Home Screen app:** separate storage. Data moves only by backup file.
- **New or lost device:** nothing transfers without a backup file.
- **Corrupted storage:** reads fall back to empty on a parse error (`store.read`). A later save then overwrites the corrupted value, so the original is lost. POTENTIAL ISSUE (low): the app could warn or keep a copy before overwriting. Not changed.
- **Storage full or blocked:** a write failure shows a toast and the change isn't saved.
- **Persistence:** the app calls `navigator.storage.persist()`. It is a request; browsers may refuse.
- **Invalid backup:** invalid JSON or a file with no entries shows a message and changes nothing. Unreadable entries are skipped and counted. `Replace All` asks for confirmation.
- **Backup format:** pretty-printed JSON, `app: "clinical-hours-tracker"`, `schemaVersion: 3`, with all data in the table above plus `exportedAt`. Not encrypted. Saved through the share sheet or a download.
- **Compatibility:** any browser or device running the app can restore it. Older backups restore. The restore code doesn't read `schemaVersion` at all, so it can't warn about a backup from a newer version.

NEEDS MANUAL REVIEW: whether Home Screen apps on iPhone keep storage that Safari would remove after inactivity. The old README stated this as fact and the in-app install card still says Safari "can clear website data after a week without use." That is platform behavior the code can't confirm and Apple can change. I removed it from the README.

## 5. Security Findings

No hard-coded secrets, keys, tokens or passwords were found (pattern search over all current files; git history was searched for "password" only, and it contains the same set of files). No `eval`, `new Function`, `document.write`, sensitive logging (`console.*` isn't used) or user data in URLs. No third-party code, so no dependency vulnerabilities to track.

| # | Finding | Class | Detail |
|---|---|---|---|
| 1 | Restored report HTML is shown unsanitized | POTENTIAL ISSUE | On restore, each saved report's `html` string is accepted if it is a string (`app.js` ~1410). It is later assigned with `innerHTML` in the report viewer and print view. The CSP (`script-src 'self'`, no inline scripts) should stop script execution in browsers that enforce it, but a crafted backup could still show fake text, links or styled content. Requires the user to restore a malicious file. **Proposed fix:** store report data rather than HTML and rebuild the HTML on open, or sanitize on restore. |
| 2 | CSV and Copy Rows formula injection | POTENTIAL ISSUE | `csvCell` only handles quotes, commas and newlines. A location beginning `=`, `+`, `-` or `@` (possible via an imported sheet) is written as is, and a spreadsheet may run it as a formula. **Proposed fix:** prefix such values with an apostrophe or a space on export. |
| 3 | No size limit on spreadsheet import | POTENTIAL ISSUE (low) | `importer.js` unzips and parses XML with no size or entry limits. A huge file can hang the tab. Self-inflicted only. |
| 4 | Shared web address on GitHub Pages | POTENTIAL ISSUE | `localStorage` is shared by everything under `bicklabs.github.io`. Today only this repo has Pages, so nothing else can read the data. Any future Pages site on the account could. **Options:** keep Pages to this one repo, or use a custom domain or separate account. |
| 5 | Not framing-protected | NEEDS MANUAL REVIEW | GitHub Pages can't send `X-Frame-Options` or `frame-ancestors`, and a `<meta>` CSP ignores `frame-ancestors`. Another site could frame the app. Low impact for an app with no server actions. |
| 6 | Unencrypted local storage and backups | VERIFIED | Documented in README and SECURITY.md. Adding encryption would be a feature change. |
| 7 | Other rendering paths | VERIFIED, limited | Import previews, history, calendar and location screens escape user text with `esc()`. I checked these by pattern search and reading, not line by line for all 56 `innerHTML` sites. |
| 8 | Unvalidated fields in restored backups | POTENTIAL ISSUE (low) | Entries keep every field from the file (`...r`), and settings are spread into state without a field allow-list. Impact appeared limited to odd behavior, but this wasn't fully tested. |
| 9 | Service worker | VERIFIED | Same-origin GET only, versioned cache, never caches user data. |

## 6. Features

Verified by reading `app.js` and `index.html`. Full table in the README.

- **Implemented:** clock in and out, notes, Highlights, "Still clocked in?" at 24 hours, manual entry, repeat shift, edit, delete with Undo, History with search and filters, Calendar (hours per day, colored by the category with the most hours, monthly summary), custom categories (name, icon, color, goal, hide), contact details per location, six themes with Light, Dark and Match Phone, CSV export, Copy Rows, backup and restore, PWA install, offline use.
- **Beta (tagged in the UI):** Reports (Application Packet, Hours Summary, saved reports), Pre-Health Track (General, Pre-Med, Pre-PA), Import Hours.
- **Partial or worth noting:** the app has "contact" details per location, not a supervisor field per entry. The mobile layout was only checked at phone width. Default categories are Clinical, Shadowing, Volunteering, Research.
- **Not present:** accounts, sync, encryption, notifications, submission to application services, tests.
- **Old documentation that no longer matched:** button names "Backup Data" and "Restore from Backup" (now "Back Up Now" and "Restore"), the paste subtitle mentioning Numbers, and the old two-domain testing note. All updated.

## 7. Application-Service Names and Trademark Considerations

- **Status (VERIFIED, changed in version 10):** the app and README no longer use the names of specific application services. Settings shows "Pre-Med" and "Pre-PA" with the labels "Med School" and "PA Program". Reports are titled "Experiences (Pre-Med Layout)" and "Experiences (Pre-PA Layout)". The "allows 15 experiences" message was replaced with a general note. A search of the repository for the service names, other than this audit and its history, finds none. Earlier versions (1 through 9, in the old repository history) did use them.
- **Documentation:** the README states the project is independent, isn't affiliated with or endorsed by any application service, school or program, and that the layouts aren't official formats. No logos or brand assets are used.
- **Layouts still resemble real applications (NEEDS MANUAL REVIEW):** the 700 character description count, the field names and the hours-per-week figure were chosen from general knowledge of typical applications, not from a checked source. They are labeled Beta and described as typical layouts, not official ones. Verify them against current application instructions before removing the Beta tags.

## 8. Dependencies and Licenses

- **npm / package files:** none. No lockfile, no transitive dependencies.
- **Geist font** (VERIFIED file present): SIL Open Font License 1.1, copyright 2024 The Geist Project Authors. Bundling is allowed. Attribution is satisfied by keeping `fonts/OFL.txt` with the files. No Reserved Font Name is declared in the notice. **NEEDS MANUAL REVIEW:** where the `.woff2` files were downloaded from and whether they were converted or subset. Modified versions have extra OFL conditions (for example, not selling the font by itself).
- **Icons** (NEEDS MANUAL REVIEW): interface icons are inline SVG paths in `app.js`, and `icons/` holds the app icon in SVG and PNG. No icon library file is present, and no attribution comments. Their origin isn't documented, and I couldn't establish whether any path data was adapted from an existing icon set. If you know they were drawn fresh, note it. Otherwise compare against sets you may have used.
- **Copied or adapted code** (NEEDS MANUAL REVIEW): no license headers, "copied from" comments or URLs were found. `importer.js` implements its own zip and XML reading. Origin of any snippet can't be proven from the repo. AI-assisted code may resemble public code.
- **README layout:** the banner, centered title and badge row were modeled on the look of another project's README. Only layout ideas were used. No text or images were copied.
- **README badges:** loaded from shields.io by the viewer's browser on GitHub. Not part of the app. NOT APPLICABLE to app licensing.

## 9. Project License

- **Current state (VERIFIED):** the repository has **no license**. GitHub reports none. A `LICENSE` file (MIT) was added on `dev` and removed shortly after, at your request. It exists in git history (commit `cfcb682`, removed in `46602bc`), and both are now in `main`'s history. It named "Ashton Bickle."
- **Effect:** until you choose a license, others have no granted permission to reuse the code beyond what GitHub's terms allow for viewing and forking. The README says this and doesn't imply a license.
- **Your decision:** whether and which license to use. I haven't chosen one. Consider what you want others to be able to do, and whether contributors will send changes. Consult an attorney if it matters. Note the AI-assistance considerations below.
- **Compatibility:** with no third-party code except the OFL font, there is no dependency conflict for any common license. OFL font terms apply to the font files separately.

## 10. AI-Development Considerations

- The README has a disclosure that Claude assisted with code generation, debugging, refactoring, implementation and documentation, and that you handled concept, direction, design decisions, testing, review, repository management and maintenance. It doesn't say all code is human-written or all AI-written.
- **NEEDS MANUAL REVIEW (attorney):** how copyright applies to AI-assisted work is unsettled and depends on where you are. The documentation makes no ownership claim. Ask before choosing a license or accepting outside contributions.
- The application layout details (section 7) are the biggest accuracy risk from AI assistance.

## 11. Privacy Policy Assessment

Based on the code, the project doesn't collect user data: no accounts, analytics, or server. The README's Data and Privacy section says what the code does, and I did not write a formal policy, since a policy is a legal document and may claim compliance the project can't support. NEEDS MANUAL REVIEW (attorney) if any of these change: analytics or error reporting are added, accounts or sync, distribution through an app store, a custom domain with hosting-level analytics, use by minors or by institutions, or if you want to make statements about specific laws. Also consider that users store other people's contact details (supervisors) on their own devices.

## 12. Missing or Inaccurate Documentation

- In-app text still says the Home Screen app "isn't cleared" and Safari "can clear website data after a week" (`index.html` install card). NEEDS MANUAL REVIEW, proposed rewording.
- In-app Privacy list says "Nothing is sent to any server." That matches the code for user data, but hosts still see requests. Optional rewording: "The app doesn't send your entries anywhere."
- The version 9 README used the names of specific application services, which version 10 removes. Upload the version 10 README, app files and audit together.
- The `_headers` comment says to delete it when merging to `main`.
- No screenshots in the repo. No tests. No roadmap and no contribution policy exist; none were invented.

## 13. Recommended Manual Actions

- [ ] Choose a license (or decide to stay unlicensed) and add a `LICENSE` file.
- [ ] Turn on **Private vulnerability reporting** in the repository's Settings › Code security, so SECURITY.md's first option works.
- [ ] Decide on the remaining code changes proposed above: sanitizing restored reports, CSV formula protection, and the install card wording. (The report titles and service-name labels were already made generic in version 10.)
- [ ] Verify the Pre-Med and Pre-PA layouts against current application instructions before removing the Beta tags.
- [ ] Confirm where the Geist font files came from.
- [ ] Note where the icon drawings came from (or replace them with a licensed set).
- [ ] Keep other GitHub Pages sites off this account, or move to a custom domain.
- [ ] Decide whether the name in git history's removed LICENSE is fine to leave in public history.
- [ ] Ask an attorney about: AI-assisted code ownership, whether you need a formal privacy policy, and your license choice.
- [ ] Promote the updated documentation to `main` once you've reviewed it.

## 14. Claims to Avoid

Don't say the app is "secure," "encrypted," "private by design," "HIPAA compliant," "legally compliant," "official," or "compatible with" or "approved by" any application service. Don't say "no server" without noting the hosts, and don't say backups are secure. Don't say the code is fully human-written or fully AI-written, or claim who owns the copyright.
