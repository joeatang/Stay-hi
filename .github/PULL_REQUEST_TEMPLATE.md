# Hi-OS v1.0 Pull Request

## Hi-OS Preflight Checklist
- [ ] Ran VS Code task "Hi-OS: Preflight" → PASS ✅
- [ ] `/public/dev/preflight/index.html` shows ALL PASS ✅
- [ ] `/public/dev/phase7-verifier/verifier.html` → ALL PASS ✅
- [ ] `/public/dev/auth/phase9-verifier.html` → ALL PASS ✅
- [ ] No edits to `sw.js` or `manifest.json` (pre–PWA hardening) ✅
- [ ] Feature flags + cohort configured (if applicable) ✅
- [ ] `{data,error}` contract preserved in HiBase ✅
- [ ] No new `window.*` globals (dev tools only under `/public/dev/**`) ✅

## Change Summary

### Scope
Brief description of what this PR changes.

### Feature Flags
- Flag name: `flag_name`
- Rollout percentage: 0% → 10% → 50% → 100%
- Cohort logic: [describe targeting]

### Rollout Plan
1. **Phase 1**: Deploy with flag at 0% (code only)
2. **Phase 2**: Enable for 10% of users via `HiRolloutOps.presets.start(10)`
3. **Phase 3**: Ramp to 50% via `HiRolloutOps.presets.mid(50)`
4. **Phase 4**: Full rollout via `HiRolloutOps.presets.full(100)`

### Rollback Plan
- **Immediate**: Set flag to 0% via `HiRolloutOps.set('flag_name', 0)`
- **Full revert**: Revert this PR and redeploy
- **Data cleanup**: [describe any data cleanup needed]

### Telemetry Events
List all new telemetry events added:
- `event_name`: Description of when it fires
- `another_event`: Context and payload structure

## Testing
- [ ] Local testing completed
- [ ] Dev console shows no errors
- [ ] All verifiers pass
- [ ] Telemetry events firing correctly

## Database Changes
- [ ] No schema changes
- [ ] Schema changes documented and backwards compatible
- [ ] Migration script provided (if needed)

## Documentation Updates
- [ ] No docs needed
- [ ] Updated relevant documentation
- [ ] Added inline code comments for complex logic

## Breaking Changes
- [ ] No breaking changes
- [ ] Breaking changes documented with migration path

## Deployment Notes
Special considerations for deployment:
- Dependencies to install:
- Environment variables:
- Post-deploy verification steps:

---

**Hi-OS v1.0 Compliance**: This PR follows Tesla-grade discipline for safe, rollback-ready deployments.

/cc @hi-os-reviewers