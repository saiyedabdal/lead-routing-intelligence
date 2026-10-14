/**
 * Frido store lead router
 *
 * Setup (one time):
 * 1. Create a Google Sheet -> Extensions -> Apps Script.
 *    Paste this file as Code.gs and add an HTML file named "Index".
 * 2. Run setup() once and allow access. It creates the "Leads" and "Setup" tabs.
 * 3. In the Setup tab, paste each store's WhatsApp group invite link
 *    next to the store name. Edit categories, team names and products there any time.
 * 4. Deploy -> New deployment -> Web app. Execute as: Me.
 *    Who has access: anyone in your Google org (or anyone with the link).
 *    Share the web app URL with the routing team.
 */

const LEADS_SHEET = 'Leads';
const SETUP_SHEET = 'Setup';

const LEAD_HEADERS = [
  'Lead ID', 'Submitted at', 'Store', 'Customer name', 'Customer number',
  'Products', 'Product category', 'Expected visit date', 'Expected visit time',
  'Discount offered', 'Remarks', 'Submitted by'
];

const DEFAULT_STORES = [
  'PMC, Vimannagar', 'Amanora Mall, Magarpatta', 'Amar Tech Park, Balewadi',
  'Elpro Mall, PCMC', 'Nexus Westend, Aundh', 'Kopa Mall, Ghorpadi, KP',
  'Mall of Asia', 'Lakeshore, Y junction', 'Sky City Mall, Borivali',
  'Gachibowli, Hyderabad', 'Banjara Hills', 'DLF Summit, Gurgaon',
  'Bhartiya Mall, Bangalore', 'Kompally, Hyderabad', 'Vegas Mall, Dwarka',
  'Lulu Mall, Bangalore', 'Golf Course Road, Gurgaon', 'Omaxe, Faridabad',
  'Felix, Gurgaon', 'PMC, Whitefield, Bangalore', 'M5 Bangalore',
  'Royal Meenakshi Mall, Bangalore', 'Elan Miracle, Gurgaon'
];

const DEFAULT_CATEGORIES = [
  'Footwear', 'Orthotics', 'Body Support', 'Mobility', 'Personal Care', 'Ergonomic Furniture'
];

const TIME_SLOTS = ['10am-12pm', '12pm-2pm', '2pm-4pm', '4pm-6pm', '6pm-8pm', '8pm-10pm'];

const SETUP_HEADERS = ['Store', 'WhatsApp group link', 'Product categories', 'Team members', 'Products'];

function setup() {
  const ss = SpreadsheetApp.getActive();

  const leads = ss.getSheetByName(LEADS_SHEET) || ss.insertSheet(LEADS_SHEET);
  if (leads.getLastRow() === 0) {
    leads.appendRow(LEAD_HEADERS);
    leads.getRange(1, 1, 1, LEAD_HEADERS.length)
      .setFontWeight('bold').setBackground('#FFD100').setFontColor('#101820');
    leads.setFrozenRows(1);
    leads.getRange('E:E').setNumberFormat('@');        // keep phone numbers as text
    leads.getRange('H:H').setNumberFormat('dd-mmm-yyyy');
    leads.getRange('I:I').setNumberFormat('@');        // time slots like 12pm-2pm
    leads.getRange('B:B').setNumberFormat('dd-mmm-yyyy hh:mm');
  }

  const existing = ss.getSheetByName(SETUP_SHEET);
  if (existing) {
    // Older Setup tabs have no Products column; add just the header, keep everything else
    if (!existing.getRange(1, 5).getDisplayValue().trim()) {
      existing.getRange(1, 5).setValue(SETUP_HEADERS[4])
        .setFontWeight('bold').setBackground('#101820').setFontColor('#FFFFFF');
      existing.setColumnWidth(5, 240);
    }
  } else {
    const s = ss.insertSheet(SETUP_SHEET);
    s.getRange(1, 1, 1, SETUP_HEADERS.length)
      .setValues([SETUP_HEADERS])
      .setFontWeight('bold').setBackground('#101820').setFontColor('#FFFFFF');
    s.getRange(2, 1, DEFAULT_STORES.length, 1).setValues(DEFAULT_STORES.map(v => [v]));
    s.getRange(2, 3, DEFAULT_CATEGORIES.length, 1).setValues(DEFAULT_CATEGORIES.map(v => [v]));
    s.setFrozenRows(1);
    s.setColumnWidth(1, 220);
    s.setColumnWidth(2, 340);
    s.setColumnWidth(3, 180);
    s.setColumnWidth(4, 180);
    s.setColumnWidth(5, 240);
  }
}

function doGet() {
  return HtmlService.createHtmlOutputFromFile('Index')
    .setTitle('Frido store lead')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1');
}

function readColumn_(sheet, col) {
  const last = sheet.getLastRow();
  if (last < 2) return [];
  return sheet.getRange(2, col, last - 1, 1).getDisplayValues()
    .map(r => r[0].trim()).filter(String);
}

function setupSheet_() {
  const s = SpreadsheetApp.getActive().getSheetByName(SETUP_SHEET);
  if (!s) throw new Error('The Setup tab is missing. Run setup() from the script editor.');
  return s;
}

function getConfig() {
  const s = setupSheet_();
  return {
    stores: readColumn_(s, 1),
    categories: readColumn_(s, 3),
    team: readColumn_(s, 4),
    products: readColumn_(s, 5),
    timeSlots: TIME_SLOTS
  };
}

function groupLinkFor_(store) {
  const s = setupSheet_();
  const last = s.getLastRow();
  if (last < 2) return null;
  const rows = s.getRange(2, 1, last - 1, 2).getDisplayValues();
  const row = rows.find(r => r[0].trim() === store);
  if (!row) throw new Error('"' + store + '" is not in the Setup tab.');
  return row[1].trim() || null;
}

// Stops values like "=..." being read as formulas in the sheet
function safe_(v) {
  const t = String(v == null ? '' : v).trim();
  return /^[=+\-@]/.test(t) ? "'" + t : t;
}

function cleanPhone_(p) {
  let d = String(p || '').replace(/\D/g, '');
  if (d.length === 12 && d.startsWith('91')) d = d.slice(2);
  if (d.length === 11 && d.startsWith('0')) d = d.slice(1);
  if (!/^[6-9]\d{9}$/.test(d)) throw new Error('Customer number should be a 10-digit Indian mobile number.');
  return d;
}

// Trims, drops blanks and duplicates, and checks each one against Setup column E
function cleanProducts_(list) {
  const picked = (Array.isArray(list) ? list : [list])
    .map(v => String(v == null ? '' : v).trim()).filter(String)
    .filter((v, i, all) => all.indexOf(v) === i);
  const known = readColumn_(setupSheet_(), 5);
  if (known.length) {
    const bad = picked.find(p => known.indexOf(p) < 0);
    if (bad) throw new Error('"' + bad + '" is not in the product list in the Setup tab.');
  }
  return picked;
}

function submitLead(f) {
  const required = {
    store: 'Store', name: 'Customer name', phone: 'Customer number',
    category: 'Product category', visitDate: 'Expected visit date',
    visitTime: 'Expected visit time', submittedBy: 'Submitted by'
  };
  Object.keys(required).forEach(k => {
    if (!String(f[k] || '').trim()) throw new Error(required[k] + ' is required.');
  });

  const phone = cleanPhone_(f.phone);
  if (TIME_SLOTS.indexOf(f.visitTime) < 0) throw new Error('Choose an expected visit time from the list.');
  const products = cleanProducts_(f.products);
  const groupLink = groupLinkFor_(f.store.trim());
  const [y, mo, d] = f.visitDate.split('-').map(Number);
  const visitDate = new Date(y, mo - 1, d);
  const tz = Session.getScriptTimeZone();

  const lock = LockService.getScriptLock();
  lock.waitLock(20000);
  let id;
  try {
    const sheet = SpreadsheetApp.getActive().getSheetByName(LEADS_SHEET);
    if (!sheet) throw new Error('The Leads tab is missing. Run setup() from the script editor.');
    id = 'L' + String(sheet.getLastRow()).padStart(4, '0');
    sheet.appendRow([
      id, new Date(), safe_(f.store), safe_(f.name), "'" + phone,
      safe_(products.join(', ')), safe_(f.category), visitDate, f.visitTime,
      safe_(f.discount), safe_(f.remarks), safe_(f.submittedBy)
    ]);
  } finally {
    lock.releaseLock();
  }

  const lines = [
    '*New lead for Frido ' + f.store.trim() + '*',
    '',
    'Customer name: ' + f.name.trim(),
    'Customer number: +91 ' + phone
  ];
  if (products.length) lines.push('Product: ' + products.join(', '));
  lines.push(
    'Product category: ' + f.category.trim(),
    'Visit date: ' + Utilities.formatDate(visitDate, tz, 'EEE, d MMM'),
    'Visit time: ' + f.visitTime,
    'Discount offered: ' + (String(f.discount || '').trim() || 'None')
  );
  if (String(f.remarks || '').trim()) lines.push('Remarks: ' + f.remarks.trim());
  lines.push('', 'Lead #' + id + ', sent by ' + f.submittedBy.trim());

  return { id: id, store: f.store.trim(), groupLink: groupLink, message: lines.join('\n') };
}
