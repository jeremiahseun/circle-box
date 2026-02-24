import { jsonResponse, requireHeader } from "../_shared/http.ts";
import { decodeJsonBody } from "../_shared/payload.ts";
import { authenticateIngestKey } from "../_shared/project-auth.ts";
import { persistFragment, persistIdempotentResponse, readIdempotentResponse, writeDeadLetter } from "../_shared/data-plane.ts";

const MAX_BODY_BYTES = 256 * 1024;

Deno.serve(async (request) => {
  if (request.method !== "POST") {
    return jsonResponse(405, { error: "method_not_allowed" });
  }

  try {
    const ingestKey = requireHeader(request, "x-circlebox-ingest-key");
    const project = authenticateIngestKey(ingestKey);
    const idempotencyKey = parseIdempotencyKey(request);
    if (idempotencyKey) {
      const cached = await readIdempotentResponse(project.region, project.projectId, "fragment", idempotencyKey);
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

    const payload = JSON.parse(await decodeJsonBody(rawBody, request.headers.get("content-type")));
    if (typeof payload !== "object" || payload === null) {
      return jsonResponse(400, { error: "invalid_fragment" });
    }

    const fragmentId = crypto.randomUUID();
    const payloadRecord = payload as Record<string, unknown>;

    try {
      await persistFragment({
        region: project.region,
        fragmentId,
        projectId: project.projectId,
        payload: payloadRecord,
      });

      const responsePayload = {
        status: "accepted",
        fragment_id: fragmentId,
        project_id: project.projectId,
        accepted_region: project.region,
        session_id: payloadRecord["session_id"] ?? null,
      };

      if (idempotencyKey) {
        await persistIdempotentResponse({
          region: project.region,
          projectId: project.projectId,
          ingestType: "fragment",
          idempotencyKey,
          response: responsePayload,
          referenceId: fragmentId,
        });
      }

      return jsonResponse(202, responsePayload);
    } catch (error) {
      const deadLetterId = await writeDeadLetter(
        project.region,
        "fragment",
        error instanceof Error ? error.message : "persist_fragment_failed",
        {
          idempotency_key: idempotencyKey,
          payload,
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
      error: "invalid_request",
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
