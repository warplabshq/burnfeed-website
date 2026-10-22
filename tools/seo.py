#!/usr/bin/env python3
"""Search engine plumbing for burnfeed.app, in one place:

- every page's <title>, description, canonical URL, Open Graph / Twitter card and
  structured data (JSON-LD), written between <!-- seo --> markers in its <head>;
- the guide and comparison pages from tools/content.py, built on the site's own shell;
- sitemap.xml, robots.txt, llms.txt (a plain summary for AI search) and 404.html.

  python3 tools/seo.py        # run after changing any page, then deploy

Pages are listed in PAGES below; a page not listed keeps its head untouched. Keep titles under
~60 characters and descriptions under ~155, true to what Burnfeed does today."""
import datetime
import html
import json
import re
import subprocess
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SITE = "https://burnfeed.app"
OG = f"{SITE}/assets/og.png"
STORE = "https://apps.apple.com/app/burnfeed/id6444266324?mt=12"
EMAIL = "mail@warplabs.co"

ORG = {
    "@context": "https://schema.org", "@type": "Organization", "name": "Burnfeed",
    "legalName": "Priyam Ventures Private Limited", "url": f"{SITE}/", "logo": f"{SITE}/logo.png",
    "contactPoint": {"@type": "ContactPoint", "email": EMAIL, "contactType": "customer support"},
}
APP = {
    "@context": "https://schema.org", "@type": "SoftwareApplication", "name": "Burnfeed",
    "applicationCategory": "BrowserApplication", "operatingSystem": "macOS (Safari extension)",
    "description": "A Safari extension for Mac that hides the endless feed on Facebook, Instagram, X, YouTube, "
                   "LinkedIn and Reddit, part by part, and leaves a quote in its place.",
    "url": f"{SITE}/", "image": OG, "installUrl": f"{SITE}/buy",
    "offers": [
        {"@type": "Offer", "name": "Burnfeed", "price": "4.99", "priceCurrency": "USD",
         "description": "One person, two Macs. Pay once, no subscription.", "url": f"{SITE}/buy#personal"},
        {"@type": "Offer", "name": "Burnfeed Team", "price": "19.99", "priceCurrency": "USD",
         "description": "Five people, two Macs each. Pay once, no subscription.", "url": f"{SITE}/buy#team"},
    ],
    "featureList": [
        "Hides the feed on Facebook, Instagram, X, YouTube, LinkedIn and Reddit",
        "Hide parts of a site: YouTube Shorts, comments and suggested videos, X trends, Reddit sidebars",
        "A quote in place of the feed",
        "Show a feed for 5, 15 or 60 minutes, then it burns again",
        "Rules update on their own when sites change",
        "Nothing about your browsing leaves your Mac",
    ],
    "author": {"@type": "Organization", "name": "Priyam Ventures Private Limited"},
}
WEBSITE = {"@context": "https://schema.org", "@type": "WebSite", "name": "Burnfeed", "url": f"{SITE}/"}

# file, canonical path, title, description, extra JSON-LD builders
PAGES = [
    ("index.html", "/", "Burnfeed: hide social media feeds in Safari on Mac",
     "A Safari extension for Mac that hides the endless feed on Facebook, Instagram, X, YouTube, LinkedIn "
     "and Reddit, part by part, and leaves a quote in its place.", ["website", "app", "org"]),
    ("buy.html", "/buy", "Buy Burnfeed: $4.99 once, no subscription",
     "Burnfeed for Mac: $4.99 once for two Macs, or $19.99 for a team of five. No subscription, no "
     "account, 14-day refund.", ["app", "faq"]),
    ("help.html", "/help", "Burnfeed Help: set up and use Burnfeed in Safari",
     "Turn Burnfeed on in Safari, hide only some parts of a site, pause a feed, and fix stuck "
     "permissions. Answers to common questions.", ["faq"]),
    ("privacy-policy.html", "/privacy-policy", "Burnfeed Privacy Policy",
     "Burnfeed collects nothing about your browsing. What stays on your Mac, rule updates, purchases "
     "and contact.", []),
    ("about.html", "/about", "About Burnfeed",
     "Why Burnfeed exists: a Safari extension for Mac that ends the habit of opening a feed.", []),
    ("changelog.html", "/changelog", "What's new in Burnfeed: changelog",
     "Every version of Burnfeed for Mac, newest first.", []),
]
NOINDEX = ["thanks.html", "404.html"]
CRUMB = {"/buy": "Buy", "/help": "Help", "/privacy-policy": "Privacy", "/about": "About", "/changelog": "Changelog"}


def ld(obj):
    return f'<script type="application/ld+json">{json.dumps(obj, ensure_ascii=False)}</script>'


def faq_from(page_html):
    """FAQPage from the page's own <h3> questions and the paragraph after each."""
    items = re.findall(r"<h3>(.*?)</h3>\s*<p>(.*?)</p>", page_html, re.S)
    clean = lambda s: html.unescape(re.sub(r"<[^>]+>", "", s)).strip()
    entities = [{"@type": "Question", "name": clean(q), "acceptedAnswer": {"@type": "Answer", "text": clean(a)}}
                for q, a in items if q.strip()]
    return {"@context": "https://schema.org", "@type": "FAQPage", "mainEntity": entities} if entities else None


def breadcrumbs(trail):
    return {"@context": "https://schema.org", "@type": "BreadcrumbList", "itemListElement": [
        {"@type": "ListItem", "position": i + 1, "name": name, "item": f"{SITE}{path}"} for i, (name, path) in enumerate(trail)]}


def seo_block(path, title, desc, schemas, og_type="website"):
    url = f"{SITE}{path}"
    t, d = html.escape(title), html.escape(desc)
    lines = [
        "<!-- seo: generated by tools/seo.py -->",
        f"<title>{t}</title>",
        f'<meta name="description" content="{d}">',
        f'<link rel="canonical" href="{url}">',
        f'<meta property="og:type" content="{og_type}"><meta property="og:site_name" content="Burnfeed">',
        f'<meta property="og:url" content="{url}"><meta property="og:title" content="{t}"><meta property="og:description" content="{d}">',
        f'<meta property="og:image" content="{OG}"><meta property="og:image:width" content="1200"><meta property="og:image:height" content="630">'
        '<meta property="og:image:alt" content="Burnfeed: burn the feed, not your time.">',
        f'<meta name="twitter:card" content="summary_large_image"><meta name="twitter:title" content="{t}">'
        f'<meta name="twitter:description" content="{d}"><meta name="twitter:image" content="{OG}">',
        '<link rel="apple-touch-icon" href="/logo.png?v=2">',
        *[ld(s) for s in schemas if s],
        "<!-- /seo -->",
    ]
    return "\n    ".join(lines)


OLD_TAGS = [
    r"\s*<title>.*?</title>", r'\s*<meta name="description"[^>]*>', r'\s*<meta name="image"[^>]*>',
    r'\s*<meta property="og:[^>]*>', r'\s*<meta name="twitter:[^>]*>', r'\s*<link rel="canonical"[^>]*>',
    r'\s*<link rel="apple-touch-icon"[^>]*>', r"\s*<!-- seo: generated.*?<!-- /seo -->",
]


def apply_head(text, block, noindex=False):
    for pat in OLD_TAGS:
        text = re.sub(pat, "", text, flags=re.S)
    text = re.sub(r'\s*<meta name="robots"[^>]*>', "", text)
    if noindex:
        block = '<meta name="robots" content="noindex">\n    ' + block
    return re.sub(r'(<meta name="viewport"[^>]*>)', lambda m: m.group(1) + "\n    " + block, text, count=1)


def lastmod(rel):
    out = subprocess.run(["git", "log", "-1", "--format=%cs", "--", rel], cwd=ROOT, capture_output=True, text=True).stdout.strip()
    return out or datetime.date.today().isoformat()


def main():
    built = {"website": WEBSITE, "app": APP, "org": ORG}
    sitemap = []
    for file, path, title, desc, kinds in PAGES:
        p = ROOT / file
        text = p.read_text()
        schemas = [faq_from(text) if k == "faq" else built[k] for k in kinds]
        if path != "/":
            schemas.append(breadcrumbs([("Burnfeed", "/"), (CRUMB[path], path)]))
        p.write_text(apply_head(text, seo_block(path, title, desc, schemas)))
        sitemap.append((path, lastmod(file)))

    # Guides and comparisons (tools/content.py), on the help page's shell
    try:
        import content
    except ImportError:
        content = None
    if content:
        for page in content.build(ROOT, seo_block, breadcrumbs, ld, APP):
            sitemap.append((page, datetime.date.today().isoformat()))

    for file in NOINDEX:
        p = ROOT / file
        if p.exists():
            text = p.read_text()
            title = re.search(r"<title>(.*?)</title>", text, re.S)
            p.write_text(apply_head(text, seo_block("/" + file.replace(".html", ""), html.unescape(title.group(1)) if title else "Burnfeed",
                                                     "Burnfeed for Safari on Mac.", []), noindex=True))

    (ROOT / "sitemap.xml").write_text(
        '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n'
        + "".join(f"  <url><loc>{SITE}{path}</loc><lastmod>{mod}</lastmod></url>\n" for path, mod in sitemap)
        + "</urlset>\n")
    guides = "".join(f"- [{g['h1']}]({SITE}/guides/{g['slug']}): {g['desc']}\n" for g in (content.GUIDES if content else []))
    (ROOT / "llms.txt").write_text(f"""# Burnfeed

> Burnfeed is a Safari extension for Mac that hides the endless feed on Facebook, Instagram, X (Twitter), YouTube, LinkedIn and Reddit, part by part, and leaves a quote in its place. Search, messages and posting keep working. Nothing about your browsing leaves the Mac. $4.99 once (two Macs) or $19.99 for a team of five; no subscription. Also on the Mac App Store.

Made by Priyam Ventures Private Limited. Mac only (Safari). Support: {EMAIL}

## Product
- [Home]({SITE}/): what it does, the time maths, a live demo
- [Pricing]({SITE}/buy): plans, how buying works, FAQ
- [Help]({SITE}/help): setup in Safari, pausing, permissions, refunds
- [Changelog]({SITE}/changelog): every version since 2022
- [Mac App Store]({STORE})

## Guides
{guides}
## Facts
- What it can hide: YouTube home feed, Shorts button, suggested videos, end-screen suggestions, comments, live chat, notifications, subscriptions, Explore; X home timeline, trends, Today's News, Explore posts; Facebook news feed, stories, groups feed; Instagram home feed, stories, Suggested for you, Explore suggestions; LinkedIn home feed and news sidebar; Reddit home feed, r/all and r/popular, subreddit feeds, sidebars, recently viewed, games.
- Pause: show a feed for 5, 15 or 60 minutes; it burns again on its own.
- Blocking rules update from burnfeed.app when sites change, without an app update.
- Requirements: macOS 13 and Safari 18.4 or later for the version from burnfeed.app; the App Store version needs macOS 12.

## Legal
- [Privacy Policy]({SITE}/privacy-policy)
""")
    (ROOT / "robots.txt").write_text(f"User-agent: *\nAllow: /\nDisallow: /thanks\n\nSitemap: {SITE}/sitemap.xml\n")
    print(f"seo: {len(sitemap)} pages in the sitemap")


if __name__ == "__main__":
    import sys
    sys.path.insert(0, str(Path(__file__).resolve().parent))
    main()
