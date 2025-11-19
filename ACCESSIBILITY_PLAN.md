# Accessibility Deep Pass Plan

## Objectives
Elevate baseline heuristic scan to comprehensive semantic and inclusive experience meeting Hi-OS standards.

## Checklist
- Landmarks: Ensure one each of `header`, `nav` (if primary navigation), `main`, `footer` per page.
- Page Titles: Unique, descriptive `<title>` aligned with primary task.
- Heading Hierarchy: No skipped levels (e.g., jump from h1 to h3) in structured content regions.
- Focus Management: After modal open, focus moves into modal; on close, returns to trigger.
- Keyboard Navigation: All interactive elements reachable via Tab/Shift+Tab without traps.
- Visible Focus: High-contrast focus styles (outline >= 2px) not suppressed.
- Color Contrast: Minimum AA contrast (4.5:1 normal text, 3:1 large text). Audit primary gradient overlays.
- ARIA Roles: Only added where native semantics insufficient (avoid redundant `role="button"` on `<button>`).
- aria-label / aria-describedby: Present for icon-only buttons and interactive custom controls.
- Form Labels: Every input associated with `<label>` or `aria-label`.
- Motion Reduction: Respect `prefers-reduced-motion`; reduce or disable non-essential animations.
- Images: Informational images have `alt` text; decorative images use empty alt (`alt=""`).
- Dynamic Updates: Use `aria-live` regions for async status changes (already offline banner uses polite region).
- Performance and A11y: Avoid layout shifts that move focused elements unexpectedly.

## Tooling Suggestions
- Integrate `axe-core` in a headless scan for CI.
- Extend `scripts/a11y-audit.js` to invoke `axe` via `puppeteer` for dynamic checks.

### Implemented
- Skip link and main landmark on `public/signin-tesla.html` (`#main-content` + `aria-describedby` on form)
- Focus-visible outlines and skip-link CSS for that page
- Automated a11y scanner: `scripts/a11y-scan.js` (Puppeteer + axe-core)

Run a scan (ensure the dev server is running):
```bash
python3 -m http.server 3030 &
node scripts/a11y-scan.js \
	http://localhost:3030/public/signin-tesla.html
```
Outputs `a11y-report.json` with violations/incomplete summaries per URL.

## Prioritization
1. Focus & Landmark Semantics (High)
2. Contrast Review (High)
3. Motion Reduction (Medium)
4. Form Label Coverage (Medium)
5. Headings and Live Regions (Medium)

## Reporting
Create `a11y-report.md` with: page, issue type, remediation, status.

## KPI Targets
- 0 Critical blocker issues (keyboard trap, inaccessible auth flow).
- <5 Minor issues across entire app after remediation.
- Automated axe scan score >= 90 for core pages.

## Next Steps
1. Run baseline manual keyboard traversal on signin, signup, profile, island pages.
2. Add missing landmarks & focus styles.
3. Integrate axe scripted scan.
4. Document exceptions (e.g., complex visualizations) with alternative text strategy.
