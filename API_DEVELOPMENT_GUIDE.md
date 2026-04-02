# Blog CMS Backend API - Development Guide

## 🎯 Overview

This document provides complete specifications for developing a **REST API backend** for the Blog CMS Frontend. The frontend currently uses Appwrite as BaaS, but this guide will help you build a custom backend API to replace it.

## 📋 Project Context

**Frontend Repository**: blog-cms-frontend (React + TypeScript + Vite)
**Current Backend**: Appwrite (BaaS)
**Target Backend**: Custom REST API (Node.js/Express, Python/FastAPI, or your choice)

### Frontend Tech Stack

- React 19 + TypeScript
- TanStack Query for API calls
- React Hook Form + Zod validation
- TipTap rich text editor
- Wouter for routing

## 🏗️ Architecture Requirements

### Multi-Tenant Architecture

- Each user manages their own isolated blog
- All resources (posts, categories, tags, media) are scoped to a `clientId` (user ID)
- Strict data isolation - users can only access their own data

### Authentication

- Email/password authentication
- JWT-based session management
- Protected routes requiring valid auth tokens

## 📊 Database Schema

### 1. Users Collection/Table

```typescript
interface User {
  id: string; // Primary key (UUID)
  email: string; // Unique, required
  password: string; // Hashed, required
  name: string; // User's display name
  createdAt: Date;
  updatedAt: Date;
}
```

**Indexes**:

- `email` (unique)

---

### 2. Posts Collection/Table

```typescript
interface Post {
  id: string; // Primary key (UUID)
  clientId: string; // Foreign key to User.id (Required)
  title: string; // Required, max 255 chars
  slug: string; // Required, unique per user, URL-friendly
  content: string; // HTML content from TipTap editor
  excerpt: string | null; // Optional short description
  status: "draft" | "published"; // Required, default: 'draft'
  categoryIds: string[]; // Array of category IDs
  tagIds: string[]; // Array of tag IDs
  featuredImage: string | null; // Image URL
  metaTitle: string | null; // SEO meta title
  metaDescription: string | null; // SEO meta description
  publishedAt: Date | null; // Timestamp when published
  createdAt: Date;
  updatedAt: Date;
}
```

**Indexes**:

- `clientId` (for filtering by user)
- `slug` + `clientId` (unique together)
- `status` (for filtering published/draft)
- `publishedAt` (for sorting)

**Relationships**:

- Many-to-many with Categories (via categoryIds)
- Many-to-many with Tags (via tagIds)

---

### 3. Categories Collection/Table

```typescript
interface Category {
  id: string; // Primary key (UUID)
  clientId: string; // Foreign key to User.id (Required)
  name: string; // Required, max 100 chars
  slug: string; // Required, unique per user, URL-friendly
  description: string | null; // Optional
  color: string | null; // Hex color code (e.g., "#3b82f6")
  postCount: number; // Computed/cached count, default: 0
  createdAt: Date;
  updatedAt: Date;
}
```

**Indexes**:

- `clientId`
- `slug` + `clientId` (unique together)

---

### 4. Tags Collection/Table

```typescript
interface Tag {
  id: string; // Primary key (UUID)
  clientId: string; // Foreign key to User.id (Required)
  name: string; // Required, max 50 chars
  slug: string; // Required, unique per user, URL-friendly
  postCount: number; // Computed/cached count, default: 0
  createdAt: Date;
  updatedAt: Date;
}
```

**Indexes**:

- `clientId`
- `slug` + `clientId` (unique together)

---

### 5. Media Collection/Table

```typescript
interface Media {
  id: string; // Primary key (UUID)
  clientId: string; // Foreign key to User.id (Required)
  fileName: string; // Original filename
  fileType: string; // MIME type (e.g., "image/png")
  fileSize: number; // Size in bytes
  fileUrl: string; // Full URL to access the file
  altText: string | null; // Alt text for images
  width: number | null; // Image width in pixels
  height: number | null; // Image height in pixels
  createdAt: Date;
  updatedAt: Date;
}
```

**Indexes**:

- `clientId`
- `fileType` (for filtering by type)

---

### 6. Settings Collection/Table

```typescript
interface Settings {
  id: string; // Primary key (UUID)
  clientId: string; // Foreign key to User.id (Required, unique)
  siteName: string; // Blog name
  siteDescription: string | null;
  customDomain: string | null; // Custom domain URL
  postsPerPage: number; // Default: 10
  dateFormat: string; // e.g., "MMM dd, yyyy"
  timezone: string; // e.g., "America/New_York"
  webhookUrl: string | null; // For triggering rebuilds
  createdAt: Date;
  updatedAt: Date;
}
```

**Indexes**:

- `clientId` (unique)

---

## 🔌 API Endpoints

### Base URL

```
https://api.yourdomain.com/v1
```

### Authentication Endpoints

#### POST /auth/register

Register a new user.

**Request Body**:

```json
{
  "email": "user@example.com",
  "password": "securePassword123",
  "name": "John Doe"
}
```

**Response** (201):

```json
{
  "user": {
    "id": "user-uuid",
    "email": "user@example.com",
    "name": "John Doe",
    "createdAt": "2024-01-01T00:00:00Z"
  },
  "token": "jwt-token-here"
}
```

---

#### POST /auth/login

Login with email and password.

**Request Body**:

```json
{
  "email": "user@example.com",
  "password": "securePassword123"
}
```

**Response** (200):

```json
{
  "user": {
    "id": "user-uuid",
    "email": "user@example.com",
    "name": "John Doe"
  },
  "token": "jwt-token-here"
}
```

---

#### GET /auth/me

Get current authenticated user.

**Headers**:

```
Authorization: Bearer {jwt-token}
```

**Response** (200):

```json
{
  "id": "user-uuid",
  "email": "user@example.com",
  "name": "John Doe",
  "createdAt": "2024-01-01T00:00:00Z"
}
```

---

#### POST /auth/logout

Logout (invalidate token if using token blacklist).

**Headers**:

```
Authorization: Bearer {jwt-token}
```

**Response** (200):

```json
{
  "message": "Logged out successfully"
}
```

---

### Posts Endpoints

#### GET /posts

List all posts for the authenticated user.

**Headers**:

```
Authorization: Bearer {jwt-token}
```

**Query Parameters**:

- `status` (optional): `draft` | `published`
- `categoryId` (optional): Filter by category ID
- `tagId` (optional): Filter by tag ID
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 20)
- `sortBy` (optional): Field to sort by (default: `createdAt`)
- `sortOrder` (optional): `asc` | `desc` (default: `desc`)

**Response** (200):

```json
{
  "posts": [
    {
      "id": "post-uuid",
      "clientId": "user-uuid",
      "title": "My First Blog Post",
      "slug": "my-first-blog-post",
      "content": "<p>Rich HTML content here</p>",
      "excerpt": "A short description",
      "status": "published",
      "categoryIds": ["cat-uuid-1"],
      "tagIds": ["tag-uuid-1", "tag-uuid-2"],
      "featuredImage": "https://cdn.example.com/image.jpg",
      "metaTitle": "My First Post - SEO Title",
      "metaDescription": "SEO description",
      "publishedAt": "2024-01-15T10:00:00Z",
      "createdAt": "2024-01-10T10:00:00Z",
      "updatedAt": "2024-01-15T10:00:00Z"
    }
  ],
  "total": 25,
  "page": 1,
  "limit": 20
}
```

---

#### GET /posts/:id

Get a single post by ID.

**Headers**:

```
Authorization: Bearer {jwt-token}
```

**Response** (200):

```json
{
  "id": "post-uuid",
  "clientId": "user-uuid",
  "title": "My First Blog Post",
  "slug": "my-first-blog-post",
  "content": "<p>Rich HTML content here</p>",
  "excerpt": "A short description",
  "status": "published",
  "categoryIds": ["cat-uuid-1"],
  "tagIds": ["tag-uuid-1", "tag-uuid-2"],
  "featuredImage": "https://cdn.example.com/image.jpg",
  "metaTitle": "My First Post - SEO Title",
  "metaDescription": "SEO description",
  "publishedAt": "2024-01-15T10:00:00Z",
  "createdAt": "2024-01-10T10:00:00Z",
  "updatedAt": "2024-01-15T10:00:00Z"
}
```

---

#### POST /posts

Create a new post.

**Headers**:

```
Authorization: Bearer {jwt-token}
Content-Type: application/json
```

**Request Body**:

```json
{
  "title": "My New Post",
  "slug": "my-new-post",
  "content": "<p>Post content in HTML</p>",
  "excerpt": "Short description",
  "status": "draft",
  "categoryIds": ["cat-uuid-1"],
  "tagIds": ["tag-uuid-1"],
  "featuredImage": "https://cdn.example.com/image.jpg",
  "metaTitle": "SEO Title",
  "metaDescription": "SEO Description",
  "publishedAt": null
}
```

**Response** (201):

```json
{
  "id": "new-post-uuid",
  "clientId": "user-uuid",
  "title": "My New Post",
  "slug": "my-new-post"
  // ... rest of post fields
}
```

**Validation Rules**:

- `title`: Required, 1-255 characters
- `slug`: Required, unique per user, URL-friendly (lowercase, hyphens only)
- `content`: Required
- `status`: Must be `draft` or `published`
- Auto-set `publishedAt` to current time when status changes from `draft` to `published`

---

#### PUT /posts/:id

Update an existing post.

**Headers**:

```
Authorization: Bearer {jwt-token}
Content-Type: application/json
```

**Request Body**: Same as POST /posts

**Response** (200): Updated post object

---

#### DELETE /posts/:id

Delete a post.

**Headers**:

```
Authorization: Bearer {jwt-token}
```

**Response** (200):

```json
{
  "message": "Post deleted successfully"
}
```

---

### Categories Endpoints

#### GET /categories

List all categories for the authenticated user.

**Headers**:

```
Authorization: Bearer {jwt-token}
```

**Response** (200):

```json
{
  "categories": [
    {
      "id": "cat-uuid",
      "clientId": "user-uuid",
      "name": "Technology",
      "slug": "technology",
      "description": "Tech-related posts",
      "color": "#3b82f6",
      "postCount": 12,
      "createdAt": "2024-01-01T00:00:00Z",
      "updatedAt": "2024-01-01T00:00:00Z"
    }
  ]
}
```

---

#### GET /categories/:id

Get a single category.

**Response** (200): Single category object

---

#### POST /categories

Create a new category.

**Request Body**:

```json
{
  "name": "Technology",
  "slug": "technology",
  "description": "Tech posts",
  "color": "#3b82f6"
}
```

**Response** (201): Created category object

---

#### PUT /categories/:id

Update a category.

**Response** (200): Updated category object

---

#### DELETE /categories/:id

Delete a category.

**Response** (200):

```json
{
  "message": "Category deleted successfully"
}
```

---

### Tags Endpoints

#### GET /tags

List all tags.

**Response** (200): Array of tag objects

#### GET /tags/:id

Get a single tag.

#### POST /tags

Create a new tag.

**Request Body**:

```json
{
  "name": "JavaScript",
  "slug": "javascript"
}
```

#### PUT /tags/:id

Update a tag.

#### DELETE /tags/:id

Delete a tag.

---

### Media Endpoints

#### GET /media

List all media files.

**Query Parameters**:

- `fileType` (optional): Filter by MIME type
- `page`, `limit`: Pagination

**Response** (200):

```json
{
  "media": [
    {
      "id": "media-uuid",
      "clientId": "user-uuid",
      "fileName": "image.jpg",
      "fileType": "image/jpeg",
      "fileSize": 245678,
      "fileUrl": "https://cdn.example.com/uploads/image.jpg",
      "altText": "Description",
      "width": 1920,
      "height": 1080,
      "createdAt": "2024-01-01T00:00:00Z",
      "updatedAt": "2024-01-01T00:00:00Z"
    }
  ],
  "total": 50,
  "page": 1,
  "limit": 20
}
```

---

#### POST /media/upload

Upload a file.

**Headers**:

```
Authorization: Bearer {jwt-token}
Content-Type: multipart/form-data
```

**Request Body** (multipart):

```
file: [binary file data]
altText: "Image description" (optional)
```

**Response** (201):

```json
{
  "id": "media-uuid",
  "fileName": "image.jpg",
  "fileType": "image/jpeg",
  "fileSize": 245678,
  "fileUrl": "https://cdn.example.com/uploads/image.jpg",
  "altText": "Description",
  "width": 1920,
  "height": 1080,
  "createdAt": "2024-01-01T00:00:00Z"
}
```

**File Upload Requirements**:

- Max file size: 10MB
- Allowed types: `image/jpeg`, `image/png`, `image/gif`, `image/webp`, `image/svg+xml`, `application/pdf`
- Store files in cloud storage (AWS S3, Google Cloud Storage, etc.)
- Generate unique filenames to prevent collisions
- Extract image dimensions for images

---

#### PUT /media/:id

Update media metadata (alt text).

**Request Body**:

```json
{
  "altText": "Updated description"
}
```

---

#### DELETE /media/:id

Delete a media file (also remove from storage).

---

### Settings Endpoints

#### GET /settings

Get user's settings.

**Response** (200):

```json
{
  "id": "settings-uuid",
  "clientId": "user-uuid",
  "siteName": "My Awesome Blog",
  "siteDescription": "A blog about technology",
  "customDomain": "https://myblog.com",
  "postsPerPage": 10,
  "dateFormat": "MMM dd, yyyy",
  "timezone": "America/New_York",
  "webhookUrl": "https://build-hook.netlify.com/...",
  "createdAt": "2024-01-01T00:00:00Z",
  "updatedAt": "2024-01-01T00:00:00Z"
}
```

---

#### PUT /settings

Update settings (create if doesn't exist).

**Request Body**:

```json
{
  "siteName": "My Blog",
  "siteDescription": "Description",
  "customDomain": "https://myblog.com",
  "postsPerPage": 15,
  "dateFormat": "yyyy-MM-dd",
  "timezone": "UTC",
  "webhookUrl": "https://webhook.com/..."
}
```

---

## 🔒 Security Requirements

### Authentication

- Use **JWT tokens** with reasonable expiration (e.g., 7 days)
- Hash passwords with **bcrypt** (salt rounds: 10+)
- Implement **refresh tokens** for long-lived sessions (optional but recommended)

### Authorization

- **All endpoints** (except `/auth/register` and `/auth/login`) require authentication
- Verify `clientId` matches authenticated user ID for all operations
- Prevent users from accessing/modifying other users' data

### Input Validation

- Validate all input on the server side
- Sanitize HTML content (allow only safe tags)
- Validate slug format (lowercase, hyphens, alphanumeric)
- Limit string lengths as specified in schema
- Validate file types and sizes for uploads

### Rate Limiting

- Implement rate limiting on all endpoints
- Stricter limits on auth endpoints to prevent brute force

### CORS

- Configure CORS to allow requests from frontend domain
- Restrict to specific origins in production

---

## 📝 Business Logic

### Post Count Updates

When a post is created/deleted or categories/tags change:

- Update `postCount` on affected categories
- Update `postCount` on affected tags

### Slug Generation

If slug is not provided or invalid:

- Generate from title: lowercase, replace spaces with hyphens, remove special chars
- Ensure uniqueness per user by appending number if needed

### Published Date

- When status changes from `draft` to `published`, set `publishedAt` to current timestamp if null
- When status changes from `published` to `draft`, keep existing `publishedAt`

### Default Settings

When a user registers, create default settings:

```json
{
  "siteName": "My Blog",
  "siteDescription": "",
  "customDomain": null,
  "postsPerPage": 10,
  "dateFormat": "MMM dd, yyyy",
  "timezone": "UTC",
  "webhookUrl": null
}
```

---

## 🧪 Testing Requirements

### Unit Tests

- Test all CRUD operations
- Test authentication and authorization
- Test input validation
- Test slug generation logic

### Integration Tests

- Test full request/response cycles
- Test multi-tenant data isolation
- Test file upload/delete flows

### Test Coverage

- Aim for 80%+ code coverage

---

## 📦 Recommended Tech Stack Options

### Option 1: Node.js + Express

```
- express: Web framework
- typescript: Type safety
- prisma or typeorm: ORM
- jsonwebtoken: JWT handling
- bcrypt: Password hashing
- multer: File uploads
- sharp: Image processing
- joi or zod: Validation
- PostgreSQL or MongoDB: Database
```

### Option 2: Python + FastAPI

```
- fastapi: Web framework
- sqlalchemy: ORM
- pydantic: Validation
- python-jose: JWT
- passlib: Password hashing
- python-multipart: File uploads
- Pillow: Image processing
- PostgreSQL or MongoDB: Database
```

### Option 3: Go + Gin

```
- gin: Web framework
- gorm: ORM
- jwt-go: JWT handling
- bcrypt: Password hashing
- PostgreSQL or MongoDB: Database
```

---

## 🚀 Deployment Checklist

- [ ] Set up PostgreSQL/MongoDB database
- [ ] Configure environment variables
- [ ] Set up cloud storage for media files (S3, GCS, etc.)
- [ ] Configure CORS for frontend domain
- [ ] Set up SSL/TLS certificates
- [ ] Implement logging and monitoring
- [ ] Set up backup strategy for database
- [ ] Configure rate limiting
- [ ] Deploy to cloud (AWS, GCP, Azure, Heroku, Railway, etc.)
- [ ] Test all endpoints with Postman/Insomnia
- [ ] Load testing with expected traffic

---

## 📞 Frontend Integration

The frontend uses **TanStack Query** for API calls. Here's the expected pattern:

```typescript
// Example: Fetch posts
const { data: posts } = useQuery({
  queryKey: ["posts", filters],
  queryFn: async () => {
    const response = await fetch(`${API_URL}/posts?status=published`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    return response.json();
  },
});
```

You'll need to update the frontend hooks (`use-posts.ts`, `use-categories.ts`, etc.) to call your custom API instead of Appwrite.

---

## 📚 Additional Resources

- **Frontend Repository**: Review `src/hooks/*.ts` files to understand data requirements
- **Schema Details**: Check collection interfaces in hook files for exact field names
- **Form Validation**: See `src/pages/*.tsx` for Zod schemas used in forms

---

## ✅ Getting Started

1. **Choose your tech stack** (Node.js/Python/Go)
2. **Set up the database** with the schema above
3. **Implement authentication** endpoints first
4. **Build CRUD endpoints** for posts, categories, tags
5. **Implement file upload** for media
6. **Add settings** endpoints
7. **Test thoroughly** with multi-tenant scenarios
8. **Update frontend** to use your API
9. **Deploy** and celebrate! 🎉

---

**Questions or need clarification?** Reference the frontend code in `src/hooks/` for exact data structures and expected behavior.

**Good luck building the API!** 🚀
