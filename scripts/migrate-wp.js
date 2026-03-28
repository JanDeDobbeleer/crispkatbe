// scripts/migrate-wp.js
// One-time migration: WordPress XML export → markdown files with frontmatter
// Usage: node scripts/migrate-wp.js <path-to-xml>

const fs = require("fs");
const path = require("path");
const TurndownService = require("turndown");

const xmlPath = process.argv[2];
if (!xmlPath) {
  console.error("Usage: node scripts/migrate-wp.js <path-to-xml>");
  process.exit(1);
}

const OUTPUT_DIR = path.join(__dirname, "..", "content", "posts");
fs.mkdirSync(OUTPUT_DIR, { recursive: true });

// ── helpers ────────────────────────────────────────────────────────────────

function extractCDATA(str, tag) {
  const re = new RegExp(`<${tag}><!\\[CDATA\\[([\\s\\S]*?)\\]\\]>`, "i");
  const m = str.match(re);
  return m ? m[1].trim() : "";
}

function extractPlain(str, tag) {
  const re = new RegExp(`<${tag}>([^<]*)<\/${tag}>`, "i");
  const m = str.match(re);
  return m ? m[1].trim() : "";
}

function extractAllMatches(str, re) {
  const results = [];
  let m;
  const g = new RegExp(re.source, re.flags.includes("g") ? re.flags : re.flags + "g");
  while ((m = g.exec(str)) !== null) results.push(m[1]);
  return results;
}

// ── WP shortcode → HTML conversions ────────────────────────────────────────

function convertShortcodes(content) {
  // [youtube VIDEO_ID] or [youtube=VIDEO_ID] or [youtube url="..."]
  content = content.replace(
    /\[youtube(?:=|\s+)(?:url=["']?)?(?:https?:\/\/(?:www\.)?(?:youtube\.com\/watch\?v=|youtu\.be\/))?([A-Za-z0-9_-]{7,15})["']?\]/gi,
    (_, id) =>
      `<div class="video-embed"><iframe width="560" height="315" src="https://www.youtube.com/embed/${id}" frameborder="0" allowfullscreen></iframe></div>`
  );

  // [vimeo VIDEO_ID]
  content = content.replace(
    /\[vimeo\s+(\d+)\]/gi,
    (_, id) =>
      `<div class="video-embed"><iframe src="https://player.vimeo.com/video/${id}" width="560" height="315" frameborder="0" allowfullscreen></iframe></div>`
  );

  // [soundcloud url="..."]
  content = content.replace(
    /\[soundcloud\s+[^\]]*url=["']([^"']+)["'][^\]]*\]/gi,
    (_, url) =>
      `<div class="audio-embed"><iframe width="100%" height="166" scrolling="no" frameborder="no" src="https://w.soundcloud.com/player/?url=${encodeURIComponent(url)}&color=%23ff5500&auto_play=false&hide_related=false&show_comments=true&show_user=true&show_reposts=false&show_teaser=true"></iframe></div>`
  );

  // [caption id="..." align="..." width="..."]<img .../>caption text[/caption]
  content = content.replace(
    /\[caption[^\]]*\]([\s\S]*?)\[\/caption\]/gi,
    (_, inner) => {
      const imgMatch = inner.match(/<img[^>]+>/i);
      const img = imgMatch ? imgMatch[0] : "";
      const captionText = inner.replace(/<img[^>]+>/gi, "").trim();
      if (captionText) {
        return `<figure>${img}<figcaption>${captionText}</figcaption></figure>`;
      }
      return img;
    }
  );

  // [embed]URL[/embed]
  content = content.replace(
    /\[embed\]([\s\S]*?)\[\/embed\]/gi,
    (_, url) => {
      url = url.trim();
      if (url.includes("youtube.com") || url.includes("youtu.be")) {
        const idMatch = url.match(/(?:v=|youtu\.be\/)([A-Za-z0-9_-]{7,15})/);
        if (idMatch) {
          return `<div class="video-embed"><iframe width="560" height="315" src="https://www.youtube.com/embed/${idMatch[1]}" frameborder="0" allowfullscreen></iframe></div>`;
        }
      }
      return `<a href="${url}">${url}</a>`;
    }
  );

  // [video src="..." ...] (self-hosted)
  content = content.replace(
    /\[video\s+[^\]]*src=["']([^"']+)["'][^\]]*\]/gi,
    (_, src) =>
      `<video controls src="${src}" style="max-width:100%"></video>`
  );

  return content;
}

// ── Turndown setup ──────────────────────────────────────────────────────────

const td = new TurndownService({
  headingStyle: "atx",
  hr: "---",
  bulletListMarker: "-",
  codeBlockStyle: "fenced",
});

// Preserve iframes (YouTube, Vimeo, SoundCloud) as raw HTML
td.addRule("iframe", {
  filter: "iframe",
  replacement: (_, node) => `\n\n${node.outerHTML}\n\n`,
});

// Preserve figures
td.addRule("figure", {
  filter: "figure",
  replacement: (content) => `\n\n${content}\n\n`,
});

// Preserve video elements
td.addRule("video", {
  filter: "video",
  replacement: (_, node) => `\n\n${node.outerHTML}\n\n`,
});

// ── YAML escape ─────────────────────────────────────────────────────────────

function yamlStr(s) {
  if (!s) return '""';
  // Escape double quotes, then wrap
  return `"${s.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`;
}

function yamlList(arr) {
  if (!arr || arr.length === 0) return "[]";
  return `[${arr.map(yamlStr).join(", ")}]`;
}

// ── main ───────────────────────────────────────────────────────────────────

const xmlContent = fs.readFileSync(xmlPath, "utf8");
const items = xmlContent.split("<item>").slice(1);

let written = 0;
let skipped = 0;
let errors = 0;
const slugsSeen = new Set();

for (const item of items) {
  // Only published posts
  if (!item.includes("<wp:post_type><![CDATA[post]]>")) continue;
  if (!item.includes("<wp:status><![CDATA[publish]]>")) continue;

  const title = extractCDATA(item, "title");
  const slug = extractCDATA(item, "wp:post_name") || extractCDATA(item, "wp:post_id");
  const rawDate = extractCDATA(item, "wp:post_date");
  const date = rawDate ? rawDate.split(" ")[0] : "";
  const author = extractCDATA(item, "dc:creator");
  const excerptRaw = extractCDATA(item, "excerpt:encoded");

  const categories = extractAllMatches(item, /domain="category"[^>]*><!\[CDATA\[([^\]]+)\]\]>/);
  const tags = extractAllMatches(item, /domain="post_tag"[^>]*><!\[CDATA\[([^\]]+)\]\]>/);

  // Cover image from first <img> in content or _thumbnail_ meta
  let coverImage = "";
  const thumbMeta = item.match(/<wp:meta_key><!\[CDATA\[_thumbnail_id\]\]>/);
  // We can't easily resolve thumbnail IDs without the attachment map;
  // fall back to first image src in content
  const firstImg = item.match(/<img[^>]+src=["']([^"']+)["']/i);
  if (firstImg) coverImage = firstImg[1].replace(/\?w=\d+/, "");

  // Raw HTML content
  let htmlContent = extractCDATA(item, "content:encoded");

  // Convert WP shortcodes first
  htmlContent = convertShortcodes(htmlContent);

  // Convert HTML → markdown
  let mdContent = "";
  try {
    if (htmlContent.trim()) {
      mdContent = td.turndown(htmlContent);
    }
  } catch (e) {
    errors++;
    console.error(`Error converting ${slug}: ${e.message}`);
    mdContent = htmlContent; // fall back to raw HTML
  }

  // Handle duplicate slugs
  let finalSlug = slug;
  if (slugsSeen.has(slug)) {
    finalSlug = `${slug}-${Date.now()}`;
  }
  slugsSeen.add(finalSlug);

  const frontmatter = `---
title: ${yamlStr(title)}
date: "${date}"
author: "${author}"
categories: ${yamlList(categories)}
tags: ${yamlList(tags)}
excerpt: ${yamlStr(excerptRaw)}
coverImage: "${coverImage}"
---

${mdContent}`;

  const outPath = path.join(OUTPUT_DIR, `${finalSlug}.md`);
  try {
    fs.writeFileSync(outPath, frontmatter, "utf8");
    written++;
    if (written % 100 === 0) console.log(`  ${written} posts written…`);
  } catch (e) {
    errors++;
    console.error(`Failed to write ${outPath}: ${e.message}`);
  }
}

console.log(`\n✓ Done: ${written} posts written, ${skipped} skipped, ${errors} errors`);
console.log(`  Output: ${OUTPUT_DIR}`);
