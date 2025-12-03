import { NextResponse } from "next/server";
import { initializeSchema, getSchemaStatus, verifyIndexes, rebuildCollectionIndexes } from "~/server/onchaindb/schema";

// Secret key to protect this endpoint - should be set in environment
const SCHEMA_INIT_SECRET = process.env.SCHEMA_INIT_SECRET;

/**
 * POST /api/schema/init
 *
 * Initialize the OnChainDB schema with collections, indexes, and materialized views.
 * Protected by a secret key that must be passed in the Authorization header.
 *
 * Usage:
 *   curl -X POST https://blobcell.com/api/schema/init \
 *     -H "Authorization: Bearer YOUR_SCHEMA_INIT_SECRET"
 */
export async function POST(request: Request) {
  // Verify authorization
  const authHeader = request.headers.get("Authorization");
  const token = authHeader?.replace("Bearer ", "");

  if (!SCHEMA_INIT_SECRET) {
    return NextResponse.json(
      { error: "SCHEMA_INIT_SECRET not configured" },
      { status: 500 }
    );
  }

  if (token !== SCHEMA_INIT_SECRET) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401 }
    );
  }

  try {
    console.log("[Schema Init] Starting schema initialization...");
    const result = await initializeSchema();

    return NextResponse.json({
      success: result.success,
      message: result.success
        ? "Schema initialization complete"
        : "Schema initialization completed with errors",
      collections: result.collections,
      indexes: result.indexes,
      views: result.views,
      errors: result.errors,
    });
  } catch (error) {
    console.error("[Schema Init] Failed:", error);
    return NextResponse.json(
      {
        error: "Schema initialization failed",
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/schema/init
 *
 * Get the current schema status (collections, indexes, views).
 * Also protected by secret key.
 */
export async function GET(request: Request) {
  // Verify authorization
  const authHeader = request.headers.get("Authorization");
  const token = authHeader?.replace("Bearer ", "");

  if (!SCHEMA_INIT_SECRET) {
    return NextResponse.json(
      { error: "SCHEMA_INIT_SECRET not configured" },
      { status: 500 }
    );
  }

  if (token !== SCHEMA_INIT_SECRET) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401 }
    );
  }

  try {
    const [status, indexStatus] = await Promise.all([
      getSchemaStatus(),
      verifyIndexes(),
    ]);

    return NextResponse.json({
      status,
      indexes: indexStatus,
    });
  } catch (error) {
    console.error("[Schema Status] Failed:", error);
    return NextResponse.json(
      {
        error: "Failed to get schema status",
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/schema/init?collection=namespace_repos
 *
 * Rebuild indexes for a specific collection.
 * Use when queries aren't filtering properly due to index issues.
 */
export async function PUT(request: Request) {
  // Verify authorization
  const authHeader = request.headers.get("Authorization");
  const token = authHeader?.replace("Bearer ", "");

  if (!SCHEMA_INIT_SECRET) {
    return NextResponse.json(
      { error: "SCHEMA_INIT_SECRET not configured" },
      { status: 500 }
    );
  }

  if (token !== SCHEMA_INIT_SECRET) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401 }
    );
  }

  const url = new URL(request.url);
  const collection = url.searchParams.get("collection");

  if (!collection) {
    return NextResponse.json(
      { error: "Missing 'collection' query parameter" },
      { status: 400 }
    );
  }

  try {
    console.log(`[Schema Rebuild] Rebuilding indexes for collection: ${collection}`);
    const result = await rebuildCollectionIndexes(collection);

    return NextResponse.json({
      success: result.success,
      message: result.success
        ? `Indexes rebuilt for ${collection}`
        : `Index rebuild completed with errors for ${collection}`,
      dropped: result.dropped,
      created: result.created,
      errors: result.errors,
    });
  } catch (error) {
    console.error("[Schema Rebuild] Failed:", error);
    return NextResponse.json(
      {
        error: "Index rebuild failed",
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
}
