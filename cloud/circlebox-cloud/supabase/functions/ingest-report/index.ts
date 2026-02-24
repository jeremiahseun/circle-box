import { jsonResponse, requireHeader } from "../_shared/http.ts";
import { isLikelyGzip, decodeJsonBody } from "../_shared/payload.ts";
import { authenticateIngestKey } from "../_shared/project-auth.ts";
import { deriveCrashFingerprint, makeFragment, parseEnvelopeV2 } from "../_shared/schema.ts";
import { persistIdempotentResponse, persistReport, readIdempotentResponse, writeDeadLetter } from "../_shared/data-plane.ts";

const MAX_BODY_BYTES = 2 * 1024 * 1024;

Deno.serve(async (request) => {
  if (request.method !== "POST") {
    return jsonResponse(405, { error: "method_not_allowed" });
  }

  try {
    const ingestKey = requireHeader(request, "x-circlebox-ingest-key");
    const project = authenticateIngestKey(ingestKey);
    const contentType = request.headers.get("content-type");
    const idempotencyKey = parseIdempotencyKey(request);

    if (idempotencyKey) {
      const cached = await readIdempotentResponse(project.region, project.projectId, "report", idempotencyKey);
      if (cached) {
        return jsonResponse(202, {
          ...cached,
          deduplicated: true,
          idempotency_key: idempotencyKey,
        });
      }
    }

    const rawBody = new Uint8Array(await request.arrayBuffer());
    if (rawBody.byteLength > MAX_BODY_BYTES) {
      return jsonResponse(413, { error: "payload_too_large" });
    }

    const decoded = await decodeJsonBody(rawBody, contentType);
    const envelope = parseEnvelopeV2(JSON.parse(decoded));
    const crashFingerprint = deriveCrashFingerprint(envelope);
    const reportId = crypto.randomUUID();
    const payloadWasGzip = isLikelyGzip(rawBody) || (contentType ?? "").toLowerCase().includes("gzip");

    try {
      const persisted = await persistReport({
        region: project.region,
        projectId: project.projectId,
        reportId,
        envelope,
        crashFingerprint,
        rawPayload: rawBody,
        payloadWasGzip,
      });

      const responsePayload = {
        status: "accepted",
        report_id: reportId,
        project_id: project.projectId,
        accepted_region: project.region,
        event_count: envelope.events.length,
        crash_fingerprint: crashFingerprint,
        storage_path: persisted.storagePath,
        fragment_preview: makeFragment(envelope, crashFingerprint),
      };

      if (idempotencyKey) {
        await persistIdempotentResponse({
          region: project.region,
          projectId: project.projectId,
          ingestType: "report",
          idempotencyKey,
          response: responsePayload,
          referenceId: reportId,
        });
      }

      return jsonResponse(202, responsePayload);
    } catch (error) {
      const deadLetterId = await writeDeadLetter(
        project.region,
        "report",
        error instanceof Error ? error.message : "persist_report_failed",
        {
          project_id: project.projectId,
          report_id: reportId,
          idempotency_key: idempotencyKey,
          payload_size_bytes: rawBody.byteLength,
          payload_was_gzip: payloadWasGzip,
        },
        project.projectId,
      );

      return jsonResponse(503, {
        error: "ingest_persistence_failed",
        message: error instanceof Error ? error.message : "Unknown error",
        dead_letter_id: deadLetterId,
      });
    }
  } catch (error) {
    return jsonResponse(400, {
      error: "invalid_payload",
      message: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

function parseIdempotencyKey(request: Request): string | null {
  const raw = request.headers.get("x-circlebox-idempotency-key");
  if (!raw) {
    return null;
  }

  const value = raw.trim();
  if (value.length < 8 || value.length > 128) {
    throw new Error("invalid_idempotency_key_length");
  }
  if (!/^[A-Za-z0-9._:-]+$/.test(value)) {
    throw new Error("invalid_idempotency_key_format");
  }
  return value;
}
