
## Redesign: Springer Nature-Inspired Page Header

### What I See in the Reference Image

The image shows a two-part header structure from Springer Nature's account portal:

1. **Top navigation bar** — white background, product logo/name on the left (bold serif, "SPRINGER NATURE"), and two utility links on the right: "Notifications" (bell icon) and "Account" (user icon). This bar is slim and clean.

2. **Hero identity banner** — a full-width deep teal/dark blue band below the nav. It contains:
   - A breadcrumb in the top-left (e.g. "Account > Manage your account")
   - A large circular outline user avatar icon on the left
   - The user's full name in large, bold, white serif text
   - Their email address in smaller white text beneath the name

The current page has no top nav bar and shows profile info in a left sidebar card instead. The goal is to replace the current page header with this two-part Springer Nature-style structure.

---

### What Will Change

#### 1. New top navigation bar (inside `ResearcherHomePage.tsx`)

Added at the very top, full-width, white background with a bottom border:
- **Left**: "Paper+" or the product name in bold serif font
- **Right**: Icon links — a bell icon for notifications (decorative for now) and a user/account icon that opens the edit profile dialog

This replaces the absence of a global nav on the home page.

#### 2. New full-width hero identity banner (inside `ResearcherHomePage.tsx`)

Replaces the current left sidebar `ProfileCard` for the name/email identity display. Full-width band directly beneath the nav bar:
- Background: deep teal color using a new CSS custom property (`--hero-teal: 199 73% 25%`) — matching the dark teal from the screenshot
- Breadcrumb: "Home > My Account" in small white/semi-transparent text
- Left: a large circular outlined user avatar (like the image — outline circle with a person silhouette, white stroke)
- Right of avatar: full name in ~2rem bold white serif text, email in small white/muted text below
- If admin: small "Admin" badge in the banner

#### 3. Remove the left-sidebar `ProfileCard` component

The profile identity information (name, email, avatar) moves into the new banner. The left sidebar `ProfileCard` will be removed from the layout.

The **Edit Profile**, **Digital Lab**, and **View Public Profile** action buttons will move to the top-right nav area or appear as a dropdown under the Account icon in the nav bar.

#### 4. Layout becomes single-column (main content full width)

With the profile card sidebar gone, the main content area (Upload + Library) expands to full width under the banner. This gives papers more horizontal space.

#### 5. Admin banner

The current admin banner (with shield icon + Admin Dashboard button) moves into the hero banner itself — as a subtle badge or a small button in the top-right corner of the banner.

---

### Technical Plan

**Files to change:**

| File | Change |
|------|--------|
| `src/pages/ResearcherHomePage.tsx` | Add top nav bar + hero banner; remove aside/ProfileCard; restructure layout to single column |
| `src/components/researcher-home/ProfileCard.tsx` | Not deleted (still used potentially), but its identity section is now redundant — the action buttons (Edit, Digital Lab, Public Profile) are moved to a dropdown in the nav |
| `src/index.css` | Add `--hero-teal` color token for the dark teal banner |

**Hero banner color:** `hsl(199, 73%, 25%)` — a dark teal matching the screenshot.

**Avatar icon in banner:** A CSS-styled circle with a `User` icon from lucide-react, white-outlined, approximately 64px. Not a filled avatar — mimics the outline style in the reference image.

**Nav bar right side:** A simple row of icon buttons:
- Bell icon (Notifications — no functionality, just visual)
- User icon (Account) — clicking opens a dropdown with: Edit Profile, Digital Lab, View Public Profile, and if admin: Admin Dashboard link

This matches the reference image's "Notifications | Account" top-right pattern.

---

### Visual Result

```text
+-------------------------------------------------------------+
| Paper+                         [Bell] Notifications  [User] Account |
+-------------------------------------------------------------+
| [dark teal banner, full width]                              |
|  Home > My Account                              [Admin btn] |
|  ( O )  Cristiano Matricardi                               |
|         cristiano.matricardi@gmail.com                     |
+-------------------------------------------------------------+
|  [Upload Section — full width]                             |
|  [Paper Library — full width grid]                         |
+-------------------------------------------------------------+
```
