import Foundation
import zlib

enum CircleBoxCompressionError: Error {
    case initializationFailed(status: Int32)
    case deflateFailed(status: Int32)
}

enum CircleBoxCompression {
    static func gzip(_ data: Data) throws -> Data {
        var stream = z_stream()
        let initStatus = deflateInit2_(
            &stream,
            Z_DEFAULT_COMPRESSION,
            Z_DEFLATED,
            MAX_WBITS + 16, // gzip wrapper
            MAX_MEM_LEVEL,
            Z_DEFAULT_STRATEGY,
            ZLIB_VERSION,
            Int32(MemoryLayout<z_stream>.size)
        )
        guard initStatus == Z_OK else {
            throw CircleBoxCompressionError.initializationFailed(status: initStatus)
        }
        defer { deflateEnd(&stream) }

        let chunkSize = 16_384
        var output = Data()

        try data.withUnsafeBytes { rawBuffer in
            stream.next_in = UnsafeMutablePointer<Bytef>(mutating: rawBuffer.bindMemory(to: Bytef.self).baseAddress)
            stream.avail_in = uInt(rawBuffer.count)

            var status: Int32 = Z_OK
            var chunk = [UInt8](repeating: 0, count: chunkSize)

            while status == Z_OK {
                let produced = chunk.withUnsafeMutableBufferPointer { buffer -> Int in
                    stream.next_out = buffer.baseAddress
                    stream.avail_out = uInt(buffer.count)
                    status = deflate(&stream, Z_FINISH)
                    return buffer.count - Int(stream.avail_out)
                }

                if status != Z_OK && status != Z_STREAM_END {
                    throw CircleBoxCompressionError.deflateFailed(status: status)
                }

                if produced > 0 {
                    output.append(contentsOf: chunk.prefix(produced))
                }
            }
        }

        return output
    }
}
