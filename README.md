# mcp-scrapingdog

Scrapingdog MCP — wraps Scrapingdog (scrapingdog.com), a proxy-based web

Part of [Pipeworx](https://pipeworx.io) — an MCP gateway connecting AI agents to 1394+ live data sources.

## Tools

| Tool | Description |
|------|-------------|
| `scrapingdog_scrape` | Scrape any website through Scrapingdog's rotating proxies and return its content. Returns HTML by default, or clean markdown with format:"markdown" (ideal for feeding an LLM). Set dynamic:true to render JavaScript in a headless browser for SPAs and dynamic pages (costs 5 credits instead of 1), premium:true for hard-to-scrape sites (residential proxies, 10 credits), and country to geotarget the proxy. Example: scrapingdog_scrape({ url: "https://example.com", format: "markdown", dynamic: true, _apiKey: "your-key" }) |
| `scrapingdog_google_search` | Google SERP API — run a Google search via Scrapingdog and get structured results: parsed organic results (title, link, snippet), related searches, and people-also-ask questions. Costs 5 credits per search. Example: scrapingdog_google_search({ query: "best running shoes 2026", country: "us", _apiKey: "your-key" }) |
| `scrapingdog_amazon_product` | Get Amazon product data by ASIN via Scrapingdog — title, price, rating, review count, availability, feature bullets, and images as parsed JSON. Pass an asin (e.g. "B0BFC7WQ6R") or a full Amazon product url. Example: scrapingdog_amazon_product({ asin: "B0BFC7WQ6R", domain: "com", _apiKey: "your-key" }) |

## Quick Start

Add to your MCP client (Claude Desktop, Cursor, Windsurf, etc.):

```json
{
  "mcpServers": {
    "scrapingdog": {
      "url": "https://gateway.pipeworx.io/scrapingdog/mcp"
    }
  }
}
```

Or connect to the full Pipeworx gateway for access to all 1394+ data sources:

```json
{
  "mcpServers": {
    "pipeworx": {
      "url": "https://gateway.pipeworx.io/mcp"
    }
  }
}
```

## Using with ask_pipeworx

Instead of calling tools directly, you can ask questions in plain English:

```
ask_pipeworx({ question: "your question about Scrapingdog data" })
```

The gateway picks the right tool and fills the arguments automatically.

## More

- [Docs and guides](https://pipeworx.io/docs)
- [pipeworx.io](https://pipeworx.io)

## License

MIT
