import { Client, Databases, Query } from "node-appwrite";

/**
 * Simple Appwrite Function Backend
 * This function handles HTTP requests and interacts with Appwrite database
 */
export default async ({ req, res, log, error }) => {
  // Initialize Appwrite client
  const client = new Client()
    .setEndpoint(
      process.env.APPWRITE_ENDPOINT || "https://cloud.appwrite.io/v1",
    )
    .setProject(process.env.APPWRITE_PROJECT_ID || "")
    .setKey(process.env.APPWRITE_API_KEY || "");

  const databases = new Databases(client);

  // Get database and collection IDs from environment
  const databaseId = process.env.APPWRITE_DATABASE_ID || "";
  const postsCollectionId = process.env.APPWRITE_POSTS_COLLECTION_ID || "posts";

  try {
    // Parse request path and method
    const path = req.path || "/";
    const method = req.method || "GET";

    log(`Received ${method} request to ${path}`);

    // Route: GET /posts - Fetch all posts
    if (path === "/posts" && method === "GET") {
      const posts = await databases.listDocuments(
        databaseId,
        postsCollectionId,
        [Query.orderDesc("$createdAt"), Query.limit(25)],
      );

      return res.json({
        success: true,
        data: posts.documents,
        total: posts.total,
      });
    }

    // Route: GET /posts/:id - Fetch single post
    if (path.startsWith("/posts/") && method === "GET") {
      const postId = path.split("/")[2];

      if (!postId) {
        return res.json(
          {
            success: false,
            message: "Post ID is required",
          },
          400,
        );
      }

      const post = await databases.getDocument(
        databaseId,
        postsCollectionId,
        postId,
      );

      return res.json({
        success: true,
        data: post,
      });
    }

    // Route: GET /health - Health check
    if (path === "/health" && method === "GET") {
      return res.json({
        success: true,
        message: "Appwrite Function is healthy",
        timestamp: new Date().toISOString(),
      });
    }

    // Default route
    if (path === "/" && method === "GET") {
      return res.json({
        success: true,
        message: "Blog CMS Appwrite Function",
        version: "1.0.0",
        endpoints: [
          { path: "/", method: "GET", description: "API information" },
          { path: "/health", method: "GET", description: "Health check" },
          { path: "/posts", method: "GET", description: "List all posts" },
          { path: "/posts/:id", method: "GET", description: "Get single post" },
        ],
      });
    }

    // 404 - Route not found
    return res.json(
      {
        success: false,
        message: "Route not found",
        path,
        method,
      },
      404,
    );
  } catch (err) {
    error("Function execution failed: " + err.message);

    return res.json(
      {
        success: false,
        message: "Internal server error",
        error: process.env.NODE_ENV === "development" ? err.message : undefined,
      },
      500,
    );
  }
};
