# Florida distressed office/retail → industrial site finder: research

Written 2026-09-23. Prompted by Cole Poulos (Kurv Industrial, formerly Bridge
Industrial) asking: *"If I asked you to build a project for me for Florida for
locating office buildings that are in trouble or potential land sites, could
you do it? And what would you charge?"* — using only public data: "cross
referencing public financial reports and looking at building owners and
tenants."

This folder is the study. This file is the synthesis; the five numbered files
are the full reports with sources.

| File | Covers |
| --- | --- |
| [01-market.md](01-market.md) | Florida office/retail state, CMBS distress, the office-to-industrial trend, Kurv's Florida deals, who buys and how they source |
| [02-public-data.md](02-public-data.md) | Every public/low-cost data source, verified where possible, with a join architecture and a minimum viable dataset |
| [03-existing-solutions.md](03-existing-solutions.md) | ~50 products with prices; what a developer would buy today; the gap |
| [04-methodology.md](04-methodology.md) | How distress is detected and predicted; literature; a v1 scoring model and backtest design |
| [05-business-and-legal.md](05-business-and-legal.md) | How sourcing is paid for, Florida Ch. 475 licensing risk, data licensing, pricing, pilot terms |

## Verdict

**Yes, we can help, and the ask is better than it first sounded.** Three
findings change the picture:

1. **Cole's employer already does exactly this.** Bridge Industrial renamed
   itself Kurv Industrial in March 2026 (same CEO, Steve Poulos, same team).
   Kurv's Florida strategy is buying obsolete suburban office and turning it
   into warehouses: Ryder's former HQ (16.8 ac, $42.1M, 2023, now 326K SF of
   warehouse) and a 1972 Doral office park (16 ac, $45.2M, 2024, 269K SF under
   construction). The seller of the Doral park had paid $7.8M in 2010. So the
   deliverable is not "a list of struggling office buildings." It is **"find
   the next Doral 826"**: 8–40 acre, pre-1995, low-FAR office or retail parcels
   near a highway in the infill logistics corridors, ranked by how motivated
   the owner is likely to be.
2. **Florida's public data is unusually good for this.** Statewide parcel
   rolls with owner, use code, year built, building area and sale history are
   free in one format for all 67 counties (FL DOR NAL/SDF). The sales file
   already codes deeds-in-lieu, tax deeds, receiver sales and duress sales.
   The tangible personal property roll (NAP) lists the businesses at each
   address every year, which is a free tenant move-out signal nobody uses.
   Sunbiz corporate data is free in bulk over SFTP. Every recorded mortgage
   shows lender, date and (via doc-stamp tax) amount, so the loan-maturity
   wall is visible for bank and private loans, not just CMBS. CMBS loan-level
   NOI, DSCR, occupancy and special-servicing status are free on SEC EDGAR
   for registered conduit deals since late 2016 (verified with a live pull).
3. **No product does the whole job.** Loan-data platforms (Trepp, CRED iQ,
   MSCI) see only securitized debt and have no court or tax records.
   Public-records lead tools (PropStream, PropertyRadar, DealMachine) are
   built for houses. Land tools (Regrid, LightBox, MapWise, Deepblocks,
   Gridics) have no notion of distress. Nobody joins them on a Florida
   commercial parcel and screens for industrial fit. The closest competitor
   is HorizonsAI, an AI-native monitor of "30+ public filing types" with
   unpublished pricing; demo it before building.

## What "in trouble" looks like, and what public data can see

Distress runs in a fixed order: tenant roll-off → occupancy falls → DSCR
below ~1.10 (watchlist) → missed maturity → special servicing → lis pendens →
receiver → certificate of title / deed-in-lieu / tax deed. The early signals
are public only for CMBS loans (roughly 20–25% of office and retail debt,
[estimate] in 04). The late signals are public for every loan in Florida,
because it is a judicial-foreclosure state: every commercial foreclosure
starts as a lis pendens in a county clerk's official records.

The two strongest predictors in the literature are both computable from
Florida records for every loan:

- **Loan maturity.** A Fed paper (Glancy & Kurtzman 2024) finds reaching
  maturity adds ~12 points to delinquency probability, ~20 for office.
  Recorded mortgages give the lender, date and amount.
- **Leverage against today's value.** A 2025 Wharton paper rebuilt bank CRE
  loan books from county records, rolled last sale price forward with a price
  index, and found "latent distress" ~4× reported delinquencies. Same method
  works here.

Add to those: owner-entity problems (administratively dissolved LLC, federal
tax liens, officer changes), tenant loss (NAP accounts vanishing, WARN
notices, business-tax receipts lapsing), tax delinquency (published every
spring), Miami-Dade/Broward 40/50-year recertification failures, code
violations, and, where CMBS covers the loan, real DSCR and occupancy.

**Blind spots to be honest about:** leases, asking rents, sublease
availability (CoStar/LoopNet/Crexi; never scrape them, see 05 §3), balance
sheet loan performance, the CMBS servicer watchlist (gated), and mezzanine
UCC foreclosures (only visible as unstructured legal notices). Published
model accuracy is modest: a public-data v1 should aim for 3–5× lift in the top
decile [estimate], delivered as a ranked list, not an oracle.

## Market context (2026)

- Florida office is two-tier. Brickell, downtown West Palm and Westshore are
  tight at record rents. Distress sits in older suburban Class B parks: Boca,
  Sunrise, Miramar, Maitland, suburban Jacksonville (~22% vacant), Tampa's
  I-75 corridor. Flagship case: Wells Fargo's August 2026 foreclosure on
  Workspace Property Trust's $1.28B loan over eight South Florida offices.
  The warning signs (2023 extension, occupancy 89%→75%, missed July 2025
  maturity) were public 1–3 years ahead.
- Florida retail is healthy (3–4.5% vacancy). Distress is in regional malls
  (Pembroke Lakes, Miami International, Washington Prime's ten FL properties,
  Orlando Fashion Square), and those mostly go to housing, not industrial.
- Nationally, CMBS delinquency ~7.5–7.9%, special servicing 11.4% (highest
  since 2013), office ~half of that. ~$875B of commercial mortgages mature in
  2026, ~$652B in 2027.
- The best conversion sites in Florida have come from corporate owner-users
  shedding campuses (Ryder, AT&T/Concentrix, Mutual of America, Baptist
  Health), not lender foreclosures. Score **owner-user obsolescence**, not
  only loan default.
- Sourcing today is broker-led and competitive ("multiple bidders" on the
  Jacksonville Baymeadows campus). The value is finding sites brokers have
  not already circulated.

## Existing solutions and what they cost

A small developer buying the pieces today: a lean stack (CRED iQ, Crexi
Intelligence or Reonomy, MapWise or LightBox, county foreclosure feeds,
Zoneomics) is roughly $25k/yr; adding CoStar and Placer.ai takes it to
$60–100k/yr. Plus half to one analyst to join it all by parcel. That covers
~70% of the need. The other 30% (the join, the Florida-specific signals, the
industrial-fit screen) is done by hand or not at all. See the table in 03.

## What would we charge

**Not a finder's fee.** Florida Statutes 475.01 defines a broker as anyone
who, for compensation, "takes any part in the procuring of sellers,
purchasers" of real property. Unlicensed brokerage is a third-degree felony
(475.42); the fee contract is void (475.41); a licensee who pays an
unlicensed person also breaks the rules. Florida courts have applied this to
"a finder's fee for locating realty to be purchased" (*Schy v. Margulies*,
1981; case-snippet reading, confirm with counsel). Data vendors like CoStar,
Reonomy and CRED iQ sell "likely to sell" and distress data legally because
the fee is flat and not tied to any transaction, and they never contact
owners.

Recommended shape (05 §6):

- **Phase 0: free pilot, 6–8 weeks, Miami-Dade + Broward**, with a one-page
  letter: free; Jonathan owns the code; Kurv gets output for internal use;
  no compensation tied to any transaction; Jonathan does not contact owners;
  not brokerage. State the market value of the work ($15–35k) as the anchor.
- **Phase 1 options** if the pilot hits its criteria: $2.5–5k/month license
  with weekly refresh; or $20–40k build + $1.5–3k/month maintenance; or
  $150–200/hour capped; or a role inside Kurv.
- One hour with a Florida real-estate/licensing attorney before the first
  paid invoice.

Value to Kurv is not the constraint: one infill site is $40–50M of land and
$10–30M of development value [estimate]. The constraints are whether the tool
finds sites their brokers would not, and the legal cap on deal-linked pay.

## Proposed v1 (if we go)

Output per office/retail parcel in the target counties: two 0–100 scores
plus confirmed-event flags.

- **Distress / motivation score**: maturity (recorded mortgage age and
  stated maturity) 25, leverage vs rolled-forward value 25, building age,
  type and FAR 15, tenant events (NAP churn, WARN, BTR) 10, owner behaviour
  (Sunbiz status, liens, sister properties in trouble, long hold / low basis)
  15, physical (permits, violations, recert) 10.
- **Industrial suitability score**: acreage, distance to limited-access
  highway (FDOT), zoning / future land use, flood and wetlands, neighbours,
  implied $/acre vs industrial land comps.
- **Actionable-now flags**: lis pendens, receiver, certificate of title,
  distressed-sale codes, tax certificate, CMBS special servicing or DSCR<1.
- **Backtest**: freeze features at 1 Jan 2023 (DOR supplies past rolls free
  on request), label 2023–2026 foreclosures, distressed deeds and
  deep-discount sales, report precision@k and lift by county.

Minimum viable dataset (02 §Engineering): DOR NAL+SDF+NAP for 2–3 years,
FGIO parcel polygons, Sunbiz bulk, CMBS EX-102 + 10-D for FL, clerk indexes
for Hillsborough (free) and Broward (free FTP) then Palm Beach ($600/yr) and
Miami-Dade (~$110/mo), tax-collector delinquent lists, WARN, Overture
Places, Miami-Dade violations/permits, FDOT/FDEP/NWI/FEMA/zoning layers.
About 4–6 engineer-weeks with near-zero data cost. Clerk integrations across
all 67 counties are the multi-month part; the top 7 counties hold most of the
value.

## Questions for Cole before anything is built

1. Markets: Miami-Dade + Broward only, or also Palm Beach, Tampa, Orlando,
   Jacksonville?
2. Thesis ranking: office→industrial (Doral pattern), retail boxes, raw land,
   existing industrial value-add (Pompano pattern)?
3. Minimum acres and target buildable SF; workable municipalities; zoning
   path required or not.
4. Price band ($/acre or total basis).
5. What counts as a hit: a site they had not seen, that survives a 15-minute
   screen, that gets an owner call. Suggested target: ≥5 such sites in the
   top 50 during the pilot.
6. What they already license (CoStar, Reonomy, Trepp/CRED iQ) so they can
   cross-check internally; our code never touches those.
7. A weekly 30-minute feedback call, each lead tagged seen/not-seen and
   fits/doesn't and why.
8. Delivery format (map + CSV, or a push into their CRM), who decides on a
   paid phase, and an NDA both ways.

## Caveats on this study

- Each report was produced by a research agent with a 200-search budget that
  ran out partway through. Items marked **[E]**, **[estimate]** or
  *unverified* in the files rest on general knowledge, not a fetched source.
  Most affected: 01 §6 (how buyers source), 03's newer startups (Ryse,
  Rexera, Perch, Ripe, Withco, Property Intel, Hello Data), 05 §5.2 (investor
  views), 02's bulk-data details for Broward, Orange, Duval and Pinellas
  appraisers and clerks.
- Trepp, MSCI, Cotality, CompStak and Yardi prices are estimates.
- The Florida Ch. 475 case readings come from court-database snippets; read
  the opinions or ask counsel before relying on them.
- Nothing here has been checked against a live Kurv deal pipeline. The one
  test that matters is whether a first scored list surfaces sites Cole's
  team has not seen.
