# Security

This file describes how to report a security problem and the known limits of the app's data handling. It doesn't claim the app is secure or free of vulnerabilities. The source code is the authoritative description of what the app does, and [PROJECT-AUDIT.md](PROJECT-AUDIT.md) records what was reviewed.

## Reporting a Vulnerability

- If a **Report a vulnerability** button appears under this repository's **Security** tab on GitHub, use it. That report is private.
- If it doesn't, open a [GitHub issue](https://github.com/bicklabs/hours-tracker/issues) that says you found a security problem, **without** the exploit details, and the maintainer can arrange a private way to receive them.
- No response time is promised. This is a small, independently maintained project.

Please don't include real personal information, such as real names, contact details or backup files, in any report or issue.

## What the App Does With Your Data

- Your entries, locations, contact details, notes, reports and settings are kept in your browser's `localStorage` on your device. They are **not encrypted**. Anyone who can unlock your phone and open the app, or run code on the same site address, can read them.
- Backup files, CSV exports and saved reports are **plain, unencrypted files**. Backups include notes and contact details.
- The app has no server and no account. In the code and in a test session, the app made network requests only to download its own files. Details and limits are in the audit report.

## Known Limitations

These come from the project's audit and haven't been fixed. They are listed so users and reviewers know about them.

- **Restoring a backup from someone else is not safe.** Saved reports inside a backup are stored as ready-made HTML and shown without cleaning. The app's Content Security Policy blocks scripts from running, but a crafted backup could still show misleading text or links inside a report. Only restore backup files you made yourself.
- **CSV export doesn't neutralize spreadsheet formulas.** A location that starts with `=`, `+`, `-` or `@` (for example from an imported spreadsheet) is exported as is, and Excel or Google Sheets may treat it as a formula. Don't open exports or imports from sources you don't trust without checking them.
- **Spreadsheet import has no file size limit.** A very large or malicious .xlsx file could make the app slow or crash on your device.
- **The stable app shares its web address with other pages on the same GitHub account.** Browser storage is shared by every page under `bicklabs.github.io`, so any other site published there in the future could read this app's stored data.
- **The app can be shown inside another site's frame.** The hosting used can't send the headers that would prevent this.
- **Storage isn't guaranteed to last.** Browsers can clear site data, and deleting the app erases it. See the README's Backup and Recovery section.

## Security-Related Choices in the Code

- A Content Security Policy in `index.html` limits scripts, fonts, images and connections to the app's own site.
- User-entered text is escaped before it is shown, in the code paths that were reviewed. The review was not exhaustive.
- The app has no third-party code, so it has no third-party dependencies to keep patched.
- GitHub secret scanning and push protection are enabled on the repository. No keys, tokens or passwords were found in the repository.
