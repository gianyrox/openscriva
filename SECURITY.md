# Security Policy

## Reporting a vulnerability

If you believe you've found a security vulnerability in OpenScriva, please **do not** open a public GitHub issue.

Instead, email: **security@agfarms.dev**

Include:
- A description of the vulnerability
- Steps to reproduce
- Affected versions / URLs / commits
- Your name and contact (so we can credit you, if you want)

We aim to respond within 48 hours and ship a fix within 7 days for critical issues.

## Scope

In scope:
- The OpenScriva codebase (this repo)
- The hosted instance at https://www.openscriva.com
- GitHub OAuth / fork-as-room flow
- AI prompt-injection, data-exfiltration, or manuscript-leakage vectors
- Dependency vulnerabilities in production code

Out of scope:
- Rate limiting (we intentionally relax it for writers)
- Self-XSS, clickjacking without impact
- Vulnerabilities in third-party services (Anthropic, GitHub, Vercel, PostHog)
- Social engineering of AGFarms employees

## Responsible disclosure

Please give us 90 days to fix before disclosing publicly. We're a tiny team and will be responsive.
