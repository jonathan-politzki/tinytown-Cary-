# Finding distressed Florida office and retail buildings, and industrial land sites, from public data: methodology

*Prepared 2026-09-23 for a conversation with Bridge Industrial. This covers method only: how distress is detected and predicted, and what a defensible v1 screen looks like. Figures carry their source. Anything marked **[estimate]** is our own judgement, not a published number.*

---

## Key takeaways

1. **Distress follows a fixed order of events, and public records in Florida show most of the later ones for every loan, not just CMBS loans.** Early signals (tenant roll, falling occupancy, DSCR below 1.10) are reported monthly for CMBS loans and almost nowhere else. The late signals are public for every loan: commercial foreclosure filing and lis pendens, receiver appointment under Ch. 714, certificate of title, deed-in-lieu, tax certificate and tax deed. By the time a lis pendens is recorded, the useful early window has usually closed. The target for prediction is the 6–24 months before it.
2. **Loan maturity is the strongest predictor, and it can be estimated from public records.** At the Fed, Glancy & Kurtzman (FEDS 2024-072) found that a loan reaching maturity was **12.2 pp** more likely to go delinquent, and an office loan maturing in 2023 was **~20 pp** more likely. CREFC's July 2026 report finds non-performing matured balloons were **66%** of newly delinquent CMBS balance. Florida county records hold every recorded mortgage with the lender and the date. The documentary stamp tax (35¢ per $100) and the intangible tax (0.2%) show the loan amount. Many mortgages also state their maturity date. That gives a public "maturity wall" for bank and private loans as well as CMBS.
3. **Leverage against today's value is the second predictor, and it can be approximated.** Hinzen, Severino & Van Nieuwerburgh (2025) rebuilt bank CRE loan books from county mortgage and deed records. They rolled the last sale price forward with MSCI indices to estimate "latent distress", meaning a loan larger than the property's current value. They found latent distress runs about **4× reported delinquencies**. The same method works for Florida from public data: deeds show sale prices, recorded mortgages show loan amounts, and a regional office or retail price index supplies the roll-forward.
4. **Published accuracy is modest, so present this as a ranked list, not an oracle.** The CMBS default literature (Titman & Tsyplakov 2010; Seslen & Wheaton 2010; Glancy & Kurtzman 2024) agrees on which factors matter:
   - original LTV and current LTV
   - DSCR and debt yield (debt yield below 8% adds **+1.9 pp**)
   - occupancy (each −10 pp adds **+1.5 pp**)
   - property size (+1 SD adds about +1 pp; +2.3 pp for office)
   - non-recourse loan (+0.4 to +3.6 pp)
   - CBD location (+2 pp)
   - reaching maturity

   These effects are a few percentage points on base rates of 5–15%. A public-data-only v1 should aim for **3–5× lift in the top decile** **[estimate]**, not high precision.
5. **Scale of the blind spot.** Nationally, CMBS/CDO/ABS hold about **13%** of the $4.9–5.0T in commercial and multifamily mortgage debt (MBA, Q3 2025). Banks hold **37%**, agencies **23%** (almost all multifamily) and life insurers **16%**. Leaving out agency multifamily, CMBS is roughly **20–25%** of office and retail debt **[estimate]**. So about **three-quarters or more of Florida office and retail loans have no public performance data**: no DSCR, occupancy or payment status. For those loans we see only the loan's existence, lender, size and date, and later its default in court. No Florida-specific split by lender type is published.
6. **Mezzanine and UCC foreclosures are the hardest events to catch.** They are private sales of pledged LLC interests. The public trace is usually a notice placed 10–60 days ahead in the WSJ, NYT, a local business paper, DailyDAC/National Law Review, or on floridapublicnotices.com. None of these are structured data. No deed is recorded when the equity changes hands, and the property owner of record stays the same. Catching them means scraping and parsing text for "UCC", "Article 9", "membership interests" and "pledge", then resolving the named entities to parcels.
7. **Bridge already underwrites "covered land" deals in Miami-Dade.** It bought the 1972 Doral office park (16 ac, 202,680 SF) for **$45.2M (~$2.8M/acre)** and is building 268,702 SF of warehouse on it (FAR ~0.39). It bought the former Ryder HQ near Medley (17 ac) for **$42M (~$2.5M/acre)** and built 326,000 SF. A useful screen finds more parcels like these: 8–40 acre suburban office or retail parcels, built before about 1995, at FAR below 0.3, within about 3 miles of a limited-access highway, outside the floodway, not next to houses. Rank them by distress and by owner motivation.
8. **v1 should output two scores and two confirmed-event flags.** The scores are (a) a **Distress Likelihood Score** built from maturity, leverage, obsolescence, tenant risk, owner behaviour and physical signals, and (b) an **Industrial Suitability Score** built from size, access, zoning or future land use, flood, wetlands and adjacency. The flags are confirmed events (lis pendens, receiver, UCC notice, tax certificate) and CMBS surveillance where it exists. Backtest on 2023–2026 events: freeze features at 1 Jan 2023, label foreclosure filings, distressed deeds and sales well below prior price through mid-2026, and report precision@k and lift by county.

---

## 1. How professionals find troubled office and retail assets

### 1.1 Who looks, and at what

| Participant | Primary lens | Data they rely on (public / private) |
|---|---|---|
| CMBS master and special servicers | Loan surveillance under the PSA; CREFC watchlist codes | Borrower financials and rent rolls (private), CREFC IRP files |
| Distressed-debt funds and note buyers | Loans coming to market (note sales), SS pipeline, maturities | Trepp, CRED iQ, KBRA, Intex (paid); broker note-sale books; court dockets |
| Bank workout / special assets groups | Their own book: maturity, covenant tests, appraisals | Internal (private) |
| Opportunistic buyers (e.g., Bridge) | Distressed or motivated sellers of well-located land | Broker relationships, CoStar and Reonomy (paid), county records, lis pendens, "who owns what" |
| Brokers' distressed desks (JLL, Newmark, CBRE, Ten-X/Crexi auctions) | Mandates from lenders, receivers, special servicers | Relationships; receivers' marketing |

The private sources (rent rolls, lender relationships, Trepp) can't be copied from public data. What we can copy is **their triggers** and **their timing**.

### 1.2 The order of signals, from earliest to latest

Lead times are typical ranges before the asset actually trades or changes hands. Sources are cited where published; the rest are **[estimate]** from the timelines of the documented cases below.

| # | Signal | Where it becomes public (Florida) | Typical lead before trade | False-positive character |
|---|---|---|---|---|
| 1 | **Large tenant lease expiry / downsizing / sublease listing** | Private (CoStar/LoopNet sublease listings are semi-public); CMBS EX-102 lists the top 3 tenants with lease expiries; press releases; WARN notices | 12–36 mo | **High.** Most rollovers are re-leased or renewed. CREFC watchlist code 4C (tenant >30% of space expiring within 12 mo) is informational until it happens |
| 2 | **Occupancy decline** | CMBS only (EX-102 "most recent physical occupancy"); a proxy from parking and foot traffic; business-licence and Google-listing churn | 12–30 mo | High for one reading; lower for a steady decline. The CREFC trigger is occupancy down >20% from underwriting, or below 80% |
| 3 | **DSCR below 1.10 (fixed) or below 1.0 (floating); DSCR below 75% of underwritten** | CMBS only (EX-102 NOI/DSCR; watchlist code 1E/1F/1G) | 6–24 mo | Medium-high. Many watchlisted loans refinance or cure. A Silver Spring office at **1.34x DSCR** still failed at maturity (CREFC Jul-2026), so low DSCR is neither necessary nor sufficient |
| 4 | **Servicer watchlist** | CMBS trustee reports (registration-walled, free); summarised by Trepp and KBRA | 6–24 mo | Medium-high (the watchlist includes "informational" codes) |
| 5 | **Cash management / lockbox springs; taxes unpaid 60+ days** (code 1B) | CMBS reports; **property tax delinquency is public for all loans** (county tax collector; certificate sale by June 1) | 6–24 mo | Medium. Lender escrow hides tax stress on most institutional loans. It is a strong signal for unescrowed and private owners |
| 6 | **Maturity approaching / missed balloon** | CMBS maturity date; **recorded Florida mortgage (date, lender, amount, often maturity)**; extensions and modifications are sometimes recorded as mortgage modification agreements | 0–18 mo | Medium. 66% of new CMBS delinquencies in Jul-2026 were matured balloons, but many are later extended (e.g., the Mid Valley Plaza forbearance with 98% occupancy) |
| 7 | **Transfer to special servicing** | CMBS: EX-102 "most recent special servicer transfer date"; trade press | 3–36 mo | Low-medium. Outcomes in the Dec-2025 SS pipeline: **foreclosure 29.1%**, REO 9.7%, modification/extension 17.3%, DPO 2.1% (Leech Tishman citing tracker data) |
| 8 | **Appraisal reduction (ARA) / new appraisal** | CMBS remittance (EX-102 "most recent value") | 3–24 mo | Low. Appraisals lag: 2026 office liquidations cleared **~20% below latest appraisal** (Deutsche Bank via CREFC) |
| 9 | **Commercial foreclosure complaint + lis pendens** | County clerk civil docket; lis pendens recorded in Official Records; the civil cover sheet flags *commercial* foreclosure | 3–30 mo | **Low.** Some cure, reinstate or DPO |
| 10 | **Receiver appointed (Fla. Stat. Ch. 714)** | Court order; §714 requires the order and legal description to be recorded | 3–18 mo | Low. The receiver can sell **free and clear** of the appointing lender's lien and junior liens with court approval |
| 11 | **UCC/mezzanine sale** (equity, not real property) | Legal notices (WSJ, NYT, local papers, floridapublicnotices.com, DailyDAC) | 0–2 mo (sale itself) | Low, but **the building doesn't "trade"**; ownership changes above the deed |
| 12 | **Note sale** | Broker marketing; rarely public; later seen as an assignment of mortgage recorded in Official Records | 0–12 mo | Low |
| 13 | **Judgment → clerk's foreclosure auction (realforeclose.com sites) → certificate of title** | Clerk; online auction calendars; certificate of title recorded | 0–3 mo | Very low (this is the event itself) |
| 14 | **Deed-in-lieu** | Deed recorded to lender or lender affiliate; doc stamps on a DIL are computed on the debt | 0 | n/a (event) |
| 15 | **REO sale** | Deed from lender or trust entity (e.g., "…2018-C46 REO LLC", "Wells Fargo as Trustee…") | 0 | n/a |
| 16 | **Tax certificate → tax deed** | Tax collector certificate sale (June); tax deed application ≥ 2 years after April 1 of issue year (Fla. Stat. 197.502); notice recorded | 24–84 mo | Low for institutional assets (rare); a useful flag for small owners |

**Documented timelines (useful for calibration):**
- *Workspace Property Trust* ($1.28B 2018 CMBS, 146 suburban office and flex properties including 8 FL offices of 1.3M SF in Boca Raton, Sunrise and Miramar). Restructured and extended in 2023, matured 1 Jul 2025, and Wells Fargo as trustee filed foreclosure in Palm Beach County on 18 Aug 2026. That is **about 13 months from maturity default to filing, and about 3 years from the first public sign of trouble (the 2023 extension)**. Value fell from $1.63B to $1.24B; occupancy fell from about 89% to about 75%.
- *Silver Spring Plaza* (CREFC Jul-2026): defaulted at its 2023 maturity, got a 3-year extension, and **failed again at the extended maturity**. Occupancy fell every year (88% → 57.9%) and it was cash-managed from 2024. A loan that was modified once is a high-risk repeat.
- *Gateway Center, Pittsburgh* (JPMCC 2013-C10): extended 2023–2025 and resolved by note sale at **$37.7M against a 2025 appraisal of $69.5M**, with $10.4M of fees. Office loss severity is about **48–63%** in 2026 (DB, JPM via CREFC).
- CRED iQ: **special servicing transfers lag delinquency by 1–3 months**, and many loans enter SS before they are formally delinquent.

**What this means for the model:** The public-record events (9–16) should be **labels and confirmation flags**, not predictors. The predictive features are the things that come before them: maturity, leverage, obsolescence, tenant and owner behaviour.

### 1.3 Where the market is (context for base rates)

| Metric (latest) | Value | Source |
|---|---|---|
| Trepp CMBS delinquency, all | **7.86%** (Jul-2026; highest since Nov-2020) | CREFC/Trepp |
| Office CMBS delinquency | **11.91%** Jul-2026 (12.34% record Jan-2026) | CREFC/Trepp; CPE |
| Retail CMBS delinquency | **6.96%** Jul-2026 | CREFC/Trepp |
| Special servicing, office / retail | **16.58% / 13.28%** Jul-2026 | CREFC/Trepp |
| KBRA distress rate (DQ + current-in-SS), office | 16.4% YE-2025; 17.0% May-2026 | Leech Tishman citing KBRA |
| CRED iQ distress rate, all | 12.07% Mar-2026 | CRED iQ |
| Bank CRE past-due + nonaccrual | **1.45%** Q4-2025; 1.67% median at banks >$100B | FDIC 2026 Risk Review |
| Modified bank CRE loans | $11.6B (0.38%), 82% performing; big banks = >50% of mods | FDIC 2026 Risk Review |
| Latent distress (loan > current value), banks | about **4× reported delinquency** | Hinzen, Severino & Van Nieuwerburgh 2025 |
| CMBS outstanding | $660.5B (51% conduit, 49% SASB) | CREFC Jul-2026 |

The gap between bank (1.45%) and CMBS (~8–12%) delinquency is mostly **composition**: banks hold smaller, lower-LTV, recourse, non-CBD loans (Glancy & Kurtzman). It is also partly **modification**: banks were about 5 pp more likely to extend. Bank-held Florida office and retail loans that look like CMBS loans (large, high LTV, non-recourse, maturing) should be scored as CMBS-like risk.

---

## 2. Mezzanine and UCC Article 9 foreclosures

**Mechanics.** A mezzanine lender holds a pledge of the membership interests in the LLC that owns the property. On default it sells those interests at a public UCC sale, which a court may later review for "commercial reasonableness" under UCC 9-610. The Florida version is Ch. 679. UCC 9-612 treats **10 days' notice** as reasonable in a non-consumer deal. In practice, sales now run **about 60 days** from notice because of commercial-reasonableness challenges, down from as little as 30 days before (Commercial Observer, 2024). Courts look at the advertising (e.g., *Edgewater*: WSJ ads plus about 60 bidders contacted).

**How they are noticed publicly:**
- **National papers:** small legal ads in the back pages of the WSJ and NYT. The Real Deal and Commercial Observer often write the story.
- **DailyDAC / National Law Review** "Public Notice of UCC Sale" pages. Each is HTML with a consistent title pattern ("PUBLIC NOTICE OF UCC [ARTICLE 9] SALE: <entity>"), which makes them fairly easy to scrape.
- **Florida papers and floridapublicnotices.com.** Florida Press Association's statewide repository. Newspapers must upload every legal notice they print. It is searchable by county, newspaper, date and text, keeps 35 days live plus up to about 3 years archived, and has email/text alerts. **No public API or RSS.** Results are HTML text, often with PDF images of the ad. *Example:* the notice of public sale of collateral for **925 N Miami LLC** (property at 941 N Miami Ave, secured party TIG Romspen), sale on 16 Oct 2025 at Shutts & Bowen, Miami. It was published through McClatchy's iPublish (Miami Herald) as a PDF.
- **Florida HB 7049 (2022, effective 1 Jan 2023)** lets *government* notices go on county websites instead of newspapers. Private notices (foreclosure sales, UCC sales) still go through newspapers and the FPA site. A Yale/Chicago Booth paper using this data (Munevar, Nakhmurina & Samuels 2025) found newspaper notice fell sharply in counties that switched.
- **UCC-1 filings** (Florida Secured Transaction Registry, floridaucc.com; images from 1997, with a data-download offering). *Caveat:* mezz lenders on LLC interests often perfect **by control**: Article 8 opt-in, certificated interests delivered to the lender. The UCC-1, if any, is filed in the **debtor's state** of organisation, often Delaware. **So the Florida UCC registry misses most mezz pledges.**

**Machine-readability:** poor. Nothing is structured. A workable pipeline has four steps:
1. Scrape floridapublicnotices.com daily, plus DailyDAC and the WSJ/NYT legal-notice pages.
2. Filter the text for `UCC|Article 9|membership interest|pledge|public sale of collateral|secured party`.
3. Extract the debtor entity, the property address and the secured party with an LLM or NER step.
4. Match the entity to Sunbiz (FL entity → principals, registered agent) and the address to the parcel.

Expected volume is small: dozens a year statewide **[estimate]**. Nationally, one auctioneer's count went from 19 (2019) to about 70 (2024). Each hit is high-value.

**Trace after the sale:** the property owner of record doesn't change. Watch for a new **Sunbiz annual report or amendment** listing different managers or members, or a new registered agent, and for a **new recorded mortgage or assignment** soon after.

---

## 3. Literature on predicting CRE loan default and distress

### 3.1 Features that consistently matter

| Feature | Direction and size (where published) | Source |
|---|---|---|
| **Reaching maturity / balloon** | +12.2 pp delinquency (all); ~+20 pp for office loans maturing in 2023 | Glancy & Kurtzman, FEDS 2024-072 |
| **Current LTV** (not just origination LTV) | The key state variable. +10 pp LTV → +1.3 pp office DQ. +1 SD LTV (0.16) → +0.8 pp (all) | Glancy & Kurtzman; ResearchGate CRE ML review; Titman & Tsyplakov (RFS 2010) |
| **DSCR / debt yield** | Debt yield below 8% → +1.9 pp. DSCR has a negative relationship (contemporaneous and original) | Glancy & Kurtzman; Singh (Cornell Hosp. Q. 2019; 5,266 lodging CMBS loans) |
| **Occupancy** | −10 pp occupancy → +1.5 pp DQ | Glancy & Kurtzman |
| **Property size / loan size** | +1 SD ln(value) → +1.0 pp (all), +2.3 pp (office). Large office explains about half the bank-vs-CMBS gap | Glancy & Kurtzman |
| **Recourse** | Recourse −0.4 pp (all), −3.6 pp (office) | Glancy & Kurtzman |
| **CBD / remote-work exposure** | CBD +2 pp. +1 SD teleworkable share → +25 bp | Glancy & Kurtzman; Gupta, Mittal & Van Nieuwerburgh (NBER w30526: office values −39% to −45%) |
| **Contemporaneous stress vs ruthless option** | Default is not "ruthless". Cash-flow stress (DSCR) matters alongside negative equity | Seslen & Wheaton (REE 2010) |
| **Originator quality** | Loans from originators with large negative stock returns before origination default more | Titman & Tsyplakov (RFS 2010) |
| **Building age / quality, low-rent neighbourhood** | Regional banks hold the oldest buildings in each market (masked risk) | Hinzen, Severino & Van Nieuwerburgh 2025 |
| **Prior modification / extension** | Repeat-failure pattern (Silver Spring, Oglethorpe) | CREFC Jul-2026 case notes |
| **Interest-only / floating rate** | Higher risk. Floating-rate DSCR has its own watchlist trigger | Glancy & Kurtzman; CREFC PRG 1G |

### 3.2 Machine-learning results

- **Glancy & Kurtzman (2024)** used OLS, decision trees, KNN and random forests on Fed Y-14Q plus Morningstar CMBS data. Fitted delinquency rates came within 2 bp of observed rates in aggregate. Observables (size × office, LTV, location) explain most of the gap between large and small banks. Their main point for us: **simple observable characteristics carry most of the signal**. Complex models added interpretability problems more than accuracy.
- A **deep-learning frailty model on Trepp data** (AEA 2020, "Liquidity-constrained vs strategic default"; 31 Trepp variables plus state macro) models latent macro factors. It is useful mainly with loan-level financials, which we lack.
- General loan-default ML (consumer and mortgage) reports AUCs of **0.75–0.91**, with gradient boosting beating logit. **Don't carry these over.** They use borrower-level payment data. For CRE loans without financials, expect **AUC around 0.70–0.80** at best **[estimate]**. Glancy & Kurtzman's own feature set was at a similar level of detail.
- **Hinzen/Severino/Van Nieuwerburgh** is the most relevant template. It is a **public-records-only** loan book (ICE/Black Knight county mortgage, assignment and deed data plus assessor rolls). Current value is the last arm's-length price times an MSCI index for 240 location × sector cells. Distress = value < loan. This is a structural measure, not a trained classifier, and it can be copied in Florida directly.
- **Trepp, CRED iQ, KBRA:** rating agencies such as KBRA (KCP) and Moody's (CMM) use DSCR and LTV stress models on CMBS. CRED iQ's "distress rate" combines 30+ DQ, SS, and matured-performing loans. These are CMBS-only. Where a Florida asset is in CMBS, their outputs (or the SEC EX-102 fields behind them) should replace our proxy features.

### 3.3 Regulators, 2023–2026

- **FDIC 2026 Risk Review:**
  - Office vacancy was 14.0% at YE-2025 and flat; values improved slightly and suburbs beat CBDs.
  - Bank CRE PDNA was 1.45% and CRE charge-offs were negligible.
  - Private credit in CRE is about $300B.
  - Modifications are concentrated at banks over $100B.
  - CMBS office DQ was 11.31% at YE-2025.
- **NY Fed "extend-and-pretend" (2024):** banks extended troubled CRE loans from 2022, which pushed maturities into a wall of about $1T in 2025 and cut new CRE originations by 4.8–5.3%. **Implication:** extensions *delay* the visible default. A recorded **mortgage modification or extension agreement** is itself a risk feature.
- **Fed Supervision & Regulation Report (Dec-2025):** CRE remains the main credit watch area.

### 3.4 Florida specifics

- South Florida office vacancy was about 18.7% in Q1-2026 (secondary source). Florida's Class B/C suburban office parks (Boca, Sunrise, Miramar, Doral, Tampa Westshore, Maitland/Orlando) are the stock at risk. CMBS Sun Belt office distress is **lower** than in gateway cities.
- The live cases include the Workspace portfolio (8 FL offices), the 925 N Miami UCC sale, and CMBS Orlando hotel loans (not in scope).
- **Florida's public records are unusually rich.** They include:
  - the DOR NAL/SDF statewide roll (2002→ and sales from 2009→, CSV)
  - statewide parcel polygons (FGIO)
  - documentary stamps, which reveal both **sale price** (deed, 0.70%) and **loan amount** (note, 0.35%)
  - Sunbiz bulk SFTP (daily and quarterly)
  - a *commercial foreclosure* case type on the civil cover sheet
  - clerk online auction calendars

  Most states offer less.

---

## 4. Owner-level and tenant-level signals

| Signal | Public source (FL) | Why it matters | Notes / false positives |
|---|---|---|---|
| **Entity inactive / annual report missed** (Sunbiz status "INACT/ADMIN DISSOLVED FOR ANNUAL REPORT"; reports due May 1) | Sunbiz daily and quarterly SFTP files (free) | A single-purpose LLC left to lapse suggests the sponsor has walked away | Many small LLCs lapse by accident and reinstate. Weight it more when combined with other signals |
| **Registered agent / manager change**, new "manager" that is a lender or servicer affiliate | Sunbiz amendments / annual report | Sign of a UCC-sale or receiver takeover | Matches to lender names (Romspen, Rialto, LNR, Midland, KeyBank Real Estate Capital, CWCapital, Trimont, Argentic, etc.) |
| **Portfolio contagion** | Group parcels by owner name, mailing address, Sunbiz principals or registered agent | A sponsor with one foreclosure is likely to have others (Workspace: 146 properties) | Needs entity resolution. Big sponsors often have separate SPEs per asset |
| **Mailing-address change on the tax roll** to a lender, receiver or law firm; "c/o" a special servicer | NAL owner mailing address, compared year on year | Control has shifted | Cheap and strong. Also watch for a change to a property manager |
| **Transfers to affiliated LLCs / quitclaim deeds / $10 consideration deeds** | SDF qualification codes; Official Records; min doc stamps | Pre-workout restructuring, estate moves, protecting assets | Many are benign (estate planning, 1031, refinance) |
| **Lender-affiliated entity takes title** | Grantee name contains "REO", "Trust 20xx-", "as Trustee", bank names | Confirms REO. The event label | n/a |
| **Out-of-state / foreign owner** | NAL mailing address state | Base-rate modifier. Absentee owners sell more readily | A weak predictor by itself |
| **Mortgage modification / extension recorded; assignment of mortgage** | Official Records | Past trouble (extend-and-pretend) and note sales | Assignments also happen in routine securitisation |
| **Tenant bankruptcy** | PACER ($0.10/page) or free CourtListener RECAP; retailer bankruptcy lists; Ch. 11 lease-rejection motions list store addresses | Anchor/co-tenancy cascades for retail | Rejected-lease schedules are PDF but include addresses. High value for strip centres |
| **Store-closure announcements** | Press, SEC 8-Ks, liquidator (e.g., Hilco, Gordon Brothers) store lists | Retail vacancy ahead of time | n/a |
| **WARN notices** | FloridaCommerce WARN list (PDF/HTML; 1998→ via third-party aggregators) | Office tenant downsizing or closure at a specific address | Only ≥100 employees. Addresses usually included |
| **Business-licence / local business tax receipt lapses** | County/city BTR databases (varied) | Tenant churn at an address | Coverage and format vary by county |
| **Google Places / reviews decline, "permanently closed"** | Google Places API (paid per call); OSM POIs | Tenant-level vacancy in retail and medical office | Terms-of-service limits storage |
| **Job postings stop at an address** | Indeed/LinkedIn (scraping restricted) | Tenant contraction | Low coverage; skip in v1 |

---

## 5. Physical and observed signals

| Signal | Data | Who has published / used it | Practical notes |
|---|---|---|---|
| **Parking-lot occupancy** | NAIP (60 cm–1 m, roughly every 2–3 years, free); county orthoimagery (3–6 in; Miami-Dade, Broward, Palm Beach, Hillsborough, Orange fly often); Maxar/Planet (paid) | Katona, Painter, Patatoukas & Zeng (Berkeley Haas, RS Metrics retailer car counts → trading edge); *Detecting Parking Spaces in a Parcel using Satellite Images* (arXiv 1909.05624, ~97.6% class accuracy); AGILE 2023 "Satellite parking"; Western Ontario thesis on aerial parking occupancy; ResearchGate study on retailer performance from parking traffic | The biggest limit is the **time of capture**: orthos are single weekday snapshots, often winter mornings. Use them as a *relative* measure (this building vs its peers in the same flight). Works well for suburban office parks with surface lots, which are exactly Bridge's targets |
| **Night-time lights** | VIIRS DNB (500 m, monthly, free) | Housing-vacancy and commercial-vitality studies (IJRS 2019; IJRS 2026 SE Asia commercial index, R² 0.80 vs service GDP) | **Too coarse for single buildings** in dense areas. At most a submarket control |
| **Cell-phone foot traffic** | Placer.ai, Advan, Unacast (paid); Kastle badge-swipe barometer (published at metro level) | Placer.ai Office Index (national visits still well below 2019); Advan used in academic papers | Building-level data is paid. Worth one licensed pilot for the top 500 candidates |
| **Permit activity dropping / TI permits absent** | County and city permit portals (heterogeneous; some Socrata/ArcGIS open data) | Standard in PropTech (Shovels, BuildZoom) | No TI or buildout permits over 3 years on a multi-tenant office is a weak negative signal |
| **Code violations / unsafe structure / 40-year (now 30-year) recertification failures** | Miami-Dade and Broward recertification lists; municipal code-enforcement data | Florida-specific: building recertification after Surfside | A strong capex-shock indicator for 1970s–90s office in South Florida |
| **Deferred maintenance** | Street View time series; roof condition from ortho; vegetation in parking lots | Research-grade only | Nice to have; skip in v1 |
| **"For Lease" / "Available" signage, LoopNet/Crexi listings** | Listings sites (ToS limits) | Brokers use availability rate by building | Semi-public; a legal review is needed before scraping |

---

## 6. Land-site screening for an infill industrial developer

### 6.1 Criteria used in practice (with Bridge's own FL deals as calibration)

| Criterion | Typical infill threshold | Evidence / rationale | Public data (FL) |
|---|---|---|---|
| **Site size** | ≥ 8–10 acres for multi-tenant bulk or last-mile; 3–8 ac for small-bay or industrial outdoor storage (IOS); 15–40 ac is the sweet spot | Bridge Doral 16 ac; Flagler Station (Ryder HQ) 17 ac; Port Everglades 22 ac. Polk County study used 10–100 ac | FDOR NAL (acreage), FGIO parcels; aggregate adjacent parcels under common/related ownership |
| **Achievable coverage** | FAR 0.35–0.45 (35–45% coverage single-storey) | Doral: 268.7k SF / 16 ac ≈ 0.39; Flagler: 326k / 17 ac ≈ 0.44 | Derived from parcel geometry |
| **Existing improvement ratio** | Building-to-land value low; existing FAR < 0.3 (suburban office park, surface parking) | "Covered land": the existing buildings are a carry cost; the land is the asset | NAL just value land vs building; year built; building SF |
| **Truck access** | ≤ 2–3 miles to limited-access highway interchange (I-95, I-75, I-4, Turnpike, SR-826/836/869, I-595); on a designated truck route; no low bridges or residential streets | Link Logistics and other infill guides; Bridge's sites cluster on SR-826 and near the Turnpike and ports | FDOT RCI roads, SIS network, interchanges (FDOT open data); OSM |
| **Population / labour** | Within 30–45 min drive of 1M+ people; last-mile within ~10–15 mi of dense rooftops | Last-mile economics | Census ACS / LODES; isochrones (OSRM) |
| **Zoning / future land use** | Industrial by right is best. Office/commercial with **FLU allowing industrial**, or a credible rezoning next to existing industrial | Doral required approval to convert office to industrial; rezonings are slower than by-right | County/city zoning and FLU GIS (varies); FGDL statewide land-use layers |
| **Flood** | Outside the floodway; Zone X preferred; AE acceptable with fill (Miami-Dade county flood criteria raise pad elevation) | Raises site-work cost; insurance | FEMA NFHL (free) |
| **Wetlands** | Avoid NWI/FL wetlands; mitigation cost | Permitting risk (SFWMD/SWFWMD ERP; USACE) | USFWS NWI; FDEP/WMD land cover |
| **Soils / geotech** | Avoid muck or peat and deep organic soils; karst risk (central FL sinkholes) | Foundation cost | NRCS SSURGO; FGS sinkhole reports |
| **Contamination** | Screen for dry cleaners, fuel, prior industrial use | Brownfield time and cost (also a possible incentive) | FDEP Contamination Locator Map, brownfield areas; EPA ECHO |
| **Utilities** | Water and sewer available; power capacity (EV fleets, cold storage) | Carry and timing | Utility service-area GIS; hard to know in detail |
| **Neighbour uses** | Not bordering single-family (truck noise → rezoning opposition); industrial or commercial neighbours best | Community opposition is the most common rezoning killer | Land-use codes of adjacent parcels (NAL DOR use code) |
| **Clear height / building potential** | Site depth for 32–36′ clear, 130–185′ truck courts, trailer parking | Modern spec | Parcel shape metrics (min depth, rectangularity) |
| **Assemblage** | Adjacent parcels with the same or related owners, or distressed neighbours | Makes up for small individual parcels | Parcel adjacency graph plus owner resolution |

### 6.2 Underwriting a "covered land" play (office or retail → industrial)

Residual land value (RLV) compared with acquisition price:

```
Stabilized industrial value  = New SF × market rent (NNN) × (1 − vacancy) / exit cap
Development cost             = hard (shell + sitework) + soft + demo/abatement + entitlement + carry + profit margin
RLV                          = Stabilized value − Development cost
Buy if (Acquisition price + interim carry − interim NOI from existing tenants) ≤ RLV × (1 − risk haircut for entitlement/timing)
```

- The **existing building's NOI during entitlement** (typically 12–30 months) offsets carry. A partly vacant, distressed office park with 2–3 years of rump leases is ideal: low price, some income, and a seller or lender who wants to exit.
- **Demolition** runs about $4–12/SF for Florida commercial and warehouse, plus $2–4/SF for asbestos in pre-1980 buildings (industry price guides). A 200k SF office park costs about $1–3M to demolish, which is small next to land at about $2.5–2.8M/acre in Miami-Dade infill.
- Rough comparison: Bridge paid **$45.2M ÷ 16 ac ≈ $2.8M/ac** for an obsolete 1972 office park. So the screen should look for office and retail parcels whose **implied $/land-acre** (recent sale price, or just value × a market ratio) is well below local industrial land comps, on sites that pass 6.1. **Price per acre is the main filter.**

### 6.3 Existing Florida GIS suitability examples

- **Polk County industrial site suitability** (Symbiosis Planning, 2026). It started from 426,311 parcels (2025 parcel data and FLU layers) and narrowed to 1,025 industrial-characteristic parcels, then 140 of 10–100 ac, then 52 vacant candidates. It is a filter cascade and doesn't publish weights.
- Generic MCDA/AHP methods (ISPRS 2018 industrial suitability; ArcGIS Business Analyst suitability; QGIS weighted overlay) standardise each layer to 0–100, weight it and sum. v1 should do the same at the **parcel** level, not the raster level.
- Florida DEO/FloridaCommerce "site certification" style checklists and county economic-development site inventories (e.g., JAXUSA, Miami-Dade Beacon Council) use similar factors: acreage, zoning, utilities, access, environmental.

---

## 7. A defensible v1 screening model for Florida

### 7.1 Universe

- **Parcels:** FDOR NAL, statewide, with DOR use codes **11–19** (stores, mixed use, department stores, supermarkets, regional and community shopping centres, 1-storey and multi-storey office, professional buildings), **21–23** (restaurants, banks) and **10** (vacant commercial). About 100k–150k parcels **[estimate]**. Filter to ≥ 1 acre for the distress score and ≥ 3 acres for the industrial overlay.
- **Join keys:** parcel ID ↔ Official Records (deeds, mortgages, lis pendens) ↔ Sunbiz entity ↔ CMBS EX-102 property address (where securitised) ↔ court dockets.

### 7.2 Score A: Distress Likelihood (0–100)

Two parts. **Confirmed-event flags** are shown separately and are *not* part of the score: open commercial foreclosure or lis pendens, receiver order, UCC-sale notice, tax certificate outstanding, CMBS in SS/REO, deed to lender. The **predictive score** is built from pre-event features:

| Block | Weight | Features (public source) | Scoring logic |
|---|---|---|---|
| **Maturity / refinance pressure** | 25 | Latest recorded mortgage date and amount (doc stamps / mortgage record); stated maturity if parsed, else origination + 5/7/10-yr term assumption; recorded modification/extension; CMBS maturity (EX-102) | Max points if an estimated maturity falls in the past 12 mo or next 18 mo and the loan was originated 2015–2022 at low rates. +bonus for a prior extension or modification (repeat-failure pattern) |
| **Leverage vs current value** ("latent distress") | 25 | Loan amount ÷ (last arm's-length price from SDF × submarket office/retail index roll-forward); fallback: loan ÷ (just value / assessment ratio) | Points rise steeply above an implied current LTV of 80%, max at >100% |
| **Asset obsolescence / demand** | 15 | Year built (pre-1990 office), building SF (size effect), suburban Class B/C proxy (low just value/SF vs submarket), office share in submarket, CBD flag, recertification due (Miami-Dade/Broward) | Office-heavy weighting per Glancy & Kurtzman (size × office) |
| **Tenant risk** | 10 | Retail: bankrupt or closing tenant at the address (PACER/RECAP rejection lists, closure lists); office: WARN notice at the address; business-licence churn; Google "closed" POIs at the parcel | Points by the share of known tenants affected |
| **Owner behaviour / contagion** | 15 | Sunbiz inactive / admin dissolved; RA or manager change; mailing-address change to c/o lender or receiver; related-entity foreclosures (portfolio); quitclaim to affiliate; tax delinquency (certificate issued) | Contagion: +points if any related parcel has a lis pendens in the past 24 mo |
| **Physical / activity** | 10 | Parking-fill ratio from the latest county ortho vs same-flight peers; permit inactivity; (optional paid) foot-traffic index | Relative percentile within submarket |

Where a parcel is **CMBS collateral**, replace the proxies with actual EX-102 values: DSCR, occupancy, top-tenant expiries, watchlist and SS dates, ARA/most recent value. Mark these "high-confidence".

Start with **hand-set weights** (above), then **fit a logistic regression or gradient-boosted model on the backtest labels** (7.4). Keep the weighted version as a benchmark that is easy to explain.

### 7.3 Score B: Industrial Site Suitability (0–100)

| Factor | Weight | Scoring |
|---|---|---|
| Size (incl. assemblage with same/related-owner or distressed neighbours) | 20 | 0 below 3 ac; linear to max at 15–40 ac |
| Highway access (network distance to a limited-access interchange; truck route frontage) | 20 | Max ≤ 1 mi; 0 beyond 5 mi |
| Zoning / FLU compatibility | 15 | Industrial by right 100; FLU permits industrial 70; commercial next to industrial 40; residential FLU 0 |
| Flood / wetlands / soils | 15 | Zone X, no NWI, no muck = 100; floodway or large wetland = exclusion |
| Neighbour compatibility | 10 | Share of perimeter touching single-family residential (penalty) |
| Market (distance to population and existing industrial clusters; submarket industrial vacancy if licensed) | 10 | Isochrone population within 30 min |
| Covered-land economics | 10 | Implied land $/ac (price or JV) vs local industrial land comps; building-to-land value ratio; existing FAR < 0.3 |

**Hard exclusions:** floodway, conservation or parks FLU, < 2 acres after assemblage, landlocked or no truck ingress.

**Final ranking:** `Opportunity = f(Score A, Score B)`. Rank on the product, or rank Score B ≥ 60 by Score A. Show the confirmed-event flags as a separate "actionable now" column.

### 7.4 Validation: backtest design (2023–2026)

1. **Snapshot** all features as of **1 Jan 2023** using the 2022 final NAL, SDF sales through 2022, Official Records through 2022, Sunbiz as of Q4-2022, and EX-102 as of Dec-2022. **No look-ahead:** use only records with a recording date before the snapshot.
2. **Labels** (any within 24 months, 1 Jan 2023 – 31 Dec 2024; then roll forward to a 2024 snapshot → 2026 labels):
   - commercial mortgage foreclosure filed (civil case type / lis pendens by a mortgagee)
   - receiver appointed
   - certificate of title or deed to a lender or lender affiliate; deed-in-lieu
   - "distressed sale": arm's-length sale ≥ 30% below the prior sale price, or below the outstanding recorded mortgage amount
   - CMBS transfer to SS, REO or note sale (EX-102)
   - tax deed application
   - *(secondary)* UCC-sale notice naming the owner entity
3. **Metrics:**
   - precision@k (k = 50, 100, 500) and **lift** over the base rate
   - PR-AUC (more useful than ROC-AUC because events are rare)
   - calibration by decile
   - results by county and by office vs retail
   - lead time (months from first entering the top decile to the event)
4. **Split:** train on the 2023 snapshot and test on the 2024 snapshot (a temporal holdout). Also do leave-one-county-out to check whether the model works across counties.
5. **Baselines to beat:** (a) "loan maturing in the next 24 mo", (b) "office built before 1990", (c) random. If the full model doesn't clearly beat (a), simplify.
6. **Hand audit:** check the top 100 against news and broker knowledge (Bridge's team) to measure label noise. Many distressed outcomes (DPOs, quiet discounted sales, extensions) produce **no label**. Measured precision is therefore a *lower bound*.

**Expected performance [estimate, to be replaced by the backtest]:**
- **Base rate** of a labelled distress event within 24 months: roughly 2–5% of Florida office and retail parcels ≥ 1 ac. This rests on national bank PDNA of ~1.5%, CMBS office DQ of ~12%, and suburban FL outperforming.
- **Top-decile lift:** 3–5× → **precision about 10–25% for "any event"**. Higher, about 30–50%, for the top 100 when the CMBS and confirmed-owner-signal subset dominates.
- **Recall at top decile:** about 30–50%.

A seller-motivation list at this precision is still useful to a buyer's acquisitions team. The cost of a false positive is a phone call or letter.

### 7.5 What public data cannot see, and how big the gap is

| Blind spot | Size / consequence |
|---|---|
| **Performance of bank, life-co and debt-fund loans** (payment status, covenants, DSCR, occupancy, NOI) | Nationally, CMBS/CDO/ABS hold **~13%** of CRE+MF mortgage debt ($642B of ~$4.9T, MBA Q3-2025). Banks hold 37% ($1.8T), agencies/GSEs 23% ($1.11T, mostly multifamily), life cos 16% ($783B); CREFC shows $660.5B of CMBS in Jul-2026. For **office and retail only**, CMBS is ~20–25% **[estimate]**. For **Florida** no public split exists, so assume **≥ 75% of Florida office and retail debt has no public performance data** |
| **Rent rolls, lease expiries, NOI** for non-CMBS assets | Only proxies (tenant events, parking, POIs) |
| **Extensions and modifications not recorded** | Banks modified $11.6B of CRE loans in 2025 (FDIC). Many modification agreements are never recorded, so maturity estimates will be wrong for some loans |
| **Mezzanine and preferred equity** | Often invisible until a UCC-sale notice. UCC-1s are often in Delaware or absent (perfection by control) |
| **Private resolutions** (DPO, quiet off-market sale at a discount, recapitalisation) | Produce no distress label; understate true positives |
| **Unencumbered or all-cash owners** | No loan → no maturity or leverage signal. Rely on owner, tenant and physical blocks |
| **Loan terms on recorded mortgages** | Rate, IO and recourse are rarely stated. Maturity is sometimes stated and sometimes not. Doc stamps give the face amount but not the current balance (IO vs amortising unknown) |
| **Timing noise in physical data** | Orthos are annual snapshots; foot-traffic building data is paid |

**Bottom line:** public Florida data can find **who owes how much to whom, since when, secured by what, on a building of what age and type, owned by an entity in what state of health, with what court events**. It can't see **how the building is performing** unless the loan is CMBS. v1 should be a ranked list of leads whose value comes from coverage and early warning (maturity and leverage). It shouldn't claim precise default probabilities.

---

## Sources

**Market and servicing data**
- CREFC, *Update on CMBS Loan Performance, July 2026* (Trepp data; DB/JPM severity notes): https://assets.informz.net/cmbs/data/images/CREFC%20Update%20on%20CMBS%20Loan%20Performance_July%202026.pdf
- CREFC monthly updates, Feb–Jun 2026: https://assets.informz.net/cmbs/data/images/CREFC%20Update%20on%20CMBS%20Loan%20Performance_June%202026.pdf
- CREFC, *IRP Servicer Watchlist Implementation Guideline* (PRG triggers: DSCR < 1.10, occupancy −20%/<80%, tenant >30% expiring, taxes 60+ days): https://css.crefc.org/uploadedfiles/CMSA_Site_Home/Industry_Standards/CMSA-Investor_Reporting_Package/CREFC_IRP_Watchlist_Implementation_Guideline.pdf
- Commercial Property Executive, *2026 CMBS Delinquency Rates*: https://www.commercialsearch.com/news/cmbs-delinquency-rates/
- Multi-Housing News, *2026 CMBS Delinquency Rates*: https://www.multihousingnews.com/cmbs-delinquency-rates/
- CRED iQ, *CMBS Distress Rate Climbs to 12.07% in March 2026*: https://cred-iq.com/blog/2026/04/03/cmbs-distress-rate-climbs-to-12-07-in-march-2026-delinquencies-hit-a-new-cycle-high/
- CRED iQ, distress-rate methodology posts: https://cred-iq.com/blog/2025/12/05/cmbs-distress-rate-climbs-to-11-6-in-november-2025/
- Leech Tishman (F. Passerin), *CMBS Distress & Special Servicing* (Aug 2026; KBRA distress; SS resolution mix): https://www.leechtishman.com/wp-content/uploads/2026/08/CMBS-Distress-and-Special-Servicing.pdf
- Commercial Observer, *CMBS Distress Is Peaking — Again* (Aug 2026): https://commercialobserver.com/2026/08/cmbs-distress-2026/
- CRE Daily, *Office Distress Hits 17%…*: https://www.credaily.com/briefs/office-distress-hits-17-percent-as-cmbs-turmoil-spreads-in-april/
- MBA, *Commercial/Multifamily Mortgage Debt Outstanding Q3 2025*: https://www.mba.org/news-and-research/newsroom/news/2026/01/13/commercial-and-multifamily-mortgage-debt-outstanding-increased-in-third-quarter-2025 and PDF https://www.mba.org/docs/default-source/research-and-forecasts/cmf-mdo/3q25mortgagedebtoutstanding.pdf
- MBA, *Debt Outstanding Crosses $5 Trillion in Q1 2026*: https://www.mba.org/news-and-research/newsroom/news/2026/06/18/commercial-and-multifamily-mortgage-debt-outstanding-crosses--5-trillion-in-first-quarter-2026
- FDIC, *2026 Risk Review* (§4.1 CRE): https://www.fdic.gov/analysis/2026-risk-review-full.pdf
- Federal Reserve, *Supervision and Regulation Report, Dec 2025*: https://www.federalreserve.gov/publications/2025-december-supervision-and-regulation-report-banking-system-conditions.htm
- Morgan Lewis on the NY Fed "extend-and-pretend" paper: https://www.morganlewis.com/pubs/2024/10/federal-reserve-bank-publishes-paper-on-extend-and-pretend-workouts
- CRE Daily, *Fed Paper Challenges "Extend and Pretend" Narrative*: https://www.credaily.com/briefs/fed-paper-challenges-extend-and-pretend-cre-narrative/

**Academic literature**
- Glancy & Kurtzman, *Determinants of Recent CRE Distress: Implications for the Banking Sector*, FEDS 2024-072: https://www.federalreserve.gov/econres/feds/files/2024072pap.pdf
- Hinzen, Severino & Van Nieuwerburgh, *Too-Many-to-Ignore: Regional Banks and CRE Risks* (2025): https://wffi.wharton.upenn.edu/wp-content/uploads/2025/10/HSV-Regional-Banks-and-CRE-Risks.pdf
- Gupta, Mittal & Van Nieuwerburgh, *Work From Home and the Office Real Estate Apocalypse*, NBER w30526: https://www.nber.org/system/files/working_papers/w30526/w30526.pdf
- Jiang et al., NBER w31970 (CRE and bank fragility): https://www.nber.org/system/files/working_papers/w31970/w31970.pdf
- Titman & Tsyplakov, *Originator Performance, CMBS Structures, and the Risk of Commercial Mortgages* (RFS 2010): https://www.semanticscholar.org/paper/Originator-Performance,-CMBS-Structures,-and-the-of-Titman-Tsyplakov/eb8648b51530b6619bec894775aae498acac52e0
- Seslen & Wheaton, *Contemporaneous Loan Stress and Termination Risk in the CMBS Pool* (REE 2010): https://www.researchgate.net/publication/227660084_Contemporaneous_Loan_Stress_and_Termination_Risk_in_the_CMBS_Pool_How_Ruthless_Is_Default
- Singh, *Predicting the Likelihood of Lodging CMBS Loan Default* (2019): https://journals.sagepub.com/doi/10.1177/1938965518777222
- *Default Prediction of Commercial Real Estate Properties Using Machine Learning Techniques*: https://www.researchgate.net/publication/335484290_Default_Prediction_of_Commercial_Real_Estate_Properties_Using_Machine_Learning_Techniques
- *Deep Learning for Disentangling Liquidity-Constrained and Strategic Default* (AEA 2020): https://www.aeaweb.org/conference/2020/preliminary/paper/AFYT43bB
- *Determinants of Pandemic-era CRE Distress* (AEA 2026): https://www.aeaweb.org/conference/2026/program/paper/E7nGbAb4
- RERI, *Commercial Mortgage Workout Strategy and Conditional Default Probability*: https://www.reri.org/research/article_pdf/wp120.pdf
- Munevar, Nakhmurina & Samuels, *Newspaper notice as a government transparency mechanism: Evidence from Florida* (2025): https://som.yale.edu/sites/default/files/2025-09/Public_Notices__BNS_.pdf
- Comparative ML default studies (context for AUCs): https://arxiv.org/pdf/2506.19789 ; https://www.sciencedirect.com/science/article/pii/S2666764923000218

**Physical and alternative data**
- *Detecting Parking Spaces in a Parcel using Satellite Images*: https://arxiv.org/pdf/1909.05624
- AGILE 2023, *Satellite parking: a new method for measuring parking occupancy*: https://agile-giss.copernicus.org/articles/4/44/2023/agile-giss-4-44-2023.pdf
- Jewell, *Towards Parking Lot Occupancy Assessment Using Aerial Imagery*: https://ir.lib.uwo.ca/etd/9072/
- *Forward-looking retailer performance using parking lot traffic from satellite imagery*: https://www.researchgate.net/publication/359885463
- Hedge funds and parking lots (Berkeley Haas research summary): https://medium.com/@darshsinghvi05/hedge-funds-analyze-parking-lots-3e77432691ae
- VIIRS housing vacancy (IJRS 2019): https://www.tandfonline.com/doi/abs/10.1080/01431161.2019.1615655 ; VIIRS commercial vitality (IJRS 2026): https://www.tandfonline.com/doi/abs/10.1080/01431161.2026.2675719

**Legal / UCC / Florida procedure**
- Florida Bar Journal, *Florida's New Commercial Real Estate Receivership Act*: https://www.floridabar.org/the-florida-bar-journal/floridas-new-commercial-real-estate-receivership-act-a-roadmap-for-judges-and-practitioners/
- Fla. Stat. Ch. 714: https://www.flsenate.gov/Laws/Statutes/2025/Chapter714/All
- Fla. Stat. 197.502 (tax deed application): https://www.flsenate.gov/Laws/Statutes/2025/197.502
- Fla. Stat. 50.0211 (statewide legal-notice website): https://flsenate.gov/Laws/Statutes/2024/50.0211
- Florida Bar News, *Legal notices no longer need be published in newspapers* (HB 7049): https://www.floridabar.org/the-florida-bar-news/legal-notices-no-longer-need-be-published-in-newspapers/
- Florida Public Notices (FPA): https://floridapublicnotices.com/
- Notice of Public Sale of Collateral, 925 N Miami LLC: https://s3.amazonaws.com/ipublishmedia.marketplace.mcclatchy/AdvertImages/notices/IPL0262804/925_Miami_vMiami_v2.pdf
- DailyDAC UCC sale notices: https://www.dailydac.com/category/premium-public-notices/
- Commercial Observer, *Why UCC Foreclosures Have Spiked* (2024): https://commercialobserver.com/2024/07/ucc-foreclosures-spike/
- Lexology / ABI, *What's "commercially reasonable" for Article 9 sales*: https://www.lexology.com/library/detail.aspx?g=d94e8e2c-5765-4780-b0a2-c51be0f7c483
- National Law Review, Delaware *Edgewater* commercial reasonableness: https://natlawreview.com/article/delaware-court-provides-critical-guidance-to-commercial-reasonableness-ucc-article-9
- Pillsbury, *Conducting a Mezzanine Loan Foreclosure Under the UCC*: https://www.pillsburylaw.com/en/news-and-insights/mezzanine-loan-foreclosure-under-the-ucc.html
- Akin Gump, *Demystifying the Out-of-Court Foreclosure Process 2024*: https://www.akingump.com/a/web/kGrM623jgxuH3pTVLk2USd/9p3D74/uccforeclosures_2024-pdf-v5.pdf
- Shumaker, *Commercial Mortgage Foreclosure (FL)*: https://www.shumaker.com/Templates/media/files/pdf/news/publications/Commercial%20Mortgage%20Foreclosure%20(FL)%20(1).pdf
- Florida documentary stamp and intangible tax: https://floridarevenue.com/taxes/taxesfees/Pages/doc_stamp.aspx ; https://starfieldsmith.com/2026/02/best-practices-a-refresher-on-florida-documentary-stamp-and-nonrecurring-intangible-tax/

**Public data infrastructure**
- SEC Reg AB II asset-level (ABS-EE / EX-102; Schedule AL Item 1125): https://www.sec.gov/newsroom/whats-new/regabii-asset-level-requirements-compliance ; https://sec-api.io/datasets/form-absee-files
- FDOR property-tax data portal (NAL/SDF/NAP): https://floridarevenue.com/property/Pages/DataPortal_RequestAssessmentRollGISData.aspx ; 2025 user guide: https://floridarevenue.com/property/dataportal/Documents/PTO%20Data%20Portal/User%20Guides/2025%20Users%20guide%20and%20quick%20reference/2025_NAL_SDF_NAP_Users_Guide.pdf
- Florida statewide parcels (FGIO): https://www.floridagio.gov/datasets/FGIO::florida-statewide-parcels
- Sunbiz data downloads (SFTP daily/quarterly): https://dos.fl.gov/sunbiz/other-services/data-downloads/
- Florida Secured Transaction Registry: https://floridaucc.com/search
- FloridaCommerce WARN: https://floridajobs.org/workforce-resources/worker-adjustment-and-retraining-notification-(warn)

**Industrial site selection / Bridge Industrial**
- Commercial Observer, *Bridge Industrial Nabs $57M to Convert Old Miami-Dade Offices Into Warehouses* (Feb 2026): https://commercialobserver.com/2026/02/bridge-office-industrial-doral/
- The Real Deal, *Bridge Industrial plans 270K sf of warehouses at office site in Doral*: https://therealdeal.com/miami/2025/11/20/bridge-industrial-plans-office-to-warehouse-doral-project/
- Kurv Industrial, *Bridge Point Doral 826* approval: https://kurvindustrial.com/blog/bridge-industrial-receives-approval-to-transform-old-office-park-into-state-of-the-art-270000-sf-industrial-complex-bridge-point-doral-826/
- Bridge Industrial, *Port Everglades 22-acre site*: https://bridgeindustrial.com/media/deal/bridge-industrial-acquires-prime-22-acre-development-site-at-port-everglades/
- Bridge Point Flagler Station: https://cre-sources.com/bridge-industrial-completes-bridge-point-flagler-station-a-new-326000-sf-class-a-logistics-complex-in-miami/
- Symbiosis Planning, *Industrial Site Suitability Analysis* (Polk County, 2026): https://symbiosisplanning.com/2026/05/27/industrial-site-suitability-analysis/
- ISPRS, *Site Suitability Analysis for Industries Using GIS and MCDM*: https://isprs-annals.copernicus.org/articles/IV-5/447/2018/isprs-annals-IV-5-447-2018.pdf
- Link Logistics, *How to Choose Industrial Warehouse Space*: https://www.linklogistics.com/news-insights/industrial-real-estate-101/how-to-choose-industrial-warehouse-space-essential-features-to-consider/
- Florida warehouse demolition cost guide: https://pawdemo.com/warehouse-demolition-cost-florida/
- Discover South Florida, *Wells Fargo Files $1.28B Foreclosure on South Florida Office Portfolio*: https://www.discoversouthflorida.com/blog/128b-office-foreclosure-shows-south-florida-isnt-all-booming

*Note: the web-search budget for this session ran out partway through. A few statements (Katona et al. car-count returns, Placer.ai office index levels, typical SS resolution durations) come from background knowledge and are flagged or kept qualitative. The backtest in §7.4 should replace every **[estimate]** with measured values.*
