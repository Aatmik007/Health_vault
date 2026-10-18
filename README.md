# HealthVault

> Personal medical document intelligence and retrieval system that allows users to securely organize, search, compare, and ask grounded questions about their own medical documents.

---

## 1. Problem Statement
Medical documents are typically scattered across physical paper, email attachments, portals, PDFs, and scanned photos. Finding a specific blood test value, prescription instruction, or historical diagnostic metric across dozens of documents is tedious and error-prone.

HealthVault solves this by providing a single, secure workspace where users can upload medical files (PDFs, lab reports, prescriptions, scanned images), automatically extract and chunk page-aware text, perform OCR on scanned pages, view documents on a chronological timeline, compare reports side-by-side, and ask natural language questions grounded strictly in their own documents with verifiable page-level citations.

---

## 2. Key Features

- **Authentication & Security**: JWT-based authentication, bcryptjs password hashing, strict user isolation across all database queries and vector searches (IDOR protection).
- **Document Management & File Support**: Upload PDFs and images (`.jpg`, `.jpeg`, `.png`) up to 10MB.
- **Page-Aware PDF & OCR Extraction**: Native page-by-page text extraction (`pdf-parse`) with automatic Tesseract.js OCR fallback for scanned pages and medical photos.
- **Document Chunking**: Structured page-aware chunking (2400 char chunk size / 400 char overlap) stored in MongoDB (`DocumentChunk`).
- **Gemini Embeddings & Vector DB**: Generates 768-dimensional vector embeddings (`text-embedding-004`) and synchronizes with Pinecone vector database using metadata filters.
- **RAG Semantic Retrieval & Grounded Q&A**: Semantic vector search with dual-layer user isolation, feeding relevant chunks into Gemini (`gemini-1.5-flash`) for factual, zero-hallucination answers.
- **Source Citations & Document Navigation**: Expandable chunk previews on the Assistant page with one-click **[ View Source ]** navigation to target pages (`/documents/:id?page=X`).
- **Medical Document Timeline**: Chronological view of documents sorted by document date with category and date range filters.
- **Side-by-Side Report Comparison**: Objective comparative engine identifying common test metrics (values, units, page citations) and unique items between two reports without diagnostic claims.

---

## 3. Technology Stack

| Layer | Technology |
| :--- | :--- |
| **Frontend** | React (Vite SPA), React Router DOM, Axios |
| **Backend** | Node.js, Express.js |
| **Database** | MongoDB, Mongoose ODM |
| **Authentication** | JSON Web Tokens (JWT), bcryptjs |
| **OCR Engine** | Tesseract.js, `pdf-export-images` |
| **AI / Embeddings** | Google Gemini API (`text-embedding-004`, `gemini-1.5-flash`) |
| **Vector Database** | Pinecone Vector DB |
| **Security Middleware** | `helmet`, `express-rate-limit`, CORS origin control |
| **Testing** | Node.js custom test suites (`test_e2e_full.js`, `test_security.js`) |

---

## 4. Getting Started

### Backend Setup
```bash
cd backend
npm install
npm run dev
```

### Frontend Setup
```bash
cd frontend
npm install
npm run dev
```


🚀 **Live Application:** [HealthVault Web App](https://health-vault-git-main-aatmik2806-8502s-projects.vercel.app)  
🖥️ **Backend API:** `https://health-vault-txdn.onrender.com`

---

## 🔑 Quick Demo & Testing Instructions (For Reviewers & Interviewers)

To test the live application without needing access to a restricted email inbox, you can use the **Universal Demo OTP**:

1. Open the [Live Application](https://health-vault-git-main-aatmik2806-8502s-projects.vercel.app).
2. Go to **Sign Up** and register with any email address.
3. When prompted on the **Verify Email** screen, enter the universal test verification code:
   ```text
   123456


