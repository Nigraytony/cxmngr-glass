# Documents API (Project-scoped)

All endpoints are project-scoped and require authentication.

## Setup

```sh
export API_BASE="http://localhost:4242"
export TOKEN="YOUR_JWT"
export PROJECT_ID="YOUR_PROJECT_ID"
```

## Folders

### List folder tree

```sh
curl -sS "$API_BASE/api/projects/$PROJECT_ID/docs/folders/tree" \
  -H "Authorization: Bearer $TOKEN"
```

### Create folder

```sh
curl -sS -X POST "$API_BASE/api/projects/$PROJECT_ID/docs/folders" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"parentId":null,"name":"Design Docs"}'
```

### Rename/move folder

```sh
export FOLDER_ID="YOUR_FOLDER_ID"

# Rename
curl -sS -X PATCH "$API_BASE/api/projects/$PROJECT_ID/docs/folders/$FOLDER_ID" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name":"Design"}'

# Move (set parentId to another folder id, or null for root)
curl -sS -X PATCH "$API_BASE/api/projects/$PROJECT_ID/docs/folders/$FOLDER_ID" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"parentId":null}'
```

### Delete folder (must be empty)

```sh
curl -sS -X DELETE "$API_BASE/api/projects/$PROJECT_ID/docs/folders/$FOLDER_ID" \
  -H "Authorization: Bearer $TOKEN"
```

### Recursive delete folder (delete subfolders + files)

```sh
curl -sS -X DELETE "$API_BASE/api/projects/$PROJECT_ID/docs/folders/$FOLDER_ID?recursive=true" \
  -H "Authorization: Bearer $TOKEN"
```

## Files (direct-to-Blob upload)

### List files in folder (returns `ready` only by default)

```sh
curl -sS "$API_BASE/api/projects/$PROJECT_ID/docs/files?folderId=$FOLDER_ID" \
  -H "Authorization: Bearer $TOKEN"
```

### Request upload (mint SAS + create pending metadata)

```sh
curl -sS -X POST "$API_BASE/api/projects/$PROJECT_ID/docs/files/request-upload" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"folderId\":\"$FOLDER_ID\",\"filename\":\"sample.pdf\",\"contentType\":\"application/pdf\",\"sizeBytes\":12345}"
```

Response includes: `fileId`, `uploadUrl` (SAS), `expiresAt`.

### Upload bytes directly to Azure Blob (using SAS URL)

```sh
export UPLOAD_URL="PASTE_uploadUrl_HERE"

curl -sS -X PUT "$UPLOAD_URL" \
  -H "x-ms-blob-type: BlockBlob" \
  -H "Content-Type: application/pdf" \
  --data-binary "@sample.pdf"
```

### Complete upload (verifies blob exists and marks metadata `ready`)

```sh
export FILE_ID="YOUR_fileId"

curl -sS -X POST "$API_BASE/api/projects/$PROJECT_ID/docs/files/$FILE_ID/complete" \
  -H "Authorization: Bearer $TOKEN"
```

### Get download URL (read-only SAS) and download

```sh
curl -sS "$API_BASE/api/projects/$PROJECT_ID/docs/files/$FILE_ID/download-url" \
  -H "Authorization: Bearer $TOKEN"

export DOWNLOAD_URL="PASTE_downloadUrl_HERE"
curl -L "$DOWNLOAD_URL" -o downloaded.bin
```

### Get preview URL (PDF/images return original; DOCX/XLSX attempt conversion to PDF)

```sh
curl -sS "$API_BASE/api/projects/$PROJECT_ID/docs/files/$FILE_ID/preview-url" \
  -H "Authorization: Bearer $TOKEN"
```

Notes:
- DOCX previews use `mammoth` (DOCX → HTML) and XLSX previews use `xlsx` (XLSX → HTML), then `puppeteer` renders the HTML to a PDF.
- If `mammoth`/`xlsx` are missing, the API returns `503` with `code=PREVIEW_DEP_MISSING`.
- If `puppeteer` is unavailable, the API returns `503` with `code=PREVIEW_CONVERTER_UNAVAILABLE`.
- Converted previews are cached as `docs/<projectId>/previews/<fileId>.pdf`.

### Rename/move file (metadata only)

```sh
curl -sS -X PATCH "$API_BASE/api/projects/$PROJECT_ID/docs/files/$FILE_ID" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"filename\":\"renamed.pdf\"}"

curl -sS -X PATCH "$API_BASE/api/projects/$PROJECT_ID/docs/files/$FILE_ID" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"folderId\":\"$FOLDER_ID\"}"
```

### Delete file (deletes blob + marks metadata deleted)

```sh
curl -sS -X DELETE "$API_BASE/api/projects/$PROJECT_ID/docs/files/$FILE_ID" \
  -H "Authorization: Bearer $TOKEN"
```
