#!/usr/bin/env python3
"""
Stamp every HTML page with a content hash of the CSS/JS it loads.

Run this after editing styles.css, app.js, bono.css or bono.js, before
committing. The version changes only when the file's bytes change, so
browsers refetch exactly when they should — and never otherwise.

Hand-written version strings caused a real bug: the stylesheet was edited
several times under one unchanged ?v=, so phones kept serving a cached
copy that predated the newer rules.
"""
import hashlib
import glob
import re

ASSETS = ['styles.css', 'app.js', 'bono.css', 'bono.js', 'cart.js', 'analytics.js']


def content_hash(path):
    with open(path, 'rb') as fh:
        return hashlib.md5(fh.read()).hexdigest()[:10]


def main():
    versions = {a: content_hash(a) for a in ASSETS}
    changed = []

    for page in sorted(glob.glob('*.html')):
        with open(page, encoding='utf-8') as fh:
            before = fh.read()
        after = before
        for asset, version in versions.items():
            after = re.sub(re.escape(asset) + r'\?v=[0-9a-f]+',
                           f'{asset}?v={version}', after)
        if after != before:
            with open(page, 'w', encoding='utf-8') as fh:
                fh.write(after)
            changed.append(page)

    for asset, version in versions.items():
        print(f'{asset:12} {version}')
    print(f'\n{len(changed)} page(s) restamped')


if __name__ == '__main__':
    main()
