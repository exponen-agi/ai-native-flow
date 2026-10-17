<div align="center">

# AI-Native Flow

**Answer 8 questions. Get a complete plan for running your business with AI.**

A free, instant blueprint: what to automate, who still decides, which tools to use, and what to build first.
No sign-up. No servers. No AI guesswork — the same answers always give the same plan.

[**Open the live app**](https://exponen-agi.github.io/ai-native-flow/) · [How it works](docs/METHOD.md) · [Architecture](docs/ARCHITECTURE.md)

![static site](https://img.shields.io/badge/static-no%20build%20step-2ea44f)
![no tracking](https://img.shields.io/badge/tracking-none-2ea44f)
![license](https://img.shields.io/badge/license-MIT-blue)

<a href="https://exponen-agi.github.io/ai-native-flow/"><img src="docs/images/blueprint.png" alt="A generated AI-native blueprint: the company drawn as loops of signals, work, approval gates and learning" width="900"></a>

</div>

---

## The problem

Companies buy AI seats, hand them to the tech team, and speed up the one step that was never the
bottleneck. Writing gets faster, but planning, review and release still move at human speed — so
results barely change and nobody knows why.

**AI-Native Flow designs the whole operation around AI, not just the tools inside it.**

## How it works

```
  1. DESCRIBE            2. REVIEW               3. ACTIVATE
  8 plain questions ───▶ 5 interactive views ───▶ roster + week-one checklist
  about 2 minutes        about 5 minutes          start this week
```

| Step | What you do | Time |
| --- | --- | --- |
| **Describe** | Business type and size, industry, what you sell, stage, main problem, tech team, budget | ~2 min |
| **Review** | Explore your plan as interactive diagrams | ~5 min |
| **Activate** | Copy the checklist and start this week | instant |

## What you get

| View | The question it answers |
| --- | --- |
| **Company** | Which parts of the business run as loops, and where do people approve? |
| **Delivery** | How does an idea become shipped work, step by step? |
| **Tool stack** | Which tool fills each slot at your stage — and how does its data flow back? |
| **Learning loop** | How does finished work make the next job better? |
| **Who does what** | Which roles are AI agents, which are people, and what passes between them? |

Plus: **the order to build it in**, **the metrics to watch**, and **the failure patterns** that
match your situation.

## Why you can trust it

- **Deterministic.** Rules, not a chatbot. Same answers, same blueprint — it can't invent roles.
- **Private.** Runs entirely in your browser. Nothing is sent, stored or tracked.
- **Free to run.** One static page: no backend, no API keys, no bill.
- **Bring your own AI.** One click exports your plan with a critique prompt to refine in the assistant you already use.

## Try it

Use the [live app](https://exponen-agi.github.io/ai-native-flow/), open `index.html` in a browser, or serve it locally:

```sh
python3 -m http.server 8000   # then visit http://localhost:8000
```

## Learn more

| Document | What it covers |
| --- | --- |
| [docs/VIEWS.md](docs/VIEWS.md) | What each tab shows and how to read it |
| [docs/METHOD.md](docs/METHOD.md) | How the blueprint is derived: the rules and the sources behind them |
| [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) | How the code is organised and why it is static |
| [docs/CONTRIBUTING.md](docs/CONTRIBUTING.md) | Run it locally, deploy it, extend the knowledge base |
| [docs/LANDSCAPE.md](docs/LANDSCAPE.md) | The tools the catalogue covers, with a monthly review log |

## Contributing

Every step, tool and rule is one small object in `assets/js/kb.js` and `assets/js/kb-company.js`.
Add one, reload the page — there is nothing to build. See
[docs/CONTRIBUTING.md](docs/CONTRIBUTING.md#extending-the-knowledge-base) for the format, and run
`npm test` before opening a PR.

## License

MIT, as declared in `package.json`.
