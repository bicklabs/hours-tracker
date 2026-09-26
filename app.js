(() => {
  'use strict';

  // ---------- Config ----------
  // Starting categories. Users can rename, recolor, re-icon, hide and add categories in Settings.
  // shade 1-6 picks one of the current theme's six category colors (see .shade-N in styles.css).
  const DEFAULT_CATEGORIES = [
    { name: 'Clinical', icon: 'stethoscope', shade: 2 },
    { name: 'Shadowing', icon: 'eye', shade: 1 },
    { name: 'Volunteering', icon: 'heart', shade: 4 },
    { name: 'Research', icon: 'flask', shade: 3 },
  ];
  const CATEGORY_ICONS = ['stethoscope', 'eye', 'heart', 'flask', 'cross', 'clipboard', 'book', 'cap', 'people', 'briefcase', 'pill', 'star'];
  const SHADES = [1, 2, 3, 4, 5, 6];
  const MAX_CATEGORY_NAME = 24;
  const LONG_SESSION_HOURS = 24; // ask "Still clocked in?" after this long
  const MAX_SAVED_REPORTS = 30;
  // Experience types used by most graduate and health-professions applications
  const EXPERIENCE_TYPES = [
    'Paid Employment - Medical/Clinical',
    'Paid Employment - Not Medical/Clinical',
    'Community Service/Volunteer - Medical/Clinical',
    'Community Service/Volunteer - Not Medical/Clinical',
    'Physician Shadowing/Clinical Observation',
    'Research/Lab',
    'Teaching/Tutoring/Teaching Assistant',
    'Leadership - Not Listed Elsewhere',
    'Honors/Awards/Recognitions',
    'Presentations/Posters',
    'Publications',
    'Conferences Attended',
    'Extracurricular Activities',
    'Intercollegiate Athletics',
    'Military Service',
    'Social Justice/Advocacy',
    'Artistic Endeavors',
    'Hobbies',
    'Other',
  ];
  const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  const KEYS = {
    entries: 'cht.entries.v1',
    active: 'cht.active.v1',
    locations: 'cht.customLocations.v1',
    prefs: 'cht.prefs.v1',
    categories: 'cht.categories.v1',
    locationDetails: 'cht.locationDetails.v1',
    reports: 'cht.reports.v1',
    imports: 'cht.imports.v1',
  };
  const BACKUP_APP_ID = 'clinical-hours-tracker';
  const BACKUP_SCHEMA = 3; // 2 adds location details, saved reports and full settings; 3 adds import history
  const CSV_HEADER = ['Date', 'Location', 'Time Begin', 'Time End', 'Duration (hrs)'];
  const NEW_LOC = '__new__';
  // Color themes: id matches [data-theme] in styles.css; colors here only draw the swatches
  const THEMES = [
    { id: 'blue', name: 'Blue', swatch: ['#8FB0EA', '#1F3D99', '#0E1A33'], bg: '#F2F4F7' },
    { id: 'rose', name: 'Rose', swatch: ['#F2A7BF', '#B23A63', '#3D1426'], bg: '#F7F2F4' },
    { id: 'blossom', name: 'Blossom', swatch: ['#FAD4E1', '#F4A6C1', '#D9739A'], bg: '#FDF4F7', check: '#3A1E2B' },
    { id: 'lavender', name: 'Lavender', swatch: ['#C9BCF3', '#6246B8', '#1E1438'], bg: '#F4F3F8' },
    { id: 'sage', name: 'Sage', swatch: ['#A9DCC6', '#1F7A5C', '#0F2A22'], bg: '#F2F5F3' },
    { id: 'sunset', name: 'Sunset', swatch: ['#F5C1A6', '#A9472A', '#3A1A10'], bg: '#F7F3F1' },
  ];
  const GAUGE_LEN = Math.PI * 98; // length of the half-circle arc in the gauge SVG

  // ---------- Icons (two-tone: soft fill layer + outline) ----------
  const S = 'fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"';
  const F = 'fill="currentColor" opacity=".22"';
  const ICONS = {
    clock: [`<circle cx="12" cy="12" r="9" ${F}/>`, `<circle cx="12" cy="12" r="9" ${S}/><path d="M12 7.5V12l3.2 2" ${S}/>`],
    timer: [`<circle cx="12" cy="13.5" r="7.5" ${F}/>`, `<circle cx="12" cy="13.5" r="7.5" ${S}/><path d="M12 10v3.5l2.3 1.5M10 3h4M18.5 6.5l1.2-1.2" ${S}/>`],
    calendar: [`<path d="M3.5 8.5A3.5 3.5 0 0 1 7 5h10a3.5 3.5 0 0 1 3.5 3.5V10h-17z" ${F}/>`,
      `<rect x="3.5" y="5" width="17" height="15.5" rx="3.5" ${S}/><path d="M3.5 10h17M8 3v4M16 3v4" ${S}/><circle cx="8.5" cy="14.5" r="1.1" fill="currentColor"/><circle cx="12" cy="14.5" r="1.1" fill="currentColor"/><circle cx="15.5" cy="14.5" r="1.1" fill="currentColor"/>`],
    history: [`<rect x="3.5" y="4" width="17" height="16" rx="3.5" ${F}/>`, `<rect x="3.5" y="4" width="17" height="16" rx="3.5" ${S}/><path d="M8 9h8M8 12.5h8M8 16h5" ${S}/>`],
    export: [`<path d="M3.5 14H8l1.5 2.5h5L16 14h4.5v3.5A2.5 2.5 0 0 1 18 20H6a2.5 2.5 0 0 1-2.5-2.5z" ${F}/>`,
      `<path d="M3.5 14H8l1.5 2.5h5L16 14h4.5v3.5A2.5 2.5 0 0 1 18 20H6a2.5 2.5 0 0 1-2.5-2.5z" ${S}/><path d="M12 3.5v8.5M8.5 8.5l3.5 3.5 3.5-3.5" ${S}/>`],
    addcircle: [`<circle cx="12" cy="12" r="9" ${F}/>`, `<circle cx="12" cy="12" r="9" ${S}/><path d="M12 8v8M8 12h8" ${S}/>`],
    chart: ['<rect x="4" y="12" width="4.2" height="8" rx="1.3" fill="currentColor" opacity=".45"/><rect x="15.8" y="8.5" width="4.2" height="11.5" rx="1.3" fill="currentColor" opacity=".45"/>',
      '<rect x="9.9" y="4" width="4.2" height="16" rx="1.3" fill="currentColor"/>'],
    recent: [`<circle cx="12" cy="12" r="8" ${F}/>`, `<path d="M4.3 12a7.7 7.7 0 1 0 2.3-5.5" ${S}/><path d="M4.5 4v3.4h3.4" ${S}/><path d="M12 8.3V12l2.6 1.6" ${S}/>`],
    // Shifted left slightly so the drawing is optically centered
    stethoscope: [`<circle cx="18.05" cy="11" r="2.4" ${F}/>`,
      `<g transform="translate(-.45 0)"><path d="M5.5 3.5H5a1 1 0 0 0-1 1v4a4.5 4.5 0 0 0 9 0v-4a1 1 0 0 0-1-1h-.5" ${S}/><path d="M8.5 13v1.5a5 5 0 0 0 10 0v-1.1" ${S}/><circle cx="18.5" cy="11" r="2.4" ${S}/></g>`],
    cross: [`<rect x="4" y="4" width="16" height="16" rx="4.5" ${F}/>`, `<rect x="4" y="4" width="16" height="16" rx="4.5" ${S}/><path d="M12 8.2v7.6M8.2 12h7.6" ${S}/>`],
    clipboard: [`<rect x="5" y="4.5" width="14" height="16" rx="2.5" ${F}/>`,
      `<rect x="5" y="4.5" width="14" height="16" rx="2.5" ${S}/><path d="M9 4.5V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v.5M8.5 10h7M8.5 13.5h7M8.5 17h4" ${S}/>`],
    book: [`<path d="M4 5.5A1.5 1.5 0 0 1 5.5 4H11v16H5.5A1.5 1.5 0 0 1 4 18.5zM20 5.5A1.5 1.5 0 0 0 18.5 4H13v16h5.5a1.5 1.5 0 0 0 1.5-1.5z" ${F}/>`,
      `<path d="M4 5.5A1.5 1.5 0 0 1 5.5 4H11v16H5.5A1.5 1.5 0 0 1 4 18.5zM20 5.5A1.5 1.5 0 0 0 18.5 4H13v16h5.5a1.5 1.5 0 0 0 1.5-1.5z" ${S}/>`],
    cap: [`<path d="M2.5 9.5 12 5l9.5 4.5L12 14z" ${F}/>`,
      `<path d="M2.5 9.5 12 5l9.5 4.5L12 14z" ${S}/><path d="M6.5 11.6v3.9c0 1.4 2.5 2.5 5.5 2.5s5.5-1.1 5.5-2.5v-3.9M21.5 9.5v5" ${S}/>`],
    people: [`<circle cx="9" cy="8.5" r="3.2" ${F}/>`,
      `<circle cx="9" cy="8.5" r="3.2" ${S}/><path d="M3 19.5a6 6 0 0 1 12 0" ${S}/><circle cx="16.8" cy="9.3" r="2.5" ${S}/><path d="M16 14.1a5 5 0 0 1 5 4.9" ${S}/>`],
    briefcase: [`<rect x="3.5" y="7" width="17" height="12.5" rx="2.5" ${F}/>`,
      `<rect x="3.5" y="7" width="17" height="12.5" rx="2.5" ${S}/><path d="M9 7V5.5A1.5 1.5 0 0 1 10.5 4h3A1.5 1.5 0 0 1 15 5.5V7M3.5 12.5h17" ${S}/>`],
    pill: [`<path d="M10.2 5.8a4.2 4.2 0 0 1 6 6L12 16z" ${F}/>`,
      `<path d="M13.8 18.2a4.2 4.2 0 0 1-6-6l6-6a4.2 4.2 0 0 1 6 6z" ${S}/><path d="M9 9l6 6" ${S}/>`],
    star: [`<path d="M12 3.5l2.6 5.3 5.9.9-4.3 4.1 1 5.8L12 16.9l-5.2 2.7 1-5.8-4.3-4.1 5.9-.9z" ${F}/>`,
      `<path d="M12 3.5l2.6 5.3 5.9.9-4.3 4.1 1 5.8L12 16.9l-5.2 2.7 1-5.8-4.3-4.1 5.9-.9z" ${S}/>`],
    pencil: [`<path d="M14.5 5.5l4 4L9 19H5v-4z" ${F}/>`, `<path d="M14.5 5.5l4 4L9 19H5v-4zM12.5 7.5l4 4" ${S}/>`],
    eye: [`<path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z" ${F}/>`,
      `<path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z" ${S}/><circle cx="12" cy="12" r="3" fill="currentColor"/>`],
    heart: [`<path d="M12 19.5s-7.5-4.6-7.5-10A4.2 4.2 0 0 1 12 7a4.2 4.2 0 0 1 7.5 2.5c0 5.4-7.5 10-7.5 10z" ${F}/>`,
      `<path d="M12 19.5s-7.5-4.6-7.5-10A4.2 4.2 0 0 1 12 7a4.2 4.2 0 0 1 7.5 2.5c0 5.4-7.5 10-7.5 10z" ${S}/><path d="M9 11.5h1.8l1-1.8 1.6 3.3 1-1.5H16" ${S}/>`],
    flask: ['<path d="M7.4 14.5h9.2l2.1 3.1a1.9 1.9 0 0 1-1.6 2.9H6.9a1.9 1.9 0 0 1-1.6-2.9z" fill="currentColor" opacity=".35"/>',
      `<path d="M9 3.5h6M10.2 3.5v5.3L5.3 17.6a1.9 1.9 0 0 0 1.6 2.9h10.2a1.9 1.9 0 0 0 1.6-2.9l-4.9-8.8V3.5" ${S}/>`],
    pin: [`<path d="M12 21s-6.5-5.6-6.5-11a6.5 6.5 0 0 1 13 0C18.5 15.4 12 21 12 21z" ${F}/>`,
      `<path d="M12 21s-6.5-5.6-6.5-11a6.5 6.5 0 0 1 13 0C18.5 15.4 12 21 12 21z" ${S}/><circle cx="12" cy="10" r="2.3" ${S}/>`],
    shield: [`<path d="M12 3.2l7 2.8v5.2c0 4.4-3 8.1-7 9.6-4-1.5-7-5.2-7-9.6V6z" ${F}/>`,
      `<path d="M12 3.2l7 2.8v5.2c0 4.4-3 8.1-7 9.6-4-1.5-7-5.2-7-9.6V6z" ${S}/><path d="M9 12l2.1 2.1L15.2 10" ${S}/>`],
    table: [`<path d="M3.5 7.5A3.5 3.5 0 0 1 7 4h10a3.5 3.5 0 0 1 3.5 3.5V9h-17z" ${F}/>`,
      `<rect x="3.5" y="4" width="17" height="16" rx="3.5" ${S}/><path d="M3.5 9h17M3.5 14.5h17M10 9v11" ${S}/>`],
    trash: [`<path d="M6.5 7h11l-.8 11.3a2 2 0 0 1-2 1.7H9.3a2 2 0 0 1-2-1.7z" ${F}/>`,
      `<path d="M4.5 7h15M6.5 7l.8 11.3a2 2 0 0 0 2 1.7h5.4a2 2 0 0 0 2-1.7l.8-11.3M9.5 7V5a1.5 1.5 0 0 1 1.5-1.5h2A1.5 1.5 0 0 1 14.5 5v2M10.5 11v5M13.5 11v5" ${S}/>`],
    gear: [`<path d="M10.09 4.85 10.65 2.5h2.7l.56 2.35 1.79.74 2.06-1.27 1.92 1.92-1.27 2.06.74 1.79 2.35.56v2.7l-2.35.56-.74 1.79 1.27 2.06-1.92 1.92-2.06-1.27-1.79.74-.56 2.35h-2.7l-.56-2.35-1.79-.74-2.06 1.27-1.92-1.92 1.27-2.06-.74-1.79-2.35-.56v-2.7l2.35-.56.74-1.79-1.27-2.06 1.92-1.92 2.06 1.27z" ${F}/>`,
      `<path d="M10.09 4.85 10.65 2.5h2.7l.56 2.35 1.79.74 2.06-1.27 1.92 1.92-1.27 2.06.74 1.79 2.35.56v2.7l-2.35.56-.74 1.79 1.27 2.06-1.92 1.92-2.06-1.27-1.79.74-.56 2.35h-2.7l-.56-2.35-1.79-.74-2.06 1.27-1.92-1.92 1.27-2.06-.74-1.79-2.35-.56v-2.7l2.35-.56.74-1.79-1.27-2.06 1.92-1.92 2.06 1.27z" ${S}/><circle cx="12" cy="12" r="3.2" ${S}/>`],
    palette: [`<path d="M12 3.5a8.5 8.5 0 0 0 0 17c1.3 0 1.9-1 1.4-2.1-.5-1.1.1-2.4 1.4-2.4h1.9a3.8 3.8 0 0 0 3.8-3.8C20.5 7.3 16.7 3.5 12 3.5z" ${F}/>`,
      `<path d="M12 3.5a8.5 8.5 0 0 0 0 17c1.3 0 1.9-1 1.4-2.1-.5-1.1.1-2.4 1.4-2.4h1.9a3.8 3.8 0 0 0 3.8-3.8C20.5 7.3 16.7 3.5 12 3.5z" ${S}/><circle cx="8" cy="11" r="1.2" fill="currentColor"/><circle cx="10.5" cy="7.5" r="1.2" fill="currentColor"/><circle cx="14.5" cy="7.8" r="1.2" fill="currentColor"/>`],
    check: ['', '<path d="M5.5 12.5l4.2 4.2L18.5 8" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/>'],
    bulb: [`<path d="M12 3a6 6 0 0 0-3.6 10.8c.7.5 1.1 1.3 1.1 2.2v.5h5v-.5c0-.9.4-1.7 1.1-2.2A6 6 0 0 0 12 3z" ${F}/>`,
      `<path d="M12 3a6 6 0 0 0-3.6 10.8c.7.5 1.1 1.3 1.1 2.2v.5h5v-.5c0-.9.4-1.7 1.1-2.2A6 6 0 0 0 12 3zM9.5 19.5h5M10.5 21.5h3" ${S}/>`],
    report: [`<path d="M6 3.5h8l4.5 4.5v12.5H6z" ${F}/>`, `<path d="M6 3.5h8l4.5 4.5v12.5H6zM14 3.5V8h4.5M9 12.5h6M9 16h6" ${S}/>`],
    search: ['', '<circle cx="11" cy="11" r="6.5" fill="none" stroke="currentColor" stroke-width="2"/><path d="M16 16l4 4" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>'],
    moon: [`<path d="M19.5 14.5A8 8 0 0 1 9.5 4.5a8 8 0 1 0 10 10z" ${F}/>`, `<path d="M19.5 14.5A8 8 0 0 1 9.5 4.5a8 8 0 1 0 10 10z" ${S}/>`],
    checkc: [`<circle cx="12" cy="12" r="9" ${F}/>`, `<circle cx="12" cy="12" r="9" ${S}/><path d="M8 12.3l2.7 2.7L16 9.7" ${S}/>`],
    starfill: ['', '<path d="M12 3.5l2.6 5.3 5.9.9-4.3 4.1 1 5.8L12 16.9l-5.2 2.7 1-5.8-4.3-4.1 5.9-.9z" fill="currentColor"/>'],
    repeat: ['', '<path d="M17 3.5l3 3-3 3M20 6.5H8a4 4 0 0 0-4 4v1M7 20.5l-3-3 3-3M4 17.5h12a4 4 0 0 0 4-4v-1" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"/>'],
    guide: [`<path d="M4 5.5A1.5 1.5 0 0 1 5.5 4H11v16H5.5A1.5 1.5 0 0 1 4 18.5z" ${F}/>`,
      `<path d="M4 5.5A1.5 1.5 0 0 1 5.5 4H11v16H5.5A1.5 1.5 0 0 1 4 18.5zM20 5.5A1.5 1.5 0 0 0 18.5 4H13v16h5.5a1.5 1.5 0 0 0 1.5-1.5z" ${S}/><path d="M6.5 8.5h2M15.5 8.5h2" ${S}/>`],
    restore: [`<circle cx="12" cy="12" r="8" ${F}/>`, `<path d="M4.3 12a7.7 7.7 0 1 0 2.3-5.5" ${S}/><path d="M4.5 4v3.4h3.4" ${S}/>`],
    warning: [`<path d="M10.3 4.3a2 2 0 0 1 3.4 0l7.2 12.5a2 2 0 0 1-1.7 3H4.8a2 2 0 0 1-1.7-3z" ${F}/>`,
      `<path d="M10.3 4.3a2 2 0 0 1 3.4 0l7.2 12.5a2 2 0 0 1-1.7 3H4.8a2 2 0 0 1-1.7-3z" ${S}/><path d="M12 9.5v4M12 16.5h.01" ${S}/>`],
    copy: [`<rect x="8.5" y="8.5" width="12" height="12" rx="2.5" ${F}/>`,
      `<rect x="8.5" y="8.5" width="12" height="12" rx="2.5" ${S}/><path d="M15.5 8.5V6A2.5 2.5 0 0 0 13 3.5H6A2.5 2.5 0 0 0 3.5 6v7A2.5 2.5 0 0 0 6 15.5h2.5" ${S}/>`],
    download: ['', '<path d="M12 4v10M8 10.5l4 4 4-4M5 17v1a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-1" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>'],
    stop: ['', '<rect x="6" y="6" width="12" height="12" rx="3" fill="currentColor"/>'],
    close: ['', '<path d="M6.5 6.5l11 11M17.5 6.5l-11 11" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/>'],
    back: ['', '<path d="M14.5 5.5L8 12l6.5 6.5" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>'],
    next: ['', '<path d="M9.5 5.5L16 12l-6.5 6.5" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>'],
    down: ['', '<path d="M6.5 9.5L12 15l5.5-5.5" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>'],
    plus: ['', '<path d="M12 6v12M6 12h12" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round"/>'],
    upload: ['', `<path d="M4 15.5v2A2.5 2.5 0 0 0 6.5 20h11a2.5 2.5 0 0 0 2.5-2.5v-2M12 15V4.5M7.5 8.5 12 4l4.5 4.5" ${S}/>`],
    paste: [`<rect x="5" y="5" width="14" height="16" rx="2.5" ${F}/>`,
      `<rect x="5" y="5" width="14" height="16" rx="2.5" ${S}/><path d="M9 5V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v1M9 11h6M9 15h4" ${S}/>`],
    merge: ['', `<path d="M6 4v5a4 4 0 0 0 4 4h8M18 4v5M15 10l3 3-3 3" ${S}/>`],
    undo: ['', '<path d="M8 5 4 9l4 4M4 9h10.5a5.5 5.5 0 0 1 0 11H10" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>'],
    phone: [`<rect x="6.5" y="3" width="11" height="18" rx="2.8" ${F}/>`, `<rect x="6.5" y="3" width="11" height="18" rx="2.8" ${S}/><path d="M10.5 17.5h3" ${S}/>`],
  };
  // Icon sizes for static markup that carries data-icon (anything not listed is 20px)
  const ICON_SIZE = { 'head-icon': 22, 'card-icon': 18, fab: 22, 'stop-sq': 18, 'round-btn': 18, 'done-icon': 26, 'modal-icon': 28, 'nudge-icon': 20, 'star-badge': 18 };

  function icon(name, size = 20, duo = true) {
    const [fill, stroke] = ICONS[name] || ICONS.pin;
    return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" aria-hidden="true">${duo ? fill : ''}${stroke}</svg>`;
  }

  // ---------- Storage ----------
  const store = {
    read(key, fallback) {
      try {
        const raw = localStorage.getItem(key);
        return raw == null ? fallback : JSON.parse(raw);
      } catch {
        return fallback;
      }
    },
    write(key, value) {
      try {
        if (value == null) localStorage.removeItem(key);
        else localStorage.setItem(key, JSON.stringify(value));
        return true;
      } catch {
        toast('Could not save. Browser storage is full or blocked.');
        return false;
      }
    },
  };

  const state = {};
  function loadState() {
    const entries = store.read(KEYS.entries, []);
    state.entries = Array.isArray(entries) ? entries : [];
    state.active = store.read(KEYS.active, null);
    const locs = store.read(KEYS.locations, {});
    state.customLocations = locs && typeof locs === 'object' ? locs : {};
    const prefs = store.read(KEYS.prefs, {});
    state.prefs = { lastLocation: {}, period: 'month', ...(prefs && typeof prefs === 'object' ? prefs : {}) };
    const details = store.read(KEYS.locationDetails, {});
    state.locDetails = details && typeof details === 'object' && !Array.isArray(details) ? details : {};
    const reports = store.read(KEYS.reports, []);
    state.reports = Array.isArray(reports) ? reports : [];
    const imports = store.read(KEYS.imports, []);
    state.imports = Array.isArray(imports) ? imports : [];
    const cats = store.read(KEYS.categories, null);
    state.categories = (Array.isArray(cats) ? cats.map(normalizeCategory).filter(Boolean) : [])
      .filter((c, i, list) => list.findIndex((x) => x.name === c.name) === i);
    if (!state.categories.length) state.categories = DEFAULT_CATEGORIES.map((c) => ({ ...c }));
    // Earlier versions kept hidden categories in prefs
    if (Array.isArray(state.prefs.hiddenCategories)) {
      for (const c of state.categories) if (state.prefs.hiddenCategories.includes(c.name)) c.hidden = true;
      delete state.prefs.hiddenCategories;
      saveCategories();
      savePrefs();
    }
    // A category used by an entry (for example from a restored backup) always gets a list item
    for (const e of state.entries) ensureCategory(e.category);
  }

  function normalizeCategory(c) {
    if (!c || typeof c !== 'object' || typeof c.name !== 'string' || !c.name.trim()) return null;
    return {
      name: c.name.trim().slice(0, MAX_CATEGORY_NAME),
      icon: CATEGORY_ICONS.includes(c.icon) ? c.icon : 'clipboard',
      shade: SHADES.includes(c.shade) ? c.shade : 5,
      ...(c.hidden ? { hidden: true } : {}),
      ...(Number(c.goal) > 0 ? { goal: Math.round(Number(c.goal)) } : {}),
    };
  }

  function ensureCategory(name) {
    if (!name || state.categories.some((c) => c.name === name)) return;
    state.categories.push({ name, icon: 'clipboard', shade: nextShade() });
    saveCategories();
  }

  // The least-used shade, so a new category looks different from the others
  function nextShade() {
    const used = SHADES.map((s) => state.categories.filter((c) => c.shade === s).length);
    return SHADES[used.indexOf(Math.min(...used))];
  }
  const saveEntries = () => store.write(KEYS.entries, state.entries);
  const saveActive = () => store.write(KEYS.active, state.active);
  const saveLocations = () => store.write(KEYS.locations, state.customLocations);
  const savePrefs = () => store.write(KEYS.prefs, state.prefs);
  const saveCategories = () => store.write(KEYS.categories, state.categories);
  const saveLocDetails = () => store.write(KEYS.locationDetails, state.locDetails);
  const saveReports = () => store.write(KEYS.reports, state.reports);
  const saveImports = () => store.write(KEYS.imports, state.imports);

  // ---------- Helpers ----------
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
  ));
  const uid = () => (crypto.randomUUID ? crypto.randomUUID()
    : Date.now().toString(36) + Math.random().toString(36).slice(2, 10));
  const pad = (n) => String(n).padStart(2, '0');
  const sameText = (a, b) => a.trim().toLowerCase() === b.trim().toLowerCase();
  const plural = (n, one, many) => `${n} ${n === 1 ? one : many}`;

  const findCat = (name) => state.categories.find((c) => c.name === name);
  const catClass = (name) => 'shade-' + (findCat(name)?.shade || 5);
  const catIcon = (name) => findCat(name)?.icon || 'clipboard';
  const badge = (c, cls = '', size = 20) => `<span class="badge ${cls}" title="${esc(c)}">${icon(catIcon(c), size)}</span>`;

  const toDateInput = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const toTimeInput = (d) => `${pad(d.getHours())}:${pad(d.getMinutes())}`;
  const fmtDate = (d) => `${d.getMonth() + 1}/${d.getDate()}/${d.getFullYear()}`;
  const fmtTime = (d) => `${d.getHours() % 12 || 12}:${pad(d.getMinutes())} ${d.getHours() < 12 ? 'AM' : 'PM'}`;
  const fmtShort = (d) => d.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
  const fmtLong = (d) => d.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' });
  const fmtMonth = (d) => d.toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
  const monthName = (d) => d.toLocaleDateString(undefined, { month: 'long' });
  const fmtHours = (h) => (Math.round(h * 100) / 100).toFixed(2);
  const fmtElapsed = (ms) => {
    const s = Math.max(0, Math.floor(ms / 1000));
    return `${Math.floor(s / 3600)}:${pad(Math.floor((s % 3600) / 60))}:${pad(s % 60)}`;
  };
  const localDateTime = (dateStr, timeStr) => {
    const [y, m, d] = dateStr.split('-').map(Number);
    const [hh, mm] = timeStr.split(':').map(Number);
    return new Date(y, m - 1, d, hh, mm);
  };
  const roundToMinute = (d) => new Date(Math.round(d.getTime() / 60000) * 60000);
  const hoursOf = (e) => (new Date(e.end) - new Date(e.start)) / 3600000;
  const byStartDesc = (a, b) => new Date(b.start) - new Date(a.start);
  const sumHours = (list) => list.reduce((s, e) => s + hoursOf(e), 0);

  function periodStart(period, now = new Date()) {
    if (period === 'week') return new Date(now.getFullYear(), now.getMonth(), now.getDate() - now.getDay());
    if (period === 'month') return new Date(now.getFullYear(), now.getMonth(), 1);
    return new Date(0);
  }

  // ---------- Locations ----------
  function locationsFor(cat) {
    const out = [];
    for (const l of state.customLocations[cat] || []) {
      if (!out.some((x) => sameText(x, l))) out.push(l);
    }
    return out;
  }
  // Returns the canonical spelling (the existing one if it matches case-insensitively).
  function addLocation(cat, name) {
    name = name.trim().replace(/\s+/g, ' ');
    const existing = locationsFor(cat).find((l) => sameText(l, name));
    if (existing) return existing;
    (state.customLocations[cat] ||= []).push(name);
    saveLocations();
    return name;
  }
  // Hidden categories keep all their data but disappear everywhere in the app
  const isHidden = (name) => !!findCat(name)?.hidden;
  const visibleCategories = () => state.categories.filter((c) => !c.hidden).map((c) => c.name);
  const shownEntries = () => state.entries.filter((e) => !isHidden(e.category));

  // ---------- UI primitives ----------
  let toastTimer;
  function toast(msg, { action, onAction, duration } = {}) {
    const el = $('#toast');
    const btn = $('#toast-action');
    $('#toast-text').textContent = msg;
    btn.hidden = !action;
    btn.textContent = action || '';
    btn.onclick = action ? () => {
      el.classList.remove('show');
      onAction();
    } : null;
    el.classList.toggle('has-action', !!action);
    el.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.classList.remove('show'), duration || (action ? 6000 : 2800));
  }

  // Confirm dialog. Buttons are listed top to bottom; put the safe choice first.
  function ask({ title, message, iconName, tone, buttons }) {
    const dlg = $('#ask-dialog');
    $('#ask-title').textContent = title;
    $('#ask-message').textContent = message || '';
    const ic = $('#ask-icon');
    ic.className = 'modal-icon' + (tone === 'danger' ? ' danger' : '');
    ic.innerHTML = iconName ? icon(iconName, 28) : '';
    $('#ask-buttons').innerHTML = buttons.map((b) =>
      `<button type="button" class="btn btn-${b.style || 'outline'}" value="${esc(b.value)}">${esc(b.label)}</button>`).join('');
    // Resolve from the tap itself rather than the dialog's close event, which some browsers deliver late or not at all.
    return new Promise((resolve) => {
      const finish = (value) => {
        $('#ask-buttons').onclick = null;
        dlg.oncancel = null;
        if (dlg.open) dlg.close();
        resolve(value);
      };
      $('#ask-buttons').onclick = (e) => {
        const btn = e.target.closest('button');
        if (btn) finish(btn.value);
      };
      dlg.oncancel = (e) => {
        e.preventDefault();
        finish('');
      };
      dlg.showModal();
    });
  }
  const notify = (title, message) => ask({ title, message, iconName: 'warning', tone: 'danger', buttons: [{ label: 'OK', value: 'ok', style: 'navy' }] });

  function setupSheet(dlg) {
    // A tap on the backdrop closes the sheet
    dlg.addEventListener('click', (e) => {
      if (e.target !== dlg) return;
      const r = dlg.getBoundingClientRect();
      if (e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom) dlg.close();
    });
    $$('[data-close]', dlg).forEach((b) => b.addEventListener('click', () => dlg.close()));
  }

  function fillIcons(root = document) {
    for (const el of $$('[data-icon]', root)) {
      const size = Object.entries(ICON_SIZE).find(([cls]) => el.classList.contains(cls))?.[1] || 20;
      const inTabbar = !!el.closest('.tabbar') && !el.classList.contains('fab');
      // Tab icons start as outlines; showView() gives the current tab its two-tone icon
      el.innerHTML = icon(el.dataset.icon, inTabbar ? 24 : size, !inTabbar);
    }
  }

  async function saveFile(filename, text, type) {
    const blob = new Blob([text], { type });
    // On phones, the share sheet is the most reliable way to save a file (for example "Save to Files").
    if (matchMedia('(pointer: coarse)').matches && navigator.canShare) {
      const file = new File([blob], filename, { type });
      if (navigator.canShare({ files: [file] })) {
        try {
          await navigator.share({ files: [file], title: filename });
          return true;
        } catch (err) {
          if (err.name === 'AbortError') return false;
        }
      }
    }
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
    return true;
  }

  async function copyText(text) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.setAttribute('readonly', '');
      ta.style.cssText = 'position:fixed;top:0;left:0;opacity:0';
      document.body.appendChild(ta);
      ta.select();
      let ok = false;
      try { ok = document.execCommand('copy'); } catch { /* ignore */ }
      ta.remove();
      return ok;
    }
  }

  // ---------- Navigation ----------
  let currentView = 'home';
  function showView(name) {
    currentView = name;
    for (const v of $$('.view')) v.hidden = v.id !== 'view-' + name;
    for (const b of $$('.tabbar button')) {
      const on = b.dataset.view === name;
      if (on) b.setAttribute('aria-current', 'page');
      else b.removeAttribute('aria-current');
      // Current tab shows the two-tone icon; the others show the outline only
      const holder = $('[data-icon]', b);
      if (!holder.classList.contains('fab')) holder.innerHTML = icon(holder.dataset.icon, 24, on);
    }
    render();
    window.scrollTo(0, 0);
  }

  function render() {
    renderHome(); // keeps the timer running regardless of the view
    if (currentView === 'calendar') renderCalendar();
    if (currentView === 'add') renderAdd();
    if (currentView === 'history') renderHistory();
    if (currentView === 'data') renderData();
  }

  // Shared entry row (Recent, Calendar day, History)
  function entryRow(e, { showDate = true } = {}) {
    const s = new Date(e.start), en = new Date(e.end);
    const lead = showDate ? fmtShort(s) : esc(e.category);
    return `<button type="button" class="row ${catClass(e.category)}" data-id="${esc(e.id)}">
      ${badge(e.category)}
      <span class="row-main">
        <span class="row-title">${esc(e.location)}${e.highlight ? `<span class="row-star" title="Highlight">${icon('starfill', 14)}</span>` : ''}</span>
        <span class="row-sub">${lead} · ${e.timesUnknown ? 'Times not recorded' : `${fmtTime(s)} - ${fmtTime(en)}`}</span>
        ${e.notes ? `<span class="row-notes">${esc(e.notes)}</span>` : ''}
      </span>
      <span class="row-end"><strong>${fmtHours(hoursOf(e))}</strong><span>hrs</span></span>
    </button>`;
  }

  // ---------- Clock tab ----------
  let timer = null;
  function tick() {
    const a = state.active;
    if (!a) return;
    const elapsed = Date.now() - new Date(a.start);
    $('#hero-timer').textContent = fmtElapsed(elapsed);
    const now = new Date();
    const runningHrs = elapsed / 3600000;
    const inPeriod = (p) => sumHours(shownEntries().filter((e) => new Date(e.start) >= periodStart(p, now))) + runningHrs;
    $('#hero-week').innerHTML = `${fmtHours(inPeriod('week'))} <small>hrs</small>`;
    $('#hero-month').innerHTML = `${fmtHours(inPeriod('month'))} <small>hrs</small>`;
  }

  const monthKey = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}`;

  // ----- Home Screen install card (the installed app keeps its own data and isn't cleared by Safari)
  let installPrompt = null; // Android and desktop Chrome offer a one-tap install
  const isInstalled = () => matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;
  const isIOS = () => /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  const showInstallCard = () => !isInstalled() && matchMedia('(pointer: coarse)').matches &&
    !(state.prefs.installSnooze && Date.now() < new Date(state.prefs.installSnooze).getTime());

  function renderHome() {
    const now = new Date();
    $('#home-date').textContent = fmtLong(now);
    const install = showInstallCard();
    $('#install-card').hidden = !install;
    if (install) {
      $('#install-how').textContent = isIOS() ? 'In Safari, tap Share, then Add to Home Screen.'
        : installPrompt ? 'Install it so it opens like an app.' : 'Open the browser menu, then tap Add to Home screen or Install app.';
      $('#install-go').hidden = !installPrompt;
      $('#install-actions').classList.toggle('single', !installPrompt);
    }
    $('#welcome-card').hidden = !!state.prefs.welcomed || install;
    // Monthly backup reminder: from the 1st of each month until you back up or dismiss it
    const thisMonth = monthKey(now);
    const backedUp = state.prefs.lastBackupAt && monthKey(new Date(state.prefs.lastBackupAt)) === thisMonth;
    $('#backup-nudge').hidden = !state.entries.length || backedUp || state.prefs.nudgeDismissed === thisMonth || !state.prefs.welcomed || install;
    const a = state.active;
    $('#home-idle').hidden = !!a;
    $('#home-active').hidden = !a;

    if (a) {
      const start = new Date(a.start);
      const hero = $('.hero');
      $('#hero-date').textContent = toDateInput(start) === toDateInput(now) ? fmtShort(start) : `Since ${fmtShort(start)}`;
      $('#hero-icon').innerHTML = icon(catIcon(a.category), 28);
      $('#hero-cat').textContent = a.category;
      $('#hero-loc').textContent = a.location;
      const t = fmtTime(start).split(' ');
      $('#hero-start').innerHTML = `${t[0]} <small>${t[1]}</small>`;
      hero.dataset.cat = a.category;
      tick();
      if (!timer) timer = setInterval(tick, 1000);
      setTimeout(maybeAskLongSession, 300);
    } else {
      clearInterval(timer);
      timer = null;
      renderTiles();
      renderGauge();
    }

    const recent = shownEntries().sort(byStartDesc).slice(0, a ? 2 : 3);
    $('#recent-list').innerHTML = recent.length
      ? recent.map((e) => entryRow(e)).join('')
      : '<p class="empty">No entries yet. Tap a category above to start.</p>';
  }

  function renderTiles() {
    const totals = {};
    for (const e of state.entries) totals[e.category] = (totals[e.category] || 0) + hoursOf(e);
    $('#cat-grid').innerHTML = visibleCategories().map((name) => `
      <button type="button" class="tile ${catClass(name)}" data-cat="${esc(name)}" aria-label="Clock in to ${esc(name)}. ${fmtHours(totals[name] || 0)} hours total.">
        ${badge(name)}
        <span class="tile-name">${esc(name)}</span>
        <span class="tile-hours">${fmtBig(totals[name] || 0)}</span>
        <span class="tile-label">Hours total</span>
        ${goalBar(name, totals[name] || 0)}
      </button>`).join('');
  }

  function goalBar(name, hours) {
    const goal = findCat(name)?.goal;
    if (!goal) return '';
    const pct = Math.round((hours / goal) * 100);
    const label = pct >= 100 ? `Goal reached · ${pct}%` : `${pct}% of ${goal.toLocaleString()} hr goal`;
    return `<span class="tile-goal"><span class="goal-bar"><span style="width: ${Math.min(pct, 100)}%"></span></span><small>${label}</small></span>`;
  }

  function renderGauge() {
    const period = state.prefs.period || 'month';
    for (const b of $$('#period-seg button')) b.setAttribute('aria-pressed', String(b.dataset.period === period));
    const from = periodStart(period);
    const list = shownEntries().filter((e) => new Date(e.start) >= from);
    const byCat = {};
    for (const e of list) byCat[e.category] = (byCat[e.category] || 0) + hoursOf(e);
    const total = sumHours(list);
    const cats = visibleCategories()
      .sort((x, y) => (byCat[y] || 0) - (byCat[x] || 0));

    const arc = 'M 22 120 A 98 98 0 0 1 218 120';
    let svg = `<path d="${arc}" fill="none" style="stroke: var(--soft)" stroke-width="36"/>`;
    const parts = cats.filter((c) => byCat[c] > 0);
    const gap = parts.length > 1 ? 4 : 0;
    let offset = 0;
    parts.forEach((c, i) => {
      const len = (byCat[c] / total) * GAUGE_LEN;
      const draw = Math.max(0.5, len - (i < parts.length - 1 ? gap : 0));
      svg += `<path class="${catClass(c)}" d="${arc}" fill="none" style="stroke: var(--cat)" stroke-width="36" stroke-dasharray="${draw.toFixed(1)} 400" stroke-dashoffset="${(-offset).toFixed(1)}"/>`;
      offset += len;
    });
    $('#gauge-svg').innerHTML = svg;
    $('#gauge-num').textContent = fmtBig(total);
    $('#gauge-label').textContent = period === 'week' ? 'Hours this week'
      : period === 'month' ? `Hours in ${monthName(new Date())}` : 'Hours all time';
    $('#gauge-legend').innerHTML = cats.map((c) => `
      <div class="legend-item ${catClass(c)}"><span class="legend-bar"></span>
        <span><span class="legend-name">${esc(c)}</span><span class="legend-val">${fmtHours(byCat[c] || 0)}</span></span></div>`).join('');
  }

  // ---------- Clock in / out ----------
  function openClockIn(cat) {
    if (state.active) {
      toast('Clock out of your current session first');
      return;
    }
    const dlg = $('#clockin-sheet');
    dlg.dataset.category = cat;
    $('#ci-badge').className = catClass(cat);
    $('#ci-badge').innerHTML = badge(cat, 'lg', 24);
    $('#ci-title').textContent = `Clock In: ${cat}`;
    const locs = locationsFor(cat);
    const last = state.prefs.lastLocation[cat];
    const selected = locs.find((l) => l === last) || (locs.length === 1 ? locs[0] : null);
    $('#ci-locations').innerHTML = locs.length ? locs.map((l) => `
      <label class="loc-option">
        <input type="radio" name="ci-loc" value="${esc(l)}"${l === selected ? ' checked' : ''}>
        <span class="loc-name">${esc(l)}</span>
        ${l === last ? '<span class="last-used">Last used</span>' : ''}
      </label>`).join('')
      : `<p class="empty">No saved ${esc(cat)} locations yet. Type one below and it will be saved for next time.</p>`;
    $('#ci-new').value = '';
    $('#ci-error').hidden = true;
    dlg.showModal();
    // Keep the keyboard from popping open on the text field
    $('#ci-submit').focus();
  }

  function submitClockIn(e) {
    e.preventDefault();
    const dlg = $('#clockin-sheet');
    const cat = dlg.dataset.category;
    const typed = $('#ci-new').value.trim();
    const picked = $('input[name="ci-loc"]:checked', dlg)?.value;
    if (!typed && !picked) {
      const err = $('#ci-error');
      err.textContent = 'Pick a location or type a new one.';
      err.hidden = false;
      return;
    }
    const location = typed ? addLocation(cat, typed) : picked;
    state.active = { category: cat, location, start: new Date().toISOString() };
    state.prefs.lastLocation[cat] = location;
    saveActive();
    savePrefs();
    dlg.close();
    renderHome();
    toast(`Clocked in at ${location}`);
  }

  // Entries that share any time with [start, end), other than the one being edited
  function findOverlaps(start, end, exceptId) {
    const s0 = new Date(start), e0 = new Date(end);
    return state.entries.filter((e) => e.id !== exceptId && new Date(e.start) < e0 && s0 < new Date(e.end));
  }

  // Asks before saving a shift that overlaps another. Resolves true to save.
  async function confirmOverlap(start, end, exceptId) {
    const hits = findOverlaps(start, end, exceptId);
    if (!hits.length) return true;
    const h = hits[0];
    const hs = new Date(h.start), he = new Date(h.end);
    const more = hits.length > 1 ? ` and ${plural(hits.length - 1, 'other entry', 'other entries')}` : '';
    const r = await ask({
      title: 'Overlapping Shift',
      message: `This overlaps ${h.location} on ${fmtShort(hs)}, ${fmtTime(hs)} - ${fmtTime(he)}${more}. Save it anyway?`,
      iconName: 'warning',
      buttons: [
        { label: 'Go Back', value: 'back', style: 'navy' },
        { label: 'Save Anyway', value: 'save', style: 'outline' },
      ],
    });
    return r === 'save';
  }

  async function clockOut() {
    const a = state.active;
    if (!a) return;
    const start = roundToMinute(new Date(a.start));
    let end = roundToMinute(new Date());
    if (end < start) end = start;
    if (end - start < 60000) {
      const r = await ask({
        title: 'Under a Minute',
        message: 'This session is less than a minute long. Save it anyway?',
        iconName: 'timer',
        buttons: [
          { label: 'Keep Clocked In', value: 'cancel', style: 'navy' },
          { label: 'Save Anyway', value: 'save', style: 'outline' },
          { label: 'Discard Session', value: 'discard', style: 'danger-outline' },
        ],
      });
      if (r === 'discard') {
        state.active = null;
        saveActive();
        render();
        toast('Session discarded');
        return;
      }
      if (r !== 'save') return;
    }
    await finishSession(start, end);
  }

  // Saves the active session as an entry ending at `end`, then offers a note
  async function finishSession(start, end) {
    const a = state.active;
    if (!a) return;
    if (!(await confirmOverlap(start, end))) return;
    const now = new Date().toISOString();
    const entry = {
      id: uid(),
      category: a.category,
      location: a.location,
      start: start.toISOString(),
      end: end.toISOString(),
      notes: '',
      source: 'clock',
      createdAt: now,
      updatedAt: now,
    };
    state.entries.push(entry);
    if (!saveEntries()) {
      state.entries.pop();
      return;
    }
    state.active = null;
    saveActive();
    render();
    openNote(entry);
  }

  // ---------- Clock-out note ----------
  function openNote(entry) {
    const s = new Date(entry.start), e = new Date(entry.end);
    $('#note-sheet').dataset.id = entry.id;
    $('#note-sub').innerHTML = `<span>${fmtHours(hoursOf(entry))} hrs at ${esc(entry.location)}</span><span>${fmtTime(s)} - ${fmtTime(e)}</span>`;
    $('#note-text').value = '';
    $('#note-highlight').checked = false; // off by default so nothing is highlighted by accident
    $('#note-sheet').showModal();
  }

  function saveNote(ev) {
    ev.preventDefault();
    const dlg = $('#note-sheet');
    const entry = state.entries.find((x) => x.id === dlg.dataset.id);
    dlg.close();
    if (!entry) return;
    const text = $('#note-text').value.trim();
    const hl = $('#note-highlight').checked;
    if (text || hl) {
      entry.notes = text;
      if (hl) entry.highlight = true;
      entry.updatedAt = new Date().toISOString();
      saveEntries();
      render();
    }
    toast(`Logged ${fmtHours(hoursOf(entry))} hrs · ${entry.category}`);
  }

  // ---------- 24-hour check ----------
  let longAskedFor = null; // the session start we already asked about during this visit

  function maybeAskLongSession() {
    const a = state.active;
    if (!a || a.stillHere || longAskedFor === a.start) return;
    if (Date.now() - new Date(a.start) < LONG_SESSION_HOURS * 3600000) return;
    if ($$('dialog[open]').length) return;
    longAskedFor = a.start;
    const start = new Date(a.start);
    // Suggest a 12-hour shift, the most common long shift
    const guess = new Date(Math.min(start.getTime() + 12 * 3600000, Date.now()));
    $('#long-msg').textContent = `You've been clocked in at ${a.location} for ${Math.floor((Date.now() - start) / 3600000)} hours. If you forgot to clock out, enter when you left.`;
    $('#long-date').value = toDateInput(guess);
    $('#long-time').value = toTimeInput(guess);
    $('#long-error').hidden = true;
    updateLongPreview();
    $('#long-dialog').showModal();
  }

  function longEnd() {
    const d = $('#long-date').value, t = $('#long-time').value;
    return d && t ? localDateTime(d, t) : null;
  }

  function updateLongPreview() {
    const end = longEnd();
    const a = state.active;
    $('#long-date-text').textContent = end ? fmtLong(end) : 'Pick a date';
    $('#long-time-text').textContent = end ? fmtTime(end) : 'Pick a time';
    if (end && a) {
      const hrs = (end - roundToMinute(new Date(a.start))) / 3600000;
      $('#long-hours').textContent = hrs > 0 ? `That makes this shift ${fmtHours(hrs)} hrs.` : '';
    }
  }

  async function submitLong(ev) {
    ev.preventDefault();
    const a = state.active;
    const end = longEnd();
    const err = $('#long-error');
    if (!a || !end) return;
    const start = roundToMinute(new Date(a.start));
    if (end <= start) {
      err.textContent = 'That time is before you clocked in.';
      err.hidden = false;
      return;
    }
    if (end > new Date()) {
      err.textContent = "That time hasn't happened yet.";
      err.hidden = false;
      return;
    }
    $('#long-dialog').close();
    await finishSession(start, roundToMinute(end));
  }

  function stillHere() {
    if (state.active) {
      state.active.stillHere = true;
      saveActive();
    }
    $('#long-dialog').close();
  }

  async function discardActive() {
    const a = state.active;
    if (!a) return;
    const r = await ask({
      title: 'Discard This Session?',
      message: `Your ${fmtElapsed(Date.now() - new Date(a.start))} at ${a.location} will not be saved. This can't be undone.`,
      iconName: 'trash',
      tone: 'danger',
      buttons: [
        { label: 'Keep Clocked In', value: 'keep', style: 'navy' },
        { label: 'Discard Session', value: 'discard', style: 'danger-outline' },
      ],
    });
    if (r !== 'discard') return;
    state.active = null;
    saveActive();
    render();
    toast('Session discarded');
  }

  // ---------- Entry form (shared by Add Entry and Edit Entry) ----------
  function setupEntryForm(form) {
    $('.fields', form).appendChild($('#entry-fields-tpl').content.cloneNode(true));
    fillIcons(form);
    const f = form.elements;
    $('[data-role="cats"]', form).addEventListener('change', () => {
      const cat = f.category.value;
      fillLocationSelect(form, cat, state.prefs.lastLocation[cat]);
    });
    f.location.addEventListener('change', () => {
      const isNew = f.location.value === NEW_LOC;
      $('[data-role="new-location"]', form).hidden = !isNew;
      if (isNew) f.newLocation.focus();
    });
    for (const n of ['date', 'start', 'end']) {
      f[n].addEventListener('input', () => updateDurationHint(form));
      f[n].addEventListener('change', () => updateDurationHint(form));
    }
  }

  function fillCategoryPicker(form, selected) {
    const cats = visibleCategories();
    if (selected && !cats.includes(selected)) cats.push(selected);
    $('[data-role="cats"]', form).innerHTML = cats.map((c) => `
      <label class="${catClass(c)}"><input type="radio" name="category" value="${esc(c)}"${c === selected ? ' checked' : ''}>
        <span>${icon(catIcon(c), 18, c === selected)}${esc(c)}</span></label>`).join('');
    // Selected option shows the two-tone icon
    $('[data-role="cats"]', form).onchange = (e) => {
      for (const lab of $$('label', e.currentTarget)) {
        const inp = $('input', lab);
        $('span', lab).innerHTML = icon(catIcon(inp.value), 18, inp.checked) + esc(inp.value);
      }
    };
  }

  function fillLocationSelect(form, cat, selected) {
    const f = form.elements;
    const locs = locationsFor(cat);
    if (selected && !locs.includes(selected)) locs.push(selected);
    const chosen = selected && locs.includes(selected) ? selected : '';
    f.location.innerHTML =
      `<option value="" disabled>Choose a location</option>` +
      locs.map((l) => `<option value="${esc(l)}">${esc(l)}</option>`).join('') +
      `<option value="${NEW_LOC}">+ Add a new location</option>`;
    // Nothing saved yet for this category: go straight to typing a new one
    f.location.value = chosen || (locs.length ? '' : NEW_LOC);
    f.newLocation.value = '';
    $('[data-role="new-location"]', form).hidden = f.location.value !== NEW_LOC;
  }

  function fillEntryForm(form, e) {
    const f = form.elements;
    fillCategoryPicker(form, e.category);
    fillLocationSelect(form, e.category, e.location);
    f.date.value = e.date || '';
    f.start.value = e.startTime || '';
    f.end.value = e.endTime || '';
    f.notes.value = e.notes || '';
    f.highlight.checked = !!e.highlight;
    showFormError(form, '');
    updateDurationHint(form);
  }

  function computeRange(dateStr, startStr, endStr) {
    if (!dateStr || !startStr || !endStr) return null;
    const start = localDateTime(dateStr, startStr);
    let end = localDateTime(dateStr, endStr);
    let overnight = false;
    if (end < start) {
      end = new Date(end.getFullYear(), end.getMonth(), end.getDate() + 1, end.getHours(), end.getMinutes());
      overnight = true;
    }
    return { start, end, overnight };
  }

  function updateDurationHint(form) {
    const f = form.elements;
    const r = computeRange(f.date.value, f.start.value, f.end.value);
    $('[data-role="duration"]', form).textContent = r ? fmtHours((r.end - r.start) / 3600000) : '0.00';
    $('[data-role="overnight"]', form).hidden = !(r && r.overnight);
    const pill = $('[data-role="date-pill"]', form);
    pill.hidden = !f.date.value;
    if (f.date.value) pill.textContent = fmtShort(localDateTime(f.date.value, '12:00'));
  }

  function showFormError(form, msg) {
    const el = $('[data-role="error"]', form);
    el.textContent = msg;
    el.hidden = !msg;
  }

  // Validates the form. Returns the entry fields, or null after showing an error.
  function readEntryForm(form) {
    const f = form.elements;
    const fail = (msg) => {
      showFormError(form, msg);
      return null;
    };
    const category = f.category.value;
    if (!category) return fail('Choose a category.');
    let location = f.location.value;
    if (location === NEW_LOC) {
      if (!f.newLocation.value.trim()) return fail('Type a name for the new location.');
    } else if (!location) {
      return fail('Choose a location.');
    }
    if (!f.date.value) return fail('Enter a date.');
    if (!f.start.value || !f.end.value) return fail('Enter both a start and an end time.');
    const r = computeRange(f.date.value, f.start.value, f.end.value);
    if (r.end - r.start === 0) return fail('The end time must be different from the start time.');
    if (location === NEW_LOC) location = addLocation(category, f.newLocation.value);
    showFormError(form, '');
    return {
      category,
      location,
      start: r.start.toISOString(),
      end: r.end.toISOString(),
      notes: f.notes.value.trim(),
      highlight: f.highlight.checked,
    };
  }

  // ---------- Add Entry ----------
  let addFormReady = false;
  function renderRepeat() {
    const seen = new Set();
    const shifts = [];
    for (const e of shownEntries().sort(byStartDesc)) {
      if (e.timesUnknown) continue;
      const s = new Date(e.start), en = new Date(e.end);
      const key = [e.category, e.location, toTimeInput(s), toTimeInput(en)].join('|');
      if (seen.has(key)) continue;
      seen.add(key);
      shifts.push({ e, s, en });
      if (shifts.length === 4) break;
    }
    $('#repeat-card').hidden = !shifts.length;
    $('#repeat-list').innerHTML = shifts.map(({ e, s, en }) => `
      <button type="button" class="repeat-chip ${catClass(e.category)}" data-repeat="${esc(e.id)}">
        ${badge(e.category, 'sm', 16)}
        <span class="row-main"><span class="row-title">${esc(e.location)}</span><span class="row-sub">${fmtTime(s)} - ${fmtTime(en)}</span></span>
      </button>`).join('');
  }

  // Fills the Add form from a past shift, dated today
  function repeatShift(id) {
    const e = state.entries.find((x) => x.id === id);
    if (!e) return;
    fillEntryForm($('#manual-form'), {
      date: toDateInput(new Date()),
      category: e.category,
      location: e.location,
      startTime: toTimeInput(new Date(e.start)),
      endTime: toTimeInput(new Date(e.end)),
    });
    toast('Filled in from your last shift there. Check the date and save.');
  }

  function renderAdd() {
    renderRepeat();
    if (addFormReady) return;
    addFormReady = true;
    const vis = visibleCategories();
    const cat = vis.includes(state.prefs.lastCategory) ? state.prefs.lastCategory : vis[0];
    fillEntryForm($('#manual-form'), {
      date: toDateInput(new Date()),
      category: cat,
      location: state.prefs.lastLocation[cat],
    });
  }

  async function submitManual(ev) {
    ev.preventDefault();
    const form = ev.target;
    const data = readEntryForm(form);
    if (!data) return;
    if (!(await confirmOverlap(data.start, data.end))) return;
    if (!data.highlight) delete data.highlight;
    const now = new Date().toISOString();
    const entry = { id: uid(), ...data, source: 'manual', createdAt: now, updatedAt: now };
    state.entries.push(entry);
    if (!saveEntries()) {
      state.entries.pop();
      return;
    }
    state.prefs.lastCategory = data.category;
    state.prefs.lastLocation[data.category] = data.location;
    savePrefs();
    // Keep the date, category and location for quick back-to-back entries; clear the times
    fillEntryForm(form, { date: form.elements.date.value, category: data.category, location: data.location });
    renderHome();
    toast(`Saved ${fmtHours(hoursOf(entry))} hrs · ${data.location}`);
  }

  // ---------- Edit Entry ----------
  function openEdit(id) {
    const e = state.entries.find((x) => x.id === id);
    if (!e) return;
    const s = new Date(e.start), en = new Date(e.end);
    const form = $('#edit-form');
    form.dataset.id = id;
    $('#edit-sub').textContent = `${e.category} · ${s.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}${e.timesUnknown ? ' · Times not recorded' : ''}`;
    $('#edit-notice').hidden = e.source !== 'clock';
    fillEntryForm(form, {
      date: toDateInput(s),
      category: e.category,
      location: e.location,
      startTime: toTimeInput(s),
      endTime: toTimeInput(en),
      notes: e.notes,
      highlight: e.highlight,
    });
    const dlg = $('#edit-sheet');
    dlg.showModal();
    dlg.scrollTop = 0;
    $('[data-close]', dlg).focus();
  }

  async function submitEdit(ev) {
    ev.preventDefault();
    const form = ev.target;
    const idx = state.entries.findIndex((x) => x.id === form.dataset.id);
    if (idx < 0) return;
    const data = readEntryForm(form);
    if (!data) return;
    if (!(await confirmOverlap(data.start, data.end, form.dataset.id))) return;
    const prev = state.entries[idx];
    // Spread the old entry first so any extra fields are preserved
    state.entries[idx] = { ...prev, ...data, updatedAt: new Date().toISOString() };
    if (!data.highlight) delete state.entries[idx].highlight;
    // Times added to an imported shift that had none
    if (prev.timesUnknown && (data.start !== prev.start || data.end !== prev.end)) delete state.entries[idx].timesUnknown;
    if (!saveEntries()) {
      state.entries[idx] = prev;
      return;
    }
    $('#edit-sheet').close();
    render();
    toast('Entry updated');
  }

  async function deleteEntry() {
    const id = $('#edit-form').dataset.id;
    const e = state.entries.find((x) => x.id === id);
    if (!e) return;
    const r = await ask({
      title: 'Delete This Entry?',
      message: `${e.location}\n${fmtShort(new Date(e.start))} · ${fmtHours(hoursOf(e))} hrs\n\nThis can't be undone.`,
      iconName: 'trash',
      tone: 'danger',
      buttons: [
        { label: 'Keep Entry', value: 'keep', style: 'navy' },
        { label: 'Delete Entry', value: 'delete', style: 'danger-outline' },
      ],
    });
    if (r !== 'delete') return;
    const index = state.entries.indexOf(e);
    state.entries.splice(index, 1);
    saveEntries();
    $('#edit-sheet').close();
    render();
    toast('Entry deleted', {
      action: 'Undo',
      onAction: () => {
        state.entries.splice(Math.min(index, state.entries.length), 0, e);
        saveEntries();
        render();
        toast('Entry restored');
      },
    });
  }

  // ---------- Calendar ----------
  const cal = { year: new Date().getFullYear(), month: new Date().getMonth(), selected: toDateInput(new Date()) };

  function shiftMonth(delta) {
    const d = new Date(cal.year, cal.month + delta, 1);
    cal.year = d.getFullYear();
    cal.month = d.getMonth();
    // Select today when landing on the current month, otherwise nothing
    const today = new Date();
    cal.selected = cal.year === today.getFullYear() && cal.month === today.getMonth() ? toDateInput(today) : '';
    renderCalendar();
  }

  function renderCalendar() {
    const first = new Date(cal.year, cal.month, 1);
    const daysInMonth = new Date(cal.year, cal.month + 1, 0).getDate();
    const todayStr = toDateInput(new Date());
    $('#cal-title').textContent = fmtMonth(first);

    // Entries in this month, keyed by the day they started
    const byDay = {};
    const monthEntries = [];
    for (const e of shownEntries()) {
      const s = new Date(e.start);
      if (s.getFullYear() !== cal.year || s.getMonth() !== cal.month) continue;
      monthEntries.push(e);
      (byDay[s.getDate()] ||= []).push(e);
    }

    const cells = [];
    for (let i = 0; i < first.getDay(); i++) cells.push('<span class="day blank"></span>');
    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = toDateInput(new Date(cal.year, cal.month, d));
      const list = byDay[d] || [];
      const hours = sumHours(list);
      // A day with several categories takes the color of the one with the most hours
      const perCat = {};
      for (const e of list) perCat[e.category] = (perCat[e.category] || 0) + hoursOf(e);
      const top = Object.keys(perCat).sort((a, b) => perCat[b] - perCat[a])[0];
      const cls = ['day'];
      if (list.length) cls.push('has', catClass(top));
      if (dateStr === todayStr) cls.push('today');
      if (dateStr === cal.selected) cls.push('sel');
      const label = `${fmtLong(new Date(cal.year, cal.month, d))}${list.length ? `, ${fmtHours(hours)} hours` : ''}`;
      cells.push(`<button type="button" class="${cls.join(' ')}" data-date="${dateStr}" aria-label="${esc(label)}">
        <span class="day-num">${d}</span>${list.length ? `<span class="day-hrs">${+hours.toFixed(1)}h</span>` : ''}</button>`);
    }
    $('#cal-grid').innerHTML = cells.join('');
    $('#cal-legend').innerHTML = visibleCategories().map((c) => `<span class="${catClass(c)}"><i></i>${esc(c)}</span>`).join('');

    // Selected day
    const dayBox = $('#cal-day');
    if (cal.selected && cal.selected.startsWith(`${cal.year}-${pad(cal.month + 1)}-`)) {
      const d = Number(cal.selected.slice(8));
      const list = (byDay[d] || []).sort((a, b) => new Date(a.start) - new Date(b.start));
      dayBox.hidden = false;
      dayBox.innerHTML = `
        <div class="card-head"><h3>${esc(fmtLong(new Date(cal.year, cal.month, d)))}</h3>${list.length ? `<span class="soft-pill">${fmtHours(sumHours(list))} hrs</span>` : ''}</div>
        ${list.length ? `<div class="rows">${list.map((e) => entryRow(e, { showDate: false })).join('')}</div>` : '<p class="empty">No entries on this day.</p>'}`;
    } else {
      dayBox.hidden = true;
    }

    // Monthly summary
    const summary = $('#cal-summary');
    const mName = monthName(first);
    if (!monthEntries.length) {
      summary.innerHTML = `<div class="card-head"><span class="card-icon">${icon('chart', 17)}</span><h2>${esc(mName)} Summary</h2></div><p class="empty">No entries this month.</p>`;
      return;
    }
    const total = sumHours(monthEntries);
    const byCat = new Map();
    for (const e of monthEntries) {
      const c = byCat.get(e.category) || { count: 0, hours: 0 };
      c.count++;
      c.hours += hoursOf(e);
      byCat.set(e.category, c);
    }
    const order = [...byCat.keys()].sort((a, b) => byCat.get(b).hours - byCat.get(a).hours);
    const byLoc = {};
    for (const e of monthEntries) byLoc[e.location] = (byLoc[e.location] || 0) + hoursOf(e);
    const topLocs = Object.keys(byLoc).sort((a, b) => byLoc[b] - byLoc[a]).slice(0, 3);
    const days = Object.keys(byDay).length;
    summary.innerHTML = `
      <div class="card-head"><span class="card-icon">${icon('chart', 17)}</span><h2>${esc(mName)} Summary</h2></div>
      <div class="big-stat stacked"><span class="big-num">${fmtHours(total)}</span><span class="stat-line"><span class="big-label">Hours logged</span><span class="good-pill">${plural(days, 'day', 'days')}</span></span></div>
      <div class="split-bar" role="img" aria-label="${esc(order.map((c) => `${c} ${fmtHours(byCat.get(c).hours)} hours`).join(', '))}">
        ${order.map((c) => `<span class="${catClass(c)}" style="flex-grow: ${byCat.get(c).hours.toFixed(2)}"></span>`).join('')}
      </div>
      <div class="mini-grid">
        ${order.map((c) => {
          const v = byCat.get(c);
          return `<div class="mini ${catClass(c)}"><span class="mini-head">${badge(c, 'sm', 16)}${esc(c)}</span>
            <strong>${fmtHours(v.hours)}</strong><small>${plural(v.count, 'entry', 'entries')} · ${(v.hours / total * 100).toFixed(1)}%</small></div>`;
        }).join('')}
      </div>
      <div class="table-rows">
        <div><span>Top Locations</span><span>Hours</span></div>
        ${topLocs.map((l) => `<div><span>${esc(l)}</span><b>${fmtHours(byLoc[l])}</b></div>`).join('')}
      </div>
      <button type="button" class="btn btn-outline btn-block" data-goto="history">View Full History</button>`;
  }

  // ---------- History ----------
  const filters = { category: '', location: '', search: '', highlight: false };

  function renderHistory() {
    const cats = visibleCategories();
    if (filters.category && !cats.includes(filters.category)) filters.category = '';
    $('#h-chips').innerHTML =
      `<button type="button" data-cat="" aria-pressed="${!filters.category}">All</button>` +
      `<button type="button" data-highlight aria-pressed="${filters.highlight}">${icon('starfill', 14)}Highlights</button>` +
      cats.map((c) => `<button type="button" data-cat="${esc(c)}" aria-pressed="${filters.category === c}">${icon(catIcon(c), 16, filters.category === c)}${esc(c)}</button>`).join('');

    const locSet = new Set();
    for (const c of filters.category ? [filters.category] : cats) locationsFor(c).forEach((l) => locSet.add(l));
    for (const e of shownEntries()) if (!filters.category || e.category === filters.category) locSet.add(e.location);
    const locs = [...locSet].sort((a, b) => a.localeCompare(b));
    if (filters.location && !locs.includes(filters.location)) filters.location = '';
    const locSel = $('#f-location');
    locSel.innerHTML = `<option value="">All locations</option>` + locs.map((l) => `<option value="${esc(l)}">${esc(l)}</option>`).join('');
    locSel.value = filters.location;

    const q = filters.search.trim().toLowerCase();
    const list = shownEntries()
      .filter((e) => (!filters.category || e.category === filters.category) && (!filters.location || e.location === filters.location))
      .filter((e) => !filters.highlight || e.highlight)
      .filter((e) => !q || [e.location, e.notes, e.category].some((v) => (v || '').toLowerCase().includes(q)))
      .sort(byStartDesc);
    $('#h-total').textContent = fmtBig(sumHours(list));
    $('#h-count').textContent = `Hours across ${plural(list.length, 'entry', 'entries')}`;

    if (!list.length) {
      $('#history-list').innerHTML = `<section class="card"><p class="empty">${state.entries.length
        ? (q ? `Nothing matches "${esc(filters.search.trim())}".` : filters.highlight ? 'No highlights yet. Turn on Highlight when you add a note.' : 'No entries match these filters.')
        : 'No entries yet. Clock in from the Clock tab or add one manually.'}</p></section>`;
      return;
    }

    // Group by month
    const groups = [];
    for (const e of list) {
      const s = new Date(e.start);
      const key = `${s.getFullYear()}-${s.getMonth()}`;
      let g = groups[groups.length - 1];
      if (!g || g.key !== key) {
        g = { key, label: fmtMonth(s), items: [] };
        groups.push(g);
      }
      g.items.push(e);
    }
    $('#history-list').innerHTML = groups.map((g) => `
      <section class="card month-card">
        <div class="card-head"><h2>${esc(g.label)}</h2><span class="soft-pill">${fmtHours(sumHours(g.items))} hrs</span></div>
        <div class="rows">${g.items.map((e) => entryRow(e)).join('')}</div>
      </section>`).join('');
  }

  // ---------- Export ----------
  // Categories picked for export. null means every visible category (the default).
  let exportSel = null;
  const exportSelected = () => exportSel ? visibleCategories().filter((c) => exportSel.has(c)) : visibleCategories();

  function entriesInRange() {
    const from = $('#x-from').value;
    const to = $('#x-to').value;
    if (from && to && from > to) return { error: 'The "From" date is after the "To" date.' };
    const picked = exportSelected();
    if (!picked.length) return { error: 'Pick at least one category to export.' };
    const list = shownEntries()
      .filter((e) => {
        const d = toDateInput(new Date(e.start));
        return (!from || d >= from) && (!to || d <= to) && picked.includes(e.category);
      })
      .sort((a, b) => new Date(a.start) - new Date(b.start));
    return { list, from, to, picked };
  }

  function exportRows(list) {
    return list.map((e) => {
      const s = new Date(e.start), en = new Date(e.end);
      return [fmtDate(s), e.location, e.timesUnknown ? '' : fmtTime(s), e.timesUnknown ? '' : fmtTime(en), fmtHours(hoursOf(e))];
    });
  }

  const csvCell = (v) => {
    const s = String(v ?? '');
    return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };

  async function exportCsv() {
    const { list, from, to, picked, error } = entriesInRange();
    if (error) return toast(error);
    if (!list.length) return toast('No matching entries to export');
    const lines = [CSV_HEADER, ...exportRows(list)].map((r) => r.map(csvCell).join(','));
    // BOM so Excel reads it as UTF-8 (apostrophes, accents, etc.)
    const csv = '﻿' + lines.join('\r\n') + '\r\n';
    const range = from || to ? `_${from || 'start'}_to_${to || toDateInput(new Date())}` : '';
    // Name the file after the categories, unless every category is included
    const cat = picked.length < visibleCategories().length ? '_' + picked.map((c) => c.toLowerCase().replace(/[^a-z0-9]+/g, '-')).join('+') : '';
    const ok = await saveFile(`clinical-hours${cat}${range}_${toDateInput(new Date())}.csv`, csv, 'text/csv');
    if (ok) toast(`Exported ${plural(list.length, 'entry', 'entries')}`);
  }

  async function copyRows() {
    const { list, error } = entriesInRange();
    if (error) return toast(error);
    if (!list.length) return toast('No matching entries to copy');
    // Tab-separated rows paste into separate Excel columns
    const tsv = exportRows(list)
      .map((r) => r.map((v) => String(v).replace(/[\t\r\n]+/g, ' ')).join('\t'))
      .join('\n');
    const ok = await copyText(tsv);
    toast(ok ? `Copied ${plural(list.length, 'row', 'rows')}. Paste into Excel.` : 'Copy failed. Use Export CSV instead.');
  }

  // ---------- Backup / restore ----------
  async function backup() {
    const now = new Date();
    const previousBackup = state.prefs.lastBackupAt;
    // Record the backup time first so the file itself carries it
    state.prefs.lastBackupAt = now.toISOString();
    const data = {
      app: BACKUP_APP_ID,
      schemaVersion: BACKUP_SCHEMA,
      exportedAt: now.toISOString(),
      entryCount: state.entries.length,
      entries: state.entries,
      customLocations: state.customLocations,
      categories: state.categories,
      locationDetails: state.locDetails,
      reports: state.reports,
      imports: state.imports,
      activeSession: state.active,
      prefs: state.prefs,
    };
    const stamp = `${toDateInput(now)}_${pad(now.getHours())}${pad(now.getMinutes())}`;
    const ok = await saveFile(`clinical-hours-backup_${stamp}.json`, JSON.stringify(data, null, 2), 'application/json');
    if (!ok) {
      if (previousBackup) state.prefs.lastBackupAt = previousBackup;
      else delete state.prefs.lastBackupAt;
    }
    if (ok) {
      savePrefs();
      renderData();
      toast(`Backed up ${plural(state.entries.length, 'entry', 'entries')}`);
    }
  }

  // Accepts an entry from a backup; keeps every field and only fixes up the essentials
  function normalizeEntry(r) {
    if (!r || typeof r !== 'object') return null;
    const s = new Date(r.start), e = new Date(r.end);
    if (isNaN(s) || isNaN(e) || e < s) return null;
    if (typeof r.category !== 'string' || !r.category.trim()) return null;
    if (typeof r.location !== 'string' || !r.location.trim()) return null;
    return {
      ...r,
      id: typeof r.id === 'string' && r.id ? r.id : uid(),
      category: r.category.trim(),
      location: r.location.trim(),
      start: s.toISOString(),
      end: e.toISOString(),
    };
  }

  function normalizeActive(a) {
    if (!a || typeof a !== 'object' || typeof a.category !== 'string' || typeof a.location !== 'string') return null;
    return isNaN(new Date(a.start)) ? null : a;
  }

  async function restoreFromFile(file) {
    let data;
    try {
      data = JSON.parse(await file.text());
    } catch {
      await notify('Can’t Read That File', 'It isn’t a valid backup file.');
      return;
    }
    const raw = Array.isArray(data) ? data : Array.isArray(data?.entries) ? data.entries : null;
    if (!raw) {
      await notify('No Entries Found', 'That file doesn’t look like a backup from this app.');
      return;
    }
    const valid = [];
    let skipped = 0;
    for (const r of raw) {
      const e = normalizeEntry(r);
      if (e) valid.push(e);
      else skipped++;
    }
    const when = data.exportedAt && !isNaN(new Date(data.exportedAt)) ? ` from ${fmtShort(new Date(data.exportedAt))}` : '';
    const backupLocs = data.customLocations && typeof data.customLocations === 'object' ? data.customLocations : {};
    const locCount = Object.values(backupLocs).reduce((n, l) => n + (Array.isArray(l) ? l.length : 0), 0);
    const choice = await ask({
      title: 'Restore Backup?',
      message:
        `The backup${when} has ${plural(valid.length, 'entry', 'entries')}` +
        (skipped ? ` (${skipped} unreadable, will be skipped)` : '') +
        ` and ${plural(locCount, 'saved location', 'saved locations')}. This phone has ${plural(state.entries.length, 'entry', 'entries')}.\n\n` +
        `Merge adds backup entries and locations you don't already have.\n` +
        `Replace erases what's here and uses only the backup.`,
      iconName: 'restore',
      buttons: [
        { label: 'Merge', value: 'merge', style: 'primary' },
        { label: 'Replace All', value: 'replace', style: 'danger-outline' },
        { label: 'Cancel', value: 'cancel', style: 'outline' },
      ],
    });
    if (choice !== 'merge' && choice !== 'replace') return;

    const backupActive = normalizeActive(data.activeSession);
    const backupCats = Array.isArray(data.categories) ? data.categories.map(normalizeCategory).filter(Boolean) : [];
    const backupDetails = data.locationDetails && typeof data.locationDetails === 'object' && !Array.isArray(data.locationDetails) ? data.locationDetails : {};
    const backupReports = Array.isArray(data.reports) ? data.reports.filter((r) => r && typeof r.id === 'string' && typeof r.html === 'string') : [];
    const backupImports = Array.isArray(data.imports) ? data.imports.filter((r) => r && typeof r.id === 'string') : [];
    let added = 0;
    if (choice === 'replace') {
      state.entries = valid;
      state.customLocations = {};
      if (backupCats.length) state.categories = backupCats;
      state.active = backupActive;
      state.locDetails = { ...backupDetails };
      state.reports = backupReports.slice(0, MAX_SAVED_REPORTS);
      state.imports = backupImports;
      if (data.prefs && typeof data.prefs === 'object') state.prefs = { lastLocation: {}, period: 'month', ...data.prefs };
      state.prefs.lastBackupAt ||= data.exportedAt;
      added = valid.length;
    } else {
      // Fill in location details and reports this phone doesn't have yet
      for (const [k, d] of Object.entries(backupDetails)) {
        if (!d || typeof d !== 'object') continue;
        const cur = state.locDetails[k] || {};
        const merged = { ...cur };
        for (const [f, v] of Object.entries(d)) if (!merged[f] && v) merged[f] = v;
        state.locDetails[k] = merged;
      }
      for (const r of backupReports) if (!state.reports.some((x) => x.id === r.id)) state.reports.push(r);
      state.reports.sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
      for (const r of backupImports) if (!state.imports.some((x) => x.id === r.id)) state.imports.push(r);
      state.imports.sort((a, b) => (b.at || '').localeCompare(a.at || ''));
      const byId = new Map(state.entries.map((e) => [e.id, e]));
      for (const e of valid) {
        const cur = byId.get(e.id);
        if (!cur) {
          byId.set(e.id, e);
          added++;
        } else if ((e.updatedAt || '') > (cur.updatedAt || '')) {
          byId.set(e.id, e);
        }
      }
      state.entries = [...byId.values()];
      if (!state.active) state.active = backupActive;
    }
    // Bring back saved locations, plus any location an entry uses
    for (const [cat, locs] of Object.entries(backupLocs)) {
      if (Array.isArray(locs)) locs.forEach((l) => typeof l === 'string' && l.trim() && addLocation(cat, l));
    }
    for (const c of backupCats) if (!findCat(c.name)) state.categories.push(c);
    for (const e of state.entries) {
      ensureCategory(e.category);
      addLocation(e.category, e.location);
    }
    saveCategories();

    saveEntries();
    saveLocations();
    saveActive();
    saveLocDetails();
    saveReports();
    saveImports();
    savePrefs();
    applyTheme();
    addFormReady = false;
    render();
    toast(choice === 'replace' ? `Restored ${plural(added, 'entry', 'entries')}` : `Merged. ${plural(added, 'new entry', 'new entries')} added.`);
  }

  // ---------- Import from a spreadsheet ----------
  const IM = window.HoursImport;
  const IMPORT_FIELDS = [
    ['date', 'Date'],
    ['location', 'Location'],
    ['start', 'Time Begin'],
    ['end', 'Time End'],
    ['hours', 'Hours'],
    ['notes', 'Notes'],
    ['category', 'Category'],
  ];
  const NO_TIMES_START = 9 * 60; // shifts without recorded times are placed at 9:00 AM; only their hours count
  const SKIP = '__skip__', USE_COLUMN = '__column__', NEW_CAT = '__newcat__';
  const IMPORT_STEPS = ['sheets', 'columns', 'review'];
  let imp = null; // the import in progress, or null

  function prepTable(t) {
    const headerIdx = IM.findHeader(t.rows);
    const headers = headerIdx >= 0 ? (t.rows[headerIdx] || []).map(IM.cellText) : [];
    const data = [];
    t.rows.forEach((cells, i) => {
      if (i > headerIdx && cells.some(Boolean)) data.push({ num: i + 1, cells });
    });
    const width = Math.max(headers.length, 0, ...data.map((d) => d.cells.length));
    const map = IM.guessMapping(headers, data.map((d) => d.cells), t.date1904);
    return { name: t.name, hidden: !!t.hidden, date1904: !!t.date1904, headers, data, width, map, auto: { ...map }, category: SKIP, fallbackLoc: '' };
  }

  // Matches a sheet to a category by name, like "Volunteer" to "Volunteering"
  function guessTableCategory(t, single) {
    const n = t.name.toLowerCase().trim();
    const hit = state.categories.find((c) => {
      const x = c.name.toLowerCase();
      return x === n || (n.length >= 4 && x.length >= 4 && (x.startsWith(n) || n.startsWith(x)));
    });
    if (hit) return hit.name;
    if (t.map.category >= 0) return USE_COLUMN;
    return single ? visibleCategories()[0] : SKIP;
  }

  const activeTables = () => imp.tables.filter((t) => t.category !== SKIP);

  function openImport(step, source) {
    imp = { step, source, tables: [], emptyCount: 0, col: 0, overlap: 'import', show: {}, pasteText: '' };
    renderImport();
    const dlg = $('#import-sheet');
    if (!dlg.open) dlg.showModal();
  }

  async function importFile(file) {
    let tables;
    try {
      tables = await IM.readFile(file);
    } catch (err) {
      await notify('Can’t Import That File', err instanceof IM.ImportError ? err.message : 'Something went wrong while reading it. Save it as .xlsx or CSV and try again.');
      return;
    }
    openImport('sheets', file.name);
    beginImport(tables);
  }

  function beginImport(tables) {
    const prepped = tables.map(prepTable);
    const usable = prepped.filter((t) => t.data.length);
    if (!usable.length) {
      $('#import-sheet').close();
      notify('No Rows Found', 'There aren’t any rows to import in that file.');
      return;
    }
    usable.forEach((t) => (t.category = t.hidden ? SKIP : guessTableCategory(t, usable.length === 1)));
    Object.assign(imp, { tables: usable, emptyCount: prepped.length - usable.length, step: 'sheets', col: 0 });
    renderImport();
  }

  function pasteNext() {
    const text = $('#imp-paste').value;
    imp.pasteText = text;
    const rows = IM.parseDelimited(text).filter((r) => r.some(Boolean));
    if (!rows.length) return importError('Paste at least one row first.');
    beginImport([{ name: 'Pasted rows', rows }]);
  }

  function importError(msg) {
    const el = $('#imp-error');
    el.textContent = msg;
    el.hidden = false;
  }

  // ----- Reading one row with the chosen columns
  function buildRow(t, d) {
    const get = (f) => (t.map[f] >= 0 ? d.cells[t.map[f]] : undefined);
    const dateCell = get('date'), startCell = get('start'), endCell = get('end'), hoursCell = get('hours');
    if (!dateCell && !startCell && !endCell && !hoursCell) return null; // nothing to import on this row
    const quote = (c) => `“${IM.cellText(c)}”`;
    const isTotal = d.cells.some((c) => c && typeof c.v === 'string' && /\btotals?\b|\bsum\b/i.test(c.v));
    const day = IM.parseDate(dateCell, t.date1904) || IM.parseDate(startCell, t.date1904);
    if (!day) {
      if (isTotal || !dateCell) return isTotal ? null : { error: 'no date' };
      return { error: `can’t read the date ${quote(dateCell)}` };
    }
    const locText = (get('location') ? IM.cellText(get('location')) : t.fallbackLoc).trim().replace(/\s+/g, ' ');
    if (!locText) return { error: 'no location' };
    const s = IM.parseTime(startCell), e = IM.parseTime(endCell);
    if (startCell && s == null) return { error: `can’t read the start time ${quote(startCell)}` };
    if (endCell && e == null) return { error: `can’t read the end time ${quote(endCell)}` };
    const h = hoursCell ? IM.parseHours(hoursCell) : null;
    if (hoursCell && h == null) return { error: `can’t read the hours ${quote(hoursCell)}` };
    if (h != null && !(h > 0)) return { error: 'hours are zero' };
    if (h != null && h > 24) return { error: 'more than 24 hours in one row' };
    let startMin, endMin, unknown = false;
    if (s != null && e != null) {
      startMin = s;
      endMin = e;
      if (e <= s) {
        if (e === s) return { error: 'start and end times are the same' };
        if (e + 1440 - s > 16 * 60) return { error: 'end time is before start time' };
        endMin = e + 1440; // an overnight shift
      }
    } else if (s != null && h != null) {
      startMin = s;
      endMin = s + Math.round(h * 60);
    } else if (e != null && h != null) {
      endMin = e;
      startMin = e - Math.round(h * 60);
    } else if (h != null) {
      unknown = true;
      startMin = NO_TIMES_START;
      endMin = startMin + Math.round(h * 60);
    } else {
      return { error: s != null || e != null ? 'missing an end time or hours' : 'no times or hours' };
    }
    let category = t.category;
    if (category === USE_COLUMN) {
      const c = IM.cellText(get('category')).trim().replace(/\s+/g, ' ').slice(0, MAX_CATEGORY_NAME);
      if (!c) return { error: 'no category' };
      category = state.categories.find((x) => sameText(x.name, c))?.name || c;
    }
    return {
      category,
      location: locText.slice(0, 120),
      start: new Date(day.y, day.m - 1, day.d, 0, startMin),
      end: new Date(day.y, day.m - 1, day.d, 0, endMin),
      notes: get('notes') ? IM.cellText(get('notes')) : '',
      unknown,
    };
  }

  function collectRows() {
    const rows = [], errors = [];
    const one = imp.tables.length === 1;
    for (const t of activeTables()) {
      for (const d of t.data) {
        const r = buildRow(t, d);
        if (!r) continue;
        if (r.error) errors.push(`${one ? 'Row' : t.name + ' row'} ${d.num}: ${r.error}`);
        else rows.push(r);
      }
    }
    return { rows, errors };
  }

  // Imported location names that look like one you already have, or like each other
  function findLocSuggestions(rows) {
    const byCat = new Map();
    for (const r of rows) {
      if (!byCat.has(r.category)) byCat.set(r.category, new Map());
      const m = byCat.get(r.category);
      m.set(r.location, (m.get(r.location) || 0) + 1);
    }
    const out = [];
    for (const [cat, counts] of byCat) {
      const existing = [...new Set([...locationsFor(cat), ...state.entries.filter((e) => e.category === cat).map((e) => e.location)])];
      const names = [...counts.keys()].sort((a, b) => counts.get(b) - counts.get(a));
      names.forEach((name, i) => {
        if (existing.some((x) => sameText(x, name))) return;
        const earlier = names.slice(0, i).filter((x) => !out.some((o) => o.cat === cat && o.from === x));
        if (earlier.some((x) => sameText(x, name))) return; // same name in a different case merges on its own
        let best = null;
        for (const x of [...existing, ...earlier]) {
          const kind = IM.locMatch(name, x);
          if (kind === 'same') { best = { to: x, kind }; break; }
          if (kind && !best) best = { to: x, kind };
        }
        if (best) out.push({ cat, from: name, to: best.to, kind: best.kind, rows: counts.get(name), existing: existing.includes(best.to), choice: best.kind === 'same' ? 'combine' : 'keep' });
      });
    }
    return out;
  }

  function computeReview() {
    const merge = new Map(imp.suggestions.filter((x) => x.choice === 'combine').map((x) => [x.cat + '::' + x.from, x.to]));
    const rows = imp.parsed.rows.map((r) => ({ ...r, location: merge.get(r.category + '::' + r.location) || r.location }));
    // Skip rows already in the app: same location and times, or same day and hours when times weren't recorded
    const strict = new Set(), loose = new Set();
    const keyStrict = (loc, s, e) => `${IM.normLoc(loc)}|${s.getTime()}|${e.getTime()}`;
    const keyLoose = (loc, s, e) => `${IM.normLoc(loc)}|${toDateInput(s)}|${fmtHours((e - s) / 3600000)}`;
    for (const e of state.entries) {
      const s = new Date(e.start), en = new Date(e.end);
      strict.add(keyStrict(e.location, s, en));
      loose.add(keyLoose(e.location, s, en));
    }
    const dups = [], keep = [];
    for (const r of rows) {
      const ks = keyStrict(r.location, r.start, r.end), kl = keyLoose(r.location, r.start, r.end);
      if (r.unknown ? loose.has(kl) : strict.has(ks)) {
        dups.push(r);
        continue;
      }
      strict.add(ks);
      loose.add(kl);
      keep.push(r);
    }
    // Overlaps with existing entries or with other imported rows (rows without times can't overlap)
    const placed = state.entries.filter((e) => !e.timesUnknown)
      .map((e) => ({ s: new Date(e.start).getTime(), e: new Date(e.end).getTime(), ref: { ...e, start: new Date(e.start) } }));
    const overlaps = [];
    for (const r of keep) {
      if (r.unknown) continue;
      const s = r.start.getTime(), e = r.end.getTime();
      const hit = placed.find((p) => p.s < e && s < p.e);
      if (hit) {
        r.overlapWith = hit.ref;
        overlaps.push(r);
      }
      placed.push({ s, e, ref: r });
    }
    const final = imp.overlap === 'leave' ? keep.filter((r) => !r.overlapWith) : keep;
    return { rows: final, dups, overlaps, errors: imp.parsed.errors };
  }

  function goToReview() {
    imp.parsed = collectRows();
    imp.suggestions = findLocSuggestions(imp.parsed.rows);
    imp.step = 'review';
    renderImport();
  }

  // Checks the current sheet's columns before moving on. Returns an error message or ''.
  function columnsProblem(t) {
    const m = t.map;
    if (m.date < 0 && m.start < 0) return 'Pick the column with dates.';
    if (m.location < 0 && !t.fallbackLoc.trim()) return 'Pick the Location column, or type one location for every row.';
    if (m.hours < 0 && (m.start < 0 || m.end < 0)) return 'Pick Time Begin and Time End, or the Hours column.';
    if (t.category === USE_COLUMN && m.category < 0) return 'Pick the Category column.';
    return '';
  }

  function importNext() {
    if (imp.step === 'paste') return pasteNext();
    if (imp.step === 'sheets') {
      if (!activeTables().length) return importError('Pick a category for at least one sheet.');
      imp.step = 'columns';
      imp.col = 0;
      return renderImport();
    }
    if (imp.step === 'columns') {
      const tables = activeTables();
      const problem = columnsProblem(tables[imp.col]);
      if (problem) return importError(problem);
      if (imp.col < tables.length - 1) {
        imp.col++;
        renderImport();
        $('#import-sheet').scrollTop = 0;
        return;
      }
      return goToReview();
    }
    if (imp.step === 'review') return commitImport();
  }

  function importBack() {
    const dlg = $('#import-sheet');
    if (imp.step === 'sheets' && imp.source === 'Pasted rows') imp.step = 'paste';
    else if (imp.step === 'columns' && imp.col > 0) imp.col--;
    else if (imp.step === 'columns') imp.step = 'sheets';
    else if (imp.step === 'review') {
      imp.step = 'columns';
      imp.col = activeTables().length - 1;
    } else return dlg.close();
    renderImport();
    dlg.scrollTop = 0;
  }

  // ----- Screens
  const fieldOptions = (t, selected) => `<option value="-1"${selected < 0 ? ' selected' : ''}>Not in this sheet</option>` +
    Array.from({ length: t.width }, (_, i) =>
      `<option value="${i}"${i === selected ? ' selected' : ''}>Column ${IM.letter(i)}${t.headers[i] ? ' · ' + esc(t.headers[i]) : ''}</option>`).join('');

  function sampleText(t, field) {
    const col = t.map[field];
    if (col < 0) return '';
    const seen = [];
    for (const d of t.data) {
      const c = d.cells[col];
      if (!c) continue;
      let v;
      if (field === 'date') {
        const p = IM.parseDate(c, t.date1904);
        v = p ? fmtShort(new Date(p.y, p.m - 1, p.d)) : IM.cellText(c);
      } else if (field === 'start' || field === 'end') {
        const m = IM.parseTime(c);
        v = m == null ? IM.cellText(c) : fmtTime(new Date(2000, 0, 1, 0, m));
      } else if (field === 'hours') {
        const h = IM.parseHours(c);
        v = h == null ? IM.cellText(c) : fmtHours(h);
      } else v = IM.cellText(c);
      if (v.length > 40) v = v.slice(0, 38) + '…';
      if (!seen.includes(v)) seen.push(v);
    }
    const more = seen.length > 3 ? `, +${seen.length - 3} more` : '';
    return seen.slice(0, 3).join(', ') + more;
  }

  const shortTime = (d) => fmtTime(d).replace(' AM', 'a').replace(' PM', 'p');

  function renderImportPaste() {
    return {
      body: `<section class="card">
        <label class="field"><span>Select rows in your spreadsheet, copy them, then paste here. Include the header row if there is one.</span>
          <textarea id="imp-paste" class="imp-paste" rows="8" spellcheck="false" autocapitalize="off" placeholder="Date	Location	Start	End	Hours">${esc(imp.pasteText)}</textarea></label>
        <span class="imp-status" id="imp-paste-status"></span>
      </section>`,
      next: 'Next',
    };
  }

  function updatePasteStatus() {
    const rows = IM.parseDelimited($('#imp-paste').value).filter((r) => r.some(Boolean));
    const cols = Math.max(0, ...rows.map((r) => r.length));
    const data = rows.length - (IM.findHeader(rows) >= 0 ? 1 : 0);
    const el = $('#imp-paste-status');
    el.innerHTML = data > 0 ? `${icon('checkc', 16)}${plural(data, 'row', 'rows')}, ${plural(cols, 'column', 'columns')} found` : '';
  }

  function renderImportSheets() {
    const single = imp.tables.length === 1;
    const opts = (t) => state.categories.map((c) =>
      `<option value="${esc(c.name)}"${t.category === c.name ? ' selected' : ''}>${esc(c.name)}${c.hidden ? ' (hidden)' : ''}</option>`).join('') +
      (t.map.category >= 0 ? `<option value="${USE_COLUMN}"${t.category === USE_COLUMN ? ' selected' : ''}>Use the Category column</option>` : '') +
      `<option value="${SKIP}"${t.category === SKIP ? ' selected' : ''}>Skip this sheet</option>` +
      `<option value="${NEW_CAT}">New Category…</option>`;
    const rows = imp.tables.map((t, i) => `
      <label class="field imp-sheet-row${t.category === SKIP ? ' skipped' : ''}">
        <span class="imp-row-head"><b>${esc(t.name)}</b><span>${plural(t.data.length, 'row', 'rows')}</span></span>
        <select data-sheet="${i}" aria-label="Category for ${esc(t.name)}">${opts(t)}</select>
      </label>`).join('');
    const count = imp.tables.length + imp.emptyCount;
    const fileSub = imp.source === 'Pasted rows' ? 'Pasted on this phone'
      : count > 1 ? `${plural(count, 'sheet', 'sheets')} · read on this phone, never uploaded` : 'Read on this phone, never uploaded';
    return {
      body: `<section class="card imp-file"><span class="nudge-icon">${icon('table', 20)}</span>
          <span class="row-main"><span class="row-title">${esc(imp.source)}</span><span class="row-sub">${fileSub}</span></span></section>
        <section class="card">
          <div><h2 class="imp-h2">${single ? 'Which Category Are These Rows?' : 'Which Category Is Each Sheet?'}</h2>
          <p class="hint">${single ? 'Pick where these hours belong.' : 'Matched by sheet name. Tap one to change it.'}${imp.emptyCount ? ` ${plural(imp.emptyCount, 'empty sheet was', 'empty sheets were')} left out.` : ''}</p></div>
          <div class="imp-sheet-list">${rows}</div>
        </section>`,
      next: 'Next: Match Columns',
    };
  }

  function renderImportColumns() {
    const tables = activeTables();
    const t = tables[imp.col];
    const chips = tables.length > 1 ? `<div class="imp-chips">${tables.map((x, i) =>
      `<button type="button" class="imp-chip" data-col="${i}" aria-pressed="${i === imp.col}"${i > imp.col ? ' disabled' : ''}>${esc(x.name)}</button>`).join('')}</div>` : '';
    const fields = IMPORT_FIELDS.filter(([f]) => f !== 'category' || t.category === USE_COLUMN).map(([f, label]) => {
      const col = t.map[f];
      const tag = col >= 0 && col === t.auto[f] ? `<span class="imp-found">${icon('checkc', 14)}Found</span>`
        : col < 0 && (f === 'notes') ? '<span class="imp-optional">Optional</span>' : '';
      let sub = sampleText(t, f);
      if (f === 'hours') sub = col >= 0 ? `${sub}. Used when a row has no times.` : 'Used when a row has no times. 4.5 or 4:30 both work.';
      if (f === 'notes' && col < 0) sub = 'Pick a column to bring notes in with each entry.';
      const fallback = f === 'location' && col < 0
        ? `<input type="text" class="imp-fallback" data-fallback maxlength="120" placeholder="Or type one location for every row" value="${esc(t.fallbackLoc)}" aria-label="Location for every row">` : '';
      return `<div class="imp-field">
        <span class="imp-row-head"><b>${label}</b>${tag}</span>
        <label class="field"><select data-field="${f}" aria-label="${label} column">${fieldOptions(t, col)}</select></label>
        ${fallback}${sub ? `<span class="imp-sample">${esc(sub)}</span>` : ''}
      </div>`;
    }).join('');
    // Preview: the first three rows as they'll be saved
    const preview = t.data.map((d) => ({ d, r: buildRow(t, d) })).filter((x) => x.r).slice(0, 3).map(({ d, r }) => r.error
      ? `<div class="imp-prev-row error"><span>Row ${d.num}: ${esc(r.error)}</span></div>`
      : `<div class="imp-prev-row"><span>${esc(r.start.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }))}</span><span class="clip">${esc(r.location)}</span>
          <span class="muted-cell">${r.unknown ? 'No times' : `${shortTime(r.start)}-${shortTime(r.end)}`}</span><b>${fmtHours((r.end - r.start) / 3600000)}</b></div>`).join('');
    const next = imp.col < tables.length - 1 ? `Next: ${tables[imp.col + 1].name}` : 'Next: Review';
    return {
      body: `${chips}
        <section class="card">
          <div><h2 class="imp-h2">Match Columns${tables.length > 1 ? ` · ${esc(t.name)}` : ''}</h2>
          <p class="hint">${tables.length > 1 ? `Sheet ${imp.col + 1} of ${tables.length}. Each sheet is checked on its own, since layouts often differ.` : 'Check which column holds each part of a shift.'}</p></div>
          <div class="imp-fields">${fields}</div>
        </section>
        <section class="card">
          <div class="card-head"><h2>Preview</h2><span class="card-aside">First ${Math.min(3, t.data.length)} of ${t.data.length}</span></div>
          <div class="imp-prev"><div class="imp-prev-row head"><span>Date</span><span>Location</span><span>Time</span><span>Hrs</span></div>${preview || '<p class="empty">No rows to show.</p>'}</div>
        </section>`,
      next,
    };
  }

  function issue(ic, tone, title, text, extra = '') {
    return `<div class="imp-issue"><span class="imp-issue-icon ${tone}">${icon(ic, 18)}</span>
      <span class="row-main"><span class="row-title">${title}</span><span class="imp-issue-text">${text}</span>${extra}</span></div>`;
  }
  const choicePair = (attrs, value, a, b) => `<span class="imp-choice">
      <button type="button" ${attrs} data-value="${a[0]}" aria-pressed="${value === a[0]}">${a[1]}</button>
      <button type="button" ${attrs} data-value="${b[0]}" aria-pressed="${value === b[0]}">${b[1]}</button></span>`;
  const showToggle = (key, list) => list.length ? (imp.show[key]
    ? `<ul class="imp-list">${list.map((x) => `<li>${esc(x)}</li>`).join('')}</ul><button type="button" class="link-btn" data-show="${key}">Hide them</button>`
    : `<button type="button" class="link-btn" data-show="${key}">Show them</button>`) : '';
  const rowLabel = (r) => `${fmtShort(r.start)} · ${r.location}${r.unknown ? '' : ` · ${fmtTime(r.start)} - ${fmtTime(r.end)}`}`;

  function renderImportReview() {
    const rv = computeReview();
    const hours = sumHours(rv.rows.map((r) => ({ start: r.start, end: r.end })));
    const cats = new Map();
    for (const r of rv.rows) {
      const c = cats.get(r.category) || { n: 0, h: 0 };
      c.n++;
      c.h += (r.end - r.start) / 3600000;
      cats.set(r.category, c);
    }
    const times = rv.rows.map((r) => r.start.getTime());
    const monthYear = (t) => new Date(t).toLocaleDateString(undefined, { month: 'short', year: 'numeric' });
    const first = times.length ? monthYear(Math.min(...times)) : '', lastMonth = times.length ? monthYear(Math.max(...times)) : '';
    const range = first ? ` · ${first}${first === lastMonth ? '' : ` - ${lastMonth}`}` : '';
    const catRows = [...cats].map(([name, c]) => `<div class="imp-cat ${catClass(name)}">${badge(name, 'sm', 16)}
      <span class="row-main"><span class="row-title">${esc(name)}${findCat(name) ? '' : ' <span class="soft-pill">New</span>'}</span></span>
      <span class="imp-cat-n">${plural(c.n, 'entry', 'entries')}</span><b>${fmtBig(c.h)}</b></div>`).join('');

    const issues = [];
    imp.suggestions.forEach((x, i) => issues.push(issue('merge', 'soft', 'Combine locations?',
      `“${esc(x.from)}” (${plural(x.rows, 'row', 'rows')}) looks like “${esc(x.to)}”${x.existing ? ', a location you already have' : ''}.`,
      choicePair(`data-merge="${i}"`, x.choice, ['combine', 'Combine'], ['keep', 'Keep Separate']))));
    if (rv.dups.length) {
      issues.push(issue('copy', 'plain', `${rv.dups.length} already in the app`,
        'Same location and times as an existing entry. These will be skipped.', showToggle('dups', rv.dups.map(rowLabel))));
    }
    if (rv.overlaps.length) {
      const o = rv.overlaps[0];
      const w = o.overlapWith;
      issues.push(issue('warning', 'warn', `${plural(rv.overlaps.length, 'shift overlaps', 'shifts overlap')} another`,
        `${esc(fmtShort(o.start))} at ${esc(o.location)} overlaps ${esc(w.location)} (${esc(w.category)}) the same day.`,
        choicePair('data-overlap', imp.overlap, ['import', 'Import Anyway'], ['leave', 'Leave Out']) +
        showToggle('overlaps', rv.overlaps.map((r) => `${rowLabel(r)} overlaps ${r.overlapWith.location}`))));
    }
    const noTimes = rv.rows.filter((r) => r.unknown).length;
    if (noTimes) {
      issues.push(issue('clock', 'plain', `${plural(noTimes, 'row has', 'rows have')} no times`,
        'Their hours are saved and the times show as not recorded. You can add times later in History.'));
    }
    if (rv.errors.length) {
      const first = rv.errors.slice(0, 2).join('. ');
      issues.push(issue('close', 'danger', `${plural(rv.errors.length, 'row', 'rows')} couldn’t be read`,
        esc(first.charAt(0).toUpperCase() + first.slice(1)) + '.', rv.errors.length > 2 ? showToggle('errors', rv.errors) : ''));
    }
    const last = state.prefs.lastBackupAt;
    const backedUpNow = last && Date.now() - new Date(last) < 10 * 60000;
    const backupLine = backedUpNow
      ? `<div class="imp-backup done">${icon('checkc', 18)}<span class="row-main">Backed up just now.</span></div>`
      : `<div class="imp-backup">${icon('shield', 18)}<span class="row-main">Back up first? ${last ? `Last backup ${new Date(last).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}.` : 'You haven’t backed up yet.'}</span>
          <button type="button" class="link-btn" id="imp-backup">Back Up</button></div>`;
    return {
      body: `<section class="card">
          <span class="imp-label">Ready to add</span>
          <div class="imp-total"><strong>${fmtBig(hours)}</strong><span>Hours across ${plural(rv.rows.length, 'entry', 'entries')}${range}</span></div>
          ${catRows ? `<div class="imp-cats">${catRows}</div>` : '<p class="empty">Nothing new to add. Everything here is already in the app or was left out.</p>'}
        </section>
        ${issues.length ? `<section class="card"><h2 class="imp-h2">Worth a Look</h2><div class="imp-issues">${issues.join('')}</div></section>` : ''}`,
      pre: backupLine,
      next: rv.rows.length ? `Import ${plural(rv.rows.length, 'Entry', 'Entries')}` : '',
    };
  }

  function renderImportDone() {
    const r = imp.result;
    return {
      body: `<section class="card imp-done">
        <span class="modal-icon good">${icon('checkc', 32)}</span>
        <h2>Hours Imported</h2>
        <div class="welcome-lines">
          <span>${plural(r.count, 'entry', 'entries')}, ${fmtBig(r.hours)} hrs, added to your history.</span>
          ${r.skipped ? `<span>${plural(r.skipped, 'row was', 'rows were')} skipped.</span>` : ''}
          <span>Changed your mind? Undo removes only this import.</span>
        </div>
        <div class="split-actions">
          <button type="button" class="btn btn-outline" id="imp-undo"><span data-icon="undo"></span>Undo</button>
          <button type="button" class="btn btn-primary" id="imp-history">View History</button>
        </div>
        <p class="hint center">You can also undo it later from Reports › Backup › Past Imports.</p>
      </section>`,
      next: '',
    };
  }

  function renderImport() {
    if (!imp) return;
    const step = IMPORT_STEPS.indexOf(imp.step);
    const names = ['Sheets', 'Columns', 'Review'];
    $('#imp-title').textContent = imp.step === 'paste' ? 'Paste Rows' : imp.step === 'done' ? 'Import Hours' : 'Import Hours';
    $('#imp-sub').textContent = step >= 0 ? `Step ${step + 1} of 3 · ${names[step]}` : imp.step === 'paste' ? 'From Excel, Numbers or Google Sheets' : 'Finished';
    $('#imp-progress').hidden = step < 0;
    $('#imp-back').style.visibility = imp.step === 'done' ? 'hidden' : '';
    $$('#imp-progress span').forEach((s, i) => s.classList.toggle('on', i <= step));
    const view = { paste: renderImportPaste, sheets: renderImportSheets, columns: renderImportColumns, review: renderImportReview, done: renderImportDone }[imp.step]();
    $('#imp-body').innerHTML = view.body;
    fillIcons($('#imp-body'));
    $('#imp-foot').hidden = !view.next;
    $('#imp-pre').innerHTML = view.pre || '';
    $('#imp-next').textContent = view.next || '';
    $('#imp-error').hidden = true;
    if (imp.step === 'paste') updatePasteStatus();
  }

  // ----- Saving and undoing
  function commitImport() {
    const rv = computeReview();
    if (!rv.rows.length) return;
    const id = uid(), now = new Date().toISOString();
    const catsBefore = new Set(state.categories.map((c) => c.name));
    const locKey = (c, l) => c + '::' + l.toLowerCase();
    const locsBefore = new Set(Object.entries(state.customLocations).flatMap(([c, list]) => (list || []).map((l) => locKey(c, l))));
    const entries = rv.rows.map((r) => {
      ensureCategory(r.category);
      return {
        id: uid(),
        category: r.category,
        location: addLocation(r.category, r.location),
        start: r.start.toISOString(),
        end: r.end.toISOString(),
        notes: r.notes || '',
        source: 'import',
        importId: id,
        ...(r.unknown ? { timesUnknown: true } : {}),
        createdAt: now,
        updatedAt: now,
      };
    });
    state.entries.push(...entries);
    if (!saveEntries()) {
      state.entries = state.entries.filter((e) => e.importId !== id);
      return;
    }
    const hours = sumHours(entries);
    state.imports.unshift({
      id,
      name: imp.source,
      at: now,
      count: entries.length,
      hours: Math.round(hours * 100) / 100,
      categories: state.categories.map((c) => c.name).filter((n) => !catsBefore.has(n)),
      locations: Object.entries(state.customLocations).flatMap(([c, list]) => (list || []).filter((l) => !locsBefore.has(locKey(c, l))).map((l) => [c, l])),
    });
    saveImports();
    addFormReady = false;
    const skipped = rv.dups.length + rv.errors.length + (imp.overlap === 'leave' ? rv.overlaps.length : 0);
    imp.result = { id, count: entries.length, hours, skipped };
    imp.step = 'done';
    render();
    renderImport();
    $('#import-sheet').scrollTop = 0;
  }

  async function undoImport(id) {
    const rec = state.imports.find((x) => x.id === id);
    if (!rec) return;
    const list = state.entries.filter((e) => e.importId === id);
    const edited = list.filter((e) => e.updatedAt !== e.createdAt).length;
    const r = await ask({
      title: 'Undo This Import?',
      message: `This removes the ${plural(list.length, 'entry', 'entries')} (${fmtHours(sumHours(list))} hrs) ${rec.name === 'Pasted rows' ? 'when you pasted rows' : `from ${rec.name}`}.` +
        (edited ? ` ${edited} of them ${edited === 1 ? 'was' : 'were'} edited since.` : '') + ' Everything else stays.',
      iconName: 'undo',
      buttons: [
        { label: 'Keep Import', value: 'keep', style: 'navy' },
        { label: 'Undo Import', value: 'undo', style: 'danger-outline' },
      ],
    });
    if (r !== 'undo') return;
    state.entries = state.entries.filter((e) => e.importId !== id);
    // Remove locations and categories the import created, unless something else now uses them
    for (const [cat, loc] of rec.locations || []) {
      if (state.entries.some((e) => e.category === cat && sameText(e.location, loc))) continue;
      state.customLocations[cat] = (state.customLocations[cat] || []).filter((l) => !sameText(l, loc));
      if (!state.customLocations[cat].length) delete state.customLocations[cat];
    }
    for (const name of rec.categories || []) {
      if (!state.entries.some((e) => e.category === name)) state.categories = state.categories.filter((c) => c.name !== name);
    }
    if (!visibleCategories().length) state.categories = DEFAULT_CATEGORIES.map((c) => ({ ...c }));
    state.imports = state.imports.filter((x) => x !== rec);
    saveEntries();
    saveLocations();
    saveCategories();
    saveImports();
    addFormReady = false;
    if ($('#import-sheet').open) $('#import-sheet').close();
    render();
    toast(`Import undone. ${plural(list.length, 'entry', 'entries')} removed.`);
  }

  function renderPastImports() {
    $('#imp-past-card').hidden = !state.imports.length;
    $('#imp-past').innerHTML = state.imports.map((x) => {
      const left = state.entries.filter((e) => e.importId === x.id);
      return `<div class="imp-past-row"><span class="row-main"><span class="row-title">${esc(x.name)}</span>
        <span class="row-sub">${new Date(x.at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })} · ${plural(left.length, 'entry', 'entries')} · ${fmtBig(sumHours(left))} hrs</span></span>
        <button type="button" class="pill-btn" data-undo-import="${esc(x.id)}">${icon('undo', 16)}Undo</button></div>`;
    }).join('');
  }

  async function downloadTemplate() {
    const ok = await saveFile('hours-import-template.csv', IM.template(), 'text/csv');
    if (ok) toast('Template saved. Fill it in, then import it here.');
  }

  function setupImport() {
    const dlg = $('#import-sheet');
    $('#imp-close').addEventListener('click', () => dlg.close());
    $('#imp-back').addEventListener('click', importBack);
    $('#imp-next').addEventListener('click', importNext);
    // The close event arrives late, so only forget the import if the sheet didn't reopen in the meantime
    dlg.addEventListener('close', () => {
      if (!dlg.open) imp = null;
    });
    $('#imp-file').addEventListener('change', async (e) => {
      const file = e.target.files[0];
      e.target.value = '';
      if (file) await importFile(file);
    });
    $('#imp-paste-open').addEventListener('click', () => openImport('paste', 'Pasted rows'));
    $('#imp-template').addEventListener('click', downloadTemplate);
    $('#imp-past').addEventListener('click', (e) => {
      const b = e.target.closest('[data-undo-import]');
      if (b) undoImport(b.dataset.undoImport);
    });
    const body = $('#imp-body');
    body.addEventListener('input', (e) => {
      if (e.target.id === 'imp-paste') {
        imp.pasteText = e.target.value;
        updatePasteStatus();
      }
      if (e.target.matches('[data-fallback]')) activeTables()[imp.col].fallbackLoc = e.target.value;
    });
    body.addEventListener('change', (e) => {
      const sel = e.target;
      if (sel.matches('[data-sheet]')) {
        const t = imp.tables[Number(sel.dataset.sheet)];
        if (sel.value === NEW_CAT) {
          sel.value = t.category;
          imp.pendingCat = Number(sel.dataset.sheet);
          imp.catsBefore = state.categories.map((c) => c.name);
          openCategoryEditor(null);
          return;
        }
        t.category = sel.value;
        renderImport();
      }
      if (sel.matches('[data-field]')) {
        activeTables()[imp.col].map[sel.dataset.field] = Number(sel.value);
        renderImport();
      }
    });
    body.addEventListener('click', async (e) => {
      const chip = e.target.closest('[data-col]');
      if (chip) {
        imp.col = Number(chip.dataset.col);
        renderImport();
      }
      const merge = e.target.closest('[data-merge]');
      if (merge) {
        imp.suggestions[Number(merge.dataset.merge)].choice = merge.dataset.value;
        renderImport();
      }
      const ov = e.target.closest('[data-overlap]');
      if (ov) {
        imp.overlap = ov.dataset.value;
        renderImport();
      }
      const show = e.target.closest('[data-show]');
      if (show) {
        imp.show[show.dataset.show] = !imp.show[show.dataset.show];
        renderImport();
      }
      if (e.target.closest('#imp-undo')) undoImport(imp.result.id);
      if (e.target.closest('#imp-history')) {
        dlg.close();
        showView('history');
      }
    });
    $('#imp-pre').addEventListener('click', async (e) => {
      if (!e.target.closest('#imp-backup')) return;
      await backup();
      renderImport();
    });
    // Returning from "New Category…" picks the category that was just made
    $('#cat-sheet').addEventListener('close', () => {
      if (imp?.pendingCat == null) return;
      const made = state.categories.find((c) => !imp.catsBefore.includes(c.name));
      if (made) imp.tables[imp.pendingCat].category = made.name;
      imp.pendingCat = null;
      renderImport();
    });
  }

  // ---------- Reports tab ----------
  let reportSeg = 'summary';
  let reportYear = 'all';

  function renderData() {
    for (const b of $$('#report-seg button')) b.setAttribute('aria-pressed', String(b.dataset.seg === reportSeg));
    $('#rep-summary').hidden = reportSeg !== 'summary';
    $('#rep-export').hidden = reportSeg !== 'export';
    $('#rep-backup').hidden = reportSeg !== 'backup';
    renderSummary();
    renderExportPanel();
    renderBackupPanel();
    renderSavedLocations();
  }

  function renderExportPanel() {
    // Hours per category for the chosen dates, shown beside each checkbox
    const from = $('#x-from').value, to = $('#x-to').value;
    const inRange = shownEntries().filter((e) => {
      const d = toDateInput(new Date(e.start));
      return (!from || d >= from) && (!to || d <= to);
    });
    const picked = exportSelected();
    $('#x-cats').innerHTML = visibleCategories().map((c) => {
      const on = picked.includes(c);
      const hrs = sumHours(inRange.filter((e) => e.category === c));
      return `<button type="button" class="check-row ${catClass(c)}" role="checkbox" aria-checked="${on}" data-cat="${esc(c)}">
        ${badge(c, 'sm', 16)}<span class="row-main">${esc(c)}</span><span class="check-hrs">${fmtHours(hrs)} hrs</span>
        <span class="check-box">${on ? icon('check', 16) : ''}</span></button>`;
    }).join('');
    const all = picked.length === visibleCategories().length;
    $('#x-toggle-all').textContent = all ? 'Clear All' : 'Select All';

    const { list, error } = entriesInRange();
    const preview = $('#x-preview');
    if (error) {
      preview.innerHTML = `<p class="form-error">${esc(error)}</p>`;
      $('#x-hours').textContent = '0.00';
      $('#x-count').textContent = '';
    } else {
      const rows = exportRows(list.slice(-3));
      preview.innerHTML = `<div class="preview-row head"><span>Date</span><span>Location</span><span>Begin</span><span>End</span><span>Hrs</span></div>` +
        (rows.length ? rows.map((r) => `<div class="preview-row">${r.map((v) => `<span>${esc(v)}</span>`).join('')}</div>`).join('')
          : '<p class="empty">No entries match.</p>');
      $('#x-hours').textContent = fmtHours(sumHours(list));
      $('#x-count').textContent = `Hours in ${plural(list.length, 'entry', 'entries')}`;
    }

  }

  function renderBackupPanel() {
    const last = state.prefs.lastBackupAt;
    $('#last-backup').className = last ? 'good-pill' : 'danger-pill';
    $('#last-backup').textContent = last
      ? `${new Date(last).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}, ${fmtTime(new Date(last))}`
      : 'Not backed up yet';

    renderPastImports();
    $('#storage-note').textContent =
      `${plural(state.entries.length, 'entry', 'entries')} saved on this device. Back up regularly.`;
  }

  function renderSavedLocations() {
    const rows = [];
    for (const [cat, locs] of Object.entries(state.customLocations)) {
      for (const l of locs || []) rows.push({ cat, l });
    }
    $('#loc-count').textContent = `${rows.length} saved`;
    $('#custom-locations').innerHTML = rows.length
      ? rows.map((r) => `
          <div class="loc-row ${catClass(r.cat)}">${badge(r.cat, 'sm', 16)}
            <span class="row-main"><span>${esc(r.l)}</span><span class="row-sub">${esc(r.cat)}</span></span>
            <button type="button" class="remove-btn" data-remove-cat="${esc(r.cat)}" data-remove-loc="${esc(r.l)}" aria-label="Remove ${esc(r.l)}">Remove</button>
          </div>`).join('')
      : '<p class="empty">None yet. Add one when you clock in, or restore a backup that has your locations.</p>';

  }

  // ----- Years (the user picks which months a year covers, August through July by default)
  const yearStart = () => state.prefs.yearStart ?? 7;
  const yearEnd = () => state.prefs.yearEnd ?? 6;
  function yearLabel(d) {
    const m = d.getMonth(), y = d.getFullYear(), a = yearStart(), b = yearEnd();
    if (a <= b) return m >= a && m <= b ? String(y) : null;
    if (m >= a) return `${y}-${pad((y + 1) % 100)}`;
    if (m <= b) return `${y - 1}-${pad(y % 100)}`;
    return null; // a month the user left out, like a summer break
  }
  const inReportYear = (e) => reportYear === 'all' || yearLabel(new Date(e.start)) === reportYear;
  const reportRangeLabel = () => reportYear === 'all' ? 'All time' : `${reportYear} year (${MONTHS[yearStart()].slice(0, 3)}-${MONTHS[yearEnd()].slice(0, 3)})`;
  const fmtBig = (h) => (Math.round(h * 100) / 100).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const fmtMonthYear = (d) => d.toLocaleDateString(undefined, { month: 'short', year: 'numeric' });
  const locKey = (cat, loc) => `${cat}::${loc}`;
  const detailsMissing = (d) => !d || !d.contactName || !d.contactEmail;

  // Groups entries by category and location, biggest first
  function groupLocations(list) {
    const map = new Map();
    for (const e of list) {
      const k = locKey(e.category, e.location);
      const g = map.get(k) || { key: k, category: e.category, location: e.location, hours: 0, count: 0, first: null, last: null, entries: [] };
      const s = new Date(e.start);
      g.hours += hoursOf(e);
      g.count++;
      if (!g.first || s < g.first) g.first = s;
      if (!g.last || s > g.last) g.last = s;
      g.entries.push(e);
      map.set(k, g);
    }
    return [...map.values()].sort((a, b) => b.hours - a.hours);
  }

  function renderSummary() {
    // Year choices come from the data
    const labels = [...new Set(shownEntries().map((e) => yearLabel(new Date(e.start))).filter(Boolean))].sort().reverse();
    if (reportYear !== 'all' && !labels.includes(reportYear)) reportYear = 'all';
    $('#r-year').innerHTML = `<option value="all">All Time</option>` + labels.map((l) => `<option value="${l}">${l}</option>`).join('');
    $('#r-year').value = reportYear;
    $('#r-year-start').innerHTML = MONTHS.map((m, i) => `<option value="${i}">${m}</option>`).join('');
    $('#r-year-end').innerHTML = $('#r-year-start').innerHTML;
    $('#r-year-start').value = String(yearStart());
    $('#r-year-end').value = String(yearEnd());

    const list = shownEntries().filter(inReportYear);
    const groups = groupLocations(list);
    $('#r-total').textContent = fmtBig(sumHours(list));
    $('#r-count').textContent = `Hours across ${plural(list.length, 'entry', 'entries')} at ${plural(groups.length, 'location', 'locations')}`;
    const byCat = {};
    for (const e of list) byCat[e.category] = (byCat[e.category] || 0) + hoursOf(e);
    $('#r-cats').innerHTML = visibleCategories().map((c) => `<div class="${catClass(c)}"><i></i>${esc(c)}<b>${fmtBig(byCat[c] || 0)}</b></div>`).join('');

    $('#r-loc-count').textContent = plural(groups.length, 'location', 'locations');
    $('#r-locations').innerHTML = groups.length ? groups.map((g) => `
      <button type="button" class="row loc-summary ${catClass(g.category)}" data-loc="${esc(g.key)}">
        ${badge(g.category, 'lg', 20)}
        <span class="row-main">
          <span class="row-title">${esc(g.location)}</span>
          <span class="row-sub">${fmtMonthYear(g.first)} - ${fmtMonthYear(g.last)}</span>
          <span class="row-sub">${plural(g.count, 'entry', 'entries')}</span>
          ${detailsMissing(state.locDetails[g.key]) ? '<span class="warn-pill">Add contact details</span>' : ''}
        </span>
        <span class="row-end"><strong>${fmtBig(g.hours)}</strong><span>hrs</span></span>
      </button>`).join('') : '<p class="empty">No entries in this range yet.</p>';

    renderTracks();
    $('#r-saved-count').textContent = String(state.reports.length);
    $('#r-saved').innerHTML = state.reports.length ? state.reports.map((r) => `
      <button type="button" class="row" data-report="${esc(r.id)}">
        <span class="report-icon">${icon('report', 18)}</span>
        <span class="row-main"><span class="row-title">${esc(r.title)}</span><span class="row-sub">${esc(fmtShortDate(r.createdAt))} · ${esc(r.range)}</span></span>
        <span class="row-end"><strong>${fmtBig(r.totalHours)}</strong><span>hrs</span></span>
      </button>`).join('') : '<p class="empty">Reports you create are saved here.</p>';
  }
  const fmtShortDate = (iso) => new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });

  // ----- Location page
  function openLocation(key) {
    const all = shownEntries().filter((e) => locKey(e.category, e.location) === key);
    const g = groupLocations(all)[0];
    if (!g) return;
    const d = state.locDetails[key] || {};
    const form = $('#loc-form');
    form.dataset.key = key;
    $('#loc-title').textContent = g.location;
    $('#loc-sub').textContent = g.category;
    $('#loc-stats').innerHTML = `
      <div class="big-stat stacked"><span class="big-num">${fmtBig(g.hours)}</span><span class="big-label">Hours across ${plural(g.count, 'entry', 'entries')}</span></div>
      <div class="stat-pair"><div><span>First shift</span><b>${fmtShortDate(g.first)}</b></div><div><span>Most recent</span><b>${fmtShortDate(g.last)}</b></div></div>`;
    const f = form.elements;
    f.experienceType.innerHTML = `<option value="">Choose a type</option>` + EXPERIENCE_TYPES.map((t) => `<option>${esc(t)}</option>`).join('');
    for (const n of ['organization', 'experienceType', 'contactName', 'contactTitle', 'contactEmail', 'contactPhone', 'city', 'description']) f[n].value = d[n] || '';
    updateLocMissing();
    const hl = g.entries.filter((e) => e.highlight).sort(byStartDesc);
    $('#loc-highlights').innerHTML = `<div class="card-head"><span class="card-icon">${icon('star', 18)}</span><h2>Highlights</h2><span class="soft-pill">${hl.length}</span></div>` +
      (hl.length ? hl.map((e) => `<div class="hl-item"><span>${icon('starfill', 16)}</span><span><small>${fmtShortDate(e.start)}</small><p>${esc(e.notes || 'No note')}</p></span></div>`).join('')
        : '<p class="empty">Turn on Highlight when you add a note, and those shifts show up here.</p>');
    $('#loc-sheet').showModal();
    $('#loc-sheet').scrollTop = 0;
    $('[data-close]', $('#loc-sheet')).focus();
  }

  function updateLocMissing() {
    const f = $('#loc-form').elements;
    const missing = !f.contactName.value.trim() || !f.contactEmail.value.trim();
    $('#loc-missing').innerHTML = missing ? '<span class="warn-pill">Add contact details</span>' : '';
    $('#loc-chars').textContent = `${f.description.value.length} / 700 characters`;
  }

  function saveLocation(ev) {
    ev.preventDefault();
    const form = ev.target;
    const f = form.elements;
    const d = {};
    for (const n of ['organization', 'experienceType', 'contactName', 'contactTitle', 'contactEmail', 'contactPhone', 'city', 'description']) {
      const v = f[n].value.trim();
      if (v) d[n] = v;
    }
    if (Object.keys(d).length) state.locDetails[form.dataset.key] = { ...d, updatedAt: new Date().toISOString() };
    else delete state.locDetails[form.dataset.key];
    saveLocDetails();
    $('#loc-sheet').close();
    renderData();
    toast('Details saved');
  }

  // ----- Pre-Health Track (Beta): shapes the Application Packet like a typical application for that path (not an official format)
  const TRACKS = [
    { id: 'general', name: 'General', service: '', hint: 'A simple packet with every location. Pick a track for a layout that follows an application.' },
    { id: 'med', name: 'Pre-Med', service: 'Med School', hint: 'Numbered experiences, oldest first, laid out like a typical medical school application, with a 700 character description count.' },
    { id: 'pa', name: 'Pre-PA', service: 'PA Program', hint: 'Experiences grouped by category with totals and average hours per week, laid out like a typical PA program application.' },
  ];
  const currentTrack = () => TRACKS.find((t) => t.id === state.prefs.track) || TRACKS[0];

  function renderTracks() {
    const cur = currentTrack();
    $('#track-grid').innerHTML = TRACKS.map((t) => `
      <button type="button" class="track-opt" role="radio" aria-checked="${t.id === cur.id}" data-track-id="${t.id}">
        <strong>${esc(t.name)}</strong><span>${esc(t.service || 'Any')}</span></button>`).join('');
    $('#track-hint').textContent = cur.hint;
    $('#r-track-note').textContent = cur.id === 'general' ? 'Choose a Pre-Health Track in Settings to match the packet to your application.'
      : `Packets use the ${cur.name} layout. Change this in Settings.`;
  }

  function setTrack(id) {
    state.prefs.track = id;
    savePrefs();
    renderTracks();
  }

  // ----- Reports (Application Packet and Hours Summary)
  function reportShell(title, list, groups, inner) {
    return `<h1>${esc(title)}</h1>
      <p class="meta">Created ${fmtShortDate(new Date())} · ${esc(reportRangeLabel())}</p>
      <p class="total">${fmtBig(sumHours(list))} hours</p>
      <p class="meta">${plural(list.length, 'entry', 'entries')} at ${plural(groups.length, 'location', 'locations')}</p>
      ${inner}
      <footer>Created with Clinical Hours</footer>`;
  }

  function buildSummary(list, groups) {
    const byCat = new Map();
    for (const e of list) {
      const c = byCat.get(e.category) || { hours: 0, count: 0 };
      c.hours += hoursOf(e);
      c.count++;
      byCat.set(e.category, c);
    }
    const cats = [...byCat.entries()].sort((a, b) => b[1].hours - a[1].hours);
    return reportShell('Experience Hours Summary', list, groups, `
      <h2>By Category</h2>
      <table><tr><th>Category</th><th>Entries</th><th>Hours</th></tr>
      ${cats.map(([c, v]) => `<tr><td>${esc(c)}</td><td>${v.count}</td><td>${fmtBig(v.hours)}</td></tr>`).join('')}</table>
      <h2>By Location</h2>
      <table><tr><th>Location</th><th>Dates</th><th>Hours</th></tr>
      ${groups.map((g) => `<tr><td>${esc(g.location)}<br><span class="meta">${esc(g.category)}</span></td><td>${fmtMonthYear(g.first)} - ${fmtMonthYear(g.last)}</td><td>${fmtBig(g.hours)}</td></tr>`).join('')}</table>`);
  }

  const packetRow = (label, value) => value ? `<dt>${label}</dt><dd>${esc(value)}</dd>` : '';
  const packetHighlights = (g) => {
    const hl = g.entries.filter((e) => e.highlight).sort(byStartDesc);
    return hl.length ? `<p><strong>Highlights</strong></p>${hl.map((e) => `<blockquote>${fmtShortDate(e.start)}: ${esc(e.notes || 'No note')}</blockquote>`).join('')}` : '';
  };
  const contactOf = (d) => [d.contactName, d.contactTitle].filter(Boolean).join(', ');
  const datesOf = (g) => `${fmtMonthYear(g.first)} - ${fmtMonthYear(g.last)}`;
  const weeksOf = (g) => Math.max(1, Math.ceil((g.last - g.first) / (7 * 86400000)));

  function generalBlock(g) {
    const d = state.locDetails[g.key] || {};
    return `<div class="loc-block">
      <h3>${esc(d.organization || g.location)}</h3>
      <dl>
        ${d.organization ? packetRow('Location', g.location) : ''}
        ${packetRow('Category', g.category)}
        ${packetRow('Experience type', d.experienceType)}
        ${packetRow('Dates', datesOf(g))}
        ${packetRow('Total hours', `${fmtBig(g.hours)} (${plural(g.count, 'entry', 'entries')})`)}
        ${packetRow('Contact', contactOf(d))}
        ${packetRow('Email', d.contactEmail)}
        ${packetRow('Phone', d.contactPhone)}
        ${packetRow('City', d.city)}
      </dl>
      ${d.description ? `<p><strong>Description</strong><br>${esc(d.description)}</p>` : ''}
      ${packetHighlights(g)}
    </div>`;
  }

  // Pre-Med layout: numbered entries with the fields a medical school application typically asks for
  function medBlock(g, i) {
    const d = state.locDetails[g.key] || {};
    return `<div class="loc-block">
      <h3>${i + 1}. ${esc(d.organization || g.location)}</h3>
      <dl>
        ${packetRow('Experience Type', d.experienceType || g.category)}
        ${packetRow('Experience Name', g.location)}
        ${packetRow('Organization', d.organization)}
        ${packetRow('Start / End Date', datesOf(g))}
        ${packetRow('Total Hours', fmtBig(g.hours))}
        ${packetRow('Contact Name', d.contactName)}
        ${packetRow('Contact Title', d.contactTitle)}
        ${packetRow('Contact Email', d.contactEmail)}
        ${packetRow('Contact Phone', d.contactPhone)}
        ${packetRow('City', d.city)}
      </dl>
      ${d.description ? `<p><strong>Experience Description</strong> (${d.description.length} / 700 characters)<br>${esc(d.description)}</p>` : ''}
      ${packetHighlights(g)}
    </div>`;
  }

  // Pre-PA layout: experiences grouped by category, each with total and average weekly hours
  function paBlock(g) {
    const d = state.locDetails[g.key] || {};
    return `<div class="loc-block">
      <h3>${esc(d.organization || g.location)}</h3>
      <dl>
        ${packetRow('Experience Type', d.experienceType)}
        ${packetRow('Location', d.organization ? g.location : '')}
        ${packetRow('Start / End Date', datesOf(g))}
        ${packetRow('Total Hours', fmtBig(g.hours))}
        ${packetRow('Average Hours per Week', fmtHours(g.hours / weeksOf(g)))}
        ${packetRow('Contact', contactOf(d))}
        ${packetRow('Email', d.contactEmail)}
        ${packetRow('Phone', d.contactPhone)}
        ${packetRow('City', d.city)}
      </dl>
      ${d.description ? `<p><strong>Description</strong><br>${esc(d.description)}</p>` : ''}
      ${packetHighlights(g)}
    </div>`;
  }

  function buildPacket(list, groups) {
    const track = currentTrack();
    if (track.id === 'med') {
      const ordered = [...groups].sort((a, b) => a.first - b.first);
      return reportShell('Experiences (Pre-Med Layout)', list, groups, ordered.map(medBlock).join(''));
    }
    if (track.id === 'pa') {
      const sections = visibleCategories().map((c) => {
        const gs = groups.filter((g) => g.category === c);
        if (!gs.length) return '';
        const hours = gs.reduce((n, g) => n + g.hours, 0);
        return `<h2>${esc(c)} · ${fmtBig(hours)} hours</h2>${gs.map(paBlock).join('')}`;
      }).join('');
      return reportShell('Experiences (Pre-PA Layout)', list, groups, sections);
    }
    return reportShell('Application Packet', list, groups, groups.map(generalBlock).join(''));
  }

  function createReport(type) {
    const list = shownEntries().filter(inReportYear);
    if (!list.length) return toast('There are no entries in this range yet');
    const groups = groupLocations(list);
    const record = {
      id: uid(),
      type,
      title: type === 'packet' ? ({ med: 'Experiences (Pre-Med Layout)', pa: 'Experiences (Pre-PA Layout)' }[currentTrack().id] || 'Application Packet') : 'Hours Summary',
      createdAt: new Date().toISOString(),
      range: reportRangeLabel(),
      totalHours: sumHours(list),
      entryCount: list.length,
      html: type === 'packet' ? buildPacket(list, groups) : buildSummary(list, groups),
    };
    state.reports.unshift(record);
    state.reports = state.reports.slice(0, MAX_SAVED_REPORTS);
    saveReports();
    renderData();
    openReport(record.id);
    if (type === 'packet' && currentTrack().id === 'med' && groups.length > 15) toast(`This packet lists ${groups.length} experiences. Many applications limit how many you can enter, so check yours.`);
  }

  function openReport(id) {
    const r = state.reports.find((x) => x.id === id);
    if (!r) return;
    $('#report-sheet').dataset.id = id;
    $('#report-title').textContent = r.title;
    $('#report-sub').textContent = `${fmtShortDate(r.createdAt)} · ${r.range}`;
    $('#report-body').innerHTML = r.html;
    $('#report-sheet').showModal();
    $('#report-sheet').scrollTop = 0;
  }

  function printReport() {
    const r = state.reports.find((x) => x.id === $('#report-sheet').dataset.id);
    if (!r) return;
    const root = $('#print-root');
    root.innerHTML = `<div class="report-paper">${r.html}</div>`;
    const title = document.title;
    // The page title becomes the PDF's file name
    document.title = `${r.title} ${toDateInput(new Date(r.createdAt))}`;
    // Restore the title when printing ends, or when the report closes if the phone never says printing ended
    const done = () => {
      document.title = title;
      window.removeEventListener('afterprint', done);
      $('#report-sheet').removeEventListener('close', done);
    };
    window.addEventListener('afterprint', done);
    $('#report-sheet').addEventListener('close', done);
    window.print();
  }

  async function deleteReport() {
    const id = $('#report-sheet').dataset.id;
    const r = await ask({
      title: 'Delete This Report?',
      message: 'Your entries are not affected. Only this saved snapshot is removed.',
      iconName: 'trash',
      tone: 'danger',
      buttons: [
        { label: 'Keep Report', value: 'keep', style: 'navy' },
        { label: 'Delete Report', value: 'delete', style: 'danger-outline' },
      ],
    });
    if (r !== 'delete') return;
    state.reports = state.reports.filter((x) => x.id !== id);
    saveReports();
    $('#report-sheet').close();
    renderData();
    toast('Report deleted');
  }

  async function removeCustomLocation(cat, loc) {
    const r = await ask({
      title: 'Remove Location?',
      message: `“${loc}” will no longer appear in the ${cat} list. Existing entries are not changed.`,
      iconName: 'pin',
      tone: 'danger',
      buttons: [
        { label: 'Keep Location', value: 'keep', style: 'navy' },
        { label: 'Remove', value: 'remove', style: 'danger-outline' },
      ],
    });
    if (r !== 'remove') return;
    state.customLocations[cat] = (state.customLocations[cat] || []).filter((l) => l !== loc);
    if (!state.customLocations[cat].length) delete state.customLocations[cat];
    saveLocations();
    addFormReady = false;
    render();
  }

  // ---------- Settings ----------
  function renderSettings() {
    const totals = {};
    for (const e of state.entries) totals[e.category] = (totals[e.category] || 0) + hoursOf(e);
    const onCount = visibleCategories().length;
    $('#settings-cats').innerHTML = state.categories.map(({ name, hidden }) => {
      const lastOn = !hidden && onCount === 1;
      const sub = lastOn ? 'At least one category stays on' : hidden ? `Hidden · ${fmtHours(totals[name] || 0)} hrs` : `${fmtHours(totals[name] || 0)} hours logged`;
      return `<div class="set-row ${catClass(name)}${hidden ? ' off' : ''}">${badge(name)}
        <span class="row-main"><span class="row-title">${esc(name)}</span><span class="row-sub">${sub}</span></span>
        <button type="button" class="edit-btn" data-edit-cat="${esc(name)}" aria-label="Edit ${esc(name)}">${icon('pencil', 18)}</button>
        <input type="checkbox" class="switch" role="switch" data-cat="${esc(name)}" aria-label="Show ${esc(name)}"${hidden ? '' : ' checked'}${lastOn ? ' disabled' : ''}>
      </div>`;
    }).join('');
  }

  // ---------- Category editor ----------
  let editingCat = null; // name of the category being edited, or null when adding one

  function openCategoryEditor(name) {
    const cat = name ? findCat(name) : null;
    editingCat = cat ? cat.name : null;
    const form = $('#cat-form');
    form.elements.name.value = cat ? cat.name : '';
    form.dataset.icon = cat ? cat.icon : CATEGORY_ICONS.find((i) => !state.categories.some((c) => c.icon === i)) || 'clipboard';
    form.dataset.shade = String(cat ? cat.shade : nextShade());
    form.elements.goal.value = cat && cat.goal ? cat.goal : '';
    $('#cat-sheet-title').textContent = cat ? 'Edit Category' : 'New Category';
    $('#cat-error').hidden = true;
    const count = cat ? state.entries.filter((e) => e.category === cat.name).length : 0;
    $('#cat-delete').hidden = !cat || count > 0;
    $('#cat-delete-note').hidden = !cat || count === 0;
    $('#cat-delete-note').textContent = `This category has ${plural(count, 'entry', 'entries')}, so it can't be deleted. Switch it off to hide it instead.`;
    renderCategoryEditor();
    $('#cat-sheet').showModal();
    if (!cat) form.elements.name.focus();
  }

  function renderCategoryEditor() {
    const form = $('#cat-form');
    const iconName = form.dataset.icon, shade = Number(form.dataset.shade);
    $('#cat-preview').className = `shade-${shade}`;
    $('#cat-preview').innerHTML = `<span class="badge lg">${icon(iconName, 24)}</span>`;
    $('#cat-icons').innerHTML = CATEGORY_ICONS.map((i) => `
      <button type="button" class="icon-opt shade-${shade}" role="radio" aria-checked="${i === iconName}" data-pick-icon="${i}" aria-label="${i} icon">${icon(i, 22)}</button>`).join('');
    $('#cat-shades').innerHTML = SHADES.map((n) => `
      <button type="button" class="shade-opt shade-${n}" role="radio" aria-checked="${n === shade}" data-pick-shade="${n}" aria-label="Color ${n}">${n === shade ? icon('check', 18) : ''}</button>`).join('');
  }

  function renameCategory(from, to) {
    for (const e of state.entries) if (e.category === from) e.category = to;
    if (state.customLocations[from]) {
      state.customLocations[to] = state.customLocations[from];
      delete state.customLocations[from];
    }
    if (state.prefs.lastLocation[from]) {
      state.prefs.lastLocation[to] = state.prefs.lastLocation[from];
      delete state.prefs.lastLocation[from];
    }
    if (state.prefs.lastCategory === from) state.prefs.lastCategory = to;
    for (const k of Object.keys(state.locDetails)) {
      if (k.startsWith(`${from}::`)) {
        state.locDetails[`${to}::${k.slice(from.length + 2)}`] = state.locDetails[k];
        delete state.locDetails[k];
      }
    }
    saveLocDetails();
    if (state.active && state.active.category === from) state.active.category = to;
    if (filters.category === from) filters.category = to;
    if (exportSel && exportSel.has(from)) {
      exportSel.delete(from);
      exportSel.add(to);
    }
    saveEntries();
    saveLocations();
    savePrefs();
    saveActive();
  }

  function submitCategory(ev) {
    ev.preventDefault();
    const form = ev.target;
    const name = form.elements.name.value.trim().replace(/\s+/g, ' ');
    const err = $('#cat-error');
    const fail = (msg) => {
      err.textContent = msg;
      err.hidden = false;
    };
    if (!name) return fail('Give the category a name.');
    if (name.length > MAX_CATEGORY_NAME) return fail(`Keep the name under ${MAX_CATEGORY_NAME} characters.`);
    const clash = state.categories.find((c) => sameText(c.name, name) && c.name !== editingCat);
    if (clash) return fail(`You already have a category called ${clash.name}.`);
    const iconName = form.dataset.icon, shade = Number(form.dataset.shade);
    const goalText = form.elements.goal.value.trim();
    const goal = goalText ? Math.round(Number(goalText)) : 0;
    if (goalText && !(goal > 0 && goal <= 100000)) return fail('Enter a goal between 1 and 100,000 hours, or leave it blank.');
    if (editingCat) {
      const cat = findCat(editingCat);
      if (name !== cat.name) renameCategory(cat.name, name);
      Object.assign(cat, { name, icon: iconName, shade });
      if (goal) cat.goal = goal;
      else delete cat.goal;
    } else {
      state.categories.push({ name, icon: iconName, shade, ...(goal ? { goal } : {}) });
    }
    saveCategories();
    addFormReady = false;
    $('#cat-sheet').close();
    renderSettings();
    render();
    toast(editingCat ? 'Category updated' : `${name} added`);
  }

  async function deleteCategory() {
    const cat = findCat(editingCat);
    if (!cat || state.entries.some((e) => e.category === cat.name)) return;
    const r = await ask({
      title: `Delete ${cat.name}?`,
      message: 'It has no entries, so nothing else is removed.',
      iconName: 'trash',
      tone: 'danger',
      buttons: [
        { label: 'Keep Category', value: 'keep', style: 'navy' },
        { label: 'Delete Category', value: 'delete', style: 'danger-outline' },
      ],
    });
    if (r !== 'delete') return;
    state.categories = state.categories.filter((c) => c !== cat);
    delete state.customLocations[cat.name];
    saveCategories();
    saveLocations();
    addFormReady = false;
    $('#cat-sheet').close();
    renderSettings();
    render();
    toast(`${cat.name} deleted`);
  }

  const darkQuery = matchMedia('(prefers-color-scheme: dark)');
  const isDark = () => {
    const mode = state.prefs.appearance || 'light';
    return mode === 'dark' || (mode === 'system' && darkQuery.matches);
  };

  function applyTheme() {
    const root = document.documentElement;
    const theme = THEMES.find((t) => t.id === state.prefs.theme) || THEMES[0];
    if (theme.id === 'blue') delete root.dataset.theme;
    else root.dataset.theme = theme.id;
    if (isDark()) root.dataset.mode = 'dark';
    else delete root.dataset.mode;
    // Status bar color follows the page background
    $('meta[name="theme-color"]').setAttribute('content', getComputedStyle(root).getPropertyValue('--bg').trim() || theme.bg);
  }

  // Small preview pictures for Light, Dark and Match Phone
  function modeArt(kind) {
    const screen = (bg, card, bar) => `<rect width="64" height="44" rx="11" fill="${bg}"/><rect x="8" y="8" width="26" height="6" rx="3" fill="${bar}"/><rect x="8" y="18" width="48" height="18" rx="6" fill="${card}"/>`;
    const light = screen('#F2F4F7', '#FDFDFE', '#1F3D99'), dark = screen('#0B1220', '#1A2438', '#7C9CF0');
    const body = kind === 'light' ? light : kind === 'dark' ? dark
      : `<defs><clipPath id="mode-half"><polygon points="64,0 64,44 0,44"/></clipPath><clipPath id="mode-round"><rect width="64" height="44" rx="11"/></clipPath></defs><g clip-path="url(#mode-round)">${light}<g clip-path="url(#mode-half)">${dark}</g></g>`;
    return `<svg class="mode-art" width="64" height="44" viewBox="0 0 64 44" aria-hidden="true">${body}</svg>`;
  }

  function renderModes() {
    const current = state.prefs.appearance || 'light';
    $('#mode-grid').innerHTML = [['light', 'Light'], ['dark', 'Dark'], ['system', 'Match Phone']].map(([id, label]) => `
      <button type="button" class="mode-opt" role="radio" aria-checked="${id === current}" data-mode-id="${id}">${modeArt(id === 'system' ? 'match' : id)}${label}</button>`).join('');
  }

  function setAppearance(id) {
    state.prefs.appearance = id;
    savePrefs();
    applyTheme();
    renderModes();
  }

  // ---------- Quick Guide ----------
  const GUIDE = [
    ['Logging Hours', [
      ['clock', 'Clock in and out', ['Clock', 'Tap a category']],
      ['addcircle', 'Add a shift you forgot', ['Add']],
      ['repeat', 'Repeat a recent shift', ['Add', 'Repeat a Recent Shift']],
      ['star', 'Save a note or highlight', ['Clock Out', 'Anything memorable today?']],
    ]],
    ['Reviewing', [
      ['history', 'Edit or delete an entry', ['History', 'Tap the entry']],
      ['search', 'Search notes and locations', ['History', 'Search bar']],
      ['calendar', 'See hours by day and month', ['Calendar']],
    ]],
    ['Applications and Backups', [
      ['clipboard', 'Add application details', ['Reports', 'Summary', 'Tap a location']],
      ['report', 'Create an Application Packet or Hours Summary (Beta)', ['Reports', 'Summary', 'Create a Report']],
      ['export', 'Export a spreadsheet', ['Reports', 'Export']],
      ['shield', 'Back up or restore', ['Reports', 'Backup']],
      ['download', 'Import hours from a spreadsheet (Beta)', ['Reports', 'Backup', 'Import Hours']],
    ]],
    ['Personalizing', [
      ['palette', 'Change the color theme', ['Clock', 'Settings', 'Color Theme']],
      ['moon', 'Turn on dark mode', ['Clock', 'Settings', 'Appearance']],
      ['eye', 'Add, edit or hide categories', ['Clock', 'Settings', 'Categories']],
      ['cap', 'Choose your pre-health track (Beta)', ['Clock', 'Settings', 'Pre-Health Track']],
      ['star', 'Set an hour goal', ['Settings', 'Categories', 'Edit']],
    ]],
  ];

  function openGuide() {
    $('#guide-list').innerHTML = GUIDE.map(([title, rows]) => `
      <section class="card guide-section"><h2>${title}</h2>
        ${rows.map(([ic, text, path]) => `<div class="guide-row"><span>${icon(ic, 18)}</span>
          <span class="row-main"><span class="row-title">${text}</span><span class="guide-path">${path.map((p) => `<b>${p}</b>`).join('›')}</span></span></div>`).join('')}
      </section>`).join('');
    $('#guide-sheet').showModal();
    $('#guide-sheet').scrollTop = 0;
  }

  function renderThemes() {
    const current = state.prefs.theme || 'blue';
    $('#theme-grid').innerHTML = THEMES.map((t) => `
      <button type="button" class="theme-opt" role="radio" aria-checked="${t.id === current}" data-theme-id="${t.id}">
        <span class="swatch" style="background: ${t.swatch[1]}; color: ${t.check || '#FDFDFE'}">${t.id === current ? icon('check', 20) : ''}</span>${esc(t.name)}
      </button>`).join('');
  }

  function setTheme(id) {
    state.prefs.theme = id;
    savePrefs();
    applyTheme();
    renderThemes();
    render();
  }

  async function eraseAllData() {
    const r = await ask({
      title: 'Erase All Data?',
      message: `This permanently deletes ${plural(state.entries.length, 'entry', 'entries')}, your saved locations and your settings from this phone. Back up first if you might want them later.`,
      iconName: 'trash',
      tone: 'danger',
      buttons: [
        { label: 'Back Up First', value: 'backup', style: 'navy' },
        { label: 'Erase Everything', value: 'erase', style: 'danger-outline' },
        { label: 'Cancel', value: 'cancel', style: 'outline' },
      ],
    });
    if (r === 'backup') return backup();
    if (r !== 'erase') return;
    for (const key of Object.values(KEYS)) store.write(key, null);
    loadState();
    filters.category = filters.location = '';
    exportSel = null;
    addFormReady = false;
    applyTheme();
    $('#settings-sheet').close();
    showView('home');
    toast('All data erased');
  }

  function toggleCategory(name, on) {
    const cat = findCat(name);
    if (!cat) return;
    if (on) delete cat.hidden;
    else cat.hidden = true;
    saveCategories();
    if (!on && filters.category === name) filters.category = '';
    addFormReady = false;
    renderSettings();
    render();
  }

  // ---------- Wire up ----------
  function init() {
    loadState();
    applyTheme();
    fillIcons();

    $$('.tabbar button').forEach((b) => b.addEventListener('click', () => showView(b.dataset.view)));
    document.addEventListener('click', (e) => {
      const go = e.target.closest('[data-goto]');
      if (go) showView(go.dataset.goto);
      const row = e.target.closest('.row[data-id]');
      if (row) openEdit(row.dataset.id);
    });

    $('#cat-grid').addEventListener('click', (e) => {
      const btn = e.target.closest('.tile');
      if (btn) openClockIn(btn.dataset.cat);
    });
    $('#period-seg').addEventListener('click', (e) => {
      const btn = e.target.closest('button[data-period]');
      if (!btn) return;
      state.prefs.period = btn.dataset.period;
      savePrefs();
      renderGauge();
    });
    setupSheet($('#settings-sheet'));
    $('#btn-settings').addEventListener('click', () => {
      renderSettings();
      renderTracks();
      renderThemes();
      renderModes();
      $('#settings-sheet').showModal();
    });
    $('#settings-cats').addEventListener('change', (e) => {
      const sw = e.target.closest('.switch');
      if (sw) toggleCategory(sw.dataset.cat, sw.checked);
    });
    $('#theme-grid').addEventListener('click', (e) => {
      const opt = e.target.closest('[data-theme-id]');
      if (opt) setTheme(opt.dataset.themeId);
    });
    $('#track-grid').addEventListener('click', (e) => {
      const opt = e.target.closest('[data-track-id]');
      if (opt) setTrack(opt.dataset.trackId);
    });
    $('#btn-erase').addEventListener('click', eraseAllData);
    $('#settings-cats').addEventListener('click', (e) => {
      const btn = e.target.closest('[data-edit-cat]');
      if (btn) openCategoryEditor(btn.dataset.editCat);
    });
    $('#btn-add-cat').addEventListener('click', () => openCategoryEditor(null));
    setupSheet($('#cat-sheet'));
    $('#cat-form').addEventListener('submit', submitCategory);
    $('#cat-form').addEventListener('click', (e) => {
      const pickIcon = e.target.closest('[data-pick-icon]');
      const pickShade = e.target.closest('[data-pick-shade]');
      if (pickIcon) $('#cat-form').dataset.icon = pickIcon.dataset.pickIcon;
      if (pickShade) $('#cat-form').dataset.shade = pickShade.dataset.pickShade;
      if (pickIcon || pickShade) renderCategoryEditor();
    });
    $('#cat-delete').addEventListener('click', deleteCategory);
    $('#btn-clockout').addEventListener('click', clockOut);

    // Clock-out note
    $('#note-form').addEventListener('submit', saveNote);
    $('#note-skip').addEventListener('click', () => {
      const entry = state.entries.find((x) => x.id === $('#note-sheet').dataset.id);
      $('#note-sheet').close();
      if (entry) toast(`Logged ${fmtHours(hoursOf(entry))} hrs · ${entry.category}`);
    });
    // 24-hour check
    $('#long-form').addEventListener('submit', submitLong);
    $('#long-still').addEventListener('click', stillHere);
    for (const id of ['#long-date', '#long-time']) {
      $(id).addEventListener('input', updateLongPreview);
      $(id).addEventListener('change', updateLongPreview);
    }
    // First launch and monthly backup cards
    $('#welcome-dismiss').addEventListener('click', () => {
      state.prefs.welcomed = true;
      savePrefs();
      renderHome();
    });
    $('#welcome-guide').addEventListener('click', () => {
      state.prefs.welcomed = true;
      savePrefs();
      renderHome();
      openGuide();
    });
    $('#install-later').addEventListener('click', () => {
      state.prefs.installSnooze = new Date(Date.now() + 7 * 86400000).toISOString();
      savePrefs();
      renderHome();
    });
    $('#install-go').addEventListener('click', async () => {
      if (!installPrompt) return;
      installPrompt.prompt();
      await installPrompt.userChoice.catch(() => {});
      installPrompt = null;
      renderHome();
    });
    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      installPrompt = e;
      renderHome();
    });
    setupImport();
    $('#nudge-later').addEventListener('click', () => {
      state.prefs.nudgeDismissed = monthKey(new Date());
      savePrefs();
      renderHome();
    });
    $('#nudge-backup').addEventListener('click', async () => {
      await backup();
      renderHome();
    });
    // Add: repeat a recent shift
    $('#repeat-list').addEventListener('click', (e) => {
      const chip = e.target.closest('[data-repeat]');
      if (chip) repeatShift(chip.dataset.repeat);
    });
    // History: search and highlights
    $('#h-search').addEventListener('input', (e) => {
      filters.search = e.target.value;
      renderHistory();
    });
    // Reports
    $('#report-seg').addEventListener('click', (e) => {
      const b = e.target.closest('[data-seg]');
      if (!b) return;
      reportSeg = b.dataset.seg;
      renderData();
      window.scrollTo(0, 0);
    });
    $('#r-year').addEventListener('change', (e) => {
      reportYear = e.target.value;
      renderSummary();
    });
    $('#r-year-edit').addEventListener('click', () => {
      $('#r-year-months').hidden = !$('#r-year-months').hidden;
    });
    for (const [id, key] of [['#r-year-start', 'yearStart'], ['#r-year-end', 'yearEnd']]) {
      $(id).addEventListener('change', (e) => {
        state.prefs[key] = Number(e.target.value);
        savePrefs();
        reportYear = 'all';
        renderSummary();
      });
    }
    $('#r-locations').addEventListener('click', (e) => {
      const row = e.target.closest('[data-loc]');
      if (row) openLocation(row.dataset.loc);
    });
    setupSheet($('#loc-sheet'));
    $('#loc-form').addEventListener('submit', saveLocation);
    $('#loc-form').addEventListener('input', updateLocMissing);
    $('#make-packet').addEventListener('click', () => createReport('packet'));
    $('#make-summary').addEventListener('click', () => createReport('summary'));
    $('#r-saved').addEventListener('click', (e) => {
      const row = e.target.closest('[data-report]');
      if (row) openReport(row.dataset.report);
    });
    setupSheet($('#report-sheet'));
    $('#report-print').addEventListener('click', printReport);
    $('#report-delete').addEventListener('click', deleteReport);
    // Settings extras
    setupSheet($('#guide-sheet'));
    $('#open-guide').addEventListener('click', openGuide);
    $('#mode-grid').addEventListener('click', (e) => {
      const opt = e.target.closest('[data-mode-id]');
      if (opt) setAppearance(opt.dataset.modeId);
    });
    darkQuery.addEventListener?.('change', () => {
      if ((state.prefs.appearance || 'light') === 'system') applyTheme();
    });
    $('#btn-discard').addEventListener('click', discardActive);

    setupSheet($('#clockin-sheet'));
    $('#clockin-form').addEventListener('submit', submitClockIn);
    // Typing a new name clears the list choice; picking from the list clears the typed name
    $('#ci-new').addEventListener('input', (e) => {
      if (e.target.value.trim()) $$('input[name="ci-loc"]').forEach((r) => (r.checked = false));
    });
    $('#ci-locations').addEventListener('change', () => {
      $('#ci-new').value = '';
      $('#ci-error').hidden = true;
    });

    setupEntryForm($('#manual-form'));
    $('#manual-form').addEventListener('submit', submitManual);
    setupEntryForm($('#edit-form'));
    setupSheet($('#edit-sheet'));
    $('#edit-form').addEventListener('submit', submitEdit);
    $('#btn-delete').addEventListener('click', deleteEntry);

    $('#cal-prev').addEventListener('click', () => shiftMonth(-1));
    $('#cal-next').addEventListener('click', () => shiftMonth(1));
    $('#cal-today').addEventListener('click', () => {
      const t = new Date();
      cal.year = t.getFullYear();
      cal.month = t.getMonth();
      cal.selected = toDateInput(t);
      renderCalendar();
    });
    $('#cal-grid').addEventListener('click', (e) => {
      const day = e.target.closest('.day[data-date]');
      if (!day) return;
      cal.selected = day.dataset.date;
      renderCalendar();
    });

    $('#h-chips').addEventListener('click', (e) => {
      if (e.target.closest('[data-highlight]')) {
        filters.highlight = !filters.highlight;
        renderHistory();
        return;
      }
      const btn = e.target.closest('button[data-cat]');
      if (!btn) return;
      filters.category = btn.dataset.cat;
      filters.location = '';
      renderHistory();
    });
    $('#f-location').addEventListener('change', (e) => {
      filters.location = e.target.value;
      renderHistory();
    });

    $('#x-cats').addEventListener('click', (e) => {
      const row = e.target.closest('[data-cat]');
      if (!row) return;
      const next = new Set(exportSelected());
      if (next.has(row.dataset.cat)) next.delete(row.dataset.cat);
      else next.add(row.dataset.cat);
      exportSel = next.size === visibleCategories().length ? null : next;
      renderData();
    });
    $('#x-toggle-all').addEventListener('click', () => {
      exportSel = exportSelected().length === visibleCategories().length ? new Set() : null;
      renderData();
    });
    $('#x-from').addEventListener('change', renderData);
    $('#x-to').addEventListener('change', renderData);
    $('#btn-export').addEventListener('click', exportCsv);
    $('#btn-copy').addEventListener('click', copyRows);
    $('#btn-backup').addEventListener('click', backup);
    $('#restore-file').addEventListener('change', async (e) => {
      const file = e.target.files[0];
      e.target.value = '';
      if (file) await restoreFromFile(file);
    });
    $('#custom-locations').addEventListener('click', (e) => {
      const btn = e.target.closest('[data-remove-loc]');
      if (btn) removeCustomLocation(btn.dataset.removeCat, btn.dataset.removeLoc);
    });
    $('#update-banner').addEventListener('click', () => location.reload());

    // Refresh the timer right away when returning to the app
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden) renderHome();
    });
    // Keep multiple open tabs in sync
    window.addEventListener('storage', (e) => {
      if (e.key && e.key.startsWith('cht.')) {
        loadState();
        applyTheme();
        render();
      }
    });

    showView('home');

    // Ask the browser not to evict our data under storage pressure
    navigator.storage?.persist?.().catch(() => {});

    if ('serviceWorker' in navigator && location.protocol.startsWith('http')) {
      const hadController = !!navigator.serviceWorker.controller;
      // A new version took over: offer a reload instead of swapping the page mid-use
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        if (hadController) $('#update-banner').hidden = false;
      });
      navigator.serviceWorker.register('sw.js').then((reg) => {
        // Home-screen apps often resume instead of reloading, so check for updates on every return
        document.addEventListener('visibilitychange', () => {
          if (!document.hidden) reg.update().catch(() => {});
        });
      }).catch(() => {});
    }
  }

  init();
})();
