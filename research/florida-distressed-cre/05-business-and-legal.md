# Florida distressed-office / land-site finder: business model, pricing and legal

Prepared 2026-09-23 for Jonathan (the builder) about Cole's request. Cole is at Bridge Industrial, which renamed itself **Kurv Industrial** on 2026-03-16. This is research, not legal advice. The Florida licensing question in section 2 needs a one-hour call with a Florida real-estate attorney before any fee depends on a deal closing.

Confidence markers: **[S]** means backed by a cited source. **[E]** means an estimate or industry norm from general knowledge, not checked against a primary source this session. My web-search budget ran out partway through, so parts of sections 1 and 5 lean on [E].

---

## Key takeaways

1. **Do not take a success fee or finder's fee.** Florida's definition of "broker" covers anyone who, for another and for any compensation, "takes any part in the procuring of sellers, purchasers … of … the real property of another" or "directs or assists in the procuring of prospects" (F.S. 475.01(1)(a)) [S].
   - Acting as a broker without a license is a **third-degree felony**, with up to 5 years (F.S. 475.42) [S].
   - A fee contract made by an unlicensed person is **void** (F.S. 475.41), so Jonathan could not collect it anyway [S].
   - Florida licensees may not pay unlicensed people for real-estate services. The only statutory finder's-fee exception is a $50 apartment-tenant referral (F.S. 475.011(13), 475.25(1)(h)) [S].
   - Florida appellate courts have applied 475.41 to a "finder's fee for locating realty to be purchased" (*Schy v. Margulies*, 407 So.2d 267, Fla. 3d DCA 1981; cited in *Hardcastle Pointe Corp. v. Cohen*, 505 So.2d 1381, Fla. 4th DCA 1987) and to an unlicensed business-sale consultant (*Meteor Motors v. Thompson Halbach & Assocs.*, 914 So.2d 479, Fla. 4th DCA 2005) [S, from case-search snippets].
2. **Safe structures:**
   - A flat subscription or license fee for software or data that is not tied to any transaction, or hourly or retainer consulting for building the tool.
   - If it grows, a W-2 or salaried role. A buyer's salaried staff sourcing deals for their own employer are not acting "for another."
   - Keep Jonathan out of owner outreach and negotiation. Cole's team contacts the owners.
   - CoStar, Reonomy, CRED iQ and similar data vendors sell "likely to sell" and distress data this way without being brokers.
3. **The thesis matches what Kurv already does in Florida.** Kurv bought two obsolete Miami-area office properties and is turning them into warehouses:
   - Ryder's former headquarters at Flagler Station: 16.8 acres, **$42.1M** (about **$2.5M/acre**), March 2023 [S].
   - A 1972 office park in Doral: 16 acres, **$45.2–45.5M** (about **$2.8M/acre**) in 2024. The seller had paid $7.8M in 2010 [S].
   - Southeast partner Kevin Carroll calls this "infill redevelopment" in "one of the nation's most supply-constrained industrial markets" [S].
   - A tool that finds the *next* Doral office park is directly on strategy. A generic list of distressed office buildings is not.
4. **Value of one good lead:**
   - South Florida infill industrial land sells for roughly **$2.5–3.5M per acre** (Miami-Dade industrial land median $74/sf in H1 2025, about $3.2M/acre) [S]. A typical Kurv site is 15–25 acres, so **$40–50M+ of land**.
   - At a 1–3% land commission [E], the brokerage value alone is **$0.4–1.5M** per deal. The development profit behind it is far larger [E].
   - Kurv has made about **18–20 South Florida purchases (700–750 acres) since 2012**, roughly **1–3 land or redevelopment deals a year** [S for the totals, E for the annual rate].
   - Even one extra deal every two years makes the tool worth far more than any plausible fee. Almost none of that value can legally reach Jonathan as a per-deal fee.
5. **Market pricing for comparable data:**
   - Reonomy about $400–575/user/month [S]. Crexi Intelligence about $249–299/month [S]. CRED iQ from $1,200/month for 4 users [S].
   - CoStar about $3K–23K/year, median about $15K [S]. Placer.ai about $12–50K+/year [S, secondary]. Cherre $50K+/year enterprise [S, secondary]. Trepp is quote-only (commonly five figures a year [E]).
   - A bespoke Florida tool can reasonably be priced at **$2–5K/month** after a free pilot, or **$25–60K/year** as an internal license. Custom build work runs **$150–250/hour** [E].
6. **Data sources and legal exposure:**
   - Use public sources:
     - Florida DOR NAL/SDF tax-roll CSVs (free; owner, use code, just value, sales).
     - Sunbiz bulk corporate files (free public SFTP, daily and quarterly).
     - County clerk records: lis pendens, foreclosures, liens.
     - SEC EDGAR (free API; limit of 10 requests/second with a declared User-Agent).
     - Florida's Chapter 119, which gives *any person* a right to copy public records, for any purpose, at cost (15¢/page, plus a "reasonable" special service charge for heavy IT or clerical work) [S].
   - **Do not scrape CoStar, LoopNet or Crexi:**
     - CoStar won a **$500M** consent judgment against Xceligent, which went bankrupt; the insurers paid $10.75M [S].
     - It has sued CREXi since 2020. In June 2025 the court found CREXi "copied and cropped thousands of CoStar Group photos via an offshore scheme" [S].
     - It won an injunction against Leon Capital for unauthorized database access in September 2024 [S].
     - Cole's firm almost certainly subscribes to CoStar, so Cole can join CoStar data with the tool's output inside Bridge's own license. Jonathan's code should never touch it.
7. **Recommendation:**
   - A free 6–8 week pilot with written success criteria.
   - Then a monthly license or retainer (about $2.5–5K/month), or a one-time build fee plus maintenance.
   - A **short written agreement** that says Jonathan is paid for software and analysis, not for any transaction, and that he does not contact owners.
   - Ask Cole to define the pilot: metro, asset types, size, zoning, what counts as a "hit," and a weekly feedback loop (section 6).

---

## 1. How deal-sourcing value is paid for in CRE

### 1.1 Broker commissions (the benchmark everyone knows)
- Florida commissions are fully negotiable and not set by law [S: Florida Realtors].
- Commercial sale commissions are commonly cited at about 5–7% for smaller deals, with the percentage falling as deal size rises. Industrial or warehouse deals are about 3–5%. Land is often cited at 5–10% for small parcels [S: flcregroup, industry blogs].
- For a $40M+ institutional industrial site, the realistic all-in fee is **about 1–3%**, often split between seller and buyer brokers [E].
- Institutional industrial developers like Kurv mostly buy through the big brokerages or directly off-market. For example, CBRE National Partners represented the seller in Kurv's $219.7M Pompano Beach purchase in April 2026 [S].

### 1.2 Finder's / bird-dog fees
- In residential investing, "bird dogs" are commonly paid $500–$2,500 per lead that closes [E].
- **In Florida this is illegal for unlicensed people** when it is tied to transactions (section 2). Florida Realtors: licensees "are not allowed to pay a fee or compensate someone for real estate services who doesn't hold a real estate license … this includes attorneys" [S].
- A referral-only business must itself be a registered brokerage [S: dealrun.ai compliance guide].

### 1.3 Acquisition fees (fund economics, for context)
- Sponsors of funds and syndications typically charge investors an acquisition fee of about 0.5–2% of purchase price [E]. It pays the sponsor's own acquisitions team, whose salaried staff are the "sourcers."
- Kurv's acquisitions and development people are employees, and some are partners (section 4). They source through brokers, direct owner outreach, and relationships.

### 1.4 Retained sourcing consultants / "off-market deal sourcing" services
- Firms that sell off-market sourcing to institutions are either **licensed brokerages** paid on success, or **data or research vendors** paid by subscription or retainer [E].
- Tech-enabled "acquisition sourcing" retainers for mid-market buyers are commonly $3–15K/month [E].

### 1.5 Data subscriptions (actual numbers)
| Vendor | What it is | Price (published or reported) |
|---|---|---|
| CoStar | Comps, listings, owners, analytics | Median about **$15.1K/yr** contract, range about $3K–23K; add-on modules $2–8K/yr [S: Vendr, propertyscout360] |
| Reonomy (Altus) | Owner and debt data, LLC piercing, "likely to sell" scores | **$400/user/mo** annual; $500 monthly; Plus $575 [S: reonomy.com, CRE Daily] |
| Crexi Intelligence | Property records, comps, demographics | **$249–299/mo** [S: CRE Daily, TrustRadius] |
| CRED iQ | CMBS, CLO and agency loan distress, watchlist, special servicing | **From $1,200/mo for 4 users**; covers about 34% of CRE loans (the securitized ones) [S: CRE Daily] |
| Trepp | CMBS loan and distress data | Quote-only; commonly five figures a year [E] |
| ProspectNow (Buildout) | Owner prospecting | $499/mo for up to 4 users [S: CRE Daily] |
| Actovia | Owner and debt prospecting | $319–389/user/mo [S: CRE Daily] |
| Placer.ai | Foot traffic (retail and office distress signal) | About **$12K–50K+/yr** enterprise [S: Tontitown, AR procurement comparison; secondary] |
| Cherre | Enterprise data unification | About **$50K+/yr** custom [S: secondary review sites] |
| Esri ArcGIS | GIS | $10K–100K+/yr [S: same comparison] |

**What this implies:** a bespoke, Florida-specific, thesis-driven lead feed built on free public data sits above generic per-seat tools like Reonomy and Crexi. It sits below enterprise platforms like Cherre and Placer. **$25–60K/year** is defensible if it produces real hits [E].

### 1.6 Custom data or analytics consulting rates
- Freelance senior data or ML engineers are commonly $100–200/hour. Boutique proptech and data consultancies charge $150–300/hour, or $1.5–2.5K/day [E; could not verify with a source this session].
- A build of about 80–150 hours for v1 is worth roughly **$15–35K** at market rates [E]. That is the value of the "free" pilot to state in writing.

---

## 2. Florida legal constraints (Chapter 475)

### 2.1 Who is a "broker"
F.S. **475.01(1)(a)** (2025) [S]. A broker is a person who, *for another* and for compensation "directly or indirectly paid or promised, expressly or impliedly," does any of the following:
- sells, buys or negotiates real property;
- **"takes any part in the procuring of sellers, purchasers, lessors, or lessees of … the real property of another"**;
- **"directs or assists in the procuring of prospects or in the negotiation or closing of any transaction which does, or is calculated to, result in a sale, exchange, or leasing thereof, and who receives, expects, or is promised any compensation."**

The definition also includes "all persons who advertise rental property information or lists." That clause is about rentals, but it shows that list-selling is not automatically outside Chapter 475.

**Why this matters:** "Find me an office building whose owner will sell, and I'll pay you when we close" is precisely "procuring sellers … for another" for "compensation … promised." It is the classic finder's-fee pattern, and Florida has no general "mere finder" exception for real property [S: the statute; Florida Realtors].

### 2.2 Exemptions (F.S. 475.011) [S]
- Attorneys acting within their duties as attorneys, and CPAs, among others.
- **Owners** dealing in their own property, and their salaried employees. The exemption is lost if anyone is paid "strictly on a transactional basis."
- Salaried employees of utilities, railroads and government, if nothing beyond salary is paid.
- Apartment tenant referral: at most **$50 per transaction**, and the tenant may not advertise. Paying any other finder's or referral fee to an unlicensed person violates 475.25(1)(h) and is punishable under 475.42.
- There is no exemption for "data vendors" or "consultants" as such. The protection comes from *not meeting the definition*: not acting for another in procuring, and no compensation tied to transactions.

### 2.3 Penalties [S]
- **475.42:** operating as a broker without a license is a **third-degree felony**, up to 5 years (775.082/.083). DBPR's Unlicensed Activity program and FREC investigate, and cases can be referred to state attorneys.
- **475.41:** "No contract for a commission or compensation for any act or service enumerated in s. 475.01(3) is valid" unless the person is licensed. The fee is unenforceable even if the buyer agreed to it.
- **Licensees are exposed too.** A licensee who pays or aids an unlicensed person violates 475.25(1)(h) and FREC rules. If Cole or Bridge's brokers hold licenses, they carry this risk as well. That is a reason Cole may *prefer* a clean software contract.

### 2.4 Case law (from court-database snippets; read the full opinions before relying on them)
- ***Schy v. Margulies*, 407 So.2d 267 (Fla. 3d DCA 1981).** The court "concluded that an agreement to pay the appellant Schy a 'finder's fee' for locating realty to be purchased" fell within the licensing statute, i.e. it could not be enforced by an unlicensed person. This is the closest precedent to what Cole described.
- ***Hardcastle Pointe Corp. v. Cohen*, 505 So.2d 1381 (Fla. 4th DCA 1987).** Services "rendered in the acquisition of Tract I": 475.41 bars unlicensed compensation. It cites *Schy*.
- ***Meteor Motors, Inc. v. Thompson Halbach & Assocs.*, 914 So.2d 479 (Fla. 4th DCA 2005).** An unlicensed consultant's fee for the sale of a business (a car dealership) was held unenforceable under 475.41.
- ***United Nat'l Bank of Miami v. Airport Plaza Ltd. P'ship* (Fla. 3d DCA 1988).** A warehouse management agreement was held void under 475.41.

### 2.5 Can an unlicensed person be paid a flat fee for a data product or software that lists properties?
**Generally yes, if it is structured as a product or service rather than as procurement.**

**Why this is likely fine:**
- CoStar, Reonomy, Crexi, CRED iQ and ProspectNow all sell property, owner and distress data, including "likely to sell" scores, to buyers for subscription fees.
- Their fee does not depend on any transaction, they do not act for a particular buyer toward a particular seller, and they do not negotiate.

**Risk rises with each of these features:**
- The fee is tied to closings or to deal size, including "bonuses when a deal closes," equity or promote in the deal, or a "per qualified lead" price that is really a success fee.
- Jonathan contacts owners, arranges introductions, or negotiates for Bridge.
- The "product" is a hand-curated shortlist of a few specific properties delivered only to Bridge for a particular purchase. This looks more like procurement than a data product, even at a flat fee [E, attorney judgment needed].

### 2.6 Safe-structure menu (lowest to highest risk)
1. **Salaried or hourly employment or contracting with Bridge** to build internal tooling. Salaried buyer staff are not acting "for another." Hourly pay is compensation for labor, not tied to transactions.
2. **SaaS or data license**: a flat monthly or annual fee. There are no deal-contingent terms. Owner contact stays with Bridge. The contract says Jonathan provides "software and data analytics, not brokerage services."
3. **Fixed-fee build plus maintenance retainer.**
4. **Per-report or per-market fee**, a flat price per metro refresh. This is fine if not contingent on outcomes.
5. **Avoid:**
   - per-closing success fees, finder's fees, or a percentage of price;
   - "kickers" when a lead closes;
   - co-investment or promote given *as payment for sourcing*.
   - If success economics are ever wanted, Jonathan would need a Florida license: a sales associate's 63-hour pre-license course, working under a broker [E on the course hours]. Or the deal would have to run through a licensed brokerage in a way counsel approves.

---

## 3. Data licensing and legal exposure

### 3.1 Public sources (safe)
- **Florida DOR property tax data portal**
  - Statewide **NAL** (name, address, legal: owner, mailing address, DOR use code, just and assessed value, land and building areas, year built) and **SDF** (sales data) files, published as **CSV** with user guides.
  - Only the current roll is posted; earlier rolls are available on request. Confidential records, such as exempt owners, are removed [S].
  - The Florida Geographic Information Office publishes **statewide parcel polygons** [S].
- **Sunbiz (Division of Corporations)**
  - Free **daily and quarterly bulk corporate files** over public SFTP (sftp.floridados.gov, username "Public"), provided "as is" [S].
  - This is how to trace a property-owning LLC to its managers and registered agent.
- **County clerk official records**: lis pendens, foreclosure filings, mechanic's liens, mortgage satisfactions, deeds.
  - These are public under Chapter 119. Some counties sell bulk or subscription feeds, and bulk requests can carry special service charges [E].
- **SEC EDGAR**
  - Free, with JSON APIs (data.sec.gov) and full indexes.
  - Fair-access rule: **10 requests/second max**, declared User-Agent with a contact email, no botnets [S].
  - Useful for REIT 10-K property schedules, impairments, and tenant 10-K/8-K distress: store closures, going-concern warnings, bankruptcy filings.
- **Florida Public Records Act (Ch. 119)** [S]:
  - "Every person … shall permit the record to be inspected and copied by any person desiring to do so."
  - Fees: up to **15¢ per one-sided page**, 20¢ two-sided, $1 certified. A **"reasonable" special service charge "based on the cost incurred"** applies when a request needs extensive IT resources or clerical labor.
  - The purpose of the request is irrelevant, and commercial use is allowed [E, well established in Florida practice].

### 3.2 Proprietary sources (do not scrape)
- ***CoStar v. LoopNet*, 373 F.3d 544 (4th Cir. 2004).** LoopNet was *not* directly liable for photos its users uploaded, as a passive host with takedowns [S]. CoStar later bought LoopNet (2012) [E].
- ***CoStar v. Xceligent* (2016–2019).** Offshore contractors copied CoStar photos and cropped watermarks. Xceligent went bankrupt (2017), and the trustee agreed to a **$500M** judgment in 2019 (reported at about $50K/image). The insurers paid **$10.75M** [S].
- ***CoStar v. CREXi* (C.D. Cal. 2:20-cv-08819, filed Sept 2020).**
  - June 2025: the court found that CREXi "copied and cropped thousands of CoStar Group photos via an offshore scheme." Both sides' partial summary-judgment motions were denied, and CoStar's damages expert was partly excluded [S].
  - CoStar alleged 46,506 of 48,756 listing images were used without authorization [S].
  - The Ninth Circuit revived CREXi's antitrust counterclaims on 5 Sept 2025, and the **Supreme Court denied review on 23 March 2026** [S].
  - As of the sources found, the copyright trial had not concluded.
- **CoStar v. Leon Capital:** a permanent injunction in September 2024 over unauthorized database access [S].
- **CoStar v. Zillow (July 2025):** copyright over syndicated photos; ongoing [S].
- **General scraping law:** *hiQ v. LinkedIn* (9th Cir. 2022) held that scraping *public* pages is likely not a CFAA violation. hiQ still lost on **breach of LinkedIn's user agreement** and settled in Dec 2022 [S].
- **Lesson:** CoStar sues aggressively and its terms forbid automated access. Anything behind a login (CoStar, LoopNet Pro, Crexi Intelligence) is contract plus copyright risk. Let Bridge use its own CoStar seats to cross-check Jonathan's output manually.

---

## 4. How Kurv (formerly Bridge Industrial) is organized and what it needs

### 4.1 Company facts
- **Name:** Bridge Industrial renamed itself **Kurv Industrial** on 16 March 2026 [S]. The strategy, structure and leadership stayed the same.
- **Offices:** Chicago headquarters; regional offices in LA, **Miami**, New Jersey and Seattle [S]. Co-founder and CEO: Steve Poulos.
- **South Florida:** entered in 2012. More than **750 acres acquired**, more than **11M sf** delivered, about 25 buildings [S]. An earlier count: 18 separate transactions and about 700 acres [S].
- **Capital:** a **$789M JV with CPP Investments** (2025) [S].
- **Recent Florida deals:**
  - Kurv Pompano Beach: East Pompano Industrial Center, 818,611 sf, **$219.7M** (about $268/sf). April 2026, from QuadReal. Ares provided a $154.9M loan [S].
  - Ryder headquarters to Bridge Point Flagler Station: 16.8 acres, $42.1M, 2023. The 249K sf office was demolished and replaced by 326K sf of logistics space, finished in 2025 [S].
  - Doral office park to Bridge Point Doral 826: 16 acres, 7775 NW 48th St, **$45.2–45.5M** in 2024. Eight 1972 two-story office buildings (about 203K sf) were demolished for 268,702 sf of warehouses. Associated Bank lent $56.7M in construction financing; delivery in Q1 2027 [S].
  - Port Everglades: a 22-acre development site [S]. Others include Bridge Point AVE (about 600K sf) and Palmetto Lakes (two buildings acquired) [S].
- **Where Kurv is active:** in Florida it is overwhelmingly **Miami-Dade and Broward**. I found no evidence of Orlando, Tampa or Jacksonville activity. Ask Cole whether those markets are in scope.

### 4.2 Organization (from press releases)
- **Kevin Carroll, Partner, Southeast Region** leads Florida.
  - Development and construction report to him: in 2022 a VP of Construction (Ben Branch), a Senior Director of Development (Ramiro Garcia) and a Director of Development (Adolfo Reutlinger) were hired [S].
  - A VP, Aaron Hirschl, appears on Miami projects [S].
  - Kurv was also hiring an **SVP, Development in Miami** (Glassdoor listing; content not retrievable) [S, partial].
- Leasing runs through JLL's South Florida industrial team and Kurv's Miami leasing lead [S].
- **Typical decision flow for an institutional industrial developer [E]:**
  1. Regional partner or acquisitions person screens a lead.
  2. Quick underwriting: site plan capacity (a rule of thumb is about 35–45% building coverage), truck court and clear height feasibility, zoning and entitlement path, rents against land plus construction cost to reach yield on cost.
  3. LOI.
  4. Investment committee at headquarters, with the capital partner (CPP) sign-off on JV deals.
  5. Due diligence: title, environmental Phase I/II, survey, geotech, zoning.
  6. Close.
- Speed and discretion matter. The *first* call to a motivated owner often wins.

### 4.3 What makes a lead useful rather than noise [E, from the deal pattern above]
A useful lead includes:
- **Location** within the infill logistics geography: MIA and Airport West, Doral, Medley, Hialeah Gardens, Miami Gardens and Opa-locka, Palmetto and Turnpike, I-595 and Port Everglades, Pompano. Distance to highway interchanges should be included.
- **Site:** at least about 8–10 acres, and ideally 15–30. Parcel assemblage is flagged where adjacent parcels share or could share an owner.
- **Zoning and land use:** is it industrial now, or is there a credible path? Doral 826 needed approval. Include future land-use designation, flood zone, and any wellfield protection zone. Miami-Dade wellfield protection is a real constraint [E].
- **Improvements:** low-density, obsolete buildings where land value exceeds building value. Examples: 1970s–80s low-rise office parks, single-tenant corporate campuses, dead big-box retail.
- **A distress or motivation signal:**
  - large vacancy or loss of a major tenant (10-K or 8-K, WARN notices, bankruptcy);
  - CMBS watchlist, special servicing or loan maturity (CRED iQ or Trepp, if Bridge licenses them);
  - lis pendens or foreclosure;
  - a tax certificate or delinquency;
  - long hold by an estate or trust;
  - an LLC gone inactive on Sunbiz;
  - falling assessed value.
- **Ownership trail:** the owning LLC, its managers and principal addresses (Sunbiz), the purchase date and price (DOR SDF, deed). Low basis plus a long hold often means the owner will sell. The Doral seller paid $7.8M in 2010 and sold for $45.5M.
- **Price expectation:** assessed value, $/acre comps from DOR SDF sales, and an implied land residual.
- **Contact:** owner of record and registered agent. Bridge makes the call.

These are noise: small parcels, residential-adjacent or wrong-zoned sites with no realistic path, stale data, generic "office vacancy is high in Miami" lists, and properties already marketed on LoopNet (brokers already sent them).

### 4.4 Sizing
- **Land value** [S]:
  - Miami-Dade industrial land median **$74/sf ≈ $3.2M/acre** (H1 2025, +76% year over year). The South Florida three-county median is $64/sf (about $2.8M/acre). Commercial land in Miami-Dade is $104/sf.
  - Tampa infill industrial averages about **$925K/acre** (2025), with several deals above $1M/acre.
  - Jacksonville 2025–26 deals: Sysco about **$172K/acre** (96 acres, $16.5M); Suddath about $64K/acre (312 acres); Yulee raw land about $13K/acre.
  - Orlando listing averages about $234K/acre (listing-site figure, low confidence); core infill is likely much higher [E].
- **Deal counts:** Kurv makes about 1–3 South Florida land or redevelopment purchases a year, plus stabilized-asset buys like Pompano [S/E]. Across all Florida developers, well-located infill industrial or redevelopment sites over 10 acres that trade each year number perhaps **dozens in South Florida** [E].
- **Value of one hit** that turns into a deal Kurv would not otherwise have found:
  - Land of $40–50M.
  - A development spread of perhaps 100–150 bp of yield on a $80–120M total cost implies **$10–30M of value created** [E].
  - The brokerage-equivalent value alone is about $0.4–1.5M.
- **Conclusion:** the tool's value to Bridge is **not** the problem. The constraints are (a) whether it finds sites their brokers and relationships would not, and (b) the legal limit on capturing deal-linked value.

---

## 5. Comparable stories and investor views

### 5.1 Comparables
- **Reonomy** (NYC, founded about 2013): owner and debt data, LLC piercing, "likely to sell" predictions for off-market prospecting. Acquired by **Altus Group in Nov 2021 for C$249.5M** (about US$200M) [S: Wikipedia/Altus]. It still sells at about $400/user/month [S]. This is the canonical "off-market lead tool becomes a company" outcome, but it took years and venture funding.
- **Regrid** (formerly Loveland Technologies; Detroit, 2009): began as civic tech to help residents deal with vacancy, blight and tax foreclosure. Grew into the first complete national parcel dataset (2023) and became Esri's commercial parcel provider (2024) [S]. Shows that a small team with a distress-mapping start can become a data business.
- **CRED iQ:** a small, focused CMBS-distress data shop selling at $1,200/month for 4 users, positioned against Trepp [S].
- **DealMachine:** a "driving for dollars" distressed-residential lead app that grew to 150K+ users [S for scale; founder and bootstrapping story E].
- **Common failure pattern [E]:** bespoke lead tools built for one client either (a) get absorbed as an internal tool when the builder is hired or retained, or (b) fizzle when the client's brokers already saw every lead. Institutional developers see most marketed deals, so a tool only adds value if it surfaces *unmarketed* owners with a signal.

### 5.2 Investor views, 2025–2026 [E: general knowledge; sources not retrieved this session]
- Generic CRE data aggregation is crowded: CoStar dominates, and the antitrust fight with CREXi shows how hard it is to compete. Parcel, owner and debt data are commoditized (Regrid, Reonomy, ATTOM, CRED iQ).
- What is fundable: workflow plus proprietary signal, such as unique data exhaust, AI underwriting inside a deal workflow, or vertical tools with measurable ROI.
- "A distress lead list for one metro" is widely viewed as a *feature or service*, not a venture-scale company. That supports Jonathan's lean approach: consulting or license revenue, not a fundraise.

---

## 6. Recommendation for Jonathan

### 6.1 Structure
- **Phase 0 (free pilot, 6–8 weeks).** Deliver one metro (Miami-Dade plus Broward), with scoring built only on public data.
  - Put a one-page letter in writing:
    - pilot is free;
    - Jonathan owns the code;
    - Bridge gets the output for internal use;
    - **no compensation of any kind is tied to any transaction**;
    - Jonathan does not contact owners or act on Bridge's behalf;
    - not brokerage or legal advice.
  - State the market value of the free work ($15–35K) so the anchor is set.
- **Phase 1 (paid) options** after the pilot meets its criteria:
  - **A. Monthly license plus refresh:** $2.5–5K/month for Bridge's Florida use, covering weekly refreshes, new signals and support. 12-month term.
  - **B. Build plus maintenance:** $20–40K fixed to productionize, then $1.5–3K/month maintenance. Or source-code license to Bridge at a higher one-time price.
  - **C. Hourly consulting:** $150–200/hour, capped monthly.
  - **D. Employment or contractor role** inside Bridge, if they want it in-house.
  - **Not:** finder's fees, a percentage of price, closing bonuses or deal equity for sourcing, unless a Florida attorney approves a licensed structure.
- Get a one-hour review from a Florida real-estate or licensing attorney (about $300–600 [E]) before the first paid invoice. Cole's company counsel may also have to approve a vendor contract anyway.

### 6.2 Questions for Cole to define the pilot
1. **Markets:** only Miami-Dade and Broward (where Kurv is), or also Palm Beach, Tampa, Orlando and Jacksonville?
2. **Asset thesis:** office-to-industrial redevelopment (Doral and Flagler pattern)? Retail boxes? Raw land? Existing industrial value-add (Pompano pattern)? Rank them.
3. **Size:** minimum acres (10? 15?), and target building SF achievable.
4. **Zoning:** industrial-zoned only, or also sites needing rezoning or land-use changes? Which municipalities are workable (Doral, Medley, Miami-Dade unincorporated, and so on)?
5. **Price band:** maximum $/acre or total basis.
6. **What counts as a hit:**
   - (a) a site Bridge had *not* already seen, that
   - (b) passes a 15-minute screen, and
   - (c) gets an owner call or LOI.
   - Target: at least 5 "new and worth a call" sites out of the top 50 during the pilot.
7. **Signals Bridge trusts:** tenant bankruptcies, CMBS or special servicing (do they already license Trepp or CRED iQ?), lis pendens, long hold or low basis, vacancy.
8. **Data Bridge already has:** CoStar, Reonomy or others. Jonathan never touches it; Bridge cross-references internally.
9. **Feedback loop:** a 30-minute weekly call; each lead tagged "seen / not seen," "fits / doesn't fit, and why." Use the tags to tune the score.
10. **Delivery format:** a web map plus CSV, and a CRM push to Salesforce or Dealpath?
11. **Decision owner and path:** who at Kurv (Kevin Carroll's team?) must see value for a paid phase, and who signs a vendor contract?
12. **Confidentiality:** an NDA both ways. Jonathan's IP is retained. Bridge's feedback is confidential.

---

## Sources

**Florida statutes, regulators, cases**
- F.S. Chapter 475 (2025), full text: https://www.flsenate.gov/Laws/Statutes/2025/Chapter475/All
- F.S. 475.01 (broker definition): https://www.flsenate.gov/Laws/Statutes/2025/475.01
- F.S. 475.011 (exemptions): https://www.flsenate.gov/Laws/Statutes/2025/475.011
- F.S. 475.41 (unlicensed contracts invalid): https://www.flsenate.gov/Laws/Statutes/2024/475.41
- F.S. 475.42 (violations and penalties): https://m.flsenate.gov/Statutes/475.42 ; https://law.justia.com/codes/florida/title-xxxii/chapter-475/part-i/section-475-42/
- FREC printable law book: https://www2.myfloridalicense.com/servop/testing/documents/FREC_printable_LawBook.pdf
- Florida Realtors, licensing law overview: https://www.floridarealtors.org/law-ethics/library/florida-real-estate-licensing-law
- Florida Realtors, commissions: https://www.floridarealtors.org/law-ethics/library/compensation-commission
- DBPR Unlicensed Activity Program: https://ula.myfloridalicense.com/
- Hornsby Law, unlicensed practice: https://www.hornsby.com/crimes/regulatory/unlicensed-practice-of-real-estate.html
- Deal Run, Florida Chapter 475 compliance guide: https://dealrun.ai/compliance/florida
- Schy v. Margulies, 407 So.2d 267 (Fla. 3d DCA 1981): https://www.courtlistener.com/opinion/7585696/schy-v-margulies/
- Hardcastle Pointe Corp. v. Cohen, 505 So.2d 1381 (Fla. 4th DCA 1987): https://www.courtlistener.com/opinion/1886560/hardcastle-pointe-corp-v-cohen/
- Meteor Motors v. Thompson Halbach & Assocs., 914 So.2d 479 (Fla. 4th DCA 2005): https://www.courtlistener.com/opinion/1957446/meteor-motors-v-thompson-halbach-assocs/
- United Nat'l Bank of Miami v. Airport Plaza Ltd. P'ship: https://www.courtlistener.com/opinion/1130312/united-nat-bank-of-miami-v-airport-plaza-ltd-pship/
- F.S. 119.07 (public records, fees): https://www.flsenate.gov/Laws/Statutes/2025/119.07

**Public data sources**
- Florida DOR data portal: https://floridarevenue.com/property/Pages/DataPortal_RequestAssessmentRollGISData.aspx
- 2025 NAL/SDF/NAP user guide: https://floridarevenue.com/property/dataportal/Documents/PTO%20Data%20Portal/User%20Guides/2025%20Users%20guide%20and%20quick%20reference/2025_NAL_SDF_NAP_Users_Guide.pdf
- Florida statewide parcels (FGIO): https://www.floridagio.gov/datasets/FGIO::florida-statewide-parcels/about
- Sunbiz data downloads: https://dos.fl.gov/sunbiz/other-services/data-downloads/
- SEC EDGAR access and fair-access policy: https://www.sec.gov/search-filings/edgar-search-assistance/accessing-edgar-data

**CoStar litigation and scraping law**
- CoStar on CREXi (2025): https://www.costargroup.com/press-room/2025/costar-group-provides-update-about-ongoing-legal-battle-crexi
- CoStar/BusinessWire, court finds CREXi copied images (June 2025): https://www.businesswire.com/news/home/20250626550895/en
- RISMedia court report (June 2025): https://www.rismedia.com/2025/06/30/court-report-costar-and-crexi-lawsuits-advance-zillow-fires-back-at-compass/
- Keker (CREXi counsel): https://www.keker.com/news/news-items/momentum-builds-for-crexi-judge-clears-path-to-trial-in-ip-row
- Ninth Circuit opinion, 23-55662 (Sept 5 2025): https://cdn.ca9.uscourts.gov/datastore/opinions/2025/09/05/23-55662.pdf
- Bisnow on the appeal revival: https://www.bisnow.com/national/news/commercial-real-estate/appeals-court-revives-crexis-claims-that-costar-monopolizes-cre-information-markets-129889
- PYMNTS, Supreme Court denies review (Mar 2026): https://www.pymnts.com/cpi-posts/supreme-court-lets-crexi-antitrust-case-against-costar-move-forward/
- Xceligent $500M judgment: https://www.bisnow.com/national/news/technology/costar-wins-500m-judgment-in-xceligent-copyright-infringement-case-101421 ; https://molawyersmedia.com/2020/01/06/judge-enters-500m-judgment-in-real-estate-data-dispute/
- CoStar v. LoopNet, 373 F.3d 544: https://en.wikipedia.org/wiki/CoStar_Group,_Inc._v._LoopNet,_Inc.
- CoStar Group litigation overview: https://en.wikipedia.org/wiki/CoStar_Group
- hiQ v. LinkedIn: https://en.wikipedia.org/wiki/HiQ_Labs_v._LinkedIn

**Data vendor pricing**
- Vendr, CoStar: https://www.vendr.com/buyer-guides/costar
- PropertyScout360, CoStar cost: https://propertyscout360.com/blog/costar-subscription-cost
- Reonomy pricing: https://www.reonomy.com/pricing/ ; CRE Daily review: https://www.credaily.com/reviews/reonomy-review/
- CRED iQ review: https://www.credaily.com/reviews/cred-iq-review/
- CRE Daily, best CRE data sources 2026: https://www.credaily.com/reviews/best-commercial-real-estate-data-sources/
- Crexi pricing: https://www.credaily.com/reviews/crexi-review/ ; https://www.trustradius.com/products/crexi/pricing
- Placer.ai pricing page: https://www.placer.ai/pricing ; comparison (Tontitown, AR): https://www.tontitown.com/wp-content/uploads/2026/05/8D.-Placer.ai-comparison.pdf ; GrowthFactor: https://www.growthfactor.ai/resources/blog/placer-ai-pricing
- Cherre pricing (secondary): https://softwarefinder.com/property-management-software/cherre
- Commission ranges: https://flcregroup.com/florida-commercial-real-estate-commission-rates/

**Bridge / Kurv Industrial**
- Rebrand: https://www.chicagobusiness.com/real-estate/commercial/ccb-bridge-industrial-renamed-kurv-20260316/ ; https://www.connectcre.com/stories/chicago-based-bridge-industrial-rebrands-as-kurv-industrial/ ; https://cre-sources.com/bridge-industrial-rebrands-after-25-years-as-south-florida-platform-continues-to-grow/
- Kurv Miami page: https://kurvindustrial.com/miami/
- Flagler Station (Ryder HQ): https://www.commercialsearch.com/news/bridge-industrial-begins-office-to-industrial-redevelopment-in-miami/
- Doral 826: https://commercialobserver.com/2026/02/bridge-office-industrial-doral/ ; https://therealdeal.com/miami/2025/11/20/bridge-industrial-plans-office-to-warehouse-doral-project/ ; https://floridayimby.com/2025/12/bridge-point-doral-826-planned-for-2027-completion-at-7775-nw-48th-st-doral-florida.html
- Pompano $220M: https://www.connectcre.com/stories/kurv-pays-nearly-220m-for-pompano-beach-industrial-park/ ; https://commercialobserver.com/2026/04/kurv-bridge-industrial-east-pompano-industrial-center/
- Team expansion (2022): https://cre-sources.com/bridge-industrial-expands-south-florida-development-team-welcomes-3-industry-veterans/
- Bridge Point AVE financing: https://bridgeindustrial.com/media/press-release/bridge-industrial-secures-77-55-million-in-permanent-financing-for-bridge-point-ave-in-miami-fl/
- Kevin Carroll LinkedIn: https://www.linkedin.com/in/kevin-carroll-9a609611/
- SVP Development job (Miami): https://www.glassdoor.com/job-listing/svp-development-bridge-industrial-JV_IC1154170_KO0,15_KE16,33.htm?jl=1010170624538

**Land prices**
- MIAMI Realtors, SE Florida land sales H1 2025: https://www.miamirealtors.com/2025/07/10/south-florida-land-sales-surge-leading-indicator-of-future-real-estate-development/
- Tampa IOS/industrial land (Dec 2025): https://ios-yarddogs.com/p/tampa-ios-market-report
- Jacksonville deals: https://www.jaxdailyrecord.com/news/2026/mar/19/suddath-wraps-up-312-acre-purchase-for-almost-3-million-square-foot-north-jacksonville-industrial-park/ ; https://hoodline.com/2026/09/jacksonville-s-signature-land-grabs-150-acres-in-yulee-for-industrial-push-near-i-95/
- Orlando listings (low confidence): https://www.landsearch.com/industrial/orlando-fl

**Comparables**
- Altus Group / Reonomy acquisition: https://en.wikipedia.org/wiki/Altus_Group
- Regrid company history: https://regrid.com/company
- DealMachine: https://www.dealmachine.com/about
