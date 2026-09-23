# Florida CRE Distress: Public Data Inventory

Prepared 2026-09-23 for the Bridge Industrial question: can a tool find struggling Florida office and retail buildings, and possible industrial land sites, using only public data?

**How to read this.** "Verified" means I fetched the URL or queried the endpoint on 2026-09-23 and saw the described content. "Reported" means a search result or secondary source described it but I could not open the primary page, usually because of a bot wall (HTTP 403) or a JavaScript-only site. The web-search budget ran out partway through, so the county property-appraiser details for Broward, Orange, Duval and Pinellas are thinner than the rest.

---

## Key takeaways

1. **Florida's parcel data is free, statewide and already standardized.** It is the best backbone for this tool of any US state. Every year the FL Department of Revenue (DOR) publishes three files for all 67 counties in one layout:
   - **NAL**: the real-property roll (owner, mailing address, just and assessed values, DOR land-use code, year built, building area, number of buildings, the last two sales).
   - **SDF**: sales, with a *qualification code*.
   - **NAP**: tangible personal property, which lists the businesses operating at each address.

   The GIS parcel polygons, already joined to NAL, are a free statewide layer on the Florida GIO portal: 10.8M parcels, August 2025 vintage. Office is DOR use code 017–019, retail is 011–016, and industrial is 040–049.
2. **Some distress flags are already coded in the DOR files.** The SDF/NAL qualification codes mark sales that were deeds in lieu of foreclosure or transfers to a financial institution (12), tax deeds (11), transfers from receivers or bankruptcy trustees (19), and forced or duress sales made to avoid foreclosure (38). A statewide query can list every commercial parcel that went through a distressed transfer, with no court scraping at all.
3. **NAP is the tenant roster most people miss.** Each business that files a Florida tangible personal property return shows up with its name, NAICS code, physical address, and furniture/fixtures and leasehold-improvement values. Accounts that disappear from an office or retail address from one year to the next are a free, statewide, annual tenant move-out signal. It is noisy (small-business exemptions, address matching), but no other free source comes close.
4. **Ownership unmasking is free.** Sunbiz (the Division of Corporations) publishes full quarterly and daily bulk files over public SFTP, with no fee. They include:
   - entity status (A/I), principal and mailing address, registered agent, up to six officers, and the last three annual-report years;
   - an events file, which shows administrative dissolutions;
   - **federal tax lien** filings, debtors and secured parties.

   The state UCC registry (floridaucc.com) is searchable, but I could not confirm that bulk UCC data exists. Treat UCC as a per-entity lookup.
5. **CMBS gives the only true financial-performance data (NOI, DSCR, occupancy), and it is free on EDGAR, but coverage is partial.**
   - The monthly **ABS-EE EX-102 XML** carries loan and property-level fields: address and county, property type, square feet, top-3 tenants with lease expirations, occupancy at securitization and most recent, NOI, DSCR, payment status, property status, and special-servicer transfer date.
   - The monthly **10-D EX-99.1 remittance report** adds delinquency, specially-serviced, appraisal-reduction and modification detail.
   - Verified example: a Walton County, FL property in BANK5 2024-5YR7 shows occupancy falling from 63% to 33% and DSCR from 1.41 to 0.90.
   - **Limits:** only SEC-registered conduit deals from November 2016 on are covered. 144A deals (most SASB and CRE CLO) and the **servicer watchlist** (CREFC IRP, gated on CTSLink and similar portals) are not public.
6. **Court and recorder data is county by county.** There is no statewide public search: CCIS is closed to the public. The large counties do offer cheap or free bulk feeds:
   - **Hillsborough:** free daily official-records index files and a free monthly civil-case CSV.
   - **Broward:** 10 days of official-records FTP files (index plus images) free.
   - **Palm Beach:** $600/yr for the daily official-records index by FTP.
   - **Miami-Dade:** $110 per folder per month for bulk files, $420/month for images, and an API at $0.20 per call.

   Lis pendens, final judgments, certificates of title and deeds can all be filtered from these indexes by document type.
7. **Tax delinquency is public and seasonal.** Taxes become delinquent on April 1. Tax collectors publish delinquent lists and hold certificate sales around June 1, mostly on Grant Street's LienHub; about 33 counties run Grant Street's TaxSys. Tax-deed and foreclosure auction calendars (RealForeclose/RealTaxDeed, RealTDM, DeedAuction) are publicly viewable. Their bulk exports are limited, and the sites sit behind bot protection.
8. **Physical and occupancy signals are uneven.** The following are free, machine-readable and verified:
   - Miami-Dade building violations, violation liens, code compliance, permits, certificates of use and contaminated sites;
   - Orlando permits, code enforcement and business tax receipts (Socrata);
   - Broward and Miami-Dade local business tax layers;
   - DBPR restaurant license, ownership-change and inspection extracts;
   - FL WARN notices.

   HUD's USPS vacancy data does count business addresses, but only at tract level and only for government and nonprofit users. Placer.ai and SafeGraph are quote-only (no published prices).
9. **Industrial site data is strong and free.** It covers FDOT AADT and truck counts (weekly-updated GIS), FDEP brownfields, cleanup sites and petroleum discharges (ArcGIS REST), county zoning and future land use layers, NWI wetlands, FEMA flood zones, water-management-district land use, and LEHD LODES job density. Vacant commercial (010) and vacant industrial (040) parcels come straight from NAL.
10. **Verdict on feasibility.** Yes. There is enough free data to build a credible statewide *screen*, meaning a ranked candidate list: DOR parcels + NAP tenants + Sunbiz owners + CMBS for loans that are covered + clerk records for the 5–7 largest counties. It will not match CoStar/Trepp on leasing, asking rents or watchlists. A minimum viable product is about 4–6 engineer-weeks. A production statewide system with all 67 clerks is a multi-month effort, and the clerk integrations dominate that cost.

---

## A. Parcel and property data

### A1. FL DOR statewide assessment rolls (NAL / SDF / NAP) — verified

| Item | Detail |
|---|---|
| Portal | https://floridarevenue.com/property/Pages/DataPortal_RequestAssessmentRollGISData.aspx |
| Current files | Tax Roll Data Files directory: `https://floridarevenue.com/property/dataportal/Pages/default.aspx?path=/property/dataportal/Documents/PTO%20Data%20Portal/Tax%20Roll%20Data%20Files` (SharePoint, needs a browser session; one CSV per county per roll) |
| Spec | 2025 User's Guide: https://floridarevenue.com/property/dataportal/Documents/PTO%20Data%20Portal/User%20Guides/2025%20Users%20guide%20and%20quick%20reference/2025_NAL_SDF_NAP_Users_Guide.pdf (2022–2024 guides use the same path pattern). There is also an Excel "Quick Reference" field directory and the 2026 edit guide: https://floridarevenue.com/property/Documents/2026editguide.pdf |
| Years | NAL/NAP from 2002 on; SDF from 2009 on; GIS from 2005 on. Only the latest roll is posted; earlier years are **free on request** (form, or PTOTechnology@floridarevenue.com), sent by temporary URL link |
| Cadence | Preliminary roll July 1, initial final roll October, final roll after VAB (the Value Adjustment Board, which hears appeals) |
| Format / cost | Comma-delimited CSV, free |
| Gotchas | Only the current roll is posted. Parcel ID formats differ by county (use `CO_NO`+`PARCEL_ID`, or `STATE_PAR_ID`/`ALT_KEY`). A parcel with several uses gets its predominant use code. `TOT_LVG_AREA` is "living area", which for commercial means heated building area as reported by the county |

**NAL fields that matter** (from the 2025 guide): `PARCEL_ID, DOR_UC, PA_UC, JV, JV_CHNG, JV_CHNG_CD, AV_SD, AV_NSD, TV_*, LND_VAL, LND_SQFOOT, NCONST_VAL, DEL_VAL, IMP_QUAL, CONST_CLASS, EFF_YR_BLT, ACT_YR_BLT, TOT_LVG_AREA, NO_BULDNG, NO_RES_UNTS, SPEC_FEAT_VAL`. Sales 1 and 2 each carry `QUAL_CD, SALE_PRC, SALE_YR, SALE_MO, OR_BOOK, OR_PAGE, CLERK_NO, MULTI_PAR_SAL`. Also `OWN_NAME, OWN_ADDR1/2, OWN_CITY/STATE/ZIPCD, FIDU_*` (fiduciary), `PHY_ADDR1/2, PHY_CITY, CENSUS_BK, NBRHD_CD, MKT_AR, ALT_KEY, STATE_PAR_ID, SPC_CIR_*` (special-circumstance codes, e.g. disaster), and exemptions `EXMPT_01…82`.

**DOR use codes (commercial and industrial):**
- **Commercial:** 010 vacant commercial · 011 stores, one story · 012 mixed store/office · 013 department stores · 014 supermarkets · 015 regional shopping centers · 016 community shopping centers · **017 office, one story · 018 office, multi-story · 019 professional service buildings** · 020 airports and terminals · 021–022 restaurants · 023 financial institutions · 024 insurance offices · 025 repair · 026 service stations · 027 auto sales/repair · 028 parking lots · 029 wholesale outlets · 030–038 entertainment and recreation · 039 hotels/motels (003 = multifamily with 10+ units).
- **Industrial:** 040 vacant industrial · 041 light manufacturing · 042 heavy industrial · 043 lumber · 044 packing · 045 canneries and bottlers · 046 food processing · 047 mineral processing · **048 warehousing/distribution/trucking terminals** · 049 open storage.

**Sale qualification codes that are distress markers** (SDF `QUAL_CD`, and NAL `QUAL_CD1/2`):

| Code | Meaning |
|---|---|
| 11 | Corrective deed, quit claim, or **tax deed**; minimum doc stamps |
| 12 | Transfer **to or from a financial institution**; deed "**in lieu of foreclosure**" |
| 18 | To or from government (includes FDIC, HUD, Fannie Mae, Freddie Mac) |
| 19 | To or from **bankruptcy trustees**, executors, **receivers** |
| 30 | Between related parties or corporate affiliates |
| 37 | Atypical market exposure or atypically motivated parties |
| 38 | **Forced / under duress / to prevent foreclosure** |
| 39–40 | Consideration differs from doc stamps / non-market financing |

**SDF** is one row per sale: `CO_NO, PARCEL_ID, ASMNT_YR, DOR_UC, NBRHD_CD, MKT_AR, CENSUS_BK, SAL_CHNG_CD, VI_CD, OR_BOOK, OR_PAGE, CLERK_NO, QUAL_CD, SALE_YR, SALE_MO, SALE_PRC, MULTI_PAR_SAL, STATE_PAR_ID`.

**NAP (tangible personal property)** is one row per business account: `TAX_AUTH_CD, NAICS_CD, JV_F_F_E` (furniture/fixtures/equipment), `JV_LESE_IMP` (leasehold improvements), `JV_TOTAL, AV_TOTAL, EXMPT_VAL, TAX_VAL, PEN_RATE` (late-filing penalty), `OWN_NAME, OWN_ADDR, OWN_CITY, OWN_STATE, FIDU_*, PHY_ADDR, PHY_CITY, PHY_ZIP, ALT_KEY`. It feeds these signals:
- businesses operating at an address, by NAICS code;
- tenant churn, from accounts that disappear year over year;
- penalty rates as a sign of a struggling business.

*Caveat:* the $25,000 TPP exemption means some small businesses stop filing after their first year, and the address is the business's physical location, not a parcel ID, so it has to be geocoded or address-matched to parcels.

### A2. Statewide parcel GIS — verified

| Source | URL | Notes |
|---|---|---|
| FGIO "Florida Statewide Parcels" (FDOR Cadastral 2025) | https://geodata.floridagio.gov/datasets/FGIO::florida-statewide-parcels/about | 10.8M polygons for all 67 counties, **joined to NAL** (150+ fields). Exported August 2025. DOR collects GIS from property appraisers each April and updates the linework every August, with maintenance in May and November. Download as CSV, KML, Shapefile, GeoJSON or FGDB. Free |
| Feature service | https://services9.arcgis.com/Gh9awoU677aKree0/arcgis/rest/services/Florida_Statewide_Cadastral/FeatureServer/0 | maxRecordCount 2,000; JSON/GeoJSON/PBF; last edited 2026-09-16. For a full pull, use the hub download, not paged queries (about 5,400 pages) |
| DOR "Map Data" (per-county shapefiles, 2005 on) | via the DOR portal `…PTO%20Data%20Portal/Map%20Data` | Raw county submissions |
| FGDL (UF GeoPlan) | https://fgdl.org/ | Historical statewide parcel and land-use layers; academic archive |

### A3. County property appraisers (for fresher data, sketches and permits)

| County | What is available | Status |
|---|---|---|
| **Hillsborough (HCPA)** | https://downloads.hcpafl.org/: free parcel file (97–182 MB), a 537 MB parcel spreadsheet, **all-sales file** (68 MB), historic sales, GIS layers (easements, roads, subdivisions, lat/lon table), DOR code manual. **Refreshed weekly-ish (last 2026-09-18)** | Verified |
| **Palm Beach (PAPA)** | https://pbcpao.gov/departments/public_services.htm: **free bulk files**, published August and November: CAMA file (about 662k parcels, 8 record types), NAL-format AA file, DR-590, tangible roll (about 57k accounts), situs file, all-ownership file, parcel vector file. Custom programming $66/hr | Verified |
| **Miami-Dade (PA)** | https://www.miamidadepa.gov/pa/home.page: online property search, comparable-sales map (apps.miamidadepa.gov/ComparableSales), record cards. No bulk product is advertised; ask via RecordsRequest@miamidadepa.gov under Ch. 119, or use DOR NAL. County GIS open data: https://gis-mdc.opendata.arcgis.com/ | Partly verified |
| **Broward (BCPA)** | https://web.bcpa.net/InfoBroward/InfoBroward.asp: "commercial services" and remote access by contract, fee based, prices not published. Broward GeoHub (https://geohub-bcgis.opendata.arcgis.com/) has zoning, future land use, flood and business-tax layers | Partly verified |
| **Orange (OCPA)** | https://ocpaweb.ocpafl.org/dataproducts: data-products page is JavaScript-rendered; content not readable | Unverified |
| **Duval** | Search at https://paopropertysearch.coj.net/; no bulk page found | Unverified |
| **Pinellas (PCPAO)** | https://www.pcpao.gov/ returns 403 to bots | Unverified |

Recommendation: use DOR NAL/SDF/NAP plus FGIO parcels statewide, and add county CAMA files (Hillsborough, Palm Beach) where they are free and fresher.

---

## B. Ownership unmasking

### B1. Sunbiz bulk data (FL Division of Corporations) — verified
- Pages: https://dos.fl.gov/sunbiz/other-services/data-downloads/ , quarterly https://dos.fl.gov/sunbiz/other-services/data-downloads/quarterly-data/ , daily https://dos.fl.gov/sunbiz/other-services/data-downloads/daily-data/ , layout https://dos.sunbiz.org/data-definitions/cor.html
- **SFTP:** `sftp.floridados.gov`, user `Public`, password `PubAccess1845!` (published on the state page). **Free**, provided "as is".
- **Quarterly** (January, April, July, October; full snapshot of everything on record) under `doc/quarterly/`:
  - `cor/cordata.zip` (corporate filings) and `cor/corevent.zip` (corporate events);
  - `flr/flrf.zip`, `flre.zip`, `flrd.zip`, `flrs.zip` (**federal lien** filings, events, debtors and secured parties);
  - `fic/` fictitious names; `gen/` general partnerships; `trademarks/`.
- **Daily** files (each workday's new filings): `yyyymmddc.txt` corporate, `…ce.txt` corporate events, `…flrf/flre/flrd/flrs.txt` federal liens, `…f/fe.txt` fictitious names, `…g/ge.txt` partnerships, `…tm.txt` marks.
- **Corporate record:** fixed-width, 1,440 characters, containing:
  - document number, name, **status A/I**, and filing type (DOMP, DOMNP, FORP, FLAL = Florida LLC, FORL, DOMLP, TRUST, …);
  - principal and mailing address;
  - **registered agent** name, type and address;
  - **up to six officers or managers** (title, name, address), with a flag when there are more;
  - **three annual-report year/date pairs**;
  - FEI number.
- **Distress signals:**
  - status Inactive plus an administrative-dissolution event (no annual report is filed after May 1);
  - reinstatements;
  - federal tax liens against the owner entity or its officers;
  - an owner LLC's principal address pointing at a lender or special servicer, or a newly formed "REO LLC" taking title;
  - clusters of LLCs sharing an officer or agent, which reveals the sponsor behind single-asset LLCs.
- **Gotchas:**
  - the quarterly corporate file is larger than 1 GB of fixed-width text, so load it with a real parser;
  - officers are truncated at six;
  - the bulk file may lag sunbiz.org;
  - the web search (search.sunbiz.org) is behind bot protection (403 to scripts), so use the bulk files, not scraping;
  - OpenCorporates (https://api.opencorporates.com) mirrors Florida data, but its API is paid for commercial use.

### B2. UCC — Florida Secured Transaction Registry
- Search: https://www.floridaucc.com/uccweb/search.aspx (debtor name, secured party or file number; images from 1997). The vendor is Image API, LLC (https://dos.fl.gov/sunbiz/other-services/ucc-information/).
- **Bulk:** search results describe "data downloads" but give no prices; the site is a JavaScript single-page app and I could not confirm a bulk product. **Treat UCC as a per-entity lookup** or ask the vendor (850-222-8526).
- **Fixture filings** on real estate are recorded in the county **official records**, not the state registry, so they come with the clerk feeds (section C).
- **Article 9 (mezzanine) foreclosure sales** of the LLC interests that own a building are *private* UCC sales. No court filing is needed, so they leave no clerk trail. The only public traces are:
  - **public-sale notices**, which lenders usually advertise in national papers (WSJ/NYT legal notices), sometimes in local papers and so on **FloridaPublicNotices.com** (https://floridapublicnotices.com/; Florida newspapers must upload legal notices there);
  - later, an ownership change that shows up only as new officers in Sunbiz, because the deed does not change;
  - occasionally litigation (injunction suits) or trade press.

  Monitoring Sunbiz officer changes on owner LLCs is the practical detector.

---

## C. Court and official records (foreclosures, lis pendens, receiverships, deeds in lieu, tax deeds)

**Legal frame.**
- Ch. 119 F.S. (https://www.flsenate.gov/Laws/Statutes/2025/119.07) gives a right to copies at actual cost. Agencies may add a "special service charge" for extensive IT or labor use and may offer remote access by contract, for a fee.
- §28.2221 (https://www.flsenate.gov/Laws/Statutes/2025/28.2221) requires each county recorder to keep a **public web index of official records from 1990 on** (grantor/grantee, date, book/page, document type). It bars posting of family, juvenile and probate court records and redacts home street addresses. It says nothing about bulk sales, so bulk offerings are set county by county.
- Court-record remote access follows Rule 2.420 and the Supreme Court's Standards for Access matrix (AOSC14-19 and successors). Civil and foreclosure dockets are generally viewable online in the major counties.
- **CCIS** (https://www.flccis.com/ccis/), the statewide case index, is **closed to the public**: only courts, law enforcement and agencies may use it.
- **MyFloridaCounty.com** (https://www.myfloridacounty.com/) is the clerks' e-commerce portal (official-records search and ordering for participating counties). It is not a bulk feed.

| County | Bulk / API | Cost | Status |
|---|---|---|---|
| **Hillsborough** | https://www.hillsclerk.com/records-and-reports/public-data-files: **daily official-records index files** (three files per business day: all documents recorded or modified; at least two months kept online); **Civil Bulk Data Files**, monthly CSV of circuit and county civil cases, kept one year; a RealAuction foreclosure-balances report; unclaimed tax-deed surplus spreadsheet | **Free** | Verified |
| **Miami-Dade** | Commercial Data Services, https://www2.miamidadeclerk.gov/developers: FTP bulk files for civil, criminal, family, **official records**, traffic and VAB (daily, weekly or monthly; kept 30 days); **APIs** for the same record types. Official Records search: https://onlineservices.miamidadeclerk.gov/officialrecords/ | **$110 per folder per month**; OR images by FTP **$420/month**; API **$0.20 per call** (prepaid) | Verified |
| **Broward** | Records, Taxes & Treasury: **10 continuous days of Official Records FTP files (index plus images) free**; more by request (954-831-4000). Search: https://officialrecords.broward.org/AcclaimWeb | Free for the 10-day window | Reported (403 to bots) |
| **Palm Beach** | Electronic Distribution Index Service (FTP), same data as the online OR search, **no images**, daily | **$600/yr** | Reported (403 to bots) |
| **Orange** | Comptroller official records at https://www.occompt.com/161/Official-Records; self-service search; no bulk product found | Ask under Ch. 119 | Partly verified |
| **Duval** | https://or.duvalclerk.com/ search (party, instrument, document type, date); CORE for court records; no bulk page found | Ask | Partly verified |
| **Pinellas** | Blocks bots (403) | Ask | Unverified |

**How to use these feeds.** Filter the daily index by document type: LIS PENDENS, NOTICE OF ACTION, FINAL JUDGMENT, CERTIFICATE OF SALE, CERTIFICATE OF TITLE, ASSIGNMENT OF MORTGAGE, ASSIGNMENT OF RENTS, DEED (with low doc stamps), TAX DEED, ORDER (receivership), UCC fixture, and CLAIM OF LIEN (contractor liens). Then join to parcels by the folio or parcel ID when the index carries it, otherwise by legal description or party name matched to NAL `OWN_NAME`. Also note that commercial foreclosures in Florida are **judicial**: every one starts as a circuit civil case (mortgage foreclosure case type) plus a recorded **lis pendens**, so both feeds capture it.

**Federal bankruptcy.**
- PACER (https://pacer.uscourts.gov/pacer-pricing-how-fees-work): $0.10/page, capped at $3 per document, **fees waived if you spend $30 or less per quarter**. Court RSS feeds can monitor new petitions in S.D., M.D. and N.D. Fla. cheaply.
- CourtListener/RECAP (https://www.courtlistener.com/recap/, API at https://wiki.free.law/c/courtlistener/help/api/rest/v4/overview): free token API with **alerts and webhooks**. Default limits are low (5/min, 50/hr, 125/day); commercial agreements are available. It only covers documents someone has already bought through RECAP.
- Chapter 11 single-asset real estate filings (§101(51B)) are the key flag.

**Foreclosure and tax-deed auction platforms.**
- **RealForeclose / RealTaxDeed** (RealAuction), e.g. https://miamidade.realforeclose.com/. Its county list includes Alachua, Bay, Brevard, Broward, Charlotte, Citrus, Clay, Duval, Escambia, Flagler, Gilchrist, Gulf, Hendry, Hernando, Highlands, Hillsborough, Indian River, Lee, Miami-Dade, Palm Beach, Pasco and more. The auction calendar and case lists (case number, parcel, judgment amount, plaintiff) are viewable publicly, but there is **no public export**; bidder features need login, and realauction.com returns 403 to bots.
- **RealTDM** (e.g. https://miamidade.realtdm.com/public/cases/list): public tax-deed case search by status, parcel, certificate or sale date.
- **Broward DeedAuction** (https://broward.deedauction.net/): per-sale **Excel download** of items, plus a prior-sale results report.
- The daily foreclosure calendars scrape easily, but check each site's terms and throttle.

---

## D. Tax delinquency
- Florida taxes are due by March 31 and **delinquent April 1**. Each tax collector must **advertise the delinquent list** (May) and hold a **tax certificate sale by June 1**. After 2 years a certificate holder can apply for a **tax deed** (§197).
- **LienHub** (Grant Street, https://lienhub.com/, e.g. https://lienhub.com/county/broward/certsale/main) runs certificate sales for Broward, Miami-Dade, Orange, Volusia, Okaloosa, Pinellas and many others. Grant Street's **TaxSys** (`<county>.county-taxes.com`) is used by about 33 FL tax collectors (over 80% of property tax collected) and has a public "reports" section, e.g. `https://broward.county-taxes.com/public/reports/real_estate`, with the tax-deed sale lists (403 to bots; use a browser).
- **RealTaxLien** (RealAuction) serves smaller counties (Columbia, Dixie, Gadsden, Gilchrist, Hendry, Highlands, Lafayette …).
- DOR publishes each year which counties use which vendor: https://floridarevenue.com/property/Documents/2022TaxCertSale.pdf (the 2026 URL now returns 404).
- The legal ads themselves are PDFs, e.g. the Miami-Dade 2026 delinquent real-estate notice at https://www.miamidade.gov/resources/legal-ads/county/tax-collector/2026/2026-05-27-public-notice-delinquent-property-taxes.pdf.
- **Signal:** a commercial parcel appearing on the delinquent list, or with an outstanding certificate, is a strong owner-liquidity flag, because institutional owners almost never let taxes go delinquent. It can be refreshed once a year in May, and certificate status is continuous through LienHub/TaxSys lookups.
- Delinquent **tangible** (business) taxes are also advertised, which is a tenant-distress signal (e.g. Miami-Dade's April 30 TPP notice).

---

## E. Financial reports

### E1. SEC EDGAR CMBS — verified with a live pull
- **ABS-EE EX-102 (asset-level XML)** is filed **monthly** with each 10-D by every *registered* CMBS trust issued since **Nov 23, 2016** (the Reg AB II compliance date). Example: https://www.sec.gov/Archives/edgar/data/2022503/000188852426016352/exh_102.xml (BANK5 2024-5YR7, 55 loans, 111 distinct XML tags). The tags confirmed in that file include:
  - property: `propertyName, propertyAddress, propertyCity, propertyState, propertyZip, propertyCounty, propertyTypeCode` (OF, RT, IN, MU, LO, MF, SS, MH …), `netRentableSquareFeetNumber, yearBuiltNumber, yearLastRenovated`;
  - valuation: `valuationSecuritizationAmount/Date, mostRecentValuationAmount/Date/SourceCode`;
  - occupancy: `physicalOccupancySecuritizationPercentage, mostRecentPhysicalOccupancyPercentage`;
  - tenants: `largestTenant/secondLargestTenant/thirdLargestTenant` + square feet + **lease expiration dates**;
  - operations: `revenue…, operatingExpenses…, netOperatingIncomeSecuritizationAmount, mostRecentNetOperatingIncomeAmount, mostRecentNetCashFlowAmount, mostRecentDebtServiceAmount`;
  - coverage: `debtServiceCoverageNetOperatingIncomeSecuritizationPercentage, mostRecentDebtServiceCoverageNetOperatingIncomePercentage` (and the net-cash-flow versions);
  - loan: `paymentStatusLoanCode`, `propertyStatusCode` (in foreclosure, REO, …), `paidThroughDate`, advances outstanding, `reportPeriodModificationIndicator`, `maturityDate`, `DefeasedStatusCode`, `primaryServicerName`.

  Reg AB Schedule AL (17 CFR 229.1125, Item 2) also defines **"Most recent special servicer transfer date"**, "Most recent master servicer return date", and modification and liquidation fields.
  **Live Florida example (Aug 2026):** "Sunset King Lake", DeFuniak Springs (Walton County), manufactured-housing property: occupancy **63% → 33%**, NOI $530k (underwritten) → $83k (Q1 2026), **DSCR 1.41 → 0.90**, property status code 6.
- **10-D EX-99.1 (trustee/certificate-administrator remittance statement)** is public HTML on EDGAR, e.g. https://www.sec.gov/Archives/edgar/data/1687605/000162829726000673/ex99_1.htm (CGCMT 2016-C3). Sections include Mortgage Loan Detail (city, state, property type, balance, maturity, **payment status, workout strategy, modification code**), **NOI Detail**, **Delinquency Loan Detail**, **Appraisal Reduction**, **Specially Serviced Loan Detail** (current and historical), Loan Modification, Liquidated Loan.
- **Not public:** the CREFC **Servicer Watchlist**, the full IRP, special-servicer comments and operating statements. These sit behind certificate-administrator portals (Computershare CTSLink https://ctslink.com/a/register.html, Citi sf.citidirect.com, etc.) after investor, NRSRO or market-data-provider certification. Market-data certification can sometimes be obtained, but it is not "public".
- **Coverage gaps:** 144A deals (most **SASB** single-borrower and **CRE CLO** transactions) and pre-2016 deals have **no EX-102**. Pre-2016 public conduits still file 10-Ds, so their EX-99.1 remittance reports are available. Balance-sheet bank, life-company and debt-fund loans, which are the majority of CRE debt, are invisible.
- **Access:**
  - The EDGAR APIs (data.sec.gov submissions and XBRL, efts.sec.gov full-text search) are free with no key. They need a descriptive User-Agent with contact information and allow **no more than 10 requests per second**.
  - Verified: `efts.sec.gov/LATEST/search-index?forms=ABS-EE&dateRange=custom&startdt=2026-08-01&enddt=2026-08-31` returns 648 ABS-EE filings for August 2026 (all asset classes).
  - Full-text search does **not** index the EX-102 XML (a query for "Coral Gables" in ABS-EE returned 0). It **does** index 10-D EX-99.1 (the same query returned 33 hits in 2026) and 8-Ks (422 hits for "special servicer" + Florida + office in 2026).
  - Practical approach: list the CMBS trust CIKs (ABS-EE filers with SIC 6189 whose names include "Commercial Mortgage", BANK, Benchmark, BMO, etc.), pull each monthly `exh_102.xml`, and keep `propertyState = FL`.
  - Paid mirrors: sec-api.io (ABS-EE and 10-D datasets). Open-source loader: https://github.com/pgoldtho/visulate-abs.
- **8-K and 10-D narrative:** special-servicer transfers, appraisal reductions and trust-level events are sometimes reported. Searchable through full-text search.

### E2. REITs and banks
- **REIT 10-Ks**: Schedule III (real estate and accumulated depreciation) lists properties, sometimes by name and city, often grouped by market. Impairment notes, 8-Ks on loan defaults or "handing back keys", and the property lists in supplemental packages (on company IR sites, not EDGAR) help too. XBRL company facts and frames (data.sec.gov) give entity-level numbers; property-level Schedule III tagging is inconsistent. Useful for Florida-heavy office REITs and non-traded REITs, BDCs and interval funds that disclose loan-level CRE marks.
- **FDIC BankFind API** (https://api.fdic.gov/banks/docs/; verified: 83 active FL-headquartered institutions) and **FFIEC call reports** (https://cdr.ffiec.gov/public/, free bulk). These give CRE concentration and nonaccrual CRE totals by bank, which point to local lenders under pressure. They are **not property-level**.
- Freddie Mac and Fannie Mae multifamily loan-level data (K-deals, MCIRT/MCAS) covers multifamily only, which is less relevant here.

---

## F. Tenant and occupancy signals

| Source | URL | Content / format | Cost | Signal | Status |
|---|---|---|---|---|---|
| **FL WARN notices** | https://floridajobs.org/workforce-resources/worker-adjustment-and-retraining-notification-(warn) → https://reactwarn.floridajobs.org/WarnList/Records?year=2026 | HTML table, paginated (204 records in 2026): company, **site street address**, notice date, layoff dates, employees affected, industry, PDF attachment. 2019 on in HTML, 2017–18 as PDF | Free, scrape | Large-tenant layoff or closure at a specific address | Verified |
| **DOR NAP (TPP roll)** | see A1 | Business name, NAICS, physical address, FF&E and leasehold values | Free | Tenant roster and churn | Verified |
| **Local Business Tax (BTR)** | Miami-Dade "Local Business Tax – View" FeatureServer (https://services.arcgis.com/8Pc9XBTAsYuxx9Ny/arcgis/rest/services/Local_Business_Tax_Feature_Layer_View/FeatureServer); Broward "Business Parcels and Tax Records" and "Local and Non-Broward Business Tax Database"; Orlando "Business Tax Receipts" (https://data.cityoforlando.net/Permitting/Business-Tax-Receipts/7388-4re5) | ArcGIS / Socrata APIs | Free | Active businesses by location; non-renewals | Verified (listing) |
| **Miami-Dade Certificates of Use** (2003 on) | https://services.arcgis.com/8Pc9XBTAsYuxx9Ny/arcgis/rest/services/CertificateOfUse_New_gdb/FeatureServer | New-occupant CUs by address | Free | Leasing activity: few new CUs means stagnation | Verified |
| **DBPR licenses** | https://www2.myfloridalicense.com/hotels-restaurants/public-records/ (e.g. `sto/file_download/extracts/hrfood1.csv`…`hrfood7.csv`, `newfood_*.xlsx`, `change-owner-food_*.xlsx`, inspection extracts, weekly EOS extracts); the DBPR "datamart" covers other professions | CSV/XLSX, weekly to annual | Free | Restaurant and retail tenant openings, closures and ownership changes | Verified |
| **Overture Maps Places** | https://docs.overturemaps.org/guides/places/ | About 81M places worldwide (Sept 2026 release; Meta, Microsoft, Foursquare …): names, taxonomy (2,300+ categories), **confidence**, address, website, phone, sources. GeoParquet on S3/Azure, **monthly**, CDLA-Permissive-2.0 / Apache-2.0 | Free | POI density per building; POIs dropping out between releases | Verified |
| OpenStreetMap | https://www.openstreetmap.org (Geofabrik FL extract) | POIs, building tags; ODbL (share-alike) | Free | Weak for tenancy | Known |
| Google Places API | Places API (New) | `businessStatus` = CLOSED_TEMPORARILY / CLOSED_PERMANENTLY; paid per call with monthly free caps; **ToS forbids storing or caching content** except place IDs | Paid per call | Closure checks on candidate tenants | Known, not re-verified |
| Yelp Fusion API | https://docs.developer.yelp.com | `is_closed`; paid tiers since 2024; strict display and caching terms | Paid | Same | Known, not re-verified |
| LoopNet / Crexi listings | loopnet.com, crexi.com | Sublease and for-lease listings, availability and asking rent | Blocked (403 to bots) | Sublease glut and vacancy | **ToS prohibit scraping**; CoStar (owner of LoopNet) is known for litigation (CoStar v. Crexi, filed 2020). **Do not scrape** |
| Job postings / LinkedIn | — | Hiring vs. layoffs by employer | LinkedIn ToS prohibits scraping | Tenant health | Use licensed feeds (e.g. Revelio, Lightcast) |
| **HUD-USPS vacancy** | https://www.huduser.gov/portal/datasets/usps.html | Quarterly counts of residential **and business** addresses: vacant, no-stat, total, **by census tract** | Free but **restricted to governmental and nonprofit registered users** | Business-address vacancy at tract level (not building level) | Verified |
| Placer.ai | https://www.placer.ai/pricing | Foot traffic; freemium plus custom subscriptions; API and feeds | **Quote only** (market chatter: tens of thousands of dollars a year) | Retail visits trend | Verified (no prices) |
| SafeGraph / Advan / Dewey | https://www.safegraph.com/pricing, https://www.deweydata.io/ | SafeGraph Places (monthly); foot-traffic "Patterns" is now largely sold via Advan/Dewey | Custom quote | Visits | Verified (no prices) |
| Utility disconnects | — | Not public for commercial accounts (customer data is exempt); municipal utilities may release aggregates only | — | — | Not available |

---

## G. Physical and condition signals

| Source | URL | Notes | Status |
|---|---|---|---|
| **Miami-Dade Building Violations / Violation Liens / Citations; Code Compliance Violations** | FeatureServers under `services.arcgis.com/8Pc9XBTAsYuxx9Ny/arcgis/rest/services/` (`BuildingViolation_gdb`, `BuildingViolationLien`, `BuildingViolationCitation`, `CCVIOL_gdb`) | Updated daily-ish (Sept 2026). Unsafe-structure and recertification violations appear here | Verified |
| **Miami-Dade building permits** | `miamidade_permit_data/FeatureServer` ("2 previous years to present") | Permit type, value, address, folio. Also the Miami-Dade permit portal https://www.miamidade.gov/permits/ | Verified |
| **Miami-Dade & Broward 40/50-year recertification** | https://www.miamidade.gov/global/economy/building/recertification.page ; status search https://www.miamidade.gov/Apps/RER/carbr/ | All buildings except single-family homes, duplexes, and buildings of 2,000 sq ft or less with occupant load of 10 or less: recertify at 40 years (now 25 years coastal / 30 years inland), then every 10. Covers **commercial** buildings. Unincorporated Miami-Dade only (folio prefix 30); cities (Miami, Miami Beach, Coral Gables …) run their own. Broward has an equivalent 40-year program | Verified (page) |
| Statewide milestone inspections (§553.899) | https://www.flsenate.gov/Laws/Statutes/2025/553.899 | Condos and co-ops of 3+ stories only, **not office or retail** | Verified (statute page loads) |
| **Orlando** permits and code enforcement | https://data.cityoforlando.net/ (Socrata; e.g. Permit Applications `ryhf-m453`, Code Enforcement Cases `k6e8-nw6w`) | Refreshed daily; SODA API | Verified |
| **Tampa** planning, permits and inspections | https://city-tampa.opendata.arcgis.com/ (`arcgis.tampagov.net/.../OpenData/Planning/MapServer`) | Construction inspections, development coordination; commercial permits are thin in open data (use Accela Citizen Access) | Verified |
| Jacksonville, Palm Beach, Hillsborough, Orange open data | data.coj.net / opendata.pbcgov.org did not resolve; hubs returned no permit sets | Probably Accela/portal scraping or a Ch. 119 request | Unverified |
| Fire inspections, elevator certificates | Elevator certificates come from DBPR's Bureau of Elevator Safety (license lookup; datamart); fire inspections are local fire marshals, rarely open | Low value / hard | Known |
| **FEMA flood** | NFHL: https://www.fema.gov/flood-maps/national-flood-hazard-layer; county copies (e.g. Broward FloodZones2024 FeatureServer) | Flood zone per parcel | Known / county verified |
| **NFIP claims** | OpenFEMA API `https://www.fema.gov/api/open/v2/FimaNfipClaims` (verified: 16,089 FL non-residential claims); **v2 is deprecated as of Oct 15, 2026 → use "NFIP Redacted Claims v3"** | Redacted to census tract or rounded coordinates, **no addresses** | Verified |
| Hurricane damage | FEMA IA/PA datasets (OpenFEMA), NOAA Storm Events; the DOR NAL `SPC_CIR_*` fields flag disaster-related value changes | Tract or parcel | Known |
| Aerial and satellite imagery | NAIP (USDA, about 60 cm, every 2 years; free on AWS and Google Earth Engine); county aerials (e.g. Palm Beach PA "new aerial maps"); FDOT aerial photo archive; Sentinel-2 (10 m, free) is too coarse for parking; paid Nearmap / EagleView / Planet SkySat | Parking-lot occupancy needs about 30–50 cm and repeat captures. NAIP is too infrequent for trends; commercial imagery is needed for monitoring | Known |

---

## H. Land and site data for industrial

| Layer | Source / URL | Status |
|---|---|---|
| Vacant commercial / industrial parcels | NAL `DOR_UC` 010 / 040 (plus 048/049 for existing industrial); acreage from `LND_SQFOOT` | Verified |
| **Traffic (AADT, truck volumes)** | FDOT TDA: https://www.fdot.gov/statistics/gis/default.shtm (weekly-updated shapefiles) and hub FeatureServers `Annual_Average_Daily_Traffic_TDA`, `Annual_Average_Daily_Traffic_Historical_TDA`, `Truck_Volume_TDA`, `ComboTruckCounts2020–2024` (services1.arcgis.com/O1JpcwDW8sjYuddV); count viewer https://tdaappsprod.dot.state.fl.us/fto/ | Verified |
| Designated truck routes and SIS/freight network | FDOT GIS (Designated Roads; SIS); FreightMovesFlorida dashboard (https://www.fdot.gov/rail/) | Partly verified |
| **Rail lines and owners (CSX, FEC, short lines)** | USDOT BTS North American Rail Network: https://geodata.bts.gov/datasets/usdot::north-american-rail-network-lines/about (owner and trackage rights); FDOT Rail System Map. Spurs and sidings are generally **not** in public data (railroads' industrial-development teams have them) | Verified (page) |
| **Brownfields** | FDEP: `ca.dep.state.fl.us/arcgis/rest/services/OpenData/BROWNFIELD_AREAS/MapServer/0` (areas) and `/1` (sites); https://geodata.dep.state.fl.us/ | Verified |
| **Contamination / cleanup** | FDEP `OpenData/CLEANUP_SP/MapServer/0`; storage-tank contamination monitoring and petroleum discharges `OpenData/DWM_STCM/MapServer/2,5`; groundwater contamination areas; Miami-Dade "Contaminated Site" and "Multi-Property Contaminated Site" | Verified |
| Zoning | County and city layers, e.g. Miami-Dade County Zoning and Municipal Zone FeatureServers; Broward ZoningOfficial and Municipal Service District zoning. No statewide zoning layer exists; about 400 municipalities, so coverage is uneven | Verified (MDC, Broward) |
| Future land use | Broward Future Land Use FeatureServer; others by county. Historic statewide land use at FGDL and the water-management-district land-cover layers | Verified (Broward) |
| Wetlands | USFWS NWI state download: https://www.fws.gov/program/national-wetlands-inventory/download-state-wetlands-data | Verified (page) |
| Water management district permits and land use | SFWMD https://geodata.sfwmd.gov/ (land cover/use 1995–2016; ePermitting); SJRWMD https://data-sjrwmd.opendata.arcgis.com/ ; Miami-Dade DERM permits and wetland permits FeatureServers | Verified (portals) |
| Miami-Dade "Developable Site", "Urban Infill Area", "Community Redevelopment Area" | MDC GIS hub | Verified |
| State site selector | SelectFlorida "Site Selection Tool": https://selectflorida.giswebtechguru.com/ (sites and buildings listings from economic-development organizations; export unknown) | Partly verified |
| Opportunity zones, CRAs, enterprise zones | FloridaCommerce / county hubs (Broward "Incentive Zones") | Verified (Broward) |

---

## I. Other context data

| Source | Use | URL |
|---|---|---|
| **LEHD LODES 8** (2002–2023, census block; WAC/RAC/OD) | Office-job density, jobs by industry near each building, change over time | https://lehd.ces.census.gov/data/ |
| Census County Business Patterns / ZBP | Establishments by ZIP and NAICS | https://www.census.gov/programs-surveys/cbp.html |
| BLS QCEW | County employment by industry, quarterly | https://www.bls.gov/cew/ (403 to bots; the API works with a key) |
| FL Realtors / FL Housing | Mostly residential | — |
| NOAA Digital Coast / Storm Events | Surge and sea-level layers, storm history | https://coast.noaa.gov/digitalcoast/ |
| FloridaPublicNotices.com | Statewide legal notices (foreclosure sales, UCC sales, tax deeds); searchable with email alerts. Since HB 7049 (2022), governments may publish on county-designated websites instead (§50.0311) | https://floridapublicnotices.com/ |
| Data Commons | Aggregated federal statistics | https://datacommons.org/ |

---

## Engineering assessment

### Join architecture

```
FGIO parcels (geometry, 10.8M) ──join on CO_NO+PARCEL_ID──> DOR NAL (owner, value, use, sales)
                                                         ├─> DOR SDF (all sales, QUAL_CD distress codes)
    NAP (TPP accounts) ──address normalize/geocode──────┤  (tenants per parcel)
    Sunbiz cordata/corevent/flr* ──owner-name match─────┤  (entity status, officers, agents, fed liens)
    Clerk OR daily index + civil CSV ──folio or name────┤  (lis pendens, judgments, cert. of title)
    Tax collector delinquent list / LienHub ──parcel────┤
    CMBS EX-102 + 10-D EX-99.1 ──geocode→point-in-poly──┤  (NOI, DSCR, occupancy, SS status)
    WARN, BTR, CU, DBPR, Overture ──address/geo─────────┤
    Code violations / permits / recert ──folio/address──┘
```

### Hard parts, in order of difficulty
1. **Clerk records across 67 counties.** Each county runs a different vendor (Acclaim, Landmark, Tyler/Odyssey, custom), document-type vocabulary and bulk policy. The top 7 counties (Miami-Dade, Broward, Palm Beach, Hillsborough, Orange, Duval, Pinellas) hold most office and retail value. Hillsborough and Broward are free, Palm Beach costs $600/yr and Miami-Dade about $1.3k–6.5k/yr. Budget about 1 week per county for ingestion and normalization, plus a Ch. 119 request letter for counties without a product.
2. **Entity resolution.** Owner names in NAL look like "XYZ OFFICE PARTNERS LLC", often c/o a manager address. Match them to Sunbiz documents with exact names plus fuzzy fallback, then build officer and agent graphs to group LLCs by sponsor. Expect roughly 85–90% auto-match for Florida entities. Delaware entities registered as foreign (FORL) still appear in Sunbiz.
3. **Address matching** for NAP, WARN, CMBS and BTR against parcel situs addresses: standardize with USPS-style parsing (libpostal), and geocode with the Census geocoder (free) or the FGIO address points.
4. **CMBS pulls.** A few hundred trusts × monthly XML. The ingestion is straightforward and 10 requests per second is plenty, but mapping loans to parcels needs geocoding and manual QA for multi-property loans.
5. **Signal scoring.** No labelled "distress" ground truth exists. Bootstrap labels from outcomes (later SDF codes 11/12/19/38, certificates of title, CMBS special servicing) and back-test on 2019–2025 rolls, which DOR provides free on request.

### Minimal viable dataset (about 4–6 engineer-weeks, near-zero data cost)
1. DOR **NAL + SDF + NAP** for the latest two or three years (statewide), filtered to use codes 010–039 and 040–049, plus **FGIO parcel polygons**.
2. **Sunbiz** quarterly corporate, events and federal-lien files, plus daily deltas.
3. **CMBS** EX-102 (FL properties) and 10-D EX-99.1 special-servicing and delinquency tables.
4. **Clerk official-records index** for Hillsborough (free) and Broward (free 10-day FTP, polled daily), then Palm Beach ($600) and Miami-Dade (about $110/month for OR index); plus Hillsborough's monthly civil CSV.
5. **Tax-collector delinquent lists** (May) for the top counties.
6. **WARN** (scraped), **Overture Places** (monthly), Miami-Dade violations, permits and certificates of use.
7. Industrial sites: vacant 040/010 parcels × FDOT AADT/truck counts × FDEP brownfields/cleanup × NWI wetlands × FEMA flood × county zoning (where available).

**Resulting score for each office or retail parcel:**
- distress-coded transfers;
- value cuts (`JV_CHNG`, VAB appeals);
- tax delinquency;
- lis pendens or foreclosure filings;
- owner-entity problems (inactive, federal liens, officer changes);
- tenant loss (NAP accounts, BTR, CU, Overture churn, WARN);
- CMBS DSCR below 1.0, occupancy decline, special servicing;
- building age or recertification violations.

### What public data cannot see
- Leases, asking rents, vacancy by suite, and sublease availability. These are CoStar/LoopNet/Crexi data, which prohibit scraping.
- Balance-sheet loans (banks, life companies, debt funds). The recorded mortgage shows the lender and original amount, but not performance.
- The CMBS watchlist and SASB/CRE-CLO loan performance (gated).
- Mezzanine defaults before a UCC sale notice.

A paid add-on for these gaps would be Trepp or CRED iQ (CMBS/CLO including watchlists) and CoStar (leasing).

---

## Sources

- FL DOR data portal: https://floridarevenue.com/property/Pages/DataPortal_RequestAssessmentRollGISData.aspx
- 2025 NAL/SDF/NAP User's Guide: https://floridarevenue.com/property/dataportal/Documents/PTO%20Data%20Portal/User%20Guides/2025%20Users%20guide%20and%20quick%20reference/2025_NAL_SDF_NAP_Users_Guide.pdf
- 2024 guide: https://floridarevenue.com/property/dataportal/Documents/PTO%20Data%20Portal/User%20Guides/2024%20Users%20guide%20and%20quick%20reference/2024_NAL_SDF_NAP_Users_Guide.pdf
- 2026 edit guide: https://floridarevenue.com/property/Documents/2026editguide.pdf
- FGIO Statewide Parcels: https://geodata.floridagio.gov/datasets/FGIO::florida-statewide-parcels/about ; service: https://services9.arcgis.com/Gh9awoU677aKree0/arcgis/rest/services/Florida_Statewide_Cadastral/FeatureServer/0
- FGDL: https://fgdl.org/
- Hillsborough PA downloads: https://downloads.hcpafl.org/
- Palm Beach PA public services: https://pbcpao.gov/departments/public_services.htm
- Miami-Dade PA: https://www.miamidadepa.gov/pa/home.page ; Broward PA: https://web.bcpa.net/InfoBroward/InfoBroward.asp ; Orange PA: https://ocpaweb.ocpafl.org/dataproducts
- Sunbiz downloads: https://dos.fl.gov/sunbiz/other-services/data-downloads/ ; quarterly: https://dos.fl.gov/sunbiz/other-services/data-downloads/quarterly-data/ ; daily: https://dos.fl.gov/sunbiz/other-services/data-downloads/daily-data/ ; layout: https://dos.sunbiz.org/data-definitions/cor.html
- UCC: https://dos.fl.gov/sunbiz/other-services/ucc-information/ ; https://www.floridaucc.com/uccweb/search.aspx
- Mezzanine / UCC foreclosure practice: https://www.pillsburylaw.com/en/news-and-insights/mezzanine-loan-foreclosure-under-the-ucc.html
- Florida Public Notices: https://floridapublicnotices.com/ ; §50.0311: https://www.flsenate.gov/Laws/Statutes/2025/50.0311
- Ch. 119.07: https://www.flsenate.gov/Laws/Statutes/2025/119.07 ; §28.2221: https://www.flsenate.gov/Laws/Statutes/2025/28.2221 ; §553.899: https://www.flsenate.gov/Laws/Statutes/2025/553.899
- CCIS: https://www.flccis.com/ccis/ ; MyFloridaCounty: https://www.myfloridacounty.com/
- Hillsborough Clerk data files: https://www.hillsclerk.com/records-and-reports/public-data-files
- Miami-Dade Clerk commercial data: https://www2.miamidadeclerk.gov/developers ; OR search: https://onlineservices.miamidadeclerk.gov/officialrecords/
- Broward OR: https://officialrecords.broward.org/AcclaimWeb
- Palm Beach Clerk EDIS: https://www.mypalmbeachclerk.com/records/official-records/electronic-distribution-index-service
- Orange Comptroller OR: https://www.occompt.com/161/Official-Records ; Duval OR: https://or.duvalclerk.com/
- PACER fees: https://pacer.uscourts.gov/pacer-pricing-how-fees-work ; CourtListener API: https://wiki.free.law/c/courtlistener/help/api/rest/v4/overview ; RECAP: https://www.courtlistener.com/recap/
- RealForeclose (Miami-Dade): https://miamidade.realforeclose.com/ ; RealTDM: https://miamidade.realtdm.com/public/cases/list ; Broward DeedAuction: https://broward.deedauction.net/
- LienHub: https://lienhub.com/county/broward/certsale/main ; Grant Street: https://www.grantstreet.com/auctions ; Broward tax deed info: https://www.broward.org/RecordsTaxesTreasury/taxcollector/Pages/LatestTaxDeedSaleInfo.aspx
- DOR tax cert sale vendor list (2022): https://floridarevenue.com/property/Documents/2022TaxCertSale.pdf
- Miami-Dade delinquent notice 2026: https://www.miamidade.gov/resources/legal-ads/county/tax-collector/2026/2026-05-27-public-notice-delinquent-property-taxes.pdf
- Reg AB Schedule AL (17 CFR 229.1125) via eCFR: https://www.ecfr.gov/current/title-17/section-229.1125
- SEC Form ABS-EE: https://www.sec.gov/files/formabs-ee.pdf ; ABS XML tech spec: https://www.sec.gov/info/edgar/specifications/absxml-1.6_d.htm ; Reg AB II compliance: https://www.sec.gov/oit/announcement/regabii-asset-level-requirements-compliance.html
- Example EX-102: https://www.sec.gov/Archives/edgar/data/2022503/000188852426016352/exh_102.xml
- Example 10-D EX-99.1: https://www.sec.gov/Archives/edgar/data/1687605/000162829726000673/ex99_1.htm
- EDGAR access and fair use: https://www.sec.gov/edgar/searchedgar/accessing-edgar-data.htm
- Reg AB II scope (registered offerings only): https://www.hunton.com/media/legal/2470_user-guide-to-regulation-ab-ii-and-exchange-act-rules-15ga-2-and.pdf
- CTSLink registration: https://ctslink.com/a/register.html
- visulate-abs: https://github.com/pgoldtho/visulate-abs ; sec-api ABS-EE dataset: https://sec-api.io/datasets/form-absee-files
- FDIC API: https://api.fdic.gov/banks/docs/ ; FFIEC CDR: https://cdr.ffiec.gov/public/
- FL WARN: https://floridajobs.org/workforce-resources/worker-adjustment-and-retraining-notification-(warn) ; list: https://reactwarn.floridajobs.org/WarnList/Records?year=2026
- DBPR restaurant records: https://www2.myfloridalicense.com/hotels-restaurants/public-records/
- Orlando open data: https://data.cityoforlando.net/ ; Business Tax Receipts: https://data.cityoforlando.net/Permitting/Business-Tax-Receipts/7388-4re5
- Miami-Dade GIS hub: https://gis-mdc.opendata.arcgis.com/ ; Broward GeoHub: https://geohub-bcgis.opendata.arcgis.com/ ; Tampa: https://city-tampa.opendata.arcgis.com/
- Miami-Dade recertification: https://www.miamidade.gov/global/economy/building/recertification.page
- HUD USPS vacancy: https://www.huduser.gov/portal/datasets/usps.html
- Overture Places: https://docs.overturemaps.org/guides/places/
- Placer.ai pricing: https://www.placer.ai/pricing ; SafeGraph pricing: https://www.safegraph.com/pricing
- OpenFEMA NFIP claims: https://www.fema.gov/api/open/v2/FimaNfipClaims (v3: https://www.fema.gov/openfema-data-page/nfip-redacted-claims-v3)
- FDEP geodata: https://geodata.dep.state.fl.us/ ; brownfields service: https://ca.dep.state.fl.us/arcgis/rest/services/OpenData/BROWNFIELD_AREAS/MapServer
- FDOT GIS: https://www.fdot.gov/statistics/gis/default.shtm ; FDOT hub AADT: https://services1.arcgis.com/O1JpcwDW8sjYuddV/arcgis/rest/services/Annual_Average_Daily_Traffic_TDA/FeatureServer ; FDOT Rail: https://www.fdot.gov/rail/
- BTS rail network: https://geodata.bts.gov/datasets/usdot::north-american-rail-network-lines/about
- NWI: https://www.fws.gov/program/national-wetlands-inventory/download-state-wetlands-data
- SFWMD geodata: https://geodata.sfwmd.gov/ ; SJRWMD: https://data-sjrwmd.opendata.arcgis.com/
- SelectFlorida site tool: https://selectflorida.giswebtechguru.com/
- LEHD: https://lehd.ces.census.gov/data/ ; CBP: https://www.census.gov/programs-surveys/cbp.html
- NAIP: https://www.usgs.gov/centers/eros/science/usgs-eros-archive-aerial-photography-national-agriculture-imagery-program-naip ; Earth Engine: https://earthengine.google.com/
