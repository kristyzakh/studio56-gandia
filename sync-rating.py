#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""One rating, one place to change it.

The Google score is published in two shapes -- the visible facts line under every
treatment lead, and the aggregateRating inside the home pages' JSON-LD -- across
fifteen files in three languages. Editing them by hand is how a site ends up
claiming 5.0 while Google says 4.8, which is exactly what happened before.

So the number lives in rating.json and nowhere else. Change it there, run this,
and every page moves together.

    python3 sync-rating.py            # apply rating.json everywhere
    python3 sync-rating.py --check    # report drift, change nothing (exit 1 if any)
"""
import glob, io, json, re, sys

CHECK = '--check' in sys.argv

with io.open('rating.json', encoding='utf-8') as fh:
    r = json.load(fh)
score, count = float(r['score']), int(r['count'])

fill  = '{:.1f}'.format(score / 5 * 100)   # how much of the five stars is filled
shown = '{:.1f}'.format(score).replace('.', ',')   # a comma: the site is Spanish/UA/RU
ld    = '{:.1f}'.format(score).rstrip('0').rstrip('.')  # schema.org wants a dot

PAGES = sorted(glob.glob('*.html') + glob.glob('ua/*.html') + glob.glob('ru/*.html'))
drift, touched = [], []

for path in PAGES:
    with io.open(path, encoding='utf-8') as fh:
        src = fh.read()
    out = src

    # a) the visible line
    out = re.sub(r'(<span class="gbp-stars" style="--fill:)[\d.]+(%")', r'\g<1>' + fill + r'\2', out)
    out = re.sub(r'(<span class="gbp-score">)[^<]*(</span>)',           r'\g<1>' + shown + r'\2', out)
    out = re.sub(r'(<span class="gbp-count">)[^<]*(</span>)',           r'\g<1>' + str(count) + r'\2', out)

    # b) the structured data -- only the aggregate node carries reviewCount, so
    #    the individual 5-star reviews below it are never touched
    out = re.sub(r'("ratingValue": ")[^"]*(", "bestRating": "5", "reviewCount": ")[^"]*(")',
                 r'\g<1>' + ld + r'\g<2>' + str(count) + r'\3', out)

    if out != src:
        drift.append(path)
        if not CHECK:
            with io.open(path, 'w', encoding='utf-8') as fh:
                fh.write(out)
            touched.append(path)

# the JSON-LD must still parse, or the rich result silently disappears
bad = []
for path in PAGES:
    with io.open(path, encoding='utf-8') as fh:
        body = fh.read()
    for block in re.findall(r'<script type="application/ld\+json">(.*?)</script>', body, re.S):
        try:
            json.loads(block)
        except ValueError as e:
            bad.append('%s: %s' % (path, e))
if bad:
    print('JSON-LD BROKEN:'); [print(' ', b) for b in bad]
    sys.exit(2)

print('rating.json: %s / %s reviews  (fill %s%%, shown %s, ld %s)' % (score, count, fill, shown, ld))
if CHECK:
    if drift:
        print('OUT OF DATE (%d):' % len(drift)); [print(' ', p) for p in drift]
        sys.exit(1)
    print('every page already matches')
else:
    print('updated %d file(s)%s' % (len(touched), ':' if touched else ''))
    for p in touched:
        print(' ', p)
