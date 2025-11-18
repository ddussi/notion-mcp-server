import express, { Request, Response, NextFunction } from "express";
import cors from "cors";
import dotenv from "dotenv";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { Client } from "@notionhq/client";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Notion client setup
const notion = new Client({
  auth: process.env.NOTION_API_KEY,
});

// Transport storage for multiple connections
const transports: { [sessionId: string]: SSEServerTransport } = {};

// User permissions
interface UserPermissions {
  allowedDatabases?: string[]; // If empty, allow all
  allowedPages?: string[]; // If empty, allow all
}

interface User {
  name: string;
  apiKey: string;
  permissions: UserPermissions;
  createdAt: string;
}

// Load users from file
function loadUsers(): { [apiKey: string]: UserPermissions } {
  const usersFile = path.join(__dirname, "..", "users.json");

  if (!fs.existsSync(usersFile)) {
    console.warn("⚠️  users.json not found. Run 'npm run manage-users add <name>' to add users.");
    return {};
  }

  const data = fs.readFileSync(usersFile, "utf-8");
  const users: User[] = JSON.parse(data);

  const permissions: { [apiKey: string]: UserPermissions } = {};
  users.forEach((user) => {
    permissions[user.apiKey] = user.permissions;
  });

  return permissions;
}

const userPermissions = loadUsers();

// Authentication middleware
function authenticate(req: Request, res: Response, next: NextFunction) {
  const apiKey = req.headers["x-api-key"] as string;

  if (!apiKey || !userPermissions[apiKey]) {
    res.status(401).json({ error: "Unauthorized: Invalid API key" });
    return;
  }

  // Attach permissions to request
  (req as any).userPermissions = userPermissions[apiKey];
  next();
}

// Permission check helper
function hasPermission(
  permissions: UserPermissions,
  resourceType: "page" | "database",
  resourceId: string
): boolean {
  if (resourceType === "database") {
    if (!permissions.allowedDatabases || permissions.allowedDatabases.length === 0) {
      return true; // No restrictions
    }
    return permissions.allowedDatabases.includes(resourceId);
  }

  if (resourceType === "page") {
    if (!permissions.allowedPages || permissions.allowedPages.length === 0) {
      return true; // No restrictions
    }
    return permissions.allowedPages.includes(resourceId);
  }

  return false;
}

// Create MCP server
function createMCPServer() {
  const server = new Server(
    {
      name: "notion-mcp-server",
      version: "1.0.0",
    },
    {
      capabilities: {
        tools: {},
      },
    }
  );

  // List available tools (Read-only)
  server.setRequestHandler(ListToolsRequestSchema, async () => {
    return {
      tools: [
        {
          name: "notion_search",
          description: "Search for pages in Notion workspace",
          inputSchema: {
            type: "object",
            properties: {
              query: {
                type: "string",
                description: "Search query text",
              },
            },
            required: ["query"],
          },
        },
        {
          name: "notion_get_page",
          description: "Get a specific Notion page by ID",
          inputSchema: {
            type: "object",
            properties: {
              page_id: {
                type: "string",
                description: "The ID of the page to retrieve",
              },
            },
            required: ["page_id"],
          },
        },
        {
          name: "notion_query_database",
          description: "Query a Notion database (read-only)",
          inputSchema: {
            type: "object",
            properties: {
              database_id: {
                type: "string",
                description: "The ID of the database to query",
              },
              filter: {
                type: "object",
                description: "Optional filter object (Notion API format)",
              },
            },
            required: ["database_id"],
          },
        },
      ],
    };
  });

  // Tool execution handler
  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;

    if (!args) {
      throw new Error("Missing arguments");
    }

    // Get user permissions from request context
    const permissions = (request as any).userPermissions as UserPermissions;

    try {
      switch (name) {
        case "notion_search": {
          const response = await notion.search({
            query: args.query as string,
            filter: {
              property: "object",
              value: "page",
            },
          });

          // Filter results based on permissions
          const filteredResults = response.results.filter((page: any) => {
            return hasPermission(permissions, "page", page.id);
          });

          return {
            content: [
              {
                type: "text",
                text: JSON.stringify(filteredResults, null, 2),
              },
            ],
          };
        }

        case "notion_get_page": {
          const pageId = args.page_id as string;

          // Check permission
          if (!hasPermission(permissions, "page", pageId)) {
            return {
              content: [
                {
                  type: "text",
                  text: "Error: You don't have permission to access this page",
                },
              ],
              isError: true,
            };
          }

          const page = await notion.pages.retrieve({
            page_id: pageId,
          });

          const blocks = await notion.blocks.children.list({
            block_id: pageId,
          });

          return {
            content: [
              {
                type: "text",
                text: JSON.stringify({ page, blocks: blocks.results }, null, 2),
              },
            ],
          };
        }

        case "notion_query_database": {
          const databaseId = args.database_id as string;

          // Check permission
          if (!hasPermission(permissions, "database", databaseId)) {
            return {
              content: [
                {
                  type: "text",
                  text: "Error: You don't have permission to access this database",
                },
              ],
              isError: true,
            };
          }

          const response = await notion.databases.query({
            database_id: databaseId,
            filter: args.filter as any,
          });

          return {
            content: [
              {
                type: "text",
                text: JSON.stringify(response.results, null, 2),
              },
            ],
          };
        }

        default:
          throw new Error(`Unknown tool: ${name}`);
      }
    } catch (error: any) {
      return {
        content: [
          {
            type: "text",
            text: `Error: ${error.message}`,
          },
        ],
        isError: true,
      };
    }
  });

  return server;
}

// Express app setup
const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Health check endpoint
app.get("/health", (req, res) => {
  res.json({ status: "ok", message: "Notion MCP Server is running" });
});

// SSE endpoint (GET) - Client opens connection
app.get("/mcp/sse", authenticate, async (req, res) => {
  const permissions = (req as any).userPermissions;

  const transport = new SSEServerTransport("/mcp/messages", res);
  transports[transport.sessionId] = transport;

  // Attach permissions to transport for later use
  (transport as any).userPermissions = permissions;

  res.on("close", () => {
    delete transports[transport.sessionId];
    console.log(`Session closed: ${transport.sessionId}`);
  });

  const server = createMCPServer();

  // Attach permissions to server context
  (server as any).userPermissions = permissions;

  await server.connect(transport);
  console.log(`New connection: ${transport.sessionId}`);
});

// Messages endpoint (POST) - Client sends messages
app.post("/mcp/messages", authenticate, async (req, res) => {
  const sessionId = req.query.sessionId as string;
  const transport = transports[sessionId];

  if (!transport) {
    res.status(404).json({ error: "Session not found" });
    return;
  }

  // Attach permissions to request
  (req.body as any).userPermissions = (req as any).userPermissions;

  await transport.handlePostMessage(req, res);
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Notion MCP Server running on http://localhost:${PORT}`);
  console.log(`📡 MCP endpoint: http://localhost:${PORT}/mcp/sse`);
  console.log(`💡 Health check: http://localhost:${PORT}/health`);
});
