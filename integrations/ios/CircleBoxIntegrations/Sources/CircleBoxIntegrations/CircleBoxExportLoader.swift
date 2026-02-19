import Foundation

public enum CircleBoxExportLoader {
    public static func loadEnvelope(from data: Data) throws -> CircleBoxAdapterEnvelope {
        try JSONDecoder().decode(CircleBoxAdapterEnvelope.self, from: data)
    }

    public static func loadEnvelope(from url: URL) throws -> CircleBoxAdapterEnvelope {
        let data = try Data(contentsOf: url)
        return try loadEnvelope(from: data)
    }
}
