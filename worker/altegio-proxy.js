/* Studio 56 -- Altegio booking proxy (Cloudflare Worker)
   =====================================================
   The site needs Altegio's live availability, and every one of those calls
   must carry a partner token. That token cannot live in the page: anyone
   could read it, and Altegio issues one per developer ACCOUNT, so a leaked
   one is not limited to this studio.

   So the browser talks to this Worker, and only the Worker knows the token.
   It is deliberately narrow: six routes, one location, one origin. Anything
   else gets 403 without reaching Altegio at all.

   Setup (no tooling to install):
     1. Cloudflare dashboard -> Workers & Pages -> Create -> Worker
     2. Replace the sample code with this file, Deploy
     3. Settings -> Variables and Secrets -> Add -> Secret
          name:  ALTEGIO_TOKEN
          value: the partner token from
                 app.alteg.io -> Nastroyki akkaunta -> Dannye akkaunta
     4. Deploy again, copy the worker URL, send it over -- it is not secret. */

const ALTEGIO = 'https://api.alteg.io/api/v1';
const LOCATION = '1465552';                 // Studio 56, Gandia

/* Only these origins may use the proxy. Not a wall -- an Origin header can be
   forged -- but it stops the everyday case of somebody embedding our booking
   endpoint in their own page. The real limits are the two below it. */
const ORIGINS = [
  'https://kristyzakh.github.io',
  'http://localhost:4056'
];

/* Every route the site actually uses, and nothing else. The location id is
   inserted here rather than accepted from the caller, so this token can only
   ever be pointed at Studio 56. */
const ROUTES = [
  { method: 'GET',  from: /^\/book_services\/?$/,                       to: () => `/book_services/${LOCATION}` },
  { method: 'GET',  from: /^\/book_staff\/?$/,                          to: () => `/book_staff/${LOCATION}` },
  { method: 'GET',  from: /^\/book_dates\/?$/,                          to: () => `/book_dates/${LOCATION}` },
  { method: 'GET',  from: /^\/book_times\/(\d+)\/(\d{4}-\d{2}-\d{2})\/?$/,
                    to: (m) => `/book_times/${LOCATION}/${m[1]}/${m[2]}` },
  { method: 'POST', from: /^\/book_check\/?$/,                          to: () => `/book_check/${LOCATION}` },
  { method: 'POST', from: /^\/book_record\/?$/,                         to: () => `/book_record/${LOCATION}` }
];

const MAX_BODY = 4096;   // a booking is a few hundred bytes; anything larger is not one

function cors(origin) {
  const allowed = ORIGINS.includes(origin) ? origin : ORIGINS[0];
  return {
    'Access-Control-Allow-Origin': allowed,
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'content-type, accept',
    'Access-Control-Max-Age': '86400',
    'Vary': 'Origin'
  };
}

function deny(origin, status, message) {
  return new Response(JSON.stringify({ success: false, meta: { message } }), {
    status,
    headers: { 'Content-Type': 'application/json', ...cors(origin) }
  });
}

export default {
  async fetch(request, env) {
    const origin = request.headers.get('Origin') || '';
    const url = new URL(request.url);

    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: cors(origin) });
    }

    if (origin && !ORIGINS.includes(origin)) {
      return deny(origin, 403, 'origin not allowed');
    }

    if (!env.ALTEGIO_TOKEN) {
      /* Said plainly, because the alternative is a booking form that looks
         alive and silently fails. The site treats any error as "cannot book"
         and falls back to WhatsApp. */
      return deny(origin, 503, 'ALTEGIO_TOKEN secret is not set on this worker');
    }

    const route = ROUTES.find(r => r.method === request.method && r.from.test(url.pathname));
    if (!route) return deny(origin, 403, 'route not allowed');

    let body;
    if (request.method === 'POST') {
      body = await request.text();
      if (body.length > MAX_BODY) return deny(origin, 413, 'body too large');
    }

    const target = ALTEGIO + route.to(url.pathname.match(route.from)) + url.search;

    let upstream;
    try {
      upstream = await fetch(target, {
        method: request.method,
        headers: {
          'Authorization': `Bearer ${env.ALTEGIO_TOKEN}`,
          'Accept': 'application/vnd.api.v2+json',
          'Content-Type': 'application/json'
        },
        body
      });
    } catch (e) {
      return deny(origin, 502, 'altegio unreachable');
    }

    /* Altegio's own body passes through untouched -- the site already knows how
       to read its error codes (437 taken, 436 nobody free, and so on) and
       turns them into something a person can act on. Only the headers are
       replaced, so nothing from upstream can leak the token back out. */
    return new Response(upstream.body, {
      status: upstream.status,
      headers: { 'Content-Type': 'application/json', ...cors(origin) }
    });
  }
};
