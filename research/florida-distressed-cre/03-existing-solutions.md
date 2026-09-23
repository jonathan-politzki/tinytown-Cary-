# Existing solutions: finding financially distressed Florida office/retail buildings and land sites

Research date: 2026-09-23. Written for Bridge Industrial, an industrial developer. Question: can public data surface Florida office and retail buildings in financial distress, plus redevelopable land, and what does that already cost to buy?

Method and limits: about 60 web searches and page fetches, run until the session's search budget ran out. Prices come from vendor pricing pages, CRE Daily reviews, Vendr, G2, Capterra and forum posts. Where no public price exists, the figure is marked **(est.)** and should be checked with a sales quote. I could not research a few named entities before the budget ran out: Ryse, Rexera, Perch, Ripe, Withco, Property Intel, Hello Data, Urbanintel, Datex pricing, and the distressed desks at the big brokerages. They appear below from general knowledge and are marked as such.

---

## Key takeaways

1. **No product does this exact job.** Nothing on the market combines "Florida + office/retail + financial distress + suitable for industrial or redevelopment conversion" into a ranked list. The market splits into three groups that do not overlap well:
   - **Debt-side CRE platforms** (Trepp, CRED iQ, MSCI RCA, CoStar Loans, Yardi Matrix, Moody's CRE) see securitized and some bank loans very well. That is roughly 1/3 of CRE debt. They have no county court or tax records.
   - **Public-records investor tools** (PropStream, PropertyRadar, BatchLeads, DealMachine, DealSignals/DistressIQ, Lispend, FloridaLisPendens, LienSuite) see lis pendens, tax delinquency and code violations. They are built for residential wholesalers and are weak on commercial fields such as tenants, loans, class and SF.
   - **Land and site-selection tools** (Regrid, LightBox Vision, MapWise, Acres, LandTech, Prophetic, Parca, Deepblocks, Gridics, Zoneomics, TestFit) cover parcels, zoning and yield. They have no notion of financial distress.
2. **The closest single products are new AI-native entrants, not the incumbents.** HorizonsAI says it monitors "30+ public filing types": lis pendens, tax delinquency, probate, loan maturity, servicer reports, occupancy, assessor and state registry data. It covers all 50 states, including office, retail and industrial, for a fixed monthly fee by market and asset class. Price is not published. It is the most direct competitor to what Bridge's friend describes and should be demoed first.
3. **A realistic stack a small developer would buy today costs about $15k–$60k per year.** That covers roughly 70% of the need. The remaining 30%, joining signals across sources for Florida commercial parcels and screening for industrial fit, is still done by hand by analysts or brokers.
4. **Florida is unusually well-suited to a do-it-yourself build.**
   - Florida DOR publishes free statewide parcel rolls (NAL/SDF/GIS) with DOR land-use codes.
   - Sunbiz corporate data can be downloaded in bulk for free.
   - Florida is a judicial-foreclosure state, so every commercial foreclosure starts as a lis pendens in public county clerk records.
   - All 67 counties run tax-certificate sales every spring.
   - Most counties sell foreclosure and tax-deed auctions through the RealAuction/realforeclose platforms.
   - Miami-Dade and Broward require 40/50-year building recertification, which produces an "unsafe structure" signal.
   - CMBS loan-level data is free on SEC EDGAR (ABS-EE filings). Open-source parsers exist, such as BondLens and abs-monitor.
5. **The gap is best treated as a service first and a product second.** The value is in cleaning, joining and judging the data, e.g. "this 1985 suburban office park on 12 acres near I-4 with a lis pendens and a maturing CMBS loan could be an industrial redevelopment." That fits a Florida-only "distressed-site monitor" run as a managed service or light SaaS for a handful of industrial and IOS developers at $2k–$5k per month. A national horizontal product would compete directly with HorizonsAI, CRED iQ and Crexi, and is not recommended.

---

## 1. Comparison table

Distress signal key:
- **CMBS** = watchlist, special servicing or delinquency
- **LP** = lis pendens or foreclosure
- **Tax** = tax delinquency or tax certificate
- **Mat** = loan maturity
- **Occ** = occupancy or tenant loss
- **Own** = owner or entity data
- **Code** = code violations
- **Sub** = sublease

| # | Product | Category | Distress signals | Florida commercial coverage | Price (real where found) | Target customer | Key weakness for this use |
|---|---|---|---|---|---|---|---|
| 1 | **CoStar Suite** (incl. CoStar Loans, CoStar for Lenders, Tenant data) | Incumbent CRE database | Mat, lender, CMBS status on loans, Occ/vacancy, Sub (sublease listings), tenant lists, Own | Excellent (researched inventory of FL office/retail) | Vendr median **$15,130/yr**; range $3k–$23k/user/yr; ~$300–450/user/mo; "All Markets" ~$40k/yr for 1 license (≤3 users). Contracts since Feb 2025 allow CPI escalators; multi-MSA can be 40–50x single-market | Brokers, investors, lenders | Expensive and priced per market. No lis pendens, tax-certificate or code data. Distress has to be inferred by hand |
| 2 | **LoopNet** (CoStar) | Listing marketplace | Listings only; "auction" and price-cut flags | Good for on-market | Free to search; listing upgrades paid | Buyers and sellers | On-market only, so distress is already priced in |
| 3 | **Ten-X** (CoStar) | Online auction | REO and note sales, distressed auctions | ~175 FL commercial auctions listed at time of search | Free to browse; buyer's premium | Investors | Late-stage distress; competitive bidding |
| 4 | **Crexi Intelligence / PRO** | Marketplace + data | Mat (loan maturity search), CMBS data, lender history, Own (1,000+ owner contacts/mo), sales comps | Good | **$249/user/mo** ($2,388/yr) reported; forum reports ~$1,200/yr; tiers: Free, Listing PRO, All PRO, Intelligence, Enterprise PRO (10+ users) | Brokers, small investors | CoStar copyright ruling (Jun 2025) plus ongoing antitrust counter-suit add legal risk. No court or tax records |
| 5 | **Reonomy** (Altus Group) | Owner and property data | Mat (debt tab, search by maturity), CMBS loan details, Own (LLC unmasking), "likely to sell" score | National, 50M+ properties; weaker in small markets (~80% accuracy target) | **$4,800/user/yr or $400/user/mo** | Brokers, lenders, service providers | Research stale since 2021; no lease comps; Altus is divesting "non-core analytics" in 2026, so the product's future is uncertain |
| 6 | **Prospect by Buildout** (ex-ProspectNow) | Owner data + seller prediction | Mat, mortgage history, Own, "likely seller" AI score | National; regional plan = 3–5 counties | **$199/mo annual (5 counties)**, $349/mo annual national; $299/$499 monthly | Brokers | Built for broker prospecting; no court or tax signals |
| 7 | **Trepp** (TreppLoan, TreppCRE, TreppWire, Trepp Anywhere) | CMBS/CRE debt analytics | CMBS watchlist, special servicing, DSCR/occupancy from servicer reports, Mat, appraisal reductions | All securitized FL loans | Not published. CRE Daily lists $4,800/user/yr but that looks copied from Reonomy. Institutional seats are typically **$20k–$60k+/yr (est.)** | Bond investors, lenders, special servicers | Securitized loans only (~1/3 of CRE debt). Built for bond analysts, not site hunters |
| 8 | **CRED iQ** | CMBS + Agency loan/property data | CMBS watchlist, special servicing, delinquency, Mat, tenant and lease expirations, Own contacts, valuations | 100% of securitized FL loans | **Enterprise from $1,200/mo (up to 4 users)**; free basic account; 48-hr trial | Brokers, lenders, distressed buyers | Limited non-securitized coverage. Founded 2020 |
| 9 | **MSCI Real Capital Analytics** (Distress Tracker, Mortgage Debt Intelligence) | Transactions + distress | Distress tracker (troubled / resolved by asset), lender, Mat | Assets ~$2.5M+; good for larger FL deals | Custom; typically **$20k–$50k+/yr (est.)** | Institutions | Large deals only; misses small suburban office and strip retail |
| 10 | **Moody's CRE** (ex-Reis) | Market analytics + loan/CMBS | CMBS data, market vacancy, some property risk | Major FL metros | Enterprise custom (est. $10k–$30k+/yr); marketplace listing $99/mo | Lenders, investors | Market-level, not parcel-level |
| 11 | **Green Street** | Research, CPPI, comps | Market-level stress, sector grades | Top-50 metros + tertiary markets | **~$20k–$35k/yr** (CRE Daily est.) | REIT and institutional investors | Macro, not a sourcing tool |
| 12 | **Yardi Matrix** | Property data | In-place loans and maturities (office, industrial, multifamily), Own, supply pipeline | FL major markets (office in 120 US markets) | Custom (est. $10k–$25k/yr) | Institutions, lenders | Retail is thin; no court or tax data |
| 13 | **CompStak** | Lease + sales comps + CMBS | Lease expirations (tenant rollover), CMBS data | Good for office/retail/industrial in major FL metros | Custom (value-based; est. $10k–$40k/yr) | Landlords, lenders, appraisers | No owner contacts; no court or tax data |
| 14 | **Cherre** (now RealPage-affiliated) | Data warehouse / integration | Whatever licensed feeds you add (assessor, recorder, liens, owners) | Depends on licensed feeds | **$50k–$500k/yr**; standard deployments $150k–$500k | Institutional investors | Plumbing, not insight. Far too expensive for a small developer |
| 15 | **LightBox Vision** (ex-LandVision) + RCM + LightBox API | Parcels + ownership + debt + marketplace | Filter by debt, transaction history, Own; RCM lists distressed/REO sales | National incl. all FL; zoning, traffic, footprints | ~$150–$400/user/mo reported (**~$2k–$5k/user/yr**) | Brokers, developers, appraisers | No distress scoring; lis pendens and tax signals not native |
| 16 | **ATTOM** | Bulk/API property data | LP (NOD, lis pendens, auction, REO), Tax, Own, mortgage | National incl. FL; commercial foreclosure coverage unclear | API "from $95/mo"; licensing from $499/yr; bulk/enterprise custom (often $10k–$100k/yr, est.) | Developers building products, lenders | Residential-first. Commercial foreclosure coverage not confirmed |
| 17 | **Cotality** (ex-CoreLogic, rebranded Mar 2025) | Bulk property/mortgage data | Mortgage, LP, Tax, Own | 99.9% of US parcels | Enterprise only (est. $25k–$250k+/yr) | Lenders, insurers, data buyers | Residential and mortgage focus; enterprise sales |
| 18 | **PropStream** | Investor lead-gen | LP/pre-foreclosure, Tax/liens, vacancy, Own + skip trace | 160M records incl. FL | **$99/mo** (Essentials; $81 annual); Pro $199; Elite $699; skip trace $0.10–0.12 | Residential wholesalers | Residential-first; commercial fields shallow |
| 19 | **PropertyRadar** | Investor lead-gen | LP, Tax, Own, equity | National incl. FL | **Solo $119/mo; Team $249/mo (3 users); Business $599/mo (10)** | Residential investors, service firms | Residential-first |
| 20 | **BatchLeads / BatchData** | Lead-gen + data API | LP, Tax, liens, vacancy, Own + skip trace | National | BatchLeads ~$119–$749/mo; BatchData API **from $500/mo** (20k calls); skip-trace API from $2k/mo | Wholesalers; proptech developers | Residential-first |
| 21 | **DealMachine** | Driving-for-dollars + data | LP, Tax, vacancy, Own | National | **$59 / $179 / $599 per mo** | Residential investors | Residential-first |
| 22 | **DealSignals** (formerly DistressIQ) | Distress-signal lead-gen | Probate, tax liens, LP, code violations, evictions, bankruptcy, "signal stacking" score | Tampa (Hillsborough), Orlando (Orange), Jacksonville priced as "Major" | **$179/mo per major market** ($99 standard, $279 mega); skip trace $0.08 | Residential wholesalers | Residential. The signal-stacking approach is the right idea, pointed at the wrong asset class |
| 23 | **Lispend** | FL daily court-record feeds | LP (18 FL counties incl. Miami-Dade, Palm Beach, Hillsborough, Duval), probate (13), tax-delinquent (12) | FL-specific, partial county list | Tiered (free preview, paid, volume); price not captured | Wholesalers | No commercial filtering; Broward, Orange and Pinellas missing from LP list |
| 24 | **FloridaLisPendens.com** | FL daily lis pendens feed | LP | Any FL county | **$139/mo for 1 county, +$49/county/mo** | Agents | Raw feed; no commercial filtering |
| 25 | **LienSuite** | FL tax-delinquent lists | Tax, heirs, deceased owner | 35 of 67 FL counties | Subscription (not captured) | Tax-deed investors | Residential lean |
| 26 | **RealtyTrac / Foreclosure.com** | Foreclosure listings | LP, auction, REO | National incl. FL | **$49.95/mo; Foreclosure.com $39.80/mo** | Retail investors | Residential; commercial coverage incidental |
| 27 | **DistressedPro / BankProspector** | Bank call-report distress | Bank-level NPL/REO totals + asset-manager contacts | Every FL bank and credit union (portfolio level, not asset level) | **$199/mo or $1,998/yr** | Note buyers | Lender-level only; you still have to find the asset |
| 28 | **Capitalize.io** | Loan/lender intelligence | Mat (12M+ loan comps), lender and sponsor data | National | **Solo $399/seat/mo** | Mortgage brokers, lenders | Refinance-oriented; no court or tax data |
| 29 | **HorizonsAI** | AI-native distress deal intelligence | LP, Tax, probate, Mat (24-mo), DSCR decline, vacancy, below-market rents, servicer reports, state registry, "long hold" | All 50 states; office, retail, industrial, flex, IOS | Fixed monthly by market and asset class (not published) | CRE acquisition teams | **Closest competitor.** Young product, unverified data quality, no FL-specific depth claimed |
| 30 | **Keyway** (KeyBrain) | AI sourcing + underwriting | Sourcing intelligence; rent roll/T12 automation | Multifamily-heavy | Custom; ~$40M raised | Multifamily investors | Multifamily focus |
| 31 | **Parca** | AI land acquisition | Off-market parcels via zoning/code agents | Unknown | Enterprise | Land brokers, homebuilders | Land-only; no distress |
| 32 | **Prophetic** | AI land acquisition | SearchAI (120+ use cases), ZoneAI, SiteAI yield, DevMap pipeline | National; homebuilder customers (DR Horton, M/I Homes) | Enterprise | Homebuilders, also industrial developers | Land and feasibility; no financial distress |
| 33 | **Pillar / Plotzy / LandScout / GatherGov / Algoma** | AI land, rezoning, pipeline | Rezonings, dev pipeline, parcel filters | Varies | Plotzy $65+/mo; Pillar and Algoma freemium; others not published | Land teams | No distress |
| 34 | **LandTech (LandInsight US)** | Site sourcing | Ownership, zoning, FLU, flood/wetland layers, assemblage | US (residential focus) | **$150–$200/user/mo** | Residential developers | No distress |
| 35 | **Regrid (formerly Loveland/Landgrid)** | Parcel data | Own, land use, zoning (premium), building footprints | All 67 FL counties, refreshed in 2026 | **Pro $10/mo; Team $20/user/mo**; API metered; bulk FL download priced per county/state | Anyone; developers building products | Raw parcels only |
| 36 | **MapWise** | FL-only parcel GIS | Own, zoning, FLU, flood, wetlands, soils; 100+ layers; FL Parcels API | **All 67 FL counties, most refreshed every 2 weeks from source** | Subscription; 7-day trial (price not captured) | FL brokers, appraisers, developers | No distress; good base layer |
| 37 | **Acres** | Land data | Land comps, Own, zoning (Enterprise) | National | Plus $7.49/mo; **Pro $94.99/mo**; Enterprise custom | Land brokers, appraisers | Rural/land focus |
| 38 | **Deepblocks** (Miami) | Site selection + 3D feasibility | Zoning capacity, market scanner | Strongest in Miami/FL | **From $18/mo**; higher tiers not published | Developers | No distress; small company |
| 39 | **Gridics** (Miami) | Zoning engine + API | By-right capacity; ZoneIQ reports | Many FL municipalities (Miami, Miami Beach, etc.) | Zoning reports ~$650 each; API plans | Cities, developers | No distress |
| 40 | **Zoneomics** | Zoning data + API | Zoning, prospecting tool (enterprise) | National incl. FL | **$92/mo Essentials; $279/mo Advanced**; enterprise custom | Developers, lenders | No distress |
| 41 | **TestFit** | Feasibility / yield | None | N/A | $100/mo (Urban Planner), $250/mo (Data Maps), **Site Solver $8k/yr** | Developers, architects | Downstream of sourcing |
| 42 | **Archistar** | AI site feasibility | Zoning, envelopes | Limited US | Not published | Developers | Downstream |
| 43 | **Placer.ai** | Foot traffic | Occ proxy: visit decline at retail centers and office buildings | Good FL coverage | Freemium; paid **~$5k–$30k/yr** (est.) | Retailers, landlords | Proxy only; not tied to debt or ownership |
| 44 | **SafeGraph / Dewey / Advan** (general knowledge) | Places + foot traffic data | POI closures, foot traffic | National | Dewey academic/commercial data marketplace; bulk licenses custom | Data scientists | Raw data, requires building |
| 45 | **Shovels.ai** | Building permits | Absence of permits or TI activity (inverse signal), contractor data | ~85% of US population | **API from $599/mo** | Proptech, contractors | Permits only |
| 46 | **Datex Property Solutions** (general knowledge) | Landlord BI | Tenant health for landlords' own portfolios | Customer portfolios only | Enterprise | Retail landlords | Not external data |
| 47 | **Prophia** | AI lease abstraction | Lease expirations for owned portfolios | Customer portfolios only | $150/tenant/yr + $175 setup | Owners, REITs | Not external data |
| 48 | **Blooma** | AI CRE lending | Loan underwriting (uses Moody's/Reis) | National | Enterprise | Lenders | Lender workflow |
| 49 | **Dealpath / Planisphere / Deal Manager AI / RealQuant** | Deal pipeline / triage | None (triages inbound broker deals) | N/A | Dealpath enterprise ($25k+/yr est.) | Acquisition teams | Pipeline management, not sourcing |
| 50 | **Lev / Northspyre / ARGUS (Altus) / Hello Data / Parcl Labs / Reventure / Real Estate Bees** | Financing marketplace / dev PM / valuation / multifamily comps / residential data / residential forecasts / review site | None relevant | – | Parcl Labs $99/mo Pro; Reventure $39/mo | Various | **Not relevant**: residential, multifamily or workflow tools |

---

## 2. Notes by segment

### 2.1 Debt-side (CMBS and loans): the best view of "financially struggling"

- **Where this data comes from.** Securitized loans report NOI, DSCR, occupancy, watchlist codes, special-servicing transfers and appraisal reductions every month through the CREFC Investor Reporting Package. Loan-level data (ABS-EE) is free on EDGAR. Trepp, CRED iQ, KBRA Analytics (KBRA's DealView/KCP) and Morningstar DBRS (Morningstar Credit Analytics) all resell cleaned versions of it.
- **Market conditions.**
  - CRED iQ's July 2026 figures: overall CMBS distress **10.91%**, office **16.65%**, industrial **2.35%**.
  - South Florida office foreclosures are active in 2026. Stonerock's two downtown Miami office buildings (44 W. Flagler, 200 SE 1st St) had a final judgment and auction scheduled in June 2026. Wells Fargo's $1.28B Workspace Property Trust foreclosure includes 8 suburban offices in Boca Raton, Sunrise and Miramar. This suburban office stock is the product type most convertible to industrial or flex.
- **Blind spot.** Bank-held and private-credit loans, about 2/3 of CRE debt, never appear here. For those, distress shows up only as a lis pendens in the county clerk's records. DistressedPro/BankProspector sees bank-level NPL totals from call reports but not which asset is affected.

### 2.2 Public-records "motivated seller" tools: the right signals on the wrong asset class

- PropStream, PropertyRadar, BatchLeads, DealMachine and DealSignals are cheap ($60–$700/mo) and good at stacking lis pendens, tax delinquency, code violations and probate signals.
- They are optimized for single-family homes. Commercial parcels are present, but:
  - there are no commercial filters (class, SF, tenant, loan);
  - LLC owners are not unmasked well;
  - there is no CMBS join.
- Florida-only raw feeds are cheaper still: FloridaLisPendens $139/mo per county, Lispend, LienSuite. They deliver the raw signal with no commercial filtering.

### 2.3 Land and site selection: good geometry, no finance

- Regrid, MapWise, LightBox, Acres, LandTech, Prophetic, Parca, Deepblocks, Gridics, Zoneomics and TestFit answer "what can I build here and who owns it."
- None of them rank parcels by owner financial stress.
- Prophetic is the most capable (AI search, zoning and yield, pipeline) and lists industrial developers among its targets.

### 2.4 AI-native entrants, 2023–2026

- **HorizonsAI** is the only product found that explicitly joins public filings (lis pendens, tax, probate, registry) with debt and servicer data across office, retail and industrial. Treat it as the competitive benchmark.
- Keyway, Capitalize and Prophetic each cover one piece: multifamily sourcing, loan maturities and land feasibility respectively.
- YC real-estate companies (Propaya, PropRise, Henry, PARES) work on documents and broker workflow, not distress sourcing.
- Big owners such as Blackstone and Brookfield are building this in-house (Commercial Observer, Aug 2026). That supports the idea that the joining logic is proprietary work, not a commodity.

### 2.5 Newsletters and free distress lists

- Commercial Observer, Bisnow's South Florida "Deal Sheet", The Real Deal (Miami) and South Florida Business Journal report large FL foreclosures by name.
- CRED iQ's and Trepp's (TreppWire) monthly distress reports, plus KBRA, Morningstar DBRS and Fitch surveillance reports, name troubled loans.
- The MSCI Distress Tracker publishes quarterly aggregates.
- These are free or cheap but manual. They cover large, newsworthy assets only, not the $3–20M suburban office on 8 acres.

### 2.6 Brokerage distressed desks (general knowledge)

- CBRE, JLL, Cushman & Wakefield, Newmark, Marcus & Millichap, SVN and Colliers run loan-sale and special-servicer disposition groups.
- They see distressed assets first, because special servicers hire them. They share deals with favored buyers rather than publishing them.
- For Bridge, relationships with FL special servicers (Rialto, LNR/Starwood, CWCapital, Midland, KeyBank, Trimont, Argentic) and these desks are a complementary, free channel.

### 2.7 Open source and DIY building blocks

| Source | What | Cost |
|---|---|---|
| Florida DOR property data portal | Statewide NAL (name/address/legal, DOR use code, just value, year built, owner), SDF (sales), parcel GIS | Free (general knowledge; portal page did not render during fetch) |
| Sunbiz (FL Division of Corporations) | Entity status, officers, registered agents, dissolutions; bulk data download; many Apify scrapers | Free / Apify pennies |
| County clerk official records | Lis pendens, final judgments, mortgages, assignments, satisfactions | Free to search; bulk varies by county |
| RealForeclose / RealTaxDeed (RealAuction) | Scheduled foreclosure and tax-deed auctions for most FL counties | Free to view |
| County tax collectors | Delinquent rolls, tax-certificate sales (spring each year) | Free |
| Miami-Dade / Broward 40/50-year recertification, unsafe-structures boards | Building-safety distress | Free (general knowledge) |
| SEC EDGAR ABS-EE | Loan-level CMBS (NOI, DSCR, occupancy, servicing status) | Free. GitHub: `Lekh007/bondlens-cmbs-surveillance` (demo-grade), `pkutty265/abs-monitor`, `pgoldtho/visulate-abs`, `dgunning/edgartools` |
| Regrid bulk FL / MapWise API | Normalized parcels | Paid, low cost |

---

## 3. Answers

### (1) What would a small industrial developer buy today, and what would it cost?

A realistic stack for "Florida distressed office/retail + land":

| Need | Tool | Annual cost |
|---|---|---|
| Securitized-loan distress (watchlist, special servicing, maturity, tenants) | CRED iQ Enterprise (4 users) | ~$14,400 |
| Owner unmasking + maturities + "likely to sell" + comps | Crexi Intelligence (1–2 seats) **or** Reonomy (1 seat) **or** Prospect by Buildout national | ~$2,400–$9,600 |
| Parcels, zoning, flood, wetlands (FL) | MapWise or LightBox Vision (1–2 seats) + Regrid Team | ~$2,000–$8,000 |
| Court and tax distress for FL commercial parcels | FloridaLisPendens (~6 key counties: $139 + 5×$49 = $384/mo) **or** PropStream Pro | ~$2,400–$4,600 |
| Zoning / by-right capacity | Zoneomics Advanced or Gridics reports ad hoc | ~$2,700–$3,500 |
| Optional: occupancy proxy | Placer.ai | ~$5,000–$30,000 |
| Optional: market-wide comps and sublease | CoStar (FL markets, 1–3 users) | ~$15,000–$40,000 |

- **Lean stack: ~$25k/yr.** CRED iQ + Crexi + MapWise + FloridaLisPendens + Zoneomics.
- **Full stack: ~$60k–$100k/yr.** Adds CoStar and Placer.ai.
- **Hidden cost:** 0.5–1 analyst FTE ($60k–$120k) to join all of this by parcel, filter to commercial DOR use codes, unmask LLCs and screen for industrial fit.
- **Alternative:** a HorizonsAI subscription (price unknown; likely $1k–$5k/mo, est.) may replace part of the lean stack.

### (2) What no existing tool covers (the gap)

1. **Joining court and tax records to commercial loan and tenant data at parcel level, for Florida.** Debt platforms don't read clerk records. Record tools don't read CMBS or tenants. Nobody joins lis pendens + tax certificate + Sunbiz dissolution + CMBS watchlist + lease rollover on one FL parcel ID. HorizonsAI says it does this nationally; unverified.
2. **Non-securitized (bank / private-credit) commercial distress.** This is visible only as lis pendens and assignments of mortgage in 67 separate county clerk systems. No commercial vendor filters these for commercial property with any quality.
3. **Conversion screening.** No tool asks "is this distressed office/retail parcel a good industrial, IOS, flex or last-mile site?" That takes land area, coverage ratio, zoning and future-land-use permissiveness for industrial, truck access and interstate distance, flood zone, and nearby industrial rents. Land tools do yield; distress tools do finance; nobody combines them.
4. **Florida-specific signals.** Examples:
   - Miami-Dade/Broward recertification failures and unsafe-structure cases
   - post-hurricane insurance and code issues
   - tax-certificate buyers holding multiple years of certificates on commercial parcels
   - Sunbiz entity going "inactive / admin dissolved" while it still owns a commercial parcel
   - property-appraiser just-value cuts driven by vacancy (value-adjustment-board petitions)
   - 2026 condo/insurance spillover into mixed-use
5. **Small-asset coverage.** MSCI/RCA and news coverage skip sub-$10M suburban office and strip retail, which is the inventory most likely to suit industrial conversion.

### (3) Product, service, or nothing?

**A service first, possibly a narrow product later. It is not a "nothing".**

- **Why it's not a horizontal product.**
  - Data costs are low; FL public data is free, so there is little data moat.
  - HorizonsAI, CRED iQ, Crexi, Reonomy and Prospect already sell "distress sourcing" at $200–$1,200/mo.
  - Large owners are building their own.
  - The buyer pool of FL industrial developers and IOS investors is small: perhaps 50–200 firms.
- **Why it's a service or narrow SaaS.**
  - The value is judgment plus joining: a weekly, ranked, Florida-only memo along the lines of "these 15 office/retail parcels show 2+ distress signals and pass the industrial conversion screen."
  - A small build over free FL sources (DOR NAL, clerk lis pendens, tax certificates, Sunbiz, EDGAR ABS-EE, Regrid/MapWise parcels), plus one paid CMBS feed (CRED iQ), can produce this.
  - Price as a managed service or retainer at **$2k–$5k/mo per client**, or do it as a pilot for Bridge Industrial first.
  - If 5–10 FL developers pay, then turn it into software.
- **Validation before building.**
  1. Demo HorizonsAI and CRED iQ, both with a FL office/retail filter.
  2. Ask Bridge what they currently get from broker desks and special servicers.
  3. Hand-build one county (e.g., Broward or Orange) as a pilot list to test hit rate.

---

## Sources

- CoStar pricing: [Vendr CoStar buyer guide](https://www.vendr.com/buyer-guides/costar), [PropertyScout360 CoStar cost 2026](https://propertyscout360.com/blog/costar-subscription-cost), [BiggerPockets thread](https://www.biggerpockets.com/forums/32/topics/1097759-costar-cost-any-alternatives), [PriceLevel](https://www.pricelevel.com/vendors/costar/pricing)
- CoStar products: [CoStar Loans](https://www.costar.com/products/loans), [CoStar for Lenders](https://www.costar.com/products/costar-for-lenders), [Ten-X](https://www.ten-x.com/)
- Crexi: [CRE Daily Crexi review](https://www.credaily.com/reviews/crexi-review/), [Capterra Crexi](https://www.capterra.com/p/229507/Crexi-PRO/), [WSO Crexi Intelligence thread](https://www.wallstreetoasis.com/forum/real-estate/crexi-intelligence-subscription-whats-the-catch), [CoStar v. Crexi ruling](https://www.costargroup.com/press-room/2025/federal-court-finds-rival-crexi-copied-and-cropped-thousands-costars-copyrighted), [Bisnow antitrust revival](https://www.bisnow.com/national/news/commercial-real-estate/appeals-court-revives-crexis-claims-that-costar-monopolizes-cre-information-markets-129889)
- Reonomy and Altus: [CRE Daily Reonomy review](https://www.credaily.com/reviews/reonomy-review/), [Altus Q4 2025 results](https://www.altusgroup.com/press-releases/altus-group-reports-q4-and-fiscal-2025-financial-results-and-quarterly-dividend/)
- Prospect by Buildout: [pricing](https://www.prospect-by-buildout.com/pricing)
- CRED iQ: [CRE Daily CRED iQ review](https://www.credaily.com/reviews/cred-iq-review/), [CRED iQ site](https://www.cred-iq.com/), [Commercial Observer, Aug 2026 CMBS distress](https://commercialobserver.com/2026/08/cmbs-distress-2026-cred-iq-2/)
- Data-source roundup: [CRE Daily best CRE data sources](https://www.credaily.com/reviews/best-commercial-real-estate-data-sources-for-2025/), [CRE Daily CompStak review](https://www.credaily.com/reviews/compstak-review/), [CRE Daily Moody's review](https://www.credaily.com/reviews/moodys-market-pro-review/)
- MSCI RCA: [Distress Tracker Q1 2025](https://www.msci.com/downloads/web/msci-com/data-and-analytics/real-estate/mortgage-debt-intelligence/MSCI%20Real%20Capital%20Analytics%20-%20Distress%20Tracker%20-%20Q1%202025.pdf), [Mortgage Debt Intelligence](https://www.msci.com/data-and-analytics/real-estate/mortgage-debt-intelligence)
- Yardi Matrix: [industrial](https://www.yardimatrix.com/property-types/industrial/)
- Green Street: [Market data overview](https://info.greenstreet.com/u.s.-market-data-deals-overview)
- Cherre: [Software Finder](https://softwarefinder.com/property-management-software/cherre), [BestCRE review](https://bestcre.com/cherre-review-cre-ai/)
- LightBox: [LightBox Vision](https://www.lightboxre.com/data/lightbox-vision/), [SpotSaaS LandVision](https://www.spotsaas.com/blog/landvision-reviews), [SharpLaunch RCM](https://www.sharplaunch.com/sites/rcm)
- ATTOM: [foreclosure data](https://www.attomdata.com/data/foreclosure-data/), [zillapi ATTOM API 2026](https://zillapi.com/blog/attom-api/)
- Cotality: [rebrand press](https://www.cotality.com/press-releases/meet-cotality), [BestCRE Cotality review](https://bestcre.com/cotality-review-cre-ai/)
- PropStream: [pricing](https://www.propstream.com/pricing)
- PropertyRadar: [G2 pricing](https://www.g2.com/products/propertyradar/pricing)
- BatchData and BatchLeads: [BatchData pricing](https://batchdata.io/pricing), [G2 BatchLeads](https://www.g2.com/products/batchleads/pricing)
- DealMachine: [pricing](https://www.dealmachine.com/pricing), [REsimpli](https://resimpli.com/blog/dealmachine-pricing/)
- DealSignals / DistressIQ: [DealSignals](https://dealsignals.ai/), [DistressIQ PropStream pricing blog](https://www.distressiq.ai/blog/propstream-pricing)
- Florida court and tax feeds: [Lispend](https://www.lispend.com/), [FloridaLisPendens Silver](https://floridalispendens.com/silver-subscription), [LienSuite FL guide](https://liensuite.com/blog/free-tax-delinquent-property-list-florida), [Miami-Dade tax certificate sales](https://mdctaxcollector.gov/services/tax-certificate-sales), [Florida Tax Sale portal](https://www.flataxsales.com/Delq.aspx)
- Foreclosure listings: [RealtyTrac cost](https://support.realtytrac.com/hc/en-us/articles/200561154-What-s-the-cost-to-subscribe-to-RealtyTrac-), [Foreclosure.com vs RealtyTrac](https://defaultresearch.com/comparisons/foreclosure-com-vs-realtytrac)
- DistressedPro: [BankProspector pricing](https://distressedpro.com/get-bankprospector-pro/)
- Capitalize: [AI for CRE Capitalize](https://aiforcrecollective.com/tools/capitalize-io), [CREtech launch](https://www.cretech.com/news/capitalize-launches-ai-platform-to-unlock-3-trillion-in-maturing-cre-debt/)
- AI-native entrants: [HorizonsAI](https://www.horizonsai.co/commercial), [AI for CRE Collective tool list](https://aiforcrecollective.com/ai-tools-for-commercial-real-estate), [Prophetic](https://www.propheticsoftware.ai/), [Parca](https://www.withparca.com/), [HousingWire AI land acquisition](https://www.housingwire.com/articles/ai-native-land-acquisition/), [Keyway about](https://www.keyway.ai/about), [Keyway Crunchbase](https://www.crunchbase.com/organization/keyway-ai), [YC real estate directory](https://www.ycombinator.com/companies/industry/housing-and-real-estate), [Commercial Observer on in-house AI builds](https://commercialobserver.com/2026/08/ai-real-estate-tech-brookfield-blackstone-proptech/), [AI Consulting Network off-market sourcing](https://www.theaiconsultingnetwork.com/blog/ai-off-market-deal-sourcing-commercial-real-estate-2026)
- Land and parcels: [LandTech US pricing](https://landtech.us/pricing), [Regrid plans](https://support.regrid.com/docs/plan-types-property-app), [Regrid FL data](https://regrid.com/florida-parcel-data), [Acres pricing](https://www.acres.com/pricing), [MapWise](https://www.mapwise.com/)
- Zoning and feasibility: [Zoneomics subscription pricing](https://www.zoneomics.com/pricing/subscription), [Gridics](https://gridics.com/), [Gridics developer plans](https://developer.gridics.com/plans), [Deepblocks / Refresh Miami](https://refreshmiami.com/news/deepblocks-is-using-ai-to-make-site-selection-more-efficient-and-effective/), [TestFit pricing](https://www.testfit.io/pricing)
- Placer.ai: [pricing](https://www.placer.ai/pricing), [Benzinga review](https://www.benzinga.com/money/placer-ai-review)
- Other tools: [Shovels pricing](https://www.shovels.ai/pricing), [Prophia / CB Insights](https://www.cbinsights.com/company/leaseable), [Blooma / American Banker](https://www.americanbanker.com/news/cre-meets-ai-in-fintechs-tool-for-lenders), [Datex](https://www.datexdata.com/), [Parcl Labs usage](https://docs.parcllabs.com/docs/usage-limitations), [Reventure pricing](https://www.reventure.app/pricing)
- Florida and CMBS context: [Bisnow South Florida Deal Sheet, Jun 22 2026](https://www.bisnow.com/south-florida/news/deal-sheet/foreclosure-sale-scheduled-miami-office-buildings-south-florida-deal-sheet-135107), [Workspace $1.28B foreclosure](https://www.discoversouthflorida.com/blog/128b-office-foreclosure-shows-south-florida-isnt-all-booming), [CRE Daily 2026 office maturity wall](https://www.credaily.com/briefs/cmbs-office-distress-hits-2026-maturity-wall/)
- Open source and DIY: [BondLens](https://github.com/Lekh007/bondlens-cmbs-surveillance), [abs-monitor](https://github.com/pkutty265/abs-monitor), [visulate-abs](https://github.com/pgoldtho/visulate-abs), [edgartools](https://github.com/dgunning/edgartools), [Apify Sunbiz scraper](https://apify.com/parseforge/sunbiz-florida-business-scraper/api/python), [Regrid API](https://regrid.com/api)
