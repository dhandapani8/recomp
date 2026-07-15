#!/usr/bin/env node

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";

const apiKey = process.env.RECOMP_API_KEY;
const apiBaseUrl = process.env.RECOMP_API_URL ?? "http://127.0.0.1:3101";

function snapshotUrl() {
  const url = new URL("/api/v1/snapshot", apiBaseUrl);
  const isLoopback = ["127.0.0.1", "::1", "localhost"].includes(url.hostname);

  if (url.protocol !== "https:" && !(url.protocol === "http:" && isLoopback)) {
    throw new Error("RECOMP_API_URL must use HTTPS unless it points to localhost.");
  }

  return url;
}

if (!apiKey) {
  console.error("RECOMP_API_KEY is required for the Recomp MCP server.");
  process.exit(1);
}

const server = new McpServer({
  name: "recomp",
  version: "0.1.0",
});

server.registerTool(
  "recomp_snapshot",
  {
    title: "Read Recomp snapshot",
    description:
      "Read the user's current Recomp profile, nutrition targets, trend, and recent activity. Read-only; it never changes health data.",
    annotations: {
      readOnlyHint: true,
      destructiveHint: false,
      openWorldHint: false,
    },
  },
  async () => {
    try {
      const response = await fetch(snapshotUrl(), {
        headers: { Authorization: `Bearer ${apiKey}` },
        redirect: "error",
        signal: AbortSignal.timeout(10_000),
      });

      if (!response.ok) {
        return {
          content: [
            {
              type: "text",
              text: `Recomp API request failed (${response.status}). Check that Recomp is running and the API key matches.`,
            },
          ],
          isError: true,
        };
      }

      const snapshot = await response.json();
      return {
        content: [{ type: "text", text: JSON.stringify(snapshot, null, 2) }],
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      return {
        content: [{ type: "text", text: `Recomp API is unavailable: ${message}` }],
        isError: true,
      };
    }
  },
);

await server.connect(new StdioServerTransport());
