import Foundation
#if canImport(Darwin)
import Darwin
#endif

#if canImport(Darwin)
private let circleBoxHandledSignals: [Int32] = [SIGABRT, SIGSEGV, SIGBUS, SIGILL, SIGTRAP, SIGFPE]

private var circleBoxSignalMarkerPath = [CChar](repeating: 0, count: Int(PATH_MAX))
private var circleBoxPreviousSIGABRT = sigaction()
private var circleBoxPreviousSIGSEGV = sigaction()
private var circleBoxPreviousSIGBUS = sigaction()
private var circleBoxPreviousSIGILL = sigaction()
private var circleBoxPreviousSIGTRAP = sigaction()
private var circleBoxPreviousSIGFPE = sigaction()
private var circleBoxSignalHandlerInstalled = false

private func circleBoxSignalHandler(_ signal: Int32) {
    circleBoxWriteSignalMarker(signal)
    circleBoxChainPreviousHandler(signal)
}

private func circleBoxWriteSignalMarker(_ signal: Int32) {
    let fd = circleBoxSignalMarkerPath.withUnsafeBufferPointer { buffer -> Int32 in
        guard let path = buffer.baseAddress else { return -1 }
        return open(path, O_WRONLY | O_CREAT | O_TRUNC, S_IRUSR | S_IWUSR)
    }

    guard fd >= 0 else { return }

    var rawSignal = signal.littleEndian
    withUnsafeBytes(of: &rawSignal) { bytes in
        _ = write(fd, bytes.baseAddress, bytes.count)
    }
    _ = fsync(fd)
    _ = close(fd)
}

private func circleBoxChainPreviousHandler(_ signal: Int32) {
    var restored: sigaction?
    switch signal {
    case SIGABRT:
        restored = circleBoxPreviousSIGABRT
    case SIGSEGV:
        restored = circleBoxPreviousSIGSEGV
    case SIGBUS:
        restored = circleBoxPreviousSIGBUS
    case SIGILL:
        restored = circleBoxPreviousSIGILL
    case SIGTRAP:
        restored = circleBoxPreviousSIGTRAP
    case SIGFPE:
        restored = circleBoxPreviousSIGFPE
    default:
        break
    }

    if var previous = restored {
        _ = sigaction(signal, &previous, nil)
    } else {
        _ = Darwin.signal(signal, SIG_DFL)
    }

    _ = kill(getpid(), signal)
}

final class CircleBoxSignalCrashHandler {
    private let markerPath: [CChar]

    init?(markerPath: [CChar]) {
        guard markerPath.count > 1 else { return nil }
        self.markerPath = markerPath
    }

    func install() {
        guard !circleBoxSignalHandlerInstalled else { return }
        circleBoxSignalHandlerInstalled = true

        let copyLength = min(markerPath.count, Int(PATH_MAX) - 1)
        for index in 0..<copyLength {
            circleBoxSignalMarkerPath[index] = markerPath[index]
        }
        circleBoxSignalMarkerPath[copyLength] = 0

        for signal in circleBoxHandledSignals {
            var action = sigaction()
            sigemptyset(&action.sa_mask)
            action.sa_flags = 0
            action.__sigaction_u = __sigaction_u(__sa_handler: circleBoxSignalHandler)

            switch signal {
            case SIGABRT:
                _ = sigaction(signal, &action, &circleBoxPreviousSIGABRT)
            case SIGSEGV:
                _ = sigaction(signal, &action, &circleBoxPreviousSIGSEGV)
            case SIGBUS:
                _ = sigaction(signal, &action, &circleBoxPreviousSIGBUS)
            case SIGILL:
                _ = sigaction(signal, &action, &circleBoxPreviousSIGILL)
            case SIGTRAP:
                _ = sigaction(signal, &action, &circleBoxPreviousSIGTRAP)
            case SIGFPE:
                _ = sigaction(signal, &action, &circleBoxPreviousSIGFPE)
            default:
                break
            }
        }
    }
}
#else
final class CircleBoxSignalCrashHandler {
    init?(markerPath: [CChar]) { nil }
    func install() {}
}
#endif
