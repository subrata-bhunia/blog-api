# Blog CMS Appwrite Function

A simple serverless Appwrite Function backend for the Blog CMS that handles blog posts and integrates with Appwrite Database.

## Features

- Serverless Appwrite Function architecture
- RESTful API endpoints for blog posts
- Appwrite Database integration
- Health check endpoint
- Automatic error handling
- Environment-based configuration

## API Endpoints

| Method | Path         | Description                                              |
| ------ | ------------ | -------------------------------------------------------- |
| GET    | `/`          | API information and available endpoints                  |
| GET    | `/health`    | Health check endpoint                                    |
| GET    | `/posts`     | List all posts (limited to 25, ordered by creation date) |
| GET    | `/posts/:id` | Get a single post by ID                                  |

## Setup

### 1. Install Dependencies

```bash
cd appwrite-function
npm install
```

### 2. Configure Environment Variables

Copy `.env.example` to `.env` and update with your Appwrite credentials:

```bash
cp .env.example .env
```

Update the values:

- `APPWRITE_ENDPOINT`: Your Appwrite endpoint (default: https://cloud.appwrite.io/v1)
- `APPWRITE_PROJECT_ID`: Your Appwrite project ID
- `APPWRITE_API_KEY`: Your Appwrite API key with appropriate permissions
- `APPWRITE_DATABASE_ID`: Your database ID
- `APPWRITE_POSTS_COLLECTION_ID`: Your posts collection ID

### 3. Deploy to Appwrite

#### Using Appwrite CLI

1. Install Appwrite CLI:

```bash
npm install -g appwrite-cli
```

2. Login to Appwrite:

```bash
appwrite login
```

3. Initialize the function:

```bash
appwrite init function
```

4. Deploy the function:

```bash
appwrite deploy function
```

#### Manual Deployment via Appwrite Console

1. Go to your Appwrite Console
2. Navigate to Functions
3. Click "Create Function"
4. Choose "Node.js" runtime (18.0 or higher)
5. Upload your function code
6. Set environment variables in the function settings
7. Set the entrypoint to `src/main.js`
8. Deploy the function

### 4. Configure Function Settings

In the Appwrite Console, configure:

- **Execute Access**: Set appropriate permissions (e.g., "Any" for public access)
- **Environment Variables**: Add all variables from your `.env` file
- **Events**: Optional - configure events to trigger the function
- **Schedule**: Optional - set up CRON jobs if needed

## Local Development

For local testing, you can use the Appwrite CLI:

```bash
appwrite run function --functionId YOUR_FUNCTION_ID
```

Or test individual endpoints using the Appwrite SDK.

## Environment Variables Required

```
APPWRITE_ENDPOINT=https://cloud.appwrite.io/v1
APPWRITE_PROJECT_ID=your-project-id
APPWRITE_API_KEY=your-api-key
APPWRITE_DATABASE_ID=your-database-id
APPWRITE_POSTS_COLLECTION_ID=posts
NODE_ENV=production
```

## Response Format

All endpoints return JSON responses in the following format:

### Success Response

```json
{
  "success": true,
  "data": {
    /* response data */
  },
  "message": "Optional message"
}
```

### Error Response

```json
{
  "success": false,
  "message": "Error message",
  "error": "Detailed error (development only)"
}
```

## Example Usage

### Get all posts

```bash
curl https://your-appwrite-endpoint/functions/YOUR_FUNCTION_ID/posts
```

### Get single post

```bash
curl https://your-appwrite-endpoint/functions/YOUR_FUNCTION_ID/posts/POST_ID
```

### Health check

```bash
curl https://your-appwrite-endpoint/functions/YOUR_FUNCTION_ID/health
```

## Extending the Function

To add more endpoints, edit `src/main.js` and add new route handlers:

```javascript
// Example: POST /posts
if (path === "/posts" && method === "POST") {
  const data = JSON.parse(req.body);

  const post = await databases.createDocument(
    databaseId,
    postsCollectionId,
    "unique()",
    data,
  );

  return res.json({
    success: true,
    data: post,
  });
}
```

## Security Notes

- Never commit `.env` files with actual credentials
- Use appropriate Appwrite permissions for your collections
- Validate and sanitize all user inputs
- Use API keys with minimal required permissions
- Enable CORS only for trusted domains in production

## Troubleshooting

### Function not executing

- Check function logs in Appwrite Console
- Verify environment variables are set correctly
- Ensure API key has necessary permissions

### Database connection issues

- Verify database ID and collection IDs
- Check API key permissions for database access
- Ensure collections exist in your Appwrite database

## License

MIT
