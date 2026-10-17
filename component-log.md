# TravelMate — Component Log

| Component / File | Process / Purpose | Status |
|---|---|---|
| `components/Navbar.tsx` | Global navigation. Role-aware links (Discover vs Business hub, My trips for travelers only, My listings for owners, Admin for admins). Live username via `onAuthStateChange` (fixes stale name after account switch). History-safe logout (`replaceState`). Link prefetch for instant nav. | Connected |
| `components/Footer.tsx` | Site footer. | Connected |
| `components/AuthShell.tsx` / `AuthBootstrap.tsx` | Auth page layout + session bootstrap. | Connected |
| `components/SmartSearch.tsx` | Debounced autocomplete (Destinations + Places groups) via `search_listings` RPC. Filter panel (Type / Budget / Activity) with removable chips; params forwarded to `/search`. Flex-row bar (no overlap). | Connected |
| `app/page.tsx` — Discover dashboard | Hero (light gradient + soft glows), Trip planner (create/edit/delete, destination stops, 3-slots/day capacity, auto-plan with schedule-aware slots, day-by-day roadmap), Explore rail, Recommendations, 5-day forecast (Open-Meteo), Quick actions, Trending, hover popovers. Managers (owner/admin/pending) redirected to `/business`. | Connected |
| `app/page.tsx` modals — NewTrip / EditTrip / DeleteConfirm / DestPicker | Trip lifecycle UI with counters, slide-up entrance animations. | Connected |
| `app/search/page.tsx` | Results grid, type tabs, URL-driven filter chips (budget/activity) with Clear filters. | Connected |
| `app/listing/[listing_id]/page.tsx` | Listing detail: mosaic gallery + lightbox, quick-fact tiles, reviews + ReviewForm (BR-011), BookingModal, AddToTripModal (card selector, duplicate guard, inline create). Traveler-only actions; Manager view card for owners/admins. Scroll-to-top on open. | Connected |
| `app/my-trips/page.tsx` | Traveler history: trip cards with lifecycle chips (Upcoming/Ongoing/Finished), booking requests with status + cancel-pending. Deep-link `/?trip=ID`. Managers redirected to `/business`. | Connected |
| `app/business/page.tsx` | Owner/admin hub: stat strip (listings/rating/reviews/pending), booking approve/decline, review feed, listing performance. Admins get platform-wide scope via RLS. | Connected |
| `app/owner/page.tsx` | Publisher dashboard: stat strip, listing card grid (View/Edit/Delete), sticky publish/edit form with counters, new-destination creation, photo upload to `Media` bucket (BR-026 ownership stamp). | Connected |
| `app/admin/page.tsx` | Admin manager: application review/approve/reject, oversight links. | Connected |
| `app/apply/page.tsx` / `app/applications/page.tsx` | Business-owner application flow + application tracking. | Connected |
| `app/login/page.tsx` / `app/signup/page.tsx` | Auth with history wipe on success (no cross-account back navigation). Google OAuth + password reset. | Connected |
| `app/profile/page.tsx` | Preferences (sex, current location, travel style, budget) feeding recommendation engine; live weather source. | Connected |
| `utils/supabase/client.ts` | Browser Supabase client. | Connected |
| `utils/supabase/role.ts` | Role hook (traveler/owner/admin) with auth-state subscription. | Connected |
| `utils/supabase/searchlog.ts` | Search keyword logging for recency + recommendations. | Connected |
| `app/globals.css` | Tailwind v4 design system in plain CSS (btn/card/badge/input), animation library (fadeInUp, slideUp, scaleIn, shimmer, card-lift, img-zoom, btn-press, page-enter, stagger delays), `prefers-reduced-motion` support. | Connected |
