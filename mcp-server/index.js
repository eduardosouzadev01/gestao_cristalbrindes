import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.SUPABASE_URL || "";
const SUPABASE_KEY = process.env.SUPABASE_KEY || "";

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error("Missing SUPABASE_URL or SUPABASE_KEY environment variables");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const server = new Server(
  { name: "supabase-mcp", version: "1.0.0" },
  { capabilities: { tools: {} } }
);

server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [
    {
      name: "supabase_query",
      description: "Execute a read query on Supabase (SELECT). Returns rows.",
      inputSchema: {
        type: "object",
        properties: {
          table: { type: "string", description: "Table name" },
          select: {
            type: "string",
            description: "Columns to select, e.g. '*', 'id,name'",
            default: "*",
          },
          filters: {
            type: "array",
            items: {
              type: "object",
              properties: {
                column: { type: "string" },
                operator: {
                  type: "string",
                  enum: ["eq", "neq", "gt", "gte", "lt", "lte", "like", "ilike", "in", "is"],
                },
                value: {},
              },
            },
            description: "Array of filter conditions",
          },
          limit: { type: "number", description: "Max rows to return" },
          order: {
            type: "object",
            properties: {
              column: { type: "string" },
              ascending: { type: "boolean", default: false },
            },
          },
        },
        required: ["table"],
      },
    },
    {
      name: "supabase_insert",
      description: "Insert rows into a Supabase table.",
      inputSchema: {
        type: "object",
        properties: {
          table: { type: "string", description: "Table name" },
          rows: {
            type: "array",
            items: { type: "object" },
            description: "Array of rows to insert",
          },
        },
        required: ["table", "rows"],
      },
    },
    {
      name: "supabase_update",
      description: "Update rows in a Supabase table.",
      inputSchema: {
        type: "object",
        properties: {
          table: { type: "string", description: "Table name" },
          updates: { type: "object", description: "Column: value pairs to update" },
          filters: {
            type: "array",
            items: {
              type: "object",
              properties: {
                column: { type: "string" },
                operator: {
                  type: "string",
                  enum: ["eq", "neq", "gt", "gte", "lt", "lte", "like", "ilike", "in", "is"],
                },
                value: {},
              },
            },
            description: "Filter conditions",
          },
        },
        required: ["table", "updates"],
      },
    },
    {
      name: "supabase_delete",
      description: "Delete rows from a Supabase table.",
      inputSchema: {
        type: "object",
        properties: {
          table: { type: "string", description: "Table name" },
          filters: {
            type: "array",
            items: {
              type: "object",
              properties: {
                column: { type: "string" },
                operator: {
                  type: "string",
                  enum: ["eq", "neq", "gt", "gte", "lt", "lte", "like", "ilike", "in", "is"],
                },
                value: {},
              },
            },
            description: "Filter conditions",
          },
        },
        required: ["table"],
      },
    },
    {
      name: "supabase_rpc",
      description: "Call a Supabase RPC function.",
      inputSchema: {
        type: "object",
        properties: {
          function: { type: "string", description: "RPC function name" },
          params: {
            type: "object",
            description: "Parameters to pass to the function",
          },
        },
        required: ["function"],
      },
    },
  ],
}));

const VALID_OPERATORS = ["eq", "neq", "gt", "gte", "lt", "lte", "like", "ilike", "in", "is"];

function buildQuery(query, filters) {
  if (!filters) return query;
  for (const f of filters) {
    if (!VALID_OPERATORS.includes(f.operator)) {
      throw new Error(`Invalid operator: ${f.operator}`);
    }
    if (f.operator === "in") {
      query = query.in(f.column, f.value);
    } else if (f.operator === "is") {
      query = query.is(f.column, f.value);
    } else {
      query = query[f.operator](f.column, f.value);
    }
  }
  return query;
}

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    switch (name) {
      case "supabase_query": {
        let query = supabase
          .from(args.table)
          .select(args.select || "*");

        query = buildQuery(query, args.filters);
        if (args.limit) query = query.limit(args.limit);
        if (args.order) query = query.order(args.order.column, { ascending: args.order.ascending ?? false });

        const { data, error } = await query;
        if (error) throw new Error(error.message);
        return {
          content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
        };
      }

      case "supabase_insert": {
        const { data, error } = await supabase
          .from(args.table)
          .insert(args.rows)
          .select();
        if (error) throw new Error(error.message);
        return {
          content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
        };
      }

      case "supabase_update": {
        let query = supabase.from(args.table).update(args.updates);
        query = buildQuery(query, args.filters);
        const { data, error } = await query.select();
        if (error) throw new Error(error.message);
        return {
          content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
        };
      }

      case "supabase_delete": {
        let query = supabase.from(args.table).delete();
        query = buildQuery(query, args.filters);
        const { data, error } = await query;
        if (error) throw new Error(error.message);
        return {
          content: [{ type: "text", text: "Deleted successfully" }],
        };
      }

      case "supabase_rpc": {
        const { data, error } = await supabase.rpc(args.function, args.params);
        if (error) throw new Error(error.message);
        return {
          content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
        };
      }

      default:
        throw new Error("Unknown tool: " + name);
    }
  } catch (error) {
    return {
      isError: true,
      content: [{ type: "text", text: error.message }],
    };
  }
});

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch(console.error);
