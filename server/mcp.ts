import { serveStdio } from "@modelcontextprotocol/server/stdio";
import { config } from "./config.js";
import { createFacetMcpServer } from "./mcp-server.js";
import { ProfileStore } from "./store.js";

const store = new ProfileStore(config.dataFile);
await store.initialize();

serveStdio(() => createFacetMcpServer(store), {
  onerror: (error) => console.error("Facet MCP error:", error.message),
});

console.error("Facet MCP server is ready on stdio.");

