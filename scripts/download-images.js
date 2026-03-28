#!/usr/bin/env node
/**
 * Download all external images referenced in blog posts and update the markdown files
 * to use local paths instead.
 *
 * Usage: node scripts/download-images.js
 */

'use strict';

const fs = require('fs');
const path = require('path');
const https = require('https');
const http = require('http');
const crypto = require('crypto');
const matter = require('gray-matter');

const POSTS_DIR = path.join(__dirname, '..', 'content', 'posts');
const IMAGES_DIR = path.join(__dirname, '..', 'public', 'images', 'blog');
const LOCAL_PREFIX = '/images/blog';

const CONCURRENCY = 10;
const TIMEOUT_MS = 15_000;
const MAX_REDIRECTS = 8;
const MIN_FILE_BYTES = 50; // anything smaller is almost certainly an error response

// ── Filename generation ────────────────────────────────────────────────────────

const usedFilenames = new Set();

function urlToFilename(url) {
  try {
    const parsed = new URL(url);
    const basename = path.basename(parsed.pathname) || 'image';
    const ext = path.extname(basename).toLowerCase();
    const stem = path.basename(basename, ext).replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 80) || 'image';

    let candidate = stem + ext;
    if (!usedFilenames.has(candidate)) {
      usedFilenames.add(candidate);
      return candidate;
    }

    // Collision – prefix with 8-char URL hash so it stays unique
    const hash = crypto.createHash('md5').update(url).digest('hex').slice(0, 8);
    candidate = `${hash}_${stem}${ext}`;
    usedFilenames.add(candidate);
    return candidate;
  } catch {
    const hash = crypto.createHash('md5').update(url).digest('hex');
    usedFilenames.add(hash);
    return hash;
  }
}

// ── URL extraction ─────────────────────────────────────────────────────────────

// Matches: ![alt](https://…) or ![alt](https://… "title")
const MD_IMG_RE = /!\[[^\]]*\]\((https?:\/\/[^\s)]+)[^)]*\)/g;
// Matches: <img … src="https://…" …>
const HTML_IMG_RE = /<img\b[^>]+\bsrc=["'](https?:\/\/[^"']+)["'][^>]*>/gi;

function extractExternalUrls(rawFile) {
  const parsed = matter(rawFile);
  const urls = new Set();

  // Cover image from frontmatter
  const ci = parsed.data.coverImage;
  if (typeof ci === 'string' && /^https?:\/\//i.test(ci)) urls.add(ci);

  // Markdown images in body
  for (const m of parsed.content.matchAll(MD_IMG_RE)) urls.add(m[1]);

  // HTML img tags in body
  for (const m of parsed.content.matchAll(HTML_IMG_RE)) urls.add(m[1]);

  return urls;
}

// ── Downloader ─────────────────────────────────────────────────────────────────

function downloadUrl(url, destPath, redirects = 0) {
  return new Promise((resolve, reject) => {
    if (redirects > MAX_REDIRECTS) return reject(new Error('Too many redirects'));

    let parsedUrl;
    try { parsedUrl = new URL(url); }
    catch { return reject(new Error(`Invalid URL: ${url}`)); }

    const mod = parsedUrl.protocol === 'https:' ? https : http;

    const req = mod.get(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; crispkatbe-image-downloader/1.0)' },
    }, (res) => {
      const { statusCode, headers } = res;

      if ([301, 302, 303, 307, 308].includes(statusCode) && headers.location) {
        res.resume();
        const next = new URL(headers.location, url).href;
        return resolve(downloadUrl(next, destPath, redirects + 1));
      }

      if (statusCode !== 200) {
        res.resume();
        return reject(new Error(`HTTP ${statusCode}`));
      }

      const tmp = destPath + '.tmp';
      const file = fs.createWriteStream(tmp);
      res.pipe(file);

      file.on('finish', () => {
        file.close(() => {
          try {
            const { size } = fs.statSync(tmp);
            if (size < MIN_FILE_BYTES) {
              fs.unlinkSync(tmp);
              return reject(new Error(`Response too small (${size} bytes)`));
            }
            fs.renameSync(tmp, destPath);
            resolve();
          } catch (e) {
            try { fs.unlinkSync(tmp); } catch {}
            reject(e);
          }
        });
      });

      file.on('error', (e) => { try { fs.unlinkSync(tmp); } catch {} reject(e); });
    });

    req.setTimeout(TIMEOUT_MS, () => { req.destroy(); reject(new Error('Timeout')); });
    req.on('error', reject);
  });
}

// ── Batch runner ───────────────────────────────────────────────────────────────

async function runConcurrent(items, fn) {
  const results = [];
  for (let i = 0; i < items.length; i += CONCURRENCY) {
    const batch = items.slice(i, i + CONCURRENCY);
    const settled = await Promise.allSettled(batch.map(fn));
    results.push(...settled);
  }
  return results;
}

// ── Main ───────────────────────────────────────────────────────────────────────

async function main() {
  fs.mkdirSync(IMAGES_DIR, { recursive: true });

  // ── Pass 1: collect every unique external URL ──────────────────────────────
  console.log('Scanning posts…');
  const files = fs.readdirSync(POSTS_DIR).filter(f => f.endsWith('.md')).sort();
  console.log(`  ${files.length} posts found`);

  /** @type {Map<string, string>} url → local filename */
  const urlMap = new Map();
  /** @type {Array<{filePath: string, raw: string, urls: Set<string>}>} */
  const postData = [];

  for (const f of files) {
    const filePath = path.join(POSTS_DIR, f);
    const raw = fs.readFileSync(filePath, 'utf8');
    const urls = extractExternalUrls(raw);
    postData.push({ filePath, raw, urls });
    for (const url of urls) {
      if (!urlMap.has(url)) urlMap.set(url, urlToFilename(url));
    }
  }

  console.log(`  ${urlMap.size} unique external image URLs\n`);

  // ── Pass 2: download images ────────────────────────────────────────────────
  const urlEntries = [...urlMap.entries()];
  let done = 0, skipped = 0, failed = 0;
  const failures = [];

  await runConcurrent(urlEntries, async ([url, localName]) => {
    const destPath = path.join(IMAGES_DIR, localName);
    if (fs.existsSync(destPath)) { skipped++; return; }

    try {
      await downloadUrl(url, destPath);
      done++;
      const total = done + skipped;
      if (total % 25 === 0 || total === urlEntries.length) {
        process.stdout.write(`\r  ${total}/${urlEntries.length} processed (${done} new, ${skipped} cached, ${failed} failed)   `);
      }
    } catch (err) {
      failed++;
      failures.push({ url, err: err.message });
    }
  });

  const total = done + skipped;
  process.stdout.write(`\r  ${total}/${urlEntries.length} processed (${done} new, ${skipped} cached, ${failed} failed)\n\n`);

  // ── Pass 3: rewrite markdown files ────────────────────────────────────────
  console.log('Rewriting markdown files…');
  let filesUpdated = 0;

  for (const { filePath, raw, urls } of postData) {
    if (urls.size === 0) continue;

    let content = raw;
    let changed = false;

    for (const url of urls) {
      const localName = urlMap.get(url);
      const destPath = path.join(IMAGES_DIR, localName);

      // Only replace if we actually have the file on disk
      if (!fs.existsSync(destPath)) continue;

      const localUrl = `${LOCAL_PREFIX}/${localName}`;
      if (content.includes(url)) {
        content = content.split(url).join(localUrl);
        changed = true;
      }
    }

    if (changed) {
      fs.writeFileSync(filePath, content, 'utf8');
      filesUpdated++;
    }
  }

  console.log(`  ${filesUpdated} files updated\n`);

  // ── Summary ────────────────────────────────────────────────────────────────
  console.log('── Summary ──────────────────────────────────────────');
  console.log(`  Images downloaded : ${done}`);
  console.log(`  Already cached    : ${skipped}`);
  console.log(`  Failed            : ${failed}`);
  console.log(`  Files rewritten   : ${filesUpdated}`);

  if (failures.length > 0) {
    const sample = failures.slice(0, 20);
    console.log(`\n  First ${sample.length} failures:`);
    for (const { url, err } of sample) {
      console.log(`    [${err}] ${url.slice(0, 90)}`);
    }
    if (failures.length > 20) console.log(`  … and ${failures.length - 20} more`);

    // Write full failure log
    const logPath = path.join(__dirname, '..', 'image-download-failures.log');
    fs.writeFileSync(logPath, failures.map(f => `${f.err}\t${f.url}`).join('\n') + '\n');
    console.log(`\n  Full failure list → ${logPath}`);
  }
}

main().catch(err => { console.error(err); process.exit(1); });
