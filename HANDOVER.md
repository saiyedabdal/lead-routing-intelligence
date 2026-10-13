# Handover: Frido Store Lead Router

Owner: Arsh Aowte
Status: built, ready to deploy (Oct 2026)

This file is the full context for anyone picking the project up, including a new Claude account. Paste or upload it at the start of a new chat and the work can continue from here.

## The problem

A Frido team routes customer leads into the retail stores. Those leads come from walk-ins, the website (product page "visit store" widgets, chat) and Meta ads. When a lead is routed, two things must happen:

1. The lead's details get recorded in one Google Sheet.
2. The store the customer will visit gets notified in its DSR group, so the floor team expects them.

Before this, no form existed and the notification was entirely manual.

## Constraints we worked within

- **The store DSR groups are regular WhatsApp groups.** This decided the whole design. The official WhatsApp Business API (LimeChat, Interakt, Wati, etc.) cannot post into regular groups, and Apps Script has no WhatsApp access at all.
- **Google Workspace only.** Sheets plus Apps Script, no paid tools or extra subscriptions.
- **Agents work on both phones and laptops.**

## Decisions made

| Topic | Decision |
|---|---|
| Notification | "One-tap send": after saving, one button copies the message and opens that store's WhatsApp group via its invite link. The agent pastes and sends (~5 seconds) |
| Store selection | Agent picks the store manually from a dropdown. No pincode auto-suggest |
| After notifying | Nothing. No status tracking, reminders or closure loop (deliberately kept simple) |
| Form | Custom Apps Script web app, not Google Forms. Google Forms can't show a dynamic "open this store's group" button after submit |
| Visit date / time | Both start empty; the agent must pick. Past dates are blocked |
| Product name | Optional. Category is required |
| Discount, remarks | Optional; "None" is shown in the message if discount is blank |
| Phone number | Normalised to 10 digits (strips +91, leading 0, spaces); must be a valid Indian mobile (starts 6–9) |
| Submitted by | Dropdown from Setup column D; remembered on the device between leads |
| Look | Frido brand palette (Yellow #FFD100, Black #101820) and Outfit font (Google Fonts stand-in for Gilroy) |

### Options considered and rejected

- **Unofficial WhatsApp automation** (tools that log into WhatsApp Web and post for you): fully automatic, but against WhatsApp's terms, with real risk of the company number being banned.
- **Moving store alerts to Google Chat spaces**: fully automatic and free through webhooks, but stores would have to change where they work.
- **One-tap send plus automatic email backup to the store manager**: not chosen for now.

## Form fields → sheet columns

| Form field | Required | Leads column |
|---|---|---|
| (generated) | — | Lead ID, Submitted at |
| Store | yes | Store |
| Customer name | yes | Customer name |
| Customer number | yes | Customer number (stored as text) |
| Product name | no | Product name |
| Product category | yes | Product category |
| Expected visit date | yes | Expected visit date (dd-mmm-yyyy) |
| Expected visit time | yes | Expected visit time (e.g. 5:30 PM) |
| Discount offered | no | Discount offered |
| Remarks | no | Remarks |
| Submitted by | yes | Submitted by |

## The WhatsApp message (as sent to the group)

```
*New lead for Frido Bhartiya Mall, Bangalore*

Name: Priya S
Number: +91 98xxxxxx10
Product: Insoles (Orthotics)
Visiting: Wed, 15 Oct at 5:30 PM
Discount offered: 10%
Remarks: Heel pain, size 7

Lead L0042, sent by Rahul
```

The remarks line is left out when remarks are empty. The text is built in `submitLead()` in `Code.gs`.

## Stores (23)

Pre-filled into the Setup tab by `setup()`:

PMC, Vimannagar · Amanora Mall, Magarpatta · Amar Tech Park, Balewadi · Elpro Mall, PCMC · Nexus Westend, Aundh · Kopa Mall, Ghorpadi, KP · Mall of Asia · Lakeshore, Y junction · Sky City Mall, Borivali · Gachibowli, Hyderabad · Banjara Hills · DLF Summit, Gurgaon · Bhartiya Mall, Bangalore · Kompally, Hyderabad · Vegas Mall, Dwarka · Lulu Mall, Bangalore · Golf Course Road, Gurgaon · Omaxe, Faridabad · Felix, Gurgaon · PMC, Whitefield, Bangalore · M5 Bangalore · Royal Meenakshi Mall, Bangalore · Elan Miracle, Gurgaon

Default categories (editable in Setup): Footwear, Orthotics, Body Support, Mobility, Personal Care, Ergonomic Furniture.

## Code map

`Code.gs`
- `setup()` creates the Leads and Setup tabs with formats and default lists. Safe to re-run: it won't overwrite an existing Setup tab.
- `doGet()` serves `Index.html`.
- `getConfig()` returns the stores, categories and team from the Setup tab.
- `submitLead(form)` validates the input, cleans the phone number, appends the row under a script lock, and returns `{ id, store, groupLink, message }`.
- Helpers:
  - `cleanPhone_` normalises the phone number.
  - `to12h_` converts 24-hour time to 12-hour.
  - `safe_` blocks spreadsheet formula injection.
  - `groupLinkFor_` looks up a store's group link.

`Index.html`
- Two views: the form, and the "saved" view with a message preview and buttons.
- Copy uses `execCommand('copy')` first, because it is synchronous and works inside the Apps Script iframe, then falls back to the Clipboard API. The group link opens with `window.open` in the same click so pop-up blockers allow it.
- If opened outside Apps Script, it shows a note instead of loading forever.

## Known limitations

- **Lead IDs come from the row number.** Deleting rows from the Leads tab can make a later lead reuse an ID. Don't delete rows; mark them in a separate column if needed.
- **Group invite links let anyone with the link join.** Keep the Sheet shared only with the routing team.
- **Agents must already be members of every store group** they route to.
- **The send step is manual,** so a lead can be saved but never sent if the agent skips the button. There is no tracking for this today.

## Ideas for later (not agreed, just noted)

- A "Sent to group" checkbox column, ticked automatically when the button is tapped, to spot leads that were saved but not sent.
- Lead source field (Walk-in / Website / Meta Ergo Assessment / Meta Foot Scan) for channel reporting.
- Daily per-store summary emailed to store managers.
- Moving to Google Chat spaces later would make notifications fully automatic with a small change in `submitLead()`.
