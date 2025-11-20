#!/usr/bin/env node
// Branding + A11y Guard: enforce Hi Speak in public-facing titles/H1s
// Requires html lang on all non-dev public pages
// Scans public/**/*.html
// Flags banned words (Tesla, Wozniak) in title, h1, og:title, twitter:title (case-insensitive)
// Skips: public/dev/** and any file path containing those words
// Exit code: 1 if any violations found

const fs = require('fs');
const path = require('path');

const ROOT = process.cwd();
const PUBLIC_DIR = path.join(ROOT, 'public');

const BANNED = [/tesla/i, /wozniak/i];

function walk(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  let files = [];
  for (const e of entries) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) files = files.concat(walk(p));
    else files.push(p);
  }
  return files;
}

function extractTags(html, tag) {
  const re = new RegExp('<' + tag + '[^>]*>([\n\r\s\S]*?)<\\/' + tag + '>', 'gi');
  const matches = [];
  let m;
  while ((m = re.exec(html))) {
    const text = m[1].replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
    if (text) matches.push(text);
  }
  return matches;
}

function extractMetaContent(html, attrName, attrValue) {
  const re = new RegExp('<meta[^>]*' + attrName + '=["\']' + attrValue + '["\'][^>]*>', 'gi');
  const contentRe = /content=["']([\s\S]*?)["']/i;
  const matches = [];
  let m;
  while ((m = re.exec(html))) {
    const tag = m[0];
    const c = contentRe.exec(tag);
    if (c && c[1]) {
      const text = c[1].replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
      if (text) matches.push(text);
    }
  }
  return matches;
}

function main() {
  if (!fs.existsSync(PUBLIC_DIR)) {
    console.error('public/ directory not found');
    process.exit(1);
  }

  const allFiles = walk(PUBLIC_DIR)
    .filter(f => f.endsWith('.html'))
    .filter(f => !f.includes(`${path.sep}dev${path.sep}`))
    .filter(f => !/tesla|wozniak/i.test(f));

  const violations = [];

  for (const file of allFiles) {
    let html = '';
    try { html = fs.readFileSync(file, 'utf8'); } catch (e) { continue; }

    // A11y: require <html lang>
    const hasLang = /<html\b[^>]*\blang=["'][^"']+["']/i.test(html);
    if (!hasLang) {
      violations.push({ file, tag: '<html>', text: 'missing lang attribute' });
    }

    const titles = extractTags(html, 'title');
    const h1s = extractTags(html, 'h1');
    const ogTitles = extractMetaContent(html, 'property', 'og:title');
    const twTitles = extractMetaContent(html, 'name', 'twitter:title');

    const check = (text, tag) => {
      for (const banned of BANNED) {
        if (banned.test(text)) {
          violations.push({ file, tag, text });
          break;
        }
      }
    };

    titles.forEach(t => check(t, 'title'));
    h1s.forEach(h => check(h, 'h1'));
    ogTitles.forEach(t => check(t, 'meta[property=og:title]'));
    twTitles.forEach(t => check(t, 'meta[name=twitter:title]'));
  }

  // Additional guard: files explicitly named with tesla/wozniak must be noindex
  const testLabeledFiles = walk(PUBLIC_DIR)
    .filter(f => f.endsWith('.html'))
    .filter(f => !f.includes(`${path.sep}dev${path.sep}`))
    .filter(f => /tesla|wozniak/i.test(f));

  const hasNoindex = (html) => /<meta\s+name=["']robots["'][^>]*content=["'][^"']*noindex/i.test(html);

  for (const file of testLabeledFiles) {
    let html = '';
    try { html = fs.readFileSync(file, 'utf8'); } catch (e) { continue; }
    if (!hasNoindex(html)) {
      violations.push({ file, tag: 'meta[name=robots]', text: 'missing noindex on test-labeled page' });
    }
  }

  if (violations.length) {
    console.error('Branding/A11y violations found:');
    for (const v of violations) {
      console.error(` - ${path.relative(ROOT, v.file)} [${v.tag}]: "${v.text}"`);
    }
    console.error('\nFix branding to Hi Speak, add <html lang>, or move test files under public/dev/.');
    process.exit(1);
  }

  console.log('✅ Branding + A11y check passed (Hi Speak + <html lang>)');
}

main();
