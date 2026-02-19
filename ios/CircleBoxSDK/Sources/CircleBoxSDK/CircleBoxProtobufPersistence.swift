import Foundation

enum CircleBoxProtobufPersistence {
    private static let wireVersion: UInt64 = 1

    static func encodeEnvelope(_ envelope: CircleBoxEnvelope) throws -> Data {
        let payload = try CircleBoxSerializer.jsonData(from: envelope)

        var output = Data()
        appendVarintField(fieldNumber: 1, value: wireVersion, to: &output)
        appendLengthDelimitedField(fieldNumber: 2, payload: payload, to: &output)
        return output
    }

    static func decodeEnvelope(_ data: Data) -> CircleBoxEnvelope? {
        // Legacy path: previous versions persisted raw JSON in pending/checkpoint files.
        if let first = data.first, first == 0x7B {
            return try? CircleBoxSerializer.decodeEnvelope(from: data)
        }

        var index = data.startIndex
        var payload: Data?

        while index < data.endIndex {
            guard let key = readVarint(from: data, index: &index) else {
                return try? CircleBoxSerializer.decodeEnvelope(from: data)
            }

            let wireType = Int(key & 0x7)
            let fieldNumber = key >> 3

            switch (fieldNumber, wireType) {
            case (1, 0):
                guard readVarint(from: data, index: &index) != nil else {
                    return try? CircleBoxSerializer.decodeEnvelope(from: data)
                }
            case (2, 2):
                guard let length = readVarint(from: data, index: &index) else {
                    return try? CircleBoxSerializer.decodeEnvelope(from: data)
                }
                let byteCount = Int(length)
                guard byteCount >= 0, index + byteCount <= data.endIndex else {
                    return try? CircleBoxSerializer.decodeEnvelope(from: data)
                }
                payload = Data(data[index..<(index + byteCount)])
                index += byteCount
            default:
                guard skipField(wireType: wireType, from: data, index: &index) else {
                    return try? CircleBoxSerializer.decodeEnvelope(from: data)
                }
            }
        }

        if let payload {
            return try? CircleBoxSerializer.decodeEnvelope(from: payload)
        }

        return try? CircleBoxSerializer.decodeEnvelope(from: data)
    }

    private static func appendVarintField(fieldNumber: UInt64, value: UInt64, to output: inout Data) {
        appendVarint((fieldNumber << 3) | 0, to: &output)
        appendVarint(value, to: &output)
    }

    private static func appendLengthDelimitedField(fieldNumber: UInt64, payload: Data, to output: inout Data) {
        appendVarint((fieldNumber << 3) | 2, to: &output)
        appendVarint(UInt64(payload.count), to: &output)
        output.append(payload)
    }

    private static func appendVarint(_ value: UInt64, to output: inout Data) {
        var remaining = value
        while true {
            if remaining < 0x80 {
                output.append(UInt8(remaining))
                return
            }
            output.append(UInt8((remaining & 0x7f) | 0x80))
            remaining >>= 7
        }
    }

    private static func readVarint(from data: Data, index: inout Int) -> UInt64? {
        var shift: UInt64 = 0
        var value: UInt64 = 0

        while index < data.endIndex, shift <= 63 {
            let byte = data[index]
            index += 1

            value |= UInt64(byte & 0x7f) << shift
            if (byte & 0x80) == 0 {
                return value
            }
            shift += 7
        }

        return nil
    }

    private static func skipField(wireType: Int, from data: Data, index: inout Int) -> Bool {
        switch wireType {
        case 0:
            return readVarint(from: data, index: &index) != nil
        case 1:
            guard index + 8 <= data.endIndex else { return false }
            index += 8
            return true
        case 2:
            guard let length = readVarint(from: data, index: &index) else { return false }
            let byteCount = Int(length)
            guard byteCount >= 0, index + byteCount <= data.endIndex else { return false }
            index += byteCount
            return true
        case 5:
            guard index + 4 <= data.endIndex else { return false }
            index += 4
            return true
        default:
            return false
        }
    }
}
