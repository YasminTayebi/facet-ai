import { Client, InMemoryTransport } from "@modelcontextprotocol/client";
import { afterEach, describe, expect, it } from "vitest";
import { createFacetMcpServer } from "../server/mcp-server.js";
import { ProfileStore } from "../server/store.js";

describe("Facet MCP server", () => {
  const connections: Array<{ client: Client; server: ReturnType<typeof createFacetMcpServer> }> = [];

  afterEach(async () => {
    await Promise.all(connections.splice(0).map(async ({ client, server }) => {
      await client.close();
      await server.close();
    }));
  });

  const connect = async () => {
    const server = createFacetMcpServer(new ProfileStore());
    const client = new Client({ name: "facet-test", version: "1.0.0" });
    const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
    await server.connect(serverTransport);
    await client.connect(clientTransport);
    connections.push({ client, server });
    return client;
  };

  it("advertises read-only profile intelligence tools", async () => {
    const client = await connect();
    const result = await client.listTools();
    expect(result.tools.map((tool) => tool.name)).toEqual([
      "search_published_profiles",
      "get_profile_evidence",
      "analyze_profile_evidence",
    ]);
    expect(result.tools.every((tool) => tool.annotations?.readOnlyHint)).toBe(true);
  });

  it("searches published profiles and never exposes drafts", async () => {
    const client = await connect();
    const result = await client.callTool({
      name: "search_published_profiles",
      arguments: { query: "evaluation", workStyle: "", limit: 10 },
    });
    const text = result.content.find((item) => item.type === "text");
    expect(text?.type).toBe("text");
    if (text?.type !== "text") throw new Error("Expected text result");
    const payload = JSON.parse(text.text) as { count: number; profiles: Array<{ name: string }> };
    expect(payload.count).toBe(1);
    expect(payload.profiles[0].name).toBe("Leon Weber");
  });

  it("provides evidence gaps without producing a hiring recommendation", async () => {
    const client = await connect();
    const result = await client.callTool({
      name: "analyze_profile_evidence",
      arguments: { profileId: "profile_leon" },
    });
    const text = result.content.find((item) => item.type === "text");
    if (text?.type !== "text") throw new Error("Expected text result");
    expect(text.text).toContain("suggestedQuestion");
    expect(text.text).toContain("not a candidate ranking");
  });
});
