# TravelMate — Verification Log


| Check | Expected | Evidence / How | Status |
|---|---|---|---|
| Smart search "japan" | Grouped Destinations + Places dropdown | `search_listings` joins destinations; dropdown not clipped after hero `overflow-hidden` removal | Pass |
| Search filters end-to-end | Type/Budget/Activity narrow results | Chips → URL params → `/search` filters via `budget_tier`/`activity_tag`; Clear filters resets | Pass |
| Trip capacity | 3 places/day enforced | Over-capacity add shows "Trip full" error | Pass |
| Auto-plan geography | No cross-region same-day itineraries | Stops receive contiguous day blocks in stop order; leftovers fill remaining days | Pass |
| Schedule-aware slots | Attractions planned inside opening hours | `pickSlotTimes` filters 9am/1pm against `schedules.open_time/close_time` | Pass |
| Trip lifecycle | Create/edit/delete/status persist | Edit modal updates name+dates; delete removes items then trip; auto status + manual override | Pass |
| Auto-stop creation | Adding a place with no stops creates one | `extractStopLabel` from `region_country` (strips country suffix) | Pass |
| Booking loop | Traveler request → owner decision → traveler sees outcome | Pending appears in Business hub; Approve flips to confirmed; `/my-trips` shows status; cancel-pending works | Pass |
| BR-011 one review per traveler | Duplicate review blocked | Second submit raises BR-011; `recalc_listing_rating` updates average | Pass |
| BR-012 destination required | Listing without destination rejected | Publish form validates existing/new destination | Pass |
| BR-026 ownership stamp | Listings carry `uploaded_by` | Owner page inserts auth-mapped user id; RLS scopes owner queries | Pass |
| Role routing | Managers never see traveler dashboard | owner/admin/pending hitting `/` are replaced to `/business` | Pass |
| Navbar account switch | Name updates instantly on login/logout | `onAuthStateChange` subscription verified across Ace ↔ Roan | Pass |
| Back-button session leak | No previous-account pages after switch | `replaceState` on auth transitions; back lands on login/public pages only | Pass |
| Manager action gating | Owners/admins can't book/add-to-trip/review | Buttons hidden; Manager view card shown; `/my-trips` redirects | Pass |
| Skeletons & prefetch | No blank flashes; instant nav feel | Shimmer skeletons on dashboard; navbar prefetch observed in Network tab | Pass |
| Animations & accessibility | Smooth entrances; reduced-motion respected | Stagger fade-up cards, slide-up modals, btn-press; `prefers-reduced-motion` disables | Pass |
| 404 listing | Branded not-found with recovery links | `/listing/NOPE` shows 404 + Search/Go back | Pass |
| SQL idempotency | Re-runnable schema script | `if not exists` columns; drop-then-create RPC; single transaction order | Pass |
| Live weather | Forecast from profile location | Open-Meteo geocode + daily max temps; fallback sample data | Pass |
