# Getting county event data into HushHawk: records request plan

HushHawk already creates Absentee Owner and Out-of-State Owner events from the property appraiser roll. The other event types (foreclosure, tax, code and so on) need records that only the offices below hold. None of them offers a free feed that software can pull today, so each has to be asked for. Florida's Public Records Act (Chapter 119, Florida Statutes) lets any person request public records; no reason is required, and the office may charge its actual duplication cost, plus a special service charge when a request needs extensive staff or computer time. Confirm details with each office; they change.

Contact details below come from the offices' own websites as of November 2026. Verify them before sending.

## What to ask each office for

| Office | What it holds | Events it feeds | How to ask |
|---|---|---|---|
| **Duval Clerk of Courts**, Official Records (Room 1253, 501 W. Adams St, 904-255-2025) | Recorded lis pendens, recorded liens (judgment, mechanics, HOA), deeds including certificates of title | PFC (pre-foreclosure), COMLIEN, HOA, REO | The Clerk's "Request to Obtain Complex Public and Court Records" form. It has a field for bulk data reports, recurring data subscriptions and historical data. Cost follows the Clerk's Cost Recovery Policy. |
| **Duval Clerk of Courts**, Civil, Probate and County Court (Public Records Department, Room 2338; online case access is called CORE) | Foreclosure case filings and final judgments, probate cases, eviction cases, divorce cases | FC, PRB, INH, EVI, DIV | Same form. Ask for new filings as a recurring file. |
| **Duval Clerk of Courts**, Tax Deeds | Tax deed applications and the "List of Lands Available" | TDEED | Public files on the Clerk's website; ask for a recurring export. |
| **Duval Tax Collector** | Delinquent parcels, county-held tax certificates, full tax roll, special lien improvement book | TAX, TCERT | These reports are published on the Tax Collector's site as downloadable reports. The site's bot check blocks software, so a person downloads them (see "Do this now"). For an automated feed, ask the office in writing for a recurring export. |
| **City of Jacksonville Municipal Code Compliance** | Code cases, citations, special master actions, condemnation and demolition orders, municipal liens | CODE, CONDEMN, ML, REPAIR | Public records request on the City's records portal. The City's own pages say to choose "City Records Request" then "Municipal Code Compliance Documents", and to give the property address and the Real Estate Number. The City has a spreadsheet of active cases, so ask for that on a recurring basis. |
| **Clay, St. Johns, Nassau, Flagler, Polk** Clerks, Tax Collectors and code offices | The same record types | The same events | Send the same letters with the county name changed. Start after Duval works. |

## Ask for these fields

Every record must carry the parcel (Real Estate Number in Duval) so it can be matched to a property. HushHawk will not attach a record to a property without a verified parcel. If a file has addresses but no parcel, the parcel is looked up from the county roll and accepted only when the street address matches.

- **Foreclosure and lis pendens:** case number, filing or recording date, plaintiff, defendant, property address, parcel, legal description, case status, final judgment amount, sale date.
- **Probate, eviction, divorce:** case number, filing date, case type, status, property address or parcel where the file contains one. Court records often do not name a property; say so and ask what the office can supply.
- **Tax:** parcel, owner name, tax year, amount due, certificate number and holder (for certificates), application date (for tax deeds).
- **Code and liens:** case number, parcel, address, violation type, opened date, status, citation or fine amount, lien recorded date, lien release date.
- **Format and frequency:** CSV or Excel for the first file, then a recurring daily or weekly file for new and changed records. Ask whether a secure download link or an HTTPS data feed is possible.

## Do this now (no waiting)

The Tax Collector publishes "Delinquent Parcels" and "County-Held Tax Certificates" as reports that can be filtered and downloaded. A person can download them in a browser today. Once you have the files, HushHawk can load them as TAX and TCERT events with the report as evidence, through the existing import route. If you want, I can open the Tax Collector's reports page in the browser pane, you click the download, and I map the columns and import them. A real sample file is needed first to match its parcel format to the roll.

## Compliance notes

- Outreach to owners who are in foreclosure, probate or tax trouble is regulated. Have a Florida attorney review the outreach scripts and the use of this data before contacting anyone.
- Some record fields can be legally withheld (for example certain protected addresses). Offices may redact them. Do not try to rebuild redacted data.
- Keep each office's reply and the file it sends with the import record, so every event can be traced to its source.

## Order of work

1. Send the Tax Collector and Clerk requests (letters below). Do the Tax Collector downloads yourself the same day.
2. Send the Municipal Code Compliance request.
3. When files arrive, send them to me. I map the columns to the pillars, import them, and check parcel matches.
4. For any recurring feed, set it up as a scheduled connector.
5. Repeat for the other five counties.

## Letter 1: Duval Clerk of Courts (complex and recurring records request)

> To: Clerk of the Circuit and County Courts, Duval County, Public Records Department
> From: [your name, company, address, phone, email]
> Date: [date]
>
> Under Chapter 119, Florida Statutes, I request the following public records, using the Clerk's Request to Obtain Complex Public and Court Records form:
>
> 1. Mortgage and lien foreclosure cases filed in Duval County Circuit Court, with case number, filing date, parties, property address or parcel (Real Estate Number), case status, final judgment amount and sale date, from [start date] to the present.
> 2. Lis pendens recorded in the Official Records, with recording date, book and page, parties, legal description and parcel where available, from [start date] to the present.
> 3. Probate and eviction case filings, with case number, filing date, case type, status and any property address or parcel in the file, from [start date] to the present.
>
> I would like the historical data once, in CSV or Excel, and then new and changed records on a recurring [daily or weekly] basis through a secure download or data feed. Please tell me the cost under your Cost Recovery Policy and the fastest way to set up the recurring file. If any part of this request is denied or redacted, please state the statutory exemption relied on.
>
> Thank you,
> [name, phone, email]

## Letter 2: Duval Tax Collector

> To: Duval County Tax Collector, Public Records Requests
> From: [your name, company, address, phone, email]
> Date: [date]
>
> Under Chapter 119, Florida Statutes, I request, in CSV or Excel format:
>
> 1. The current Delinquent Parcels report (parcel or Real Estate Number, owner name, tax year, amount due).
> 2. The County-Held Tax Certificates report (parcel, certificate number, tax year, face amount, holder).
> 3. The current Full Tax Roll.
>
> I would like these on a recurring [weekly or monthly] basis. Your website offers them as reports behind a bot check that does not allow automated download. Please let me know if the same files can be sent to me by secure link or an authorised data feed, and any cost.
>
> Thank you,
> [name, phone, email]

## Letter 3: City of Jacksonville Municipal Code Compliance

> Submitted through the City's public records portal under "City Records Request", record type "Municipal Code Compliance Documents".
>
> Under Chapter 119, Florida Statutes, I request:
>
> 1. A list of all open and closed code enforcement cases from [start date] to the present, with case number, Real Estate Number, property address, violation type, opened date, status, and citation or fine amount.
> 2. Recorded municipal liens and lien releases arising from code enforcement, with parcel, recording date and amount.
> 3. Condemnation and demolition orders, with parcel, address and order date.
>
> I would like the current data once in CSV or Excel and then new and changed records on a recurring [weekly] basis. Please tell me the cost and whether a recurring export is possible.
>
> Thank you,
> [name, phone, email]
