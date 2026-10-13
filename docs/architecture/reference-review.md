# Read-only reference review

Reviewed 2026-10-12. No source was copied; no reference scripts, installs, builds, migrations, production requests, or mutations were performed. GitHub file reads used the connected GitHub API when Git HTTPS and public-page fetches failed. Default-branch blobs are point-in-time observations, not a release pin or remote commit identity.

## Atlas

Repository: [SUSI-BALAN/Atlas](https://github.com/SUSI-BALAN/Atlas). GitHub metadata identifies a public repository with main as default branch. Read README, root package scripts, connector interfaces/types/adapter, application routing, auth middleware, environment schema, API document, and the GitHub pagination test from the remote source.

Also read local reference D:\newl\atlaspro: README and package manifests; inventoried relevant source/test paths; reviewed auth, isolation, persistence, and AI test cases. Read-only Git checks used --no-optional-locks and a command-scoped safe.directory exception after the default ownership check failed. No global Git configuration was changed. The local tree was clean, branch stage7-release-readiness, commit 5e4e1414c18ba6386adddc9914fb562411715795. This is an Atlas reference identity, not a Nexus SHA or a verified remote main SHA.

| Evidence | Observation | Nexus decision |
| --- | --- | --- |
| package.json; backend/package.json; frontend/package.json | npm workspaces backend/frontend; Express 5, Mongoose 8, Zod 4, React 19, Vite 7, TypeScript 5.9, Vitest 3 declared | Reimplement independent contracts; choose compatible pinned versions, replace MongoDB with SQLite; no automatic dependency copying |
| backend/src/connectors/core/connector.interface.ts | PlatformConnector exposes search, fetchItem/fetchUpdates, streaming searchRepositories, health, rate limits, capabilities | Use provider-neutral capability model and cancellation; separate metadata discovery from Git transport |
| connector.types.ts; repositoryAdapter.ts | Normalized identity, cloneUrl/defaultBranch/license/provenance; explicit availability/rate-limit categories | Validate cloneUrl independently; retain unknown fields rather than fabricate metadata |
| docs/api.md | Enveloped typed results, cursor pagination, job-scoped details, safe errors, interrupted recovery | Adapt DTO/error/recovery ideas to narrow IPC and SQLite |
| app.ts; middleware/auth.ts | Auth + CSRF middleware, bounded JSON, request IDs, Helmet, rate limits, server workspace context | Do not reuse hosted cookie/auth flows for local desktop; preserve scoped identity principles for future pairing |
| local auth/isolation/persistence/AI test cases | Tests cover CSRF/origin, workspace access, interrupted retention, citation rejection, prompt injection, disabled AI | Reimplement equivalent relevant security cases; historical counts are not Nexus test evidence |
| GitHub pagination test | Mocked 100-item page followed by 50-item page | Provider-specific pagination tests required; no universal-forge assumption |
| environment schema | Provider settings and token options; AI disabled by default, bounded time/context/output | No token in renderer/logs; independent validated settings; keep AI optional |

Remote app.ts and env.ts contain guest-session/quota behavior while docs/api.md still describes a narrower public route set. Local auth tests include guest sessions. The inspected local app/env blobs differ from remote blobs; do not infer full branch equivalence or treat stale documentation as the complete current contract. The core connector interface and docs/api.md blobs match locally/remotely.

65 test files were found in the local reference inventory; no Atlas tests were executed. Running them is unnecessary for the Nexus baseline and could write reference build/cache/database artifacts. Their presence and names do not establish passing behavior.

Atlas root LICENSE fetch returned 404; the inspected local inventory had no license/NOTICE/COPYING path. This does not establish a permission grant or prove no licensing statement exists anywhere. Use independently implemented patterns until source reuse rights and attribution are clarified. Do not copy assets or source under assumed licensing.

Selected remote blob identities for independently repeatable review:

| Path | Git blob SHA |
| --- | --- |
| README.md | 917b4879e1264fe370f77e72792f6fb282a88187 |
| package.json | faed62026e39424dc536d72b81e0d370a62062df |
| backend/src/connectors/core/connector.interface.ts | 5e65bbafe8918b332e8efbcd4903ce0638838f13 |
| backend/src/connectors/core/connector.types.ts | 7c76917db08eb5d2c797370502661e7394e6e1f6 |
| backend/src/app.ts | 85f7d55cdc0410c7e98f6ed6c9d5dd768541c382 |
| backend/src/middleware/auth.ts | e82150fe66a5d768470dd9531747800a9ce257e6 |
| backend/src/config/env.ts | 2b37f58864efac0b7f1af275d2151de6e7b67b04 |
| docs/api.md | 0aa950c77622dbe65678511ad7156b6d35d12340 |
| backend/src/connectors/github/github.connector.pagination.test.ts | 3ac70cd5ceb15ea17ad9e0af58053b8f33639160 |

## GPT Researcher

Repository: [assafelovic/gpt-researcher](https://github.com/assafelovic/gpt-researcher). Reviewed the README architecture and fetched agent.py, skills/researcher.py, skills/writer.py, document/document.py, config/variables/default.py, pyproject.toml, setup.py, LICENSE, and SECURITY.md. No dependencies installed or code run.

The conductor plans queries and gathers source context; the writer generates reports. The Python GPTResearcher class provides async conduct_research and write_report plus getters for sources, URLs, context, and cost. Its constructor supports selected documents/context and source configurations. An isolated Python wrapper is preferable to shipping the entire upstream UI/backend. No interface is integrated or tested in Nexus yet.

Important findings:

- Source retrieval supports local documents, web, hybrid, and LangChain document paths, but local document mode still enters planning/search machinery. A local document flag alone is not proof of zero egress. Default config names cloud LLM/embedding and Tavily retrieval; override and verify every network path for local-only mode.
- DocumentLoader recursively traverses directories, loads multiple document formats, and reduces source URLs to basenames. Restrict input to approved bounded exports, reject links, and keep an independent path/hash/evidence map so equal basenames cannot collide. Do not hand it a whole arbitrary repository or app-data directory.
- Writer abstains when context is empty; Nexus must still validate returned citation identity and supporting evidence. Treat prompt injection and unsafe Markdown as application threats.
- pyproject.toml declares version 0.16.0, Python >=3.12, and a broad dependency graph (LangChain, LangGraph, parsing, LLM, web, and document libraries); setup.py filters requirements differently. Pin a reviewed distribution/version and resolve its actual graph separately. Observed Python 3.13.7 satisfies the declared minimum but does not verify dependency/runtime compatibility.
- Root LICENSE and repository license presentation are Apache-2.0; pyproject.toml and setup.py label MIT. Preserve notices/license obligations for any permitted redistribution, and resolve this inconsistency against the exact selected version before installation/redistribution in Stage 5. No license conclusion for an eventual artifact is made here.
- SECURITY.md explicitly describes an unauthenticated backend and operator responsibility for network boundaries. MCP configuration can execute commands and URL/path configuration can access resources. Nexus must disable these capabilities at the wrapper boundary rather than expose upstream configuration to repository content or renderer requests.

Selected blob identities:

| Path | Git blob SHA |
| --- | --- |
| gpt_researcher/agent.py | 1c5e043dc27307b9a2a6af2bcfb7ca53f0c871b8 |
| gpt_researcher/skills/researcher.py | 59e688e764be1feef316301321baba0301a64f00 |
| gpt_researcher/document/document.py | d232161f643cbca8488a62fbdb2e33cf37c55265 |
| gpt_researcher/config/variables/default.py | a0857d2252a8adc0988b24e7a38ab6c79f9a88ef |
| pyproject.toml | 037171e623b822b3e2282dbf9545b033e7887614 |
| setup.py | 04c5b39cdc49ab398ef84b139ebc30986f8cc3d6 |
| LICENSE | 261eeb9e9f8b2b4b0d119366dda99c6fd7d35c64 |
| SECURITY.md | 375358cd20815edcedd53672d9d2c76b22efe508 |

## Integration decision

No upstream code vendoring in Stage 0 or 1. Stage 5 first delivers a provider interface and AI-disabled behavior, then local Ollama, then a separately installed, pinned GPT Researcher wrapper if licensing/dependencies/egress controls pass. Cloud providers remain opt-in. Reports and citations use Nexus evidence IDs. An unavailable research module must return a safe status without blocking cloning.
