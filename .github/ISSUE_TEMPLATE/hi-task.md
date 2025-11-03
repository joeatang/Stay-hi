---
name: Hi Task
about: Standard task template for Hi-OS v1.0 development
title: '[TASK] '
labels: ['task', 'hi-os']
assignees: ''
---

## Hi-OS Preflight
- [ ] Read latest PHASE_*_COMPLETE.md and LATEST.md for context
- [ ] Local server running: `python3 -m http.server 3030`
- [ ] Ran VS Code task "Hi-OS: Preflight" → PASS
- [ ] `/public/dev/preflight/index.html` shows PASS
- [ ] All verifier pages show PASS status
- [ ] No sw.js/manifest.json edits (pre–PWA hardening)

## Task
Describe what you want built.

## Acceptance Criteria
- [ ] Preflight PASS before starting
- [ ] Verifier PASS after completion
- [ ] Telemetry events added for tracking
- [ ] Rollback plan documented
- [ ] Feature flags configured (if applicable)
- [ ] {data,error} contract preserved in HiBase

## Implementation Notes
- Scope:
- Flags needed:
- Rollout plan:
- Rollback plan:
- Telemetry events to emit:

## Out of Scope
List what this task specifically does NOT include.

## Definition of Done
- [ ] All acceptance criteria met
- [ ] Code follows Hi-OS architecture patterns
- [ ] No regressions in existing functionality
- [ ] Documentation updated if needed
- [ ] Ready for production deployment

## 2-Attempt Rule
If this task fails twice, auto-create `/reports/FAILURE_LOG.md` with:
- Repro steps
- Console excerpts  
- Preflight results
- Suggested fix plan

---
**Hi-OS v1.0**: This template enforces Tesla-grade discipline for reliable development.