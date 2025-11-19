# Vendor Libraries (Optional Hardening)

Place locally mirrored copies of critical external scripts here to remove runtime dependency on third-party CDNs.

## Recommended Candidates
- Supabase UMD build (currently pinned via CDN) -> `vendor/supabase-2.81.1.min.js`
- Leaflet core -> `vendor/leaflet-1.9.4.js`
- Leaflet.markercluster -> `vendor/leaflet.markercluster-1.4.1.js`

## Workflow
1. Download asset:
```bash
curl -Ls https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.81.1/dist/umd/supabase.min.js -o vendor/supabase-2.81.1.min.js
curl -Ls https://unpkg.com/leaflet@1.9.4/dist/leaflet.js -o vendor/leaflet-1.9.4.js
curl -Ls https://unpkg.com/leaflet.markercluster@1.4.1/dist/leaflet.markercluster.js -o vendor/leaflet.markercluster-1.4.1.js
```
2. Compute SRI:
```bash
openssl dgst -sha384 -binary vendor/supabase-2.81.1.min.js | openssl base64 -A
```
3. Replace HTML references with local paths (e.g. `<script src="/vendor/supabase-2.81.1.min.js" integrity="sha384-<hash>" crossorigin="anonymous"></script>`).
4. Update `expectedHashes` in `HiPWA.js` to reflect local path mapping if you choose to monitor local integrity (optional).
5. In deployment config / server, ensure `vendor/` is served with long cache headers + explicit version filenames.

## Benefits
- Eliminates external script availability risk / transient CDN outages.
- Prevents upstream silent updates from altering logic unexpectedly.
- Enables deterministic subresource integrity and potential code review of third-party code.

## Considerations
- Must manually update when upstream releases security patches.
- Slightly larger repository footprint.

## Future Automation Ideas
- CI job: fetch new versions, diff file contents, prompt PR with updated SRI and changelog snippet.
