"""Guide and comparison pages for burnfeed.app, built by tools/seo.py on the help page's shell.

Everything here must stay true: what Burnfeed hides comes from the live rules
(rules/v1/sitelist.json); claims about other products were checked on their own sites
(dates in COMPARISONS). Update a page when the product or the rules change."""
import html
import re
from pathlib import Path

SITE = "https://burnfeed.app"
STORE = "https://apps.apple.com/app/burnfeed/id6444266324?mt=12"

SETUP = [
    ("Get Burnfeed", 'Buy it on <a href="/buy">burnfeed.app</a> ($4.99 once) or from the <a href="' + STORE + '" target="_blank" rel="noopener">Mac App Store</a>, and open the app once.'),
    ("Turn it on in Safari", "Choose Safari › Settings › Extensions, tick Burnfeed, and allow it on the site."),
    ("Pick what goes", "Open the site and click the Burnfeed button in Safari's toolbar. Switch the feed, or single parts of the page, on or off."),
]

GUIDES = [
    {
        "slug": "hide-youtube-shorts-safari",
        "title": "How to hide YouTube Shorts in Safari on Mac",
        "desc": "Remove the Shorts button and the home feed full of Shorts from YouTube in Safari on your Mac, and keep search, subscriptions and the videos you meant to watch.",
        "h1": "Hide YouTube Shorts in Safari on Mac",
        "lede": "YouTube has no setting to turn Shorts off on the web. Burnfeed takes the Shorts button out of YouTube's sidebar and burns the home feed where most Shorts show up, right in Safari.",
        "site": "YouTube",
        "hides": ["The Shorts button in the sidebar and the mini sidebar", "The home feed, where the Shorts shelf lives", "Suggested videos next to a video, and the grid at the end of one", "Comments, live chat, notifications and the Explore menu, if you want"],
        "stays": "Search, your subscriptions, playlists, history and any video you open stay exactly as they are.",
        "native": "On YouTube itself you can dismiss a Shorts shelf, but it comes back. Turning off YouTube watch history empties the home feed, at the cost of your history and recommendations everywhere.",
        "faq": [
            ("Does it hide Shorts in search results?", "No. Burnfeed hides the Shorts button and the home feed. Shorts can still appear when you search, so you choose what you watch."),
            ("Can I keep the home feed and only remove the Shorts button?", "Yes. Each part has its own switch in the Burnfeed menu, so you can burn just the Shorts button and leave the rest."),
        ],
    },
    {
        "slug": "hide-youtube-recommendations-mac",
        "title": "How to hide YouTube recommendations on Mac",
        "desc": "Hide YouTube's home feed, suggested videos, end-screen suggestions and comments in Safari on Mac, part by part, with Burnfeed.",
        "h1": "Hide YouTube recommendations on Mac",
        "lede": "You open YouTube for one video and leave an hour later. Burnfeed burns the recommendations, the home feed, the sidebar and the end screen, so YouTube shows you what you came for and nothing else.",
        "site": "YouTube",
        "hides": ["The home feed", "Suggested videos beside the player", "The grid of suggestions at the end of a video", "Video comments and live chat", "The Shorts button, Explore menu, notifications and subscriptions list"],
        "stays": "Search, the video player, your subscriptions page, playlists and Watch Later keep working.",
        "native": "Turning off watch history in your Google account makes YouTube's home feed empty, but it also clears your history and personalisation. Burnfeed leaves your account alone and only changes what Safari shows you.",
        "faq": [
            ("Will it change my YouTube account?", "No. Burnfeed only changes how YouTube looks in Safari on your Mac. Your account, history and settings stay the same."),
            ("Can I see suggestions for a moment?", "Yes. Choose \"Show feed for\" 5, 15 or 60 minutes in the Burnfeed menu. When the time is up, they burn again on their own."),
        ],
    },
    {
        "slug": "hide-facebook-feed-mac",
        "title": "How to hide the Facebook feed on Mac",
        "desc": "Hide the Facebook news feed and stories in Safari on Mac, and keep Messenger, groups, events and Marketplace. Burnfeed puts a quote where the feed was.",
        "h1": "Hide the Facebook feed on Mac",
        "lede": "Most of what keeps you on Facebook is the news feed. Burnfeed removes it from facebook.com in Safari and leaves a quote in its place, so you can check a message or an event and get out.",
        "site": "Facebook",
        "hides": ["The news feed on the home page", "Stories at the top of the feed", "The groups feed, if you switch it on"],
        "stays": "Messenger, notifications, groups you open, events, Marketplace and your profile keep working.",
        "native": "Facebook's Feeds tab can sort by Friends or Favorites, but the home page always opens on the main feed again.",
        "faq": [
            ("Does it delete anything from my account?", "No. Burnfeed only hides the feed on your screen in Safari. Nothing changes on Facebook."),
            ("Does it work on Facebook's other domains?", "It works on www.facebook.com and web.facebook.com in Safari on Mac."),
        ],
    },
    {
        "slug": "hide-instagram-feed-mac",
        "title": "How to hide the Instagram feed on Mac",
        "desc": "Hide the Instagram home feed, stories and \"Suggested for you\" in Safari on Mac. Keep messages, your profile and posting.",
        "h1": "Hide the Instagram feed on Mac",
        "lede": "On a Mac, Instagram is mostly the feed. Burnfeed burns the home feed, the stories row and the suggestions, so instagram.com becomes a place to check messages and post, not to scroll.",
        "site": "Instagram",
        "hides": ["The home feed", "The stories row", "\"Suggested for you\" accounts", "Suggestions on the Explore page"],
        "stays": "Direct messages, notifications, your profile, posting and any profile or post you open directly stay.",
        "native": "Instagram's Following view shows only accounts you follow, newest first, but it is still an endless feed.",
        "faq": [
            ("Can I still see one person's posts?", "Yes. Open their profile and everything is there. Burnfeed hides the feed, not the people."),
            ("Does it hide Reels?", "Burnfeed hides the home feed and Explore suggestions, where most Reels appear. A Reel someone sends you still plays."),
        ],
    },
    {
        "slug": "hide-x-twitter-feed-mac",
        "title": "How to hide the X (Twitter) feed on Mac",
        "desc": "Hide the X home timeline, trends, \"What's happening\" and Explore posts in Safari on Mac. Keep search, messages, notifications and posting.",
        "h1": "Hide the X (Twitter) feed on Mac",
        "lede": "X opens on an endless For You timeline. Burnfeed burns it on x.com and twitter.com in Safari, along with trends and the news panel, so you can post, reply and search without falling in.",
        "site": "X",
        "hides": ["The home timeline (For You and Following)", "Trends and \"What's happening\"", "Today's News", "Posts on the Explore page"],
        "stays": "Search, messages, notifications, bookmarks, lists, profiles and posting stay.",
        "native": "X lets you pin the Following tab instead of For You, but both are endless, and trends stay on every page.",
        "faq": [
            ("Can I still read one account?", "Yes. Profiles, lists and single posts open normally."),
            ("Does it work on twitter.com too?", "Yes, on both x.com and twitter.com in Safari on Mac."),
        ],
    },
    {
        "slug": "hide-linkedin-feed-mac",
        "title": "How to hide the LinkedIn feed on Mac",
        "desc": "Hide the LinkedIn home feed and news sidebar in Safari on Mac. Keep messages, jobs, notifications and your network.",
        "h1": "Hide the LinkedIn feed on Mac",
        "lede": "You open LinkedIn for a message or a job and the feed pulls you in. Burnfeed burns the home feed and the news sidebar in Safari and leaves a quote where they were.",
        "site": "LinkedIn",
        "hides": ["The home feed", "The LinkedIn News sidebar"],
        "stays": "Messaging, jobs, notifications, My Network, profiles, search and posting stay.",
        "native": "LinkedIn has no setting to turn the feed off.",
        "faq": [
            ("Can I still post?", "Yes. The post box stays; only the feed under it burns."),
            ("Will people know?", "No. Burnfeed only changes what you see in your own Safari."),
        ],
    },
    {
        "slug": "hide-reddit-home-feed-mac",
        "title": "How to hide the Reddit home feed on Mac",
        "desc": "Hide Reddit's home feed, r/popular and r/all, sidebars, recently viewed posts and games in Safari on Mac. Keep the communities you open on purpose.",
        "h1": "Hide the Reddit home feed on Mac",
        "lede": "Reddit's front page is built to keep you scrolling. Burnfeed burns the home feed, r/popular and r/all in Safari, and can also clear the sidebars, so you only read the communities you go to on purpose.",
        "site": "Reddit",
        "hides": ["The home feed (Best, Hot, New, Top, Rising)", "r/all and r/popular", "Every subreddit's feed, if you want", "The left and right sidebars, recently viewed posts, gallery carousels and Games on Reddit"],
        "stays": "Search, single posts and their comments, messages, your profile and posting stay. Old Reddit works too.",
        "native": "Reddit's settings can mute communities and turn off some recommendations, but the home feed stays.",
        "faq": [
            ("Can I still visit one subreddit?", "Yes. Subreddit feeds stay unless you switch \"Every subreddit's feed\" on."),
            ("Does it work on old.reddit.com?", "Yes, on www.reddit.com and old.reddit.com in Safari on Mac."),
        ],
    },
]


def shell(root):
    text = (root / "help.html").read_text()
    # Pages live in folders: make the shell's relative links absolute
    text = re.sub(r'(href|src)="(?!https?:|mailto:|/|#)([^"]+)"', r'\1="/\2"', text)
    # Guides aren't linked from the App Store app, so they carry the Buy link like other pages
    text = text.replace("<!-- No Buy link: the App Store app links here (App Review 3.1.1) -->", '<a class="get" href="/buy">Buy</a>')
    head, rest = text.split('    <main class="wrap doc">', 1)
    tail = rest.split("    </main>", 1)[1]
    return head, tail


def esc(s):
    return html.escape(s, quote=False)


def guide_html(g):
    steps = "".join(f"<li><strong>{n}.</strong> {t}</li>" for n, (_, t) in enumerate(SETUP, 1))
    hides = "".join(f"<li>{esc(h)}</li>" for h in g["hides"])
    faq = "".join(f"<h3>{esc(q)}</h3>\n      <p>{esc(a)}</p>\n      " for q, a in g["faq"])
    return f'''    <main class="wrap doc">
      <p class="muted"><a href="/guides/">Guides</a></p>
      <h1>{esc(g["h1"])}</h1>
      <p class="lede">{esc(g["lede"])}</p>

      <h2>How to do it</h2>
      <ol class="how">{steps}</ol>

      <h2>What Burnfeed hides on {esc(g["site"])}</h2>
      <ul>{hides}</ul>
      <p>{esc(g["stays"])} Need the feed for a moment? Show it for 5, 15 or 60 minutes and it burns again on its own.</p>

      <h2>Without an extension</h2>
      <p>{esc(g["native"])}</p>

      <h2>Questions</h2>
      {faq}
      <div class="cta-box">
        <p><strong>Burnfeed for Safari on Mac.</strong> Six sites, part by part. $4.99 once.</p>
        <p><a class="button" href="/buy">Buy Burnfeed</a> <a class="store-link" href="{STORE}" target="_blank" rel="noopener">Also on the Mac App Store</a></p>
      </div>
    </main>'''


def guides_index_html():
    items = "".join(f'<li><a href="/guides/{g["slug"]}">{esc(g["h1"])}</a><br><span class="muted">{esc(g["desc"])}</span></li>' for g in GUIDES)
    return f'''    <main class="wrap doc">
      <h1>Guides</h1>
      <p class="lede">How to get the feeds out of Safari on your Mac, site by site, and keep the parts you actually use.</p>
      <ul class="guides">{items}</ul>
    </main>'''


PAGE_CSS = '''
    <style>
      .doc .lede { font-size: 19px; line-height: 1.5; color: var(--text-2); }
      .doc .how { padding-left: 0; list-style: none; }
      .doc .how li { margin: 0 0 10px; }
      .doc ul li { margin: 4px 0; }
      .doc .guides { list-style: none; padding: 0; }
      .doc .guides li { padding: 16px 0; border-top: 1px solid var(--line); }
      .cta-box { margin: 40px 0 0; padding: 22px 24px; border-radius: 16px; background: var(--panel); }
      .cta-box p { margin: 0 0 12px; }
      .cta-box p:last-child { margin: 0; display: flex; gap: 14px; align-items: center; flex-wrap: wrap; }
      .cta-box .store-link { color: var(--text-2); font-size: 14px; }
    </style>'''


def build(root, seo_block, breadcrumbs, ld, app):
    head, tail = shell(root)
    head = head.replace("  </head>", PAGE_CSS + "\n  </head>")
    out = root / "guides"
    out.mkdir(exist_ok=True)
    paths = []

    def write(file, path, title, desc, main, schemas):
        page = re.sub(r"<!-- seo: generated.*?<!-- /seo -->", lambda m: seo_block(path, title, desc, schemas, "article"), head, flags=re.S)
        file.write_text(page + main + tail)
        paths.append(path)

    write(out / "index.html", "/guides/", "Guides: hide social media feeds in Safari on Mac",
          "How to hide the feed on YouTube, Facebook, Instagram, X, LinkedIn and Reddit in Safari on Mac.",
          guides_index_html(), [breadcrumbs([("Burnfeed", "/"), ("Guides", "/guides/")])])
    for g in GUIDES:
        path = f"/guides/{g['slug']}"
        howto = {"@context": "https://schema.org", "@type": "HowTo", "name": g["h1"],
                 "step": [{"@type": "HowToStep", "name": n, "text": re.sub(r"<[^>]+>", "", t)} for n, t in SETUP]}
        faq = {"@context": "https://schema.org", "@type": "FAQPage", "mainEntity": [
            {"@type": "Question", "name": q, "acceptedAnswer": {"@type": "Answer", "text": a}} for q, a in g["faq"]]}
        write(out / f"{g['slug']}.html", path, g["title"], g["desc"], guide_html(g),
              [howto, faq, breadcrumbs([("Burnfeed", "/"), ("Guides", "/guides/"), (g["h1"], path)])])
    # Not found: the site's shell with a way back
    page = re.sub(r"<!-- seo: generated.*?<!-- /seo -->", "<title>Page not found · Burnfeed</title>", head, flags=re.S)
    (root / "404.html").write_text(page + '''    <main class="wrap doc">
      <h1>Nothing here.</h1>
      <p class="lede">This page burned, or never existed.</p>
      <p><a href="/">Back to Burnfeed</a> · <a href="/guides/">Guides</a> · <a href="/help">Help</a></p>
    </main>''' + tail)
    return paths
