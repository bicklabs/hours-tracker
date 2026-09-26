# Third-Party Notices

Clinical Hours has no runtime dependencies, no package manager and no build step. This file lists the third-party material that is included in the repository, based on a review of its files.

## Geist Font

- **Files:** `fonts/geist-latin.woff2`, `fonts/geist-latin-ext.woff2`
- **What it is:** the Geist typeface, used for all text in the app and loaded from the app's own files. The app doesn't request fonts from any other site.
- **License:** SIL Open Font License, Version 1.1
- **Copyright notice (from `fonts/OFL.txt`):** Copyright 2024 The Geist Project Authors (https://github.com/vercel/geist-font.git)
- **License text:** included in full in `fonts/OFL.txt`. Keep that file with the font files when copying or redistributing them.

The .woff2 files are web-font versions. The exact download source and whether they were subset or converted from the original release could not be established from the repository. See PROJECT-AUDIT.md.

## Other Material

- **Icons:** the app's interface icons are inline SVG drawings in `app.js`, and the app icons are in `icons/`. No icon library is included. Their origin has not been documented. See PROJECT-AUDIT.md.
- **Spreadsheet reading:** `importer.js` contains the app's own code for reading .xlsx, CSV and pasted data. It uses the browser's built-in `DecompressionStream` and `DOMParser`, and includes no third-party library.
- **README badges:** the status badges in the README are images loaded from shields.io when the README is viewed on GitHub. They are not part of the app.
