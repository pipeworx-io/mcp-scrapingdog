interface McpToolDefinition {
  name: string;
  description: string;
  inputSchema: {
    type: 'object';
    properties: Record<string, unknown>;
    required?: string[];
  };
}

interface McpToolExport {
  tools: McpToolDefinition[];
  callTool: (name: string, args: Record<string, unknown>) => Promise<unknown>;
  meter?: { credits: number };
  cost?: Record<string, unknown>;
  provider?: string;
}

/**
 * Scrapingdog MCP — wraps Scrapingdog (scrapingdog.com), a proxy-based web
 * scraping API with structured endpoints for Google SERP and Amazon products.
 *
 * Tools:
 * - scrapingdog_scrape         — scrape any website through rotating proxies;
 *                                HTML or markdown output, optional JS rendering
 * - scrapingdog_google_search  — Google SERP API: structured organic results
 * - scrapingdog_amazon_product — Amazon product data by ASIN (title, price,
 *                                rating, availability)
 *
 * BYO-key: pass your Scrapingdog API key via `_apiKey` (sent as the `api_key`
 * query param). Free trial with 1,000 credits at https://www.scrapingdog.com —
 * docs: https://docs.scrapingdog.com/
 *
 * Endpoint paths + param names verified against www.scrapingdog.com/documentation
 * (2026-07): /scrape takes url/dynamic/premium/country/wait/formats; /google
 * takes query/results/page/country/domain/language; /amazon/product takes
 * asin/domain/country/language. Live probes with a bogus key return the
 * "Unauthorized request" JSON on all three paths.
 */


const BASE_URL = 'https://api.scrapingdog.com';

// Cap raw page content so a huge scrape can't blow out the MCP response.
const MAX_CONTENT_CHARS = 100_000;

const SIGNUP =
  'Get a free trial key (1,000 credits) at https://www.scrapingdog.com and read the docs at https://docs.scrapingdog.com/';

const tools: McpToolExport['tools'] = [
  {
    name: 'scrapingdog_scrape',
    description:
      'Scrape any website through Scrapingdog\'s rotating proxies and return its content. ' +
      'Returns HTML by default, or clean markdown with format:"markdown" (ideal for feeding an LLM). ' +
      'Set dynamic:true to render JavaScript in a headless browser for SPAs and dynamic pages (costs 5 credits instead of 1), ' +
      'premium:true for hard-to-scrape sites (residential proxies, 10 credits), and country to geotarget the proxy. ' +
      'Example: scrapingdog_scrape({ url: "https://example.com", format: "markdown", dynamic: true, _apiKey: "your-key" })',
    inputSchema: {
      type: 'object',
      properties: {
        url: {
          type: 'string',
          description: 'The full URL to scrape including protocol, e.g. "https://example.com/page"',
        },
        dynamic: {
          type: 'boolean',
          description:
            'Render JavaScript in a headless browser before returning content (use for SPAs / dynamic pages). ' +
            'Costs 5 credits per request instead of 1 (25 with premium proxies). Default false.',
        },
        premium: {
          type: 'boolean',
          description:
            'Use premium residential proxies for hard-to-scrape sites. Costs 10 credits (25 combined with dynamic:true). Default false.',
        },
        country: {
          type: 'string',
          description: 'ISO 3166-1 alpha-2 country code to proxy from, e.g. "us", "gb", "de". Optional geotargeting.',
        },
        wait: {
          type: 'number',
          description: 'Milliseconds to wait for the page to load (0–35000). Use together with dynamic:true for slow pages.',
        },
        format: {
          type: 'string',
          description: 'Response format: "markdown" for LLM-friendly text, "links" for a link list, otherwise HTML (default). Options: html, markdown, links, summary.',
        },
        _apiKey: {
          type: 'string',
          description: 'BYOK Scrapingdog API key (free trial at scrapingdog.com)',
        },
      },
      required: ['url', '_apiKey'],
    },
  },
  {
    name: 'scrapingdog_google_search',
    description:
      'Google SERP API — run a Google search via Scrapingdog and get structured results: ' +
      'parsed organic results (title, link, snippet), related searches, and people-also-ask questions. ' +
      'Costs 5 credits per search. ' +
      'Example: scrapingdog_google_search({ query: "best running shoes 2026", country: "us", _apiKey: "your-key" })',
    inputSchema: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description: 'The Google search query, e.g. "best running shoes 2026". Supports operators like site: and intitle:.',
        },
        country: {
          type: 'string',
          description: 'Two-letter country code to localize results, e.g. "us", "gb", "fr". Default "us".',
        },
        page: {
          type: 'number',
          description: 'Result page number, 0-based: 0 = first page, 1 = second page. Default 0.',
        },
        results: {
          type: 'number',
          description: 'Number of results to return per page, e.g. 10. Optional.',
        },
        domain: {
          type: 'string',
          description: 'Google domain to search, e.g. "google.co.uk", "google.co.in". Default "google.com".',
        },
        language: {
          type: 'string',
          description: 'Results language code, e.g. "en", "es", "fr". Default "en".',
        },
        _apiKey: {
          type: 'string',
          description: 'BYOK Scrapingdog API key (free trial at scrapingdog.com)',
        },
      },
      required: ['query', '_apiKey'],
    },
  },
  {
    name: 'scrapingdog_amazon_product',
    description:
      'Get Amazon product data by ASIN via Scrapingdog — title, price, rating, review count, availability, ' +
      'feature bullets, and images as parsed JSON. Pass an asin (e.g. "B0BFC7WQ6R") or a full Amazon product url. ' +
      'Example: scrapingdog_amazon_product({ asin: "B0BFC7WQ6R", domain: "com", _apiKey: "your-key" })',
    inputSchema: {
      type: 'object',
      properties: {
        asin: {
          type: 'string',
          description: 'Amazon ASIN (product identifier), e.g. "B0BFC7WQ6R". Provide this or `url`.',
        },
        url: {
          type: 'string',
          description: 'Full Amazon product URL — the ASIN is extracted from it. Alternative to `asin`.',
        },
        domain: {
          type: 'string',
          description: 'Amazon marketplace TLD, e.g. "com", "co.uk", "de", "in". Default "com".',
        },
        country: {
          type: 'string',
          description: 'ISO country code for marketplace targeting, e.g. "us". Default "us" (1 credit; other countries cost 5).',
        },
        language: {
          type: 'string',
          description: 'ISO 639-1 language code for product data, e.g. "en", "de". Optional.',
        },
        _apiKey: {
          type: 'string',
          description: 'BYOK Scrapingdog API key (free trial at scrapingdog.com)',
        },
      },
      required: ['_apiKey'],
    },
  },
];

// Defensive access — return undefined instead of throwing on missing keys.
function pick<T = unknown>(obj: unknown, key: string): T | undefined {
  if (obj && typeof obj === 'object' && key in (obj as Record<string, unknown>)) {
    return (obj as Record<string, unknown>)[key] as T;
  }
  return undefined;
}

// Actionable error when the key is missing entirely.
function missingKeyError(tool: string): Error {
  return new Error(`Scrapingdog ${tool} requires an API key. Pass it via the _apiKey parameter. ${SIGNUP}`);
}

// Shared HTTP error formatter — keep auth + credit failures actionable.
// Scrapingdog returns 400/401/403 with an "Unauthorized request" JSON body for
// bad keys depending on the endpoint, so treat all three as auth-shaped.
function scrapingdogError(status: number, tool: string, body?: string): Error {
  const snippet = (body ?? '').slice(0, 300);
  if (status === 400 || status === 401 || status === 403) {
    if (/unauthorized|api key/i.test(snippet) || status === 401 || status === 403) {
      return new Error(
        `Scrapingdog ${tool}: auth failed (HTTP ${status}). Check your Scrapingdog _apiKey — it may be invalid or out of credits. ${SIGNUP}`,
      );
    }
    return new Error(`Scrapingdog ${tool}: bad request (HTTP 400)${snippet ? ` — ${snippet}` : ''}`);
  }
  if (status === 429) {
    return new Error(
      `Scrapingdog ${tool}: rate-limited (HTTP 429). Your Scrapingdog credits or concurrency limit are exhausted — ` +
        'slow down, upgrade at https://www.scrapingdog.com, or try another scraping pack on this gateway ' +
        '(scrapingant has a free 10k-requests/month tier; scraperapi and scrapingbee are also available).',
    );
  }
  return new Error(`Scrapingdog ${tool} error: HTTP ${status}${snippet ? ` — ${snippet}` : ''}`);
}

async function callTool(name: string, args: Record<string, unknown>): Promise<unknown> {
  const apiKey = args._apiKey as string;
  delete args._apiKey;
  if (!apiKey) throw missingKeyError(name);

  switch (name) {
    case 'scrapingdog_scrape':
      return scrape(args, apiKey);
    case 'scrapingdog_google_search':
      return googleSearch(args, apiKey);
    case 'scrapingdog_amazon_product':
      return amazonProduct(args, apiKey);
    default:
      throw new Error(`Unknown tool: ${name}`);
  }
}

// General scrape — returns page content (HTML or markdown TEXT, not JSON).
async function scrape(args: Record<string, unknown>, apiKey: string) {
  const url = args.url as string | undefined;
  if (!url) {
    throw new Error('Scrapingdog scrapingdog_scrape requires a `url` to scrape (e.g. "https://example.com").');
  }

  // Scrapingdog renders JS by default (5 credits) — send dynamic explicitly so
  // the cheap 1-credit static fetch is our default and dynamic:true is opt-in.
  const params = new URLSearchParams({
    api_key: apiKey,
    url,
    dynamic: args.dynamic === true ? 'true' : 'false',
  });
  if (args.premium === true) params.set('premium', 'true');
  if (typeof args.country === 'string' && args.country) params.set('country', args.country);
  if (typeof args.wait === 'number' && args.wait > 0) params.set('wait', String(Math.min(args.wait, 35000)));
  if (typeof args.format === 'string' && args.format && args.format !== 'html') {
    params.set('formats', args.format);
  }

  let res: Response;
  try {
    res = await fetch(`${BASE_URL}/scrape?${params}`);
  } catch (err) {
    throw new Error(
      `Scrapingdog scrapingdog_scrape: network error reaching api.scrapingdog.com — ${(err as Error).message}`,
    );
  }
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw scrapingdogError(res.status, 'scrapingdog_scrape', body);
  }

  const full = await res.text();
  const content = full.slice(0, MAX_CONTENT_CHARS);
  return {
    url,
    format: (args.format as string) || 'html',
    dynamic: args.dynamic === true,
    length: full.length,
    truncated: full.length > MAX_CONTENT_CHARS,
    content,
    raw: content,
  };
}

// Fetch + parse a structured JSON endpoint with defensive error handling.
async function fetchStructured(path: string, params: URLSearchParams, tool: string): Promise<unknown> {
  let res: Response;
  try {
    res = await fetch(`${BASE_URL}${path}?${params}`);
  } catch (err) {
    throw new Error(`Scrapingdog ${tool}: network error reaching api.scrapingdog.com — ${(err as Error).message}`);
  }
  const text = await res.text();
  if (!res.ok) throw scrapingdogError(res.status, tool, text);

  try {
    return JSON.parse(text);
  } catch {
    throw new Error(
      `Scrapingdog ${tool}: expected JSON from the structured endpoint but got a non-JSON response ` +
        `(first 200 chars: ${text.slice(0, 200)}). The query/ASIN may be invalid or the scrape was blocked.`,
    );
  }
}

// Google SERP — /google returns structured JSON with organic_results etc.
async function googleSearch(args: Record<string, unknown>, apiKey: string) {
  const query = args.query as string | undefined;
  if (!query) {
    throw new Error('Scrapingdog scrapingdog_google_search requires a `query` (e.g. "best running shoes 2026").');
  }

  const params = new URLSearchParams({ api_key: apiKey, query });
  if (typeof args.country === 'string' && args.country) params.set('country', args.country);
  if (typeof args.page === 'number') params.set('page', String(args.page));
  if (typeof args.results === 'number') params.set('results', String(args.results));
  if (typeof args.domain === 'string' && args.domain) params.set('domain', args.domain);
  if (typeof args.language === 'string' && args.language) params.set('language', args.language);

  const raw = await fetchStructured('/google', params, 'scrapingdog_google_search');

  const organic =
    pick<unknown[]>(raw, 'organic_results') ??
    pick<unknown[]>(raw, 'organic_data') ??
    pick<unknown[]>(raw, 'results');

  // Normalize the organic entries to title/link/snippet regardless of the
  // exact upstream field names.
  const results = Array.isArray(organic)
    ? organic.map((r) => ({
        title: pick<string>(r, 'title'),
        link: pick<string>(r, 'link') ?? pick<string>(r, 'url'),
        snippet: pick<string>(r, 'snippet') ?? pick<string>(r, 'description'),
        displayed_link: pick<string>(r, 'displayed_link'),
        rank: pick<unknown>(r, 'rank') ?? pick<unknown>(r, 'position'),
      }))
    : undefined;

  return {
    query,
    count: results?.length,
    results,
    related_searches: pick<unknown>(raw, 'related_searches'),
    people_also_ask: pick<unknown>(raw, 'peopleAlsoAskedFor') ?? pick<unknown>(raw, 'related_questions'),
    knowledge_graph: pick<unknown>(raw, 'knowledge_graph'),
    raw,
  };
}

// Extract an ASIN from a full Amazon product URL (e.g. /dp/B0BFC7WQ6R).
function asinFromUrl(url: string): string | undefined {
  const m = url.match(/(?:\/dp\/|\/gp\/product\/|\/product\/)([A-Z0-9]{10})(?:[/?]|$)/i);
  return m?.[1]?.toUpperCase();
}

async function amazonProduct(args: Record<string, unknown>, apiKey: string) {
  let asin = args.asin as string | undefined;
  const url = args.url as string | undefined;
  if (!asin && url) asin = asinFromUrl(url);
  if (!asin) {
    throw new Error(
      'Scrapingdog scrapingdog_amazon_product requires an `asin` (e.g. "B0BFC7WQ6R") or a full Amazon product `url` containing one (e.g. ".../dp/B0BFC7WQ6R").',
    );
  }

  const params = new URLSearchParams({
    api_key: apiKey,
    asin,
    domain: typeof args.domain === 'string' && args.domain ? args.domain : 'com',
  });
  if (typeof args.country === 'string' && args.country) params.set('country', args.country);
  if (typeof args.language === 'string' && args.language) params.set('language', args.language);

  const raw = await fetchStructured('/amazon/product', params, 'scrapingdog_amazon_product');

  return {
    asin,
    title: pick<string>(raw, 'title') ?? pick<string>(raw, 'name'),
    price: pick<unknown>(raw, 'price') ?? pick<unknown>(raw, 'pricing'),
    list_price: pick<unknown>(raw, 'list_price'),
    average_rating: pick<unknown>(raw, 'average_rating'),
    total_reviews: pick<unknown>(raw, 'total_reviews'),
    availability: pick<unknown>(raw, 'availability') ?? pick<unknown>(raw, 'availability_status'),
    brand: pick<unknown>(raw, 'brand'),
    feature_bullets: pick<unknown>(raw, 'feature_bullets'),
    main_image: pick<unknown>(raw, 'main_image'),
    images: pick<unknown>(raw, 'images'),
    product_category: pick<unknown>(raw, 'product_category'),
    raw,
  };
}

export default { tools, callTool, meter: { credits: 1 } } satisfies McpToolExport;
