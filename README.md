# RSVPme

**Invitations whose replies count themselves.** Share one link or QR code for a wedding, engagement, birthday or
function. Guests say yes, maybe or no on their phone, with who they're bringing and what they eat. You see the
list, the seats left, a food and needs count, and who still hasn't answered, with a WhatsApp reminder for each of
them. The seats can never be oversold.

**Live site:** https://rsv-pme.vercel.app/

Built by Ammara Badat as part of my portfolio. It uses Firebase, like my other apps since PaperTrail.

## Who it's for
Anyone in South Africa organising a gathering by WhatsApp: a wedding with a venue that holds 80, a lobola or
engagement party, a braai. The usual way is a group chat where people reply "yes!!" three days later, or never. The
host then phones everyone, counts by hand, and finds out at the venue that Aunty's four children were coming too.

## What it does

**For guests** (no app, no account)
- **The invitation:** the names, the date, the venue with an **Open in maps** link, a note (dress code, parking) and a
  countdown. Open it from a link, a QR code, or by typing the six-character code.
- **A reply card:** *Joyfully accepts*, *Not sure yet* or *Regretfully declines*, how many people are coming, food and
  needs (vegetarian, halaal, a wheelchair), and a message for the hosts.
- **Seats left** are shown, and "yes" turns itself off when the last seat goes.
- **A personal link** (from the host) already has the guest's name and their seats on it, so they only tap an answer.
- **Change my answer** any time, and **Add to my calendar** (a calendar file with a reminder the day before).

**For the host**
- **Your events:** each as a small invitation, with the countdown and seats taken.
- **The guest list:** *Coming*, *Maybe*, *Can't come* and *Not replied* as numbers you can tap to filter, search by
  name, and a **seats bar**.
- **Food and needs**, counted, with who asked ("Halaal for one: Aunty Grace").
- **Remind on WhatsApp:** one tap opens WhatsApp with a polite message and that guest's own link. Copy any guest's
  personal link instead if you have no number.
- **Paste a list** of names (even straight from a spreadsheet, with optional phone number and seats on each line).
- **Write down a reply** for someone who phoned, or isn't on the list.
- **Replies appear by themselves**, with a message ("Zanele is coming, with 1 other").
- **Share:** the link, a WhatsApp message, a **printable QR card**, and a button that makes a new link if the old one
  went too far. **Spreadsheet** exports the list as a CSV.
- **Close the invitation**, change any detail, or delete the event and everything in it.
- **Try the demo:** a made-up wedding with a guest list that has already started replying. No account needed.

**For everyone**
- Works on phones and laptops, light and dark mode, and is **installable** ("Add to Home screen").

## Design
A wedding invitation. Ivory paper with a fine grain, burgundy (the wax seal) for buttons and the chosen answer, sage
green and a thin gold line set inside every card, like stationery. Headings are in Cormorant Garamond, names in
Pinyon Script (a calligraphy hand, only ever used big), and everything else in Jost, which stays easy to read on a
phone. Dark mode is the evening reception: aubergine paper, rose and candle-gold. Each of my apps has its own look;
this is RSVPme's.

- **Signing in (hosts):** a wedding invitation and its reply card, with a wax seal, beside the form.
- **The invitation page** is the card a guest gets: names in script, the date, the venue, then a reply card.
- **The host's event page** is the invitation as a banner, with Guests, Invitation and Share tabs.

Text colours pass WCAG AA contrast in both themes.

## Tech stack
Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS 4, Firebase Authentication (email and password, Google,
and anonymous guest accounts) and Cloud Firestore, Vitest, GitHub Actions, Vercel. The QR codes are made in the
browser by Project Nayuki's QR Code generator (MIT licence), copied into `lib/qrcodegen.ts`, so there's no extra
package.

## Project structure
```
app/              Your events (/), New event (/new), One event (/event?id=), the guest's invitation (/rsvp?c=CODE),
                  the layout, the app manifest, icons and the light/dark script
components/       The sign-in screen, header, event form, guest list, reply editor, share tab, QR code, demo banner,
                  messages, icons and the wax-seal logo
lib/              The rules of an invitation (rsvp.ts: dates, seats, who has replied, food and needs, WhatsApp
                  messages, calendar file, CSV), invitation codes (code.ts), QR codes (qr.ts and qrcodegen.ts),
                  reading saved data (read.ts), the host's live copy (store.ts) and changes (actions.ts), the
                  guest's side (customer.ts), sign-in and the demo
tests/            Unit tests for lib/ (npm test)
firestore.rules   Who can read and change what
public/           The offline service worker and the app icons
```

## How the important parts work

**Never too many seats** (`lib/customer.ts`, `lib/actions.ts` and `firestore.rules`). The seats taken are one number
in `events/{id}/stats/totals`, with no names on it. A reply is saved with a **transaction** that reads the number,
works out how the reply changes it (a "yes" for 3 adds 3; changing it to "yes" for 2 takes 1 back) and writes the
reply and the new number in one step. If two guests grab the last seats together, one transaction fails and that guest
is told. The security rules re-check it: a guest's reply is only accepted if the seats number moves by exactly that
reply's seats, and the number can't go past the event's seats.

**What guests can see.** The event (when, where, the note) and the seats number are public, because the invitation
page needs them. A reply, with a name, can only be read by the host and the guest who sent it. A guest (with an
anonymous account: no email or password) can do exactly one thing: answer for themselves and change their own answer.
Their phone number lives apart from the guest list (`contacts`), readable by the host alone.

**Personal links.** A guest the host adds gets a link with an id that can't be guessed. Their reply is saved under
that id, so it always matches the host's list. If the same link is opened on a second phone, that phone's account
isn't the one that answered, so the database refuses to show the answer and the page says "You've already replied".

**Who hasn't answered** (`summarise()` in `lib/rsvp.ts`). Every invited guest is matched with their reply, or marked
*waiting*; replies from people who weren't on the list are added at the end. Totals count people, not replies.

**The calendar file** (`icsFile()` in `lib/rsvp.ts`). "Add to my calendar" downloads a standard .ics file with the
event, the venue, a start and an end, and a reminder the day before.

## Tests
`npm test` runs the unit tests in `tests/` with Vitest: dates and countdowns, whether replies are open, seats taken
and left, how a change of mind moves the seats, who has replied and who hasn't, the food and needs count, filtering,
pasted guest lists, WhatsApp numbers and messages, the calendar file, the spreadsheet (with spreadsheet formulas
neutralised), invitation codes, the QR codes (checked square for square against the same library's separate Python
version), and reading saved data safely. GitHub runs them on every push (`.github/workflows/tests.yml`).

## Setup (run it yourself)
1. **Firebase:** create a project at [console.firebase.google.com](https://console.firebase.google.com).
   - Authentication → Get started → turn on **Email/Password**, **Google** and **Anonymous** (guests' accounts and
     Try the demo both need it).
   - Firestore Database → Create database (production mode).
   - Firestore Database → **Rules**: paste in `firestore.rules` and press **Publish**.
   - Project settings → General → Your apps → add a **Web app** to get its settings.
2. **Settings:** copy `.env.example` to `.env.local` and fill in the four values from step 1.
3. **Run it:** `npm install`, then `npm run dev`, and open http://localhost:3000.
4. **Deploy on Vercel:** import the GitHub repo, add the same four settings under
   Settings → Environment Variables, and deploy. Then, in Firebase, add the Vercel address under
   Authentication → Settings → **Authorized domains**, so Google sign-in works there.

## Environment variables
Names only; the values are in `.env.local` (never committed) and in Vercel.

| Name | What it is |
|---|---|
| `NEXT_PUBLIC_FIREBASE_API_KEY` | The web app's API key |
| `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN` | e.g. `your-project.firebaseapp.com` |
| `NEXT_PUBLIC_FIREBASE_PROJECT_ID` | The Firebase project's ID |
| `NEXT_PUBLIC_FIREBASE_APP_ID` | The web app's ID |

These are public by design: they say which Firebase project to use, they don't unlock anything. What protects
each host and their guests is `firestore.rules`.

## Known gaps
- **The security rules aren't in the automatic tests.** They'd need the Firebase emulator; I check them by hand.
- **A reply written down by the host can't be changed by the guest.** It belongs to the host's account, so the guest
  is told to ask the hosts.
- **No messages sent for you.** WhatsApp reminders open WhatsApp with the message ready; you press send. Sending by
  themselves would cost money per message and need a business account.
- **One host per event.** No co-hosts yet.
- **Calendar times are "floating"** (the time on the guest's phone), which is right for guests in South Africa.
- **A host who closes the tab** without ending the demo leaves their example wedding in the database.
- **English only.**

## Use of AI
I built RSVPme with Claude (by Anthropic) as my AI pair programmer:

1. **I chose what to build** from ideas we discussed, as one of my new apps for my portfolio.
2. **Claude wrote the code**, starting from my other Firebase apps, explained how it works, designed its look and
   made the app icons.
3. **I set up Firebase and Vercel, added the code to my project**, ran it, tested it on my laptop and phone,
   committed it and deployed it, and reported anything that broke or looked wrong so we could fix it.
