# Landscape

The tool landscape behind the blueprint: what the app tracks, how it is kept current, and what each
review changed.

**In short:** the Tool stack view names real products because a blueprint that says "a CRM" helps
nobody. Products change faster than rules, so the catalogue is reviewed monthly and every review is
logged here.

## What the catalogue covers

The catalogue lives in `assets/js/kb-company.js` (`TOOL_CATEGORIES`). Each category is a slot in the
stack, scored against the answers, with the alternatives kept visible.

| Area | Categories |
| --- | --- |
| Build | Source control, Coding agents, Pipeline, Agent evaluation, Design and prototyping |
| Run the business | AI assistant for everyone, Work tracking, Knowledge and docs, CRM and pipeline, Support desk, Billing and finance, Working channels |
| Learn and observe | Meeting capture, Product analytics, Observability, Warehouse and index |
| Connect and control | Orchestration, Identity and access |

The named products are common choices at each stage, not endorsements. Notes stay functional (what it
is good for, who it suits) because feature claims age badly. See
[CONTRIBUTING.md](CONTRIBUTING.md#on-naming-products).

## How it is reviewed

Once a month the landscape is checked for changes that affect the catalogue: renamed or retired
products, shifts in how businesses adopt AI, and changes to coding agents. A change goes into
`kb-company.js`. Anything checked but left alone is logged here with the reason, so the next review
does not repeat it. Claims are taken from primary sources where they can be reached, and marked when
they cannot.

## Review log

One entry per monthly run, newest last. Each says what was reviewed.

## 2026-10

Reviewed (Sept 2026 and the months just before): enterprise agent adoption surveys, forward-deployed engineering hiring, US Census small-business AI use, coding-agent tool changes.

Changed:
- Coding agents: "Gemini CLI" is now "Antigravity CLI". Google ended free Gemini CLI for individual users on 18 June 2026 and points them to Antigravity CLI. Paid enterprise Code Assist users are not affected. Source: https://9to5google.com/2026/06/17/gemini-cli-code-assist-shutting-down/

Reviewed, not changed:
- Industry notes: US Census data (May 2026) shows AI use highest in information and in finance and insurance, and lowest in retail. This agrees with the existing notes. Source: https://www.census.gov/library/stories/2026/05/ai-use-businesses.html
- Forward-deployed engineering: several large vendors and consultancies are expanding these teams. The app does not name them, so nothing to update.
- Cursor was reported acquired by SpaceX (closed 14 Aug 2026) and Windsurf renamed Devin Desktop (June 2026). Only secondary news sources were reachable, and the app does not list Windsurf. Left as is.
- Vendor-blog survey figures (agent adoption, pilot failure rates) were not used: no primary source reached.

Note: many publisher sites were blocked from the run environment, so some claims could only be checked through a scraping tool.

## 2026-10 (second pass, 18 Oct)

Reviewed: small-business AI surveys (Upwork Q1 2026, Bluehost May 2026), forward-deployed engineering announcements (AWS, OpenAI, Cursor, Ramp, EY), coding-agent ownership and naming changes.

Changed:
- AI assistant for everyone: "Claude for Work" is now "Claude Team or Enterprise". The vendor's pricing page lists Team and Enterprise plans and no longer uses the old name. Source: https://claude.com/pricing

Reviewed, not changed:
- Upwork found more small-business leaders piloting AI agents than not considering them, with data security (27%) and unclear return (24%) as top barriers. This fits the existing notes and the tool's "start with one owned procedure" advice. The Bluehost survey (350 US owners) is a small sample. Neither is a basis for an industry note change. Sources: https://www.upwork.com/resources/state-of-ai-in-smbs, https://www.bluehost.com/state-of-small-business-ai-confidence
- Forward-deployed engineering: AWS announced a $1 billion team (30 Jun 2026); secondary coverage only. The app names no such vendors.
- Windsurf, Continue, Codegen and Amazon Q Developer changes were reported by secondary sites only, and the app does not list them. Cursor ownership news does not change its note.
- census.gov could not be reached this run, so no new sector figures were checked.

## 2026-11

No changes. Checked SMB agent surveys, forward-deployed engineering news and coding-agent changes; nothing was both backed by a primary source and relevant to the catalogue. Noted only: Google stopped selling new Gemini Code Assist subscriptions on 9 Oct 2026 and points buyers to Antigravity (https://developers.google.com/gemini-code-assist/docs/deprecations); the app lists neither, so no edit. Jules wind-down, Roo Code and Codegen closures and an OpenCode change were secondary or single-source and the app does not name them (OpenCode is listed, but its change is unconfirmed, so left alone; recheck next month). Census figures (24.6% of firms using AI) came from a secondary summary only.

## 2026-11 (second pass, 15 Nov)

Reviewed: vendor pricing and plan pages for the assistants, coding agents and support desks the app names; Q3 2026 earnings calls; small-business AI surveys; US Census and Federal Reserve figures.

Changed:
- Coding agents: the Cursor note now says it is sold as part of the X subscription and that models from other vendors are billed on top. The vendor's pricing page shows the cheapest paid plan runs Grok models only. Source: https://cursor.com/pricing
- Support desk: the Intercom note now says the company is called Fin and is part of Salesforce (deal completed 10 Sep 2026). The helpdesk is still sold as Intercom, so the name stays. Sources: https://www.salesforce.com/news/press-releases/2026/09/10/salesforce-completes-acquisition-of-fin/, https://www.intercom.com/

Reviewed, not changed:
- Assistant plan names: ChatGPT Business and Enterprise, Claude Team and Enterprise, and Gemini in Google Workspace all match the vendors' pricing pages. Sources: https://chatgpt.com/pricing, https://claude.com/pricing, https://workspace.google.com/pricing
- Microsoft 365 Copilot: from 1 Dec 2026 it can be bought without a Microsoft 365 base plan. The product name and the note ("where email, documents and chat already live in Microsoft 365") still hold. Source: https://learn.microsoft.com/en-us/partner-center/announcements/2026-october
- Langfuse has been part of ClickHouse since January 2026 and is still open source and self-hostable, which is all its note claims. Secondary source only.
- Antigravity CLI and OpenCode are both still published under those names (vendor docs and release notes). Last month's unconfirmed OpenCode change stays unconfirmed; dropped from the watch list.
- Industry notes: Census sector ranking (information, professional services, education and finance highest; manufacturing and retail lowest) is unchanged, read through a secondary summary because the Census data page does not render its figures to the run environment. The Federal Reserve small-business report (published March 2026) says firms use AI mostly for writing and marketing, which fits the notes. Source: https://www.fedsmallbusiness.org/reports/survey/2026/2026-report-on-employer-firms
- Forward-deployed engineering: monday.com launched a forward-deployed service (Q3 2026 call). The app names no such services.
- New meeting, spreadsheet and office tools from assistant vendors are in beta; not added.
- TubeAlfred transcripts were not used this run; primary pages answered every question.
