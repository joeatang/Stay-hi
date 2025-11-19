const isLocal = location.hostname === 'localhost' || location.hostname === '127.0.0.1';
const params = new URLSearchParams(location.search);
if (isLocal && params.has('dev')) {
  import('/devtools/HiFlagsDiag.js');
}
