# HealthVault Database Documentation

HealthVault uses MongoDB (via Mongoose ODM) as its primary, authoritative source of truth for user accounts, document metadata, extracted text, and document chunks.

---

## 1. Entity-Relationship Model

```text
┌─────────────────┐             ┌─────────────────┐             ┌─────────────────────┐
│      User       │  1       N  │    Document     │  1       N  │    DocumentChunk    │
├─────────────────┤────────────►├─────────────────┤────────────►├─────────────────────┤
│ _id             │             │ _id             │             │ _id                 │
│ name            │             │ userId (Ref)    │             │ documentId (Ref)    │
│ email           │             │ originalName    │             │ userId (Ref)        │
│ password        │             │ documentType    │             │ chunkIndex          │
│ createdAt       │             │ documentDate    │             │ pageNumber          │
└─────────────────┘             │ extractedText[] │             │ text                │
                                │ ocrStatus       │             │ characterCount      │
                                │ ocrUsed         │             └─────────────────────┘
                                └─────────────────┘
```

---

## 2. Schema Specifications

### `User` Collection (`models/User.js`)
- **`_id`**: ObjectId (Primary Key)
- **`name`**: String (Required, trimmed)
- **`email`**: String (Required, unique index, normalized lowercase)
- **`password`**: String (Required, bcryptjs hash)
- **`timestamps`**: `createdAt`, `updatedAt`

### `Document` Collection (`models/Document.js`)
- **`_id`**: ObjectId (Primary Key)
- **`userId`**: ObjectId (Ref: `User`, Indexed)
- **`originalName`**: String (Original upload filename)
- **`storedFileName`**: String (Unique server storage name)
- **`filePath`**: String (Relative path on server storage)
- **`mimeType`**: String (`application/pdf`, `image/jpeg`, `image/png`)
- **`fileSize`**: Number (Bytes)
- **`documentType`**: Enum (`Lab Report`, `Prescription`, `Discharge Summary`, `Consultation Note`, `Imaging Report`, `Other`)
- **`documentDate`**: Date (Default: upload date)
- **`extractionStatus`**: Enum (`pending`, `processing`, `completed`, `failed`)
- **`extractedText`**: Array of Page Objects `[{ pageNumber: Number, text: String }]`
- **`ocrStatus`**: Enum (`not_required`, `pending`, `processing`, `completed`, `failed`)
- **`ocrUsed`**: Boolean (Default: `false`)
- **`chunkingStatus`**, **`embeddingStatus`**, **`vectorStatus`**: Stage status enums
- **`chunkCount`**, **`vectorCount`**: Metrics counters

### `DocumentChunk` Collection (`models/DocumentChunk.js`)
- **`_id`**: ObjectId (Primary Key)
- **`documentId`**: ObjectId (Ref: `Document`, Indexed)
- **`userId`**: ObjectId (Ref: `User`, Indexed)
- **`chunkIndex`**: Number (0-indexed position)
- **`pageNumber`**: Number (1-indexed page number)
- **`text`**: String (Chunk content text)
- **`characterCount`**: Number

---

## 3. Why MongoDB is the Source of Truth

While Pinecone indexes vector embeddings for similarity search, MongoDB remains the authoritative source of truth because:
1. **Data Completeness**: MongoDB holds complete document metadata, raw extracted text, user ownership records, and authentication data.
2. **Access Control**: MongoDB enforces strict user ownership checks (`userId: req.user._id`) before serving chunk text or physical file streams.
3. **Decoupled Architecture**: If vector database connections fail, document viewing, extraction text inspection, timeline ordering, and report comparisons remain functional.
