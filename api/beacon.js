export default async function handler(req, res) {
  // Accept small POST beacons without logging; return quickly
  if (req.method !== 'POST') {
    res.setHeader('Cache-Control', 'no-store');
    return res.status(200).json({ status: 'ok' });
  }
  try {
    // Read and discard body to satisfy fetch/beacon
    // eslint-disable-next-line no-unused-vars
    const chunks = [];
    await new Promise((resolve) => {
      req.on('data', (c) => chunks.push(c));
      req.on('end', resolve);
      req.on('error', resolve);
    });
  } catch (_) {}
  res.setHeader('Cache-Control', 'no-store');
  return res.status(204).end();
}
