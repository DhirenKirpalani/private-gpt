# Knowledge Base Module — Architecture Summary

## Overview
The Knowledge Base transforms raw company documents into AI-retrievable knowledge through a multi-stage pipeline: Upload → Process → Chunk → Embed → Index → Search.

## Multi-Tenant Design
- Every resource scoped to `workspace_id`
- RLS policies enforce workspace isolation at the database level
- Storage paths: `knowledge-base/{workspace_id}/{category}/{filename}`
- AI answers only from documents belonging to the user's workspace

## Database Schema

### Tables
| Table | Purpose |
|---|---|
| `knowledge_categories` | Document categories (6 defaults + custom) |
| `documents` | File metadata, status, extracted info |
| `document_contents` | Extracted raw and normalized text |
| `document_chunks` | 800-token chunks with 150-token overlap |
| `document_embeddings` | 1536-dim vectors via `pgvector` |

### Key Indexes
- `documents`: workspace_id, status, category_id, created_at, full-text search (GIN)
- `document_embeddings`: IVFFlat + HNSW vector indexes, workspace_id composite

## Document Lifecycle
```
UPLOADING → PROCESSING → INDEXING → INDEXED
                ↓            ↓
              FAILED      FAILED
```
- Max 3 retries with exponential backoff
- Real-time status updates via Supabase subscriptions

## File Support
PDF, DOC/DOCX, TXT, MD, HTML, JSON, XML, CSV, XLSX, PPTX, EPUB. Max 50 MB.

## RAG Retrieval
SQL function `match_document_chunks(query_embedding, workspace_uuid, threshold, count)`:
- Cosine similarity search via pgvector
- Returns chunk content, document title, page number, similarity score
- Strictly filtered by workspace_id

## AI Chat Flow
1. Generate embedding from user query
2. Vector search for top-k chunks
3. Build context with citations (document name, page, similarity %)
4. Generate answer restricted to retrieved context

## Security
- Row Level Security on all tables
- Storage policies restrict access to workspace folder
- Soft deletes only (members can delete own; admins can hard delete)
- Default categories cannot be deleted

## Scalability
- Designed for 10K workspaces / 1M documents / 100M chunks
- Batch embedding generation (100 chunks per batch)
- Background worker queue with retry and dead-letter queue
- Partitioning strategy for document_chunks by workspace_id
- Caching layer for frequently accessed documents

## Analytics Tracked
- Documents uploaded, indexed, failed
- Storage usage per workspace
- Average indexing time
- Search volume and top documents
- AI retrieval success rate
