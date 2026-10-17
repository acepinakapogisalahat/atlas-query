# TravelMate — Validation Log

| Concern | Context | Resolution | Status |
|---|---|---|---|
| Stop persistence without new tables | Multi-destination trips need stored stops | `trips.stops` jsonb column; labels matched via `contains()` on `region_country`/`destination_name` — handles messy free-text regions ("La Union Philippines") | Resolved – schema-light by design |
| Auto vs manual trip status | Status should reflect reality but allow owner intent | Derived from dates (finished/ongoing/upcoming); `trips.status` column overrides when manually set | Resolved |
| Admin platform-wide hub | Admins need oversight beyond own listings | `/business` drops the `uploaded_by` filter for administrators; RLS admin policies on `bookings` | Resolved |
| Booking payments | Real payment processing | Out of scope for Mission 4; status workflow pending/confirmed/rejected/cancelled only | Discuss – post-Go-Live |
| Province-level destinations | `destinations` stores municipalities only | Stops are free-text area labels, not FK rows; picker shows live match counts | Resolved – dictionary revision candidate |
| Budget/Activity filters | Chips existed but did nothing | Denormalized `listings.budget_tier` + `listings.activity_tag` columns with idempotent backfill (regex digit extract for "4-Star"); `search_listings` RPC returns both | Resolved |
| Tailwind v4 `@apply` build break | v4 cannot `@apply` custom classes | Design system rewritten in plain CSS; zero `@apply` of custom classes | Resolved |
| SQL transaction rollbacks | Supabase editor runs scripts as one transaction; partial failures rolled back ALTERs | Single ordered script: columns → backfill → drop RPC → recreate RPC | Resolved |
| RPC return-type change | `CREATE OR REPLACE` can't change return type | `DROP FUNCTION search_listings(text)` then create 10-column version | Resolved |
| Cross-account back-button leak (instructor) | History showed previous account pages | `history.replaceState` on login/signup/logout; `/my-trips` redirects managers | Resolved |
| Stale navbar username (instructor) | Name loaded once on mount; layout never remounts | `onAuthStateChange` subscription + `pathname` dependency; deferred profile fetch (lock-safe) | Resolved |
| Perceived slowness (instructor) | Blank flashes during data fetch | Shimmer skeletons matching real layout; `next/image`; navbar link prefetch | Resolved |
| Managers invoking traveler actions | Owners/admins shouldn't book/review/plan | UI gating (`isManager`) on listing page + navbar + `/my-trips`; RLS still enforces data safety server-side | Resolved |
| Flat/abrupt UI feedback | "Animations are ugly / nothing much" | Global animation system with stagger, slide-up modals, card-lift, img-zoom, btn-press; reduced-motion respected | Resolved |
| Heavy blue hero feedback | User disliked solid blue band | Light gradient hero with soft glows, dark headline, outlined chips | Resolved |
