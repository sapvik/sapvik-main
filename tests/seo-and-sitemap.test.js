import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

function getHtmlFiles(dir) {
  let results = [];
  if (!fs.existsSync(dir)) return results;
  for (const item of fs.readdirSync(dir)) {
    const full = path.join(dir, item);
    if (fs.statSync(full).isDirectory()) {
      results = results.concat(getHtmlFiles(full));
    } else if (item.endsWith('.html')) {
      results.push(full);
    }
  }
  return results;
}

test('SEO & Sitemap: Hand-written public/sitemap.xml is removed', () => {
  assert.equal(fs.existsSync('public/sitemap.xml'), false, 'public/sitemap.xml must be removed in favor of @astrojs/sitemap');
});

test('SEO & Sitemap: @astrojs/sitemap produces valid index and child sitemaps with correct canonical URLs and lastmod', () => {
  const sitemapIndex = path.resolve('dist/sitemap-index.xml');
  const sitemapChild = path.resolve('dist/sitemap-0.xml');

  assert.ok(fs.existsSync(sitemapIndex), 'dist/sitemap-index.xml must exist');
  assert.ok(fs.existsSync(sitemapChild), 'dist/sitemap-0.xml must exist');

  const childXml = fs.readFileSync(sitemapChild, 'utf-8');
  const locMatches = Array.from(childXml.matchAll(/<loc>([^<]+)<\/loc>/g)).map(m => m[1]);

  assert.ok(locMatches.length >= 14, `Expected at least 14 URLs in sitemap, found ${locMatches.length}`);

  // No .html extensions or trailing slashes (except root)
  for (const loc of locMatches) {
    assert.ok(loc.startsWith('https://sapvik.com'), `Sitemap URL must be absolute: ${loc}`);
    assert.ok(!loc.endsWith('.html'), `Sitemap URL must not contain .html extension: ${loc}`);
    if (loc !== 'https://sapvik.com/') {
      assert.ok(!loc.endsWith('/'), `Sitemap URL must not contain trailing slash: ${loc}`);
    }
    assert.ok(!loc.includes('/404'), `Sitemap must not index 404 page: ${loc}`);
    assert.ok(!loc.includes('/config/'), `Sitemap must not index /config/: ${loc}`);
  }

  // Blog posts have lastmod
  const blogUrlRegex = /<url><loc>(https:\/\/sapvik\.com\/blog\/[^<]+)<\/loc><lastmod>([^<]+)<\/lastmod><\/url>/g;
  const blogPostsWithLastmod = Array.from(childXml.matchAll(blogUrlRegex));
  assert.ok(blogPostsWithLastmod.length >= 3, `Expected at least 3 blog posts with lastmod, found ${blogPostsWithLastmod.length}`);

  for (const [, url, lastmod] of blogPostsWithLastmod) {
    const d = new Date(lastmod);
    assert.ok(!isNaN(d.getTime()), `Invalid lastmod date for ${url}: ${lastmod}`);
  }
});

test('SEO & Sitemap: Built HTML routes match sitemap entries and canonical tags', () => {
  const htmlFiles = getHtmlFiles('dist');
  assert.ok(htmlFiles.length >= 15, `Expected 15 HTML files, found ${htmlFiles.length}`);

  const childXml = fs.readFileSync('dist/sitemap-0.xml', 'utf-8');
  const sitemapUrls = new Set(Array.from(childXml.matchAll(/<loc>([^<]+)<\/loc>/g)).map(m => m[1]));

  for (const file of htmlFiles) {
    const rel = path.relative('dist', file).replace(/\\/g, '/');
    const html = fs.readFileSync(file, 'utf-8');

    const mCan = html.match(/<link[^>]*rel=["']canonical["'][^>]*href=["']([^"']*)["']/i) ||
                 html.match(/<link[^>]*href=["']([^"']*)["'][^>]*rel=["']canonical["']/i);
    assert.ok(mCan, `Page ${rel} must have a canonical tag`);
    const canonical = mCan[1];

    const draftPrefixes = ['audit', 'bengaluru', 'about', 'pricing', 'case-studies'];
    const isDraft = draftPrefixes.some(d => rel.startsWith(d));

    if (rel === '404.html' || isDraft) {
      // 404 and draft routes must have noindex and must not be in sitemap
      assert.ok(html.includes('noindex'), `Page ${rel} must specify noindex`);
      assert.ok(!sitemapUrls.has(canonical), `Page ${rel} (${canonical}) must not be in sitemap`);
      continue;
    }

    // Every other built page must have its canonical present in the sitemap
    assert.ok(sitemapUrls.has(canonical), `Canonical URL ${canonical} for ${rel} must be in sitemap`);
  }
});

test('SEO Meta Standards: Every built page meets title, description, h1, and canonical requirements', () => {
  const htmlFiles = getHtmlFiles('dist');

  for (const file of htmlFiles) {
    const rel = path.relative('dist', file).replace(/\\/g, '/');
    const html = fs.readFileSync(file, 'utf-8');

    // Title length: 30 to 62 characters
    const mTitle = html.match(/<title>([^<]*)<\/title>/i);
    assert.ok(mTitle, `Page ${rel} must have a title`);
    const title = mTitle[1].trim();
    assert.ok(
      title.length >= 30 && title.length <= 62,
      `Page ${rel} title length (${title.length}) outside 30-62 chars: "${title}"`
    );

    // Meta description: 70 to 160 characters
    const mDesc = html.match(/<meta[^>]*name=["']description["'][^>]*content="([^"]*)"/i) ||
                  html.match(/<meta[^>]*name=["']description["'][^>]*content='([^']*)'/i) ||
                  html.match(/<meta[^>]*content="([^"]*)"[^>]*name=["']description["']/i) ||
                  html.match(/<meta[^>]*content='([^']*)'[^>]*name=["']description["']/i);
    assert.ok(mDesc, `Page ${rel} must have a meta description`);
    const desc = mDesc[1].trim();
    assert.ok(
      desc.length >= 70 && desc.length <= 160,
      `Page ${rel} meta description length (${desc.length}) outside 70-160 chars: "${desc}"`
    );

    // Exactly one h1
    const h1Matches = html.match(/<h1[^>]*>[\s\S]*?<\/h1>/gi) || [];
    assert.equal(h1Matches.length, 1, `Page ${rel} must have exactly one <h1>, found ${h1Matches.length}`);

    // Canonical is absolute, no .html, no trailing slash (except root)
    const mCan = html.match(/<link[^>]*rel=["']canonical["'][^>]*href=["']([^"']*)["']/i) ||
                 html.match(/<link[^>]*href=["']([^"']*)["'][^>]*rel=["']canonical["']/i);
    assert.ok(mCan, `Page ${rel} must have a canonical tag`);
    const can = mCan[1];
    assert.ok(can.startsWith('https://sapvik.com'), `Canonical must be absolute: ${can} on ${rel}`);
    assert.ok(!can.endsWith('.html'), `Canonical must not end with .html: ${can} on ${rel}`);
    if (can !== 'https://sapvik.com/') {
      assert.ok(!can.endsWith('/'), `Canonical must not end with trailing slash: ${can} on ${rel}`);
    }
  }
});

test('Structured Data (JSON-LD): Syntax validity, simplified Service, and complete BlogPosting schemas', () => {
  const htmlFiles = getHtmlFiles('dist');

  for (const file of htmlFiles) {
    const rel = path.relative('dist', file).replace(/\\/g, '/');
    const html = fs.readFileSync(file, 'utf-8');

    const jsonLdBlocks = Array.from(html.matchAll(/<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi));
    assert.ok(jsonLdBlocks.length >= 1, `Page ${rel} must have at least one JSON-LD block`);

    for (const [, jsonContent] of jsonLdBlocks) {
      let parsed;
      assert.doesNotThrow(() => {
        parsed = JSON.parse(jsonContent);
      }, `Invalid JSON-LD syntax on ${rel}`);

      assert.equal(parsed['@context'], 'https://schema.org');
      assert.ok(Array.isArray(parsed['@graph']), `JSON-LD must contain @graph array on ${rel}`);

      for (const item of parsed['@graph']) {
        assert.ok(item['@type'], `Schema item missing @type on ${rel}: ${JSON.stringify(item)}`);

        // BlogPosting validation
        if (item['@type'] === 'BlogPosting') {
          assert.ok(item.image, `BlogPosting on ${rel} must include image`);
          assert.ok(typeof item.image === 'string' && item.image.startsWith('https://'), `BlogPosting image on ${rel} must be absolute URL`);
          assert.ok(item.datePublished, `BlogPosting on ${rel} must include datePublished`);
          assert.ok(item.dateModified, `BlogPosting on ${rel} must include dateModified`);
        }

        // Service validation (simplified, no hasOfferCatalog)
        if (item['@type'] === 'Service') {
          assert.equal(item.hasOfferCatalog, undefined, `Service schema on ${rel} must NOT have hasOfferCatalog`);
          assert.ok(item.name, `Service schema on ${rel} must have name`);
          assert.ok(item.description, `Service schema on ${rel} must have description`);
          assert.ok(item.provider, `Service schema on ${rel} must have provider`);
        }

        // BreadcrumbList validation
        if (item['@type'] === 'BreadcrumbList') {
          assert.ok(Array.isArray(item.itemListElement), `BreadcrumbList on ${rel} must have itemListElement array`);
          assert.ok(item.itemListElement.length >= 2, `BreadcrumbList on ${rel} must have at least 2 items`);
          item.itemListElement.forEach((crumb, idx) => {
            assert.equal(crumb.position, idx + 1, `Breadcrumb position mismatch on ${rel}`);
            assert.ok(crumb.name, `Breadcrumb item on ${rel} missing name`);
            assert.ok(crumb.item, `Breadcrumb item on ${rel} missing item URL`);
          });
        }
      }
    }
  }
});

test('Internal Linking: Service pages link to related blog posts and vice versa; footer links all services', () => {
  const servicesDir = path.resolve('dist/services');
  const serviceHtmlFiles = getHtmlFiles(servicesDir);
  assert.equal(serviceHtmlFiles.length, 6, 'Must have 6 built service pages');

  for (const sFile of serviceHtmlFiles) {
    const sRel = path.relative('dist', sFile).replace(/\\/g, '/');
    const sHtml = fs.readFileSync(sFile, 'utf-8');

    // Service page links to /blog
    assert.ok(sHtml.includes('/blog/'), `Service page ${sRel} must link to related blog posts`);
    assert.ok(sHtml.includes('RELATED TECHNICAL INSIGHTS'), `Service page ${sRel} must render related insights section`);
  }

  const blogDir = path.resolve('dist/blog');
  const blogHtmlFiles = getHtmlFiles(blogDir).filter(f => !f.endsWith('index.html') && !f.endsWith('blog.html'));
  assert.equal(blogHtmlFiles.length, 3, 'Must have 3 built blog post pages');

  for (const bFile of blogHtmlFiles) {
    const bRel = path.relative('dist', bFile).replace(/\\/g, '/');
    const bHtml = fs.readFileSync(bFile, 'utf-8');

    // Blog post links to /services/
    assert.ok(bHtml.includes('/services/'), `Blog post ${bRel} must link to its related service`);
  }

  // Footer on home page links every service
  const homeHtml = fs.readFileSync('dist/index.html', 'utf-8');
  const expectedServices = [
    '/services/website-development',
    '/services/google-business-profile-management',
    '/services/search-engine-optimization',
    '/services/google-ads-meta-ads',
    '/services/social-media-management',
    '/services/application-development'
  ];

  for (const sUrl of expectedServices) {
    assert.ok(homeHtml.includes(sUrl), `Footer must link to ${sUrl}`);
  }
});

test('Robots.txt & Redirects: Configured correctly for production crawling', () => {
  assert.ok(fs.existsSync('dist/robots.txt'), 'dist/robots.txt must exist');
  const robots = fs.readFileSync('dist/robots.txt', 'utf-8');

  assert.ok(robots.includes('Disallow: /api/'), 'robots.txt must disallow /api/');
  assert.ok(robots.includes('Disallow: /config/'), 'robots.txt must disallow /config/');
  assert.ok(robots.includes('Sitemap: https://sapvik.com/sitemap-index.xml'), 'robots.txt must point to sitemap-index.xml');
  assert.ok(!robots.includes('Disallow: /services/'), 'robots.txt must not block services');
  assert.ok(!robots.includes('Disallow: /blog/'), 'robots.txt must not block blog');

  assert.ok(fs.existsSync('dist/_redirects'), 'dist/_redirects must exist');
  const redirects = fs.readFileSync('dist/_redirects', 'utf-8');
  assert.ok(redirects.includes('/sitemap.xml /sitemap-index.xml 301'), '_redirects must redirect legacy sitemap.xml to sitemap-index.xml');
});

test('Phase 5: CONTENT_INPUTS_NEEDED.md and CLAIMS_TO_CONFIRM.md exist and all 5 draft routes build with noindex', () => {
  assert.ok(fs.existsSync('docs/CONTENT_INPUTS_NEEDED.md'), 'docs/CONTENT_INPUTS_NEEDED.md must exist');
  assert.ok(fs.existsSync('docs/CLAIMS_TO_CONFIRM.md'), 'docs/CLAIMS_TO_CONFIRM.md must exist');

  const contentDoc = fs.readFileSync('docs/CONTENT_INPUTS_NEEDED.md', 'utf-8');
  assert.ok(contentDoc.includes('Standalone Free Growth Audit Page'), 'CONTENT_INPUTS_NEEDED.md must include Audit page inputs');
  assert.ok(contentDoc.includes('Bengaluru Localized Service Pages'), 'CONTENT_INPUTS_NEEDED.md must include Bengaluru inputs');
  assert.ok(contentDoc.includes('About Company & Leadership Page'), 'CONTENT_INPUTS_NEEDED.md must include About page inputs');
  assert.ok(contentDoc.includes('How We Price'), 'CONTENT_INPUTS_NEEDED.md must include Pricing inputs');
  assert.ok(contentDoc.includes('Verified Client Case Studies & Testimonials'), 'CONTENT_INPUTS_NEEDED.md must include Case Studies inputs');

  const requiredDraftHtmls = [
    'audit.html',
    'bengaluru/website-development.html',
    'bengaluru/google-business-profile-management.html',
    'bengaluru/search-engine-optimization.html',
    'about.html',
    'pricing.html',
    'case-studies.html'
  ];

  for (const draftHtml of requiredDraftHtmls) {
    const fullPath = path.resolve('dist', draftHtml);
    assert.ok(fs.existsSync(fullPath), `Draft page dist/${draftHtml} must build successfully`);
    const html = fs.readFileSync(fullPath, 'utf-8');
    assert.ok(html.includes('noindex'), `Draft page dist/${draftHtml} must have robots noindex directive`);
  }
});

