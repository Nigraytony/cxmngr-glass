## Documents feature (Azure Blob Storage)

This app’s Documents feature stores **file bytes in Azure Blob Storage** (private container) and stores **metadata only in MongoDB**.

### Required env vars (backend)

- `DOCS_BLOB_CONTAINER` — Azure Blob container name (must exist; should be private), e.g. `cxmngr-docs`
- `AZURE_STORAGE_CONNECTION_STRING` — **account-key** connection string containing `AccountName=...` and `AccountKey=...`
  - SAS-only connection strings are not supported by this implementation.

Optional:
- `DOCS_ALLOWED_CONTENT_TYPES` — comma-separated list (defaults to jpg/png/heic/heif/pdf/docx/xlsx)
- `DOCS_MAX_SIZE_BYTES` — maximum upload size in bytes (default: 25MB)

### SAS upload flow (direct-to-blob)

1) Client calls:
   - `POST /api/projects/:projectId/docs/files/request-upload`
   - Body: `folderId, filename, contentType, sizeBytes`
2) API:
   - validates inputs (including size limit)
   - creates a `DocFile` record with `status=pending`
   - returns a short-lived **write SAS** URL (`uploadUrl`, 10 min)
3) Client uploads file bytes directly to Azure Blob via `PUT uploadUrl` with:
   - `x-ms-blob-type: BlockBlob`
   - `Content-Type: <contentType>`
4) Client calls:
   - `POST /api/projects/:projectId/docs/files/:fileId/complete`
5) API verifies the blob exists (and content type where possible) then marks `DocFile.status=ready`.

Downloads:
- Client calls `GET /api/projects/:projectId/docs/files/:fileId/download-url`
- API returns a short-lived **read SAS** URL (10 min) for `status=ready` files only.

### Blob naming convention

Blobs are server-named (never client-provided) as:

`docs/<projectId>/<uuid>`

### Security assumptions

- Blob container is **private**.
- SAS tokens are short-lived (10 minutes).
- Upload SAS is **create+write** only; download SAS is **read** only.
- Every API call is scoped to `projectId` and requires authenticated project access.

### Curl examples

Assumes you have a Bearer token (the frontend stores it in `localStorage.token`).

```bash
export API_BASE="http://localhost:3000"
export PROJECT_ID="<projectId>"
export TOKEN="<jwt>"
```

- List folders:

```bash
curl -sS "$API_BASE/api/projects/$PROJECT_ID/docs/folders/tree" \
  -H "Authorization: Bearer $TOKEN" | jq .
```

- Create a folder under root:

```bash
curl -sS -X POST "$API_BASE/api/projects/$PROJECT_ID/docs/folders" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"parentId":null,"name":"Cx Plan"}' | jq .
```

- Request an upload SAS:

```bash
curl -sS -X POST "$API_BASE/api/projects/$PROJECT_ID/docs/files/request-upload" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"folderId":"<folderId>","filename":"example.pdf","contentType":"application/pdf","sizeBytes":12345}' | jq .
```

- Upload bytes to Azure (replace `UPLOAD_URL` with the returned `uploadUrl`):

```bash
curl -sS -X PUT "$UPLOAD_URL" \
  -H "x-ms-blob-type: BlockBlob" \
  -H "Content-Type: application/pdf" \
  --data-binary "@example.pdf"
```

- Complete upload:

```bash
curl -sS -X POST "$API_BASE/api/projects/$PROJECT_ID/docs/files/<fileId>/complete" \
  -H "Authorization: Bearer $TOKEN" | jq .
```

- Get download URL:

```bash
curl -sS "$API_BASE/api/projects/$PROJECT_ID/docs/files/<fileId>/download-url" \
  -H "Authorization: Bearer $TOKEN" | jq .
```
