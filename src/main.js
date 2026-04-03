import { Client, Databases, Query } from "node-appwrite";

/**
 * Simple Appwrite Function Backend
 * This function handles HTTP requests and interacts with Appwrite database
 */
export default async ({ req, res, log, error }) => {
  // Handle preflight OPTIONS request
  if (req.method === "OPTIONS") {
    return res.empty();
  }

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
  const categoriesCollectionId = process.env.APPWRITE_CATEGORIES_COLLECTION_ID || "categories";
  const tagsCollectionId = process.env.APPWRITE_TAGS_COLLECTION_ID || "tags";

  // Helper function to format post for list view (excludes large content field)
  const formatPostForList = (post) => {
    return {
      id: post.$id,
      clientId: post.clientId,
      title: post.title,
      slug: post.slug,
      excerpt: post.excerpt || null,
      status: post.status,
      featuredImage: post.featuredImage || null,
      categories: post.categories || [],
      tags: post.tags || [],
      publishedAt: post.publishedAt || null,
      createdAt: post.$createdAt,
      updatedAt: post.$updatedAt
    };
  };

  // Helper function to format post for detail view (includes all fields)
  const formatPostForDetail = (post) => {
    return {
      id: post.$id,
      clientId: post.clientId,
      title: post.title,
      slug: post.slug,
      content: post.content,
      excerpt: post.excerpt || null,
      status: post.status,
      featuredImage: post.featuredImage || null,
      metaTitle: post.metaTitle || null,
      metaDescription: post.metaDescription || null,
      categories: post.categories || [],
      tags: post.tags || [],
      publishedAt: post.publishedAt || null,
      createdAt: post.$createdAt,
      updatedAt: post.$updatedAt
    };
  };

  // Helper function to populate category and tags
  const populatePostRelations = async (post) => {
    try {
      // Populate categories (return only id, name, slug, color)
      if (post.categoryIds && Array.isArray(post.categoryIds) && post.categoryIds.length > 0) {
        try {
          const categoryPromises = post.categoryIds.map((categoryId) =>
            databases.getDocument(databaseId, categoriesCollectionId, categoryId)
              .then(cat => ({
                id: cat.$id,
                name: cat.name,
                slug: cat.slug,
                color: cat.color || null
              }))
              .catch(() => null)
          );
          const categories = await Promise.all(categoryPromises);
          post.categories = categories.filter(cat => cat !== null);
        } catch (err) {
          post.categories = [];
        }
      } else {
        post.categories = [];
      }

      // Populate tags (return only id, name, slug)
      if (post.tagIds && Array.isArray(post.tagIds) && post.tagIds.length > 0) {
        try {
          const tagPromises = post.tagIds.map((tagId) =>
            databases.getDocument(databaseId, tagsCollectionId, tagId)
              .then(tag => ({
                id: tag.$id,
                name: tag.name,
                slug: tag.slug
              }))
              .catch(() => null)
          );
          const tags = await Promise.all(tagPromises);
          post.tags = tags.filter(tag => tag !== null);
        } catch (err) {
          post.tags = [];
        }
      } else {
        post.tags = [];
      }

      // Remove the ID fields
      delete post.categoryIds;
      delete post.tagIds;

      return post;
    } catch (err) {
      return post;
    }
  };

  try {
    // Parse request path and method
    const path = req.path || "/";
    const method = req.method || "GET";

    log(`Received ${method} request to ${path}`);

    // Route: GET /posts - Fetch all posts (filtered by clientId)
    if (path === "/posts" && method === "GET") {
      // Get clientId from query parameters or headers
      const clientId = req.query?.clientId || req.headers["x-client-id"];

      if (!clientId) {
        return res.json(
          {
            success: false,
            message:
              "clientId is required. Provide it as query parameter (?clientId=xxx) or header (x-client-id)",
          },
          400,
        );
      }

      const posts = await databases.listDocuments(
        databaseId,
        postsCollectionId,
        [
          Query.equal("clientId", clientId),
          Query.orderDesc("$createdAt"),
          Query.limit(25),
        ],
      );

      // Populate category and tags for each post
      const populatedPosts = await Promise.all(
        posts.documents.map(async (post) => {
          const populated = await populatePostRelations(post);
          return formatPostForList(populated);
        })
      );

      return res.json({
        success: true,
        data: populatedPosts,
        total: posts.total,
        clientId,
      });
    }

    // Route: GET /posts/:id - Fetch single post (validated by clientId)
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

      // Get clientId from query parameters or headers
      const clientId = req.query?.clientId || req.headers["x-client-id"];

      if (!clientId) {
        return res.json(
          {
            success: false,
            message: "clientId is required. Provide it as query parameter (?clientId=xxx) or header (x-client-id)",
          },
          400,
        );
      }

      const post = await databases.getDocument(
        databaseId,
        postsCollectionId,
        postId,
      );

      // Verify the post belongs to the specified client
      if (post.clientId !== clientId) {
        return res.json(
          {
            success: false,
            message: "Post not found or access denied",
          },
          404,
        );
      }

      // Populate category and tags
      const populatedPost = await populatePostRelations(post);
      const formattedPost = formatPostForDetail(populatedPost);

      return res.json({
        success: true,
        data: formattedPost,
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
          { path: "/posts?clientId=xxx", method: "GET", description: "List posts by clientId" },
          { path: "/posts/:id?clientId=xxx", method: "GET", description: "Get single post by clientId" },
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
