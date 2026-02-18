import XCTest
@testable import CircleBoxSDK

final class CircleBoxSanitizerTests: XCTestCase {
    func testRedactsCommonPIIPatterns() {
        let config = CircleBoxConfig(sanitizeAttributes: true)
        let attrs = [
            "email": "person@example.com",
            "phone": "+1 (555) 111-2222",
            "card": "4111 1111 1111 1111",
            "safe": "hello"
        ]

        let output = CircleBoxSanitizer.sanitize(attrs: attrs, config: config)

        XCTAssertEqual(output["email"], "[REDACTED]")
        XCTAssertEqual(output["phone"], "[REDACTED]")
        XCTAssertEqual(output["card"], "[REDACTED]")
        XCTAssertEqual(output["safe"], "hello")
    }

    func testRespectsLengthCap() {
        let config = CircleBoxConfig(maxAttributeLength: 16)
        let attrs = ["value": "abcdefghijklmnopqrstuvwxyz"]

        let output = CircleBoxSanitizer.sanitize(attrs: attrs, config: config)

        XCTAssertEqual(output["value"], "abcdefghijklmnop")
    }

    func testAllowsUnsanitizedValuesWhenDisabled() {
        let config = CircleBoxConfig(sanitizeAttributes: false)
        let attrs = ["email": "person@example.com"]

        let output = CircleBoxSanitizer.sanitize(attrs: attrs, config: config)

        XCTAssertEqual(output["email"], "person@example.com")
    }
}
