# Security Policy

## Reporting a vulnerability

If you discover a security vulnerability in blockparty, please report it privately via [GitHub's vulnerability reporting](https://github.com/WorldRover/blockparty/security/advisories/new) rather than opening a public issue.

Include:

- Description of the vulnerability
- Steps to reproduce
- Affected version(s)

I'll acknowledge receipt within 7 days and aim to release a fix within 30 days for confirmed issues.

## Scope

In scope:

- `index.html` — entry point.
- `js/app.js`, `js/territories.js` — application source.
- `css/style.css` — styling.
- `data/us-states.json` — bundled TopoJSON.
- CI workflows in `.github/workflows/`.

Out of scope:

- Third-party CDN dependencies (D3, topojson-client) — report upstream.
- Local-only tooling (`.claude/`, `.vscode/`) — runs in trusted contexts.
- The historical accuracy of sovereignty sequences — open a regular issue, not a security advisory.

## Known security considerations

- D3 and topojson-client load from public CDNs (`d3js.org`, `cdn.jsdelivr.net`) without Subresource Integrity hashes. A CDN compromise would execute arbitrary script in the page. The page handles no user data, no auth, no persisted state — blast radius is limited to what the user's browser tab can see. Adding SRI hashes is a reasonable hardening step if anyone embeds this page in a more sensitive context.
- The `#tooltip` and `#legend` are populated via `innerHTML` from the `SEQUENCE_INFO` table in `js/territories.js`. That table is author-controlled, not user input, so XSS is not currently reachable — but if a future change ever sources tooltip text from user input or external fetches, switch to `textContent` / DOM construction first.
- No backend, no cookies, no credentials, no network egress beyond the CDN script tags.

## Past security fixes

None yet.
