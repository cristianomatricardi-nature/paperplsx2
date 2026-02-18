## Landing Page Overhaul — Content + Modern Layout

### Summary of all changes

**Content changes to LandingPage.tsx:**

1. **Top navbar brand** — Replace static "Paper++" text with the Springer Nature two-line brand block (identical to HubPage): `logo-brand` class for "Springer Nature" with the "Powered by Content Innovation department" subtitle in teal color tokens.
2. **"Start Discovery" button** —need to navigate to the page with the three cards the( whic are "generate paper++" "manage account" "digital lab"
3. **Hero body copy** — Replace "Experience research publications like never before. Explore modular content, interactive visualizations, and personalized insights." with: *"Turn scientific knowledge from something you read into something you operate on."*
4. **Remove "PDF to Interactive" card** — Delete it from the features array. Remaining cards: Persona-Tailored Views, AI-Enriched Layers, Agentic Replication Assistant.
5. **"AI-Enriched Layers" card description** — Replace with: *"From insights to actions: interactive data, tweakable parameters, reusable workflows, and real-time comparison with your own results."*
6. **"Replication Assistant" card** — Rename to **"Agentic Replication Assistant"** and replace description with: *"Find everything you need to reproduce and speed up your work through community-engaging tools, and a step-by-step replication checklist — check your resources and fill the missing ones in a timely fashion."*

---

### Modern layout redesign with parallax + fade-in

The new layout will be structured in these sections:

**1. Sticky Header**

- Left: Springer Nature – Paper++ in `logo-brand` style (same as HubPage/ResearcherHome)
- Right: Log in + Get Started buttons
- Subtle border-bottom, white background

**2. Hero Section — Full-viewport, teal gradient**

- Same dark teal gradient used across the app: `linear-gradient(100deg, hsl(var(--hero-teal)) 0%, hsl(var(--hero-teal-mid)) 60%, hsl(197 55% 36%) 100%)`
- Large bold headline ("Paper++") + tagline ("Interactive research publication")
- Powered-by subtitle
- New hero body copy
- CTA button — white outline pill style (to contrast on teal)
- Subtle parallax: a CSS `background-attachment: fixed` or transform-based shift using a `useEffect` scroll listener for lightweight implementation

**3. Feature Cards Section — Fade-in on scroll**

- 3-column grid (after removing PDF to Interactive)
- Cards fade and slide up using `IntersectionObserver` — each card gets `opacity-0 translate-y-6` initial state, transitions to `opacity-100 translate-y-0` when entering viewport, staggered by 100ms per card
- Very light teal tint on card hover, thin border, no heavy shadows

**4. CTA Section**

- Centered, clean, white background, one bold line + button

**5. Footer**

- Same brand wordmark in `logo-brand` + copyright

---

### Technical approach

- Add a custom `useFadeIn` IntersectionObserver hook inline (no new file needed — small enough to embed)
- Use CSS `transform: translateY` + `opacity` transitions with Tailwind `transition-all duration-700`
- Parallax on hero: `useEffect` scroll listener that sets a CSS `--scroll-y` variable, then uses `transform: translateY(calc(var(--scroll-y) * 0.3px))` on the hero content — lightweight, no library needed
- All existing color tokens respected: `--hero-teal`, `--hero-teal-mid`, `--primary`, `--border`, `--muted-foreground`
- No heavy libraries added — pure CSS transitions + IntersectionObserver

---

### Files to edit

- `**src/pages/LandingPage.tsx**` — Complete rewrite with: brand fix, content changes, new modern layout with scroll animations