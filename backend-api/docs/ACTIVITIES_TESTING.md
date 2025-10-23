# Activities Feature Manual Tests

This guide helps you verify Activities sanitization and photo upload limits using a simple Node script.

## Prerequisites

- Backend API running on <http://localhost:4242>
- A valid JWT auth token
- A project ID you can use for creating activities

## Install test deps

From `backend-api/`:

```sh
npm install --silent
```

(Dev deps `axios` and `form-data` are added for the test script.)

## Run tests

Set environment variables and run the script:

```sh
# in backend-api/
export API_BASE="http://localhost:4242/api"
export TOKEN="<your JWT>"
export PROJECT_ID="<your project id>"

npm run test:activities
```

### What it does

1. Creates an activity with HTML that includes `<script>` and an image `onerror` attribute
   - Fetches the activity and verifies the backend sanitized the HTML
2. Creates an activity for photo tests and uploads two small images (< 250KB)
   - Verifies upload succeeds
3. Attempts to upload an oversize image (~300KB)
   - Verifies the server rejects it (HTTP 400)
4. Attempts to exceed the 16-photo cap by uploading 15 more (after 2 already uploaded)
   - Verifies the server rejects it (HTTP 400)

The script prints PASS/FAIL for each step and exits non-zero on any failure.

## Troubleshooting

- 401 Unauthorized: ensure `TOKEN` is valid and includes the `Bearer` token for the same server instance.
- 404 Not Found: ensure `API_BASE` points to your running server and the routes exist.
- 400 errors on create: ensure `PROJECT_ID` is valid and belongs to your account.

## Notes

- Images are generated in-memory; the server trusts `contentType` as `image/jpeg` for these tests.
- The script does not remove created test activities; you can delete them via your UI or API if needed.
