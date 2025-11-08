export function go(fileName, params = {}) {
  const base = './';
  const url = new URL(base + fileName, window.location.href);
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
  window.location.assign(url.toString());
}