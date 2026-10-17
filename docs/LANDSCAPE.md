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
