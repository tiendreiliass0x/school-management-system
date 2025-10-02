# backend

To install dependencies:

```bash
bun install
```

To run:

```bash
bun run index.ts
```

This project was created using `bun init` in bun v1.2.20. [Bun](https://bun.com) is a fast all-in-one JavaScript runtime.

## Document uploads

The document pipeline streams uploads directly to Amazon S3. Configure the following
environment variables before running the server:

| Variable | Description |
| --- | --- |
| `AWS_REGION` | AWS region where the bucket resides. |
| `AWS_S3_BUCKET` | Target bucket for stored documents. |
| `AWS_ACCESS_KEY_ID` / `AWS_SECRET_ACCESS_KEY` | Credentials used when an instance profile is not available. |
| `AWS_S3_ENDPOINT` | *(Optional)* Custom endpoint (useful for S3-compatible stores such as MinIO). |
| `AWS_S3_FORCE_PATH_STYLE` | *(Optional)* Set to `true` when path-style addressing is required. |
| `DOCUMENT_ALLOWED_MIME_TYPES` | *(Optional)* Comma-separated list of accepted MIME types. Defaults to common document formats. |
| `DOCUMENT_MAX_BYTES` | *(Optional)* Maximum upload size in bytes (defaults to 5MB to align with API limits). |

The `/api/documents` endpoints expect `multipart/form-data` submissions with the file
attached under the `file` field. Metadata and tag payloads can be provided as JSON strings
in the `metadata` and `tags` fields respectively.
