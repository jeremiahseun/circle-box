import XCTest
@testable import CircleBoxSDK

private var circleBoxPreviousExceptionHandlerCallCount = 0

private func circleBoxPreviousExceptionHandler(_ exception: NSException) {
    _ = exception
    circleBoxPreviousExceptionHandlerCallCount += 1
}

final class CircleBoxCrashHandlerTests: XCTestCase {
    func testHandleCallsOnCrashAndPreviousHandler() {
        circleBoxPreviousExceptionHandlerCallCount = 0
        var crashDetails = ""

        let handler = CircleBoxCrashHandler(
            onCrash: { details in crashDetails = details },
            previousHandler: circleBoxPreviousExceptionHandler
        )

        let exception = NSException(name: .invalidArgumentException, reason: "unit-test", userInfo: nil)
        handler.handle(exception)

        XCTAssertEqual(crashDetails, "NSInvalidArgumentException:unit-test")
        XCTAssertEqual(circleBoxPreviousExceptionHandlerCallCount, 1)
    }
}
