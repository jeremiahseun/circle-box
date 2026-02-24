const GZIP_MAGIC_0 = 0x1f;
const GZIP_MAGIC_1 = 0x8b;

export function isLikelyGzip(bytes: Uint8Array): boolean {
  return bytes.length >= 2 && bytes[0] === GZIP_MAGIC_0 && bytes[1] === GZIP_MAGIC_1;
}

export async function decodeJsonBody(bytes: Uint8Array, contentType: string | null): Promise<string> {
  const lowerContentType = (contentType ?? "").toLowerCase();
  const shouldAttemptGzip = lowerContentType.includes("gzip") || isLikelyGzip(bytes);

  if (!shouldAttemptGzip) {
    return new TextDecoder().decode(bytes);
  }

  try {
    const stream = new Blob([copyToArrayBuffer(bytes)]).stream().pipeThrough(new DecompressionStream("gzip"));
    const decompressed = await new Response(stream).arrayBuffer();
    return new TextDecoder().decode(decompressed);
  } catch {
    // Some clients may set a gzip-ish content type while sending plain JSON.
    return new TextDecoder().decode(bytes);
  }
}

function copyToArrayBuffer(bytes: Uint8Array): ArrayBuffer {
  const copied = new Uint8Array(bytes.byteLength);
  copied.set(bytes);
  return copied.buffer;
}
