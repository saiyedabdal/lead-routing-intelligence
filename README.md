# Frido Store Lead Router

A small Google Apps Script web app the lead routing team uses to send a customer lead to a Frido retail store.

The agent fills one form. The lead is saved to a Google Sheet, and the app builds a ready-to-send WhatsApp message. Then one tap copies the message and opens that store's DSR WhatsApp group, where the agent pastes it and sends.

Owner: Arsh Aowte

## How it works

```
Agent fills form ──> submitLead() ──> new row in "Leads" tab (Lead ID L0001, L0002…)
                                  └─> message text + store's group link returned
Agent taps "Copy message & open <store> group" ──> WhatsApp opens on the group ──> paste, send
```

The last step is manual on purpose. The store DSR groups are regular WhatsApp groups, and nothing inside Google Workspace (or the official WhatsApp Business API) can post into those. See HANDOVER.md for the reasoning.

## Files

| File | What it is |
|---|---|
| `src/Code.gs` | Server side: creates the tabs, reads the Setup tab, validates and saves leads, builds the WhatsApp message |
| `src/Index.html` | The form the agents use (works on phone and laptop) |
| `src/appsscript.json` | Apps Script manifest: IST time zone, V8 runtime, web app settings |
| `HANDOVER.md` | Background, decisions made and why, known limitations, ideas for later |

## The Google Sheet

**Leads** tab, one row per lead:

Lead ID · Submitted at · Store · Customer name · Customer number · Products · Product category · Expected visit date · Expected visit time · Discount offered · Remarks · Submitted by

Products holds every product picked, separated by commas. Expected visit time is a 2-hour slot such as `12pm-2pm`.

**Setup** tab, edited by hand, read live by the form:

| Column | Contents |
|---|---|
| A, Store | The 23 store names shown in the searchable store picker |
| B, WhatsApp group link | Invite link of that store's DSR group (chat.whatsapp.com/…) |
| C, Product categories | Category dropdown values |
| D, Team members | "Submitted by" dropdown. If empty, the form shows a text box instead |
| E, Products | Searchable multi-select product list. If empty, the form shows a plain product name box instead |

Adding a store, category, team member or product only needs a new row in Setup. You don't need to touch the code or redeploy.

## First-time setup (manual, in the browser)

1. Create a Google Sheet, then go to Extensions → Apps Script.
2. Replace the contents of `Code.gs` with `src/Code.gs`.
3. Click + next to Files → HTML, name it `Index` (no extension), and paste `src/Index.html`.
4. Project Settings (gear): set Time zone to (GMT+05:30) India Standard Time.
5. In the editor, choose `setup` in the function dropdown and click Run. Allow access. On the "unverified app" screen, choose Advanced → Go to project → Allow.
6. In the Setup tab, paste each store's group invite link (WhatsApp → group info → Invite via link → Copy link; needs group admin), add team member names, and list the products in column E.
7. Deploy → New deployment → Web app. Execute as: Me. Who has access: anyone in the Frido org. Copy the URL.
8. Submit a test lead, check the Leads tab, delete the test row, and share the URL with the team.

## Setup with clasp (if working from this repo)

```
npm install -g @google/clasp
clasp login
clasp create --type sheets --title "Frido Store Lead Router" --rootDir src
clasp push
```

`clasp create --type sheets` creates a new bound Sheet. To attach to an existing Sheet instead, create `.clasp.json` with that script's ID:

```json
{ "scriptId": "<script id from Project Settings>", "rootDir": "src" }
```

Then run `setup` once from the editor (step 5 above) and deploy (step 7).

`.clasp.json` is gitignored because it points at a specific script.

`webapp.access` in `appsscript.json` is `DOMAIN` (anyone in the Google Workspace org). If the account is a personal Gmail, change it to `ANYONE` (any signed-in Google user).

## Updating after a code change

Paste or push the new code, save, then go to Deploy → Manage deployments → pencil icon → Version: New version → Deploy.

Always edit the existing deployment. A new deployment gives a new URL and the team's link stops getting updates.

## Troubleshooting

| What you see | Cause / fix |
|---|---|
| Form stuck on "Loading stores" or says it only works through the web app link | You opened Index.html directly. Use the deployed web app URL |
| "No HTML file named Index was found" | The HTML file isn't named exactly `Index` |
| "The Setup tab is missing" | Run `setup()` from the editor |
| Store saved but no "open group" button | That store has no link in Setup column B |
| WhatsApp shows "Join group" instead of the chat | The agent isn't a member of that store group |
| Dates or times look off by hours | Script time zone isn't Asia/Kolkata (Project Settings) |
| Form shows a plain "Product name" box instead of the product search | Setup column E (Products) is empty |
| Changes don't show on the live link | You saved but didn't redeploy a new version |
