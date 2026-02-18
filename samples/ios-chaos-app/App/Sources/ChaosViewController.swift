import UIKit
import CircleBoxSDK

private final class CircleBoxActionButton: UIButton {
    var onTap: (() -> Void)?

    @objc
    private func handleTap() {
        onTap?()
    }

    func wireTap() {
        addTarget(self, action: #selector(handleTap), for: .touchUpInside)
    }
}

final class ChaosViewController: UIViewController {
    override func viewDidLoad() {
        super.viewDidLoad()
        title = "CircleBox Chaos"
        view.backgroundColor = .systemBackground

        let stack = UIStackView()
        stack.axis = .vertical
        stack.spacing = 12
        stack.translatesAutoresizingMaskIntoConstraints = false

        stack.addArrangedSubview(makeButton(title: "Mock Thermal Spike") {
            CircleBox.breadcrumb("Mock thermal spike", attrs: ["state": "critical"])
        })

        stack.addArrangedSubview(makeButton(title: "Mock Low Battery") {
            CircleBox.breadcrumb("Mock low battery", attrs: ["percent": "7", "low_power_mode": "true"])
        })

        stack.addArrangedSubview(makeButton(title: "Mock No Internet") {
            CircleBox.breadcrumb("Mock no internet", attrs: ["to": "none"])
        })

        stack.addArrangedSubview(makeButton(title: "Mock Permission Revoked") {
            CircleBox.breadcrumb("Mock permission revoked", attrs: ["permission": "camera", "to": "denied"])
        })

        stack.addArrangedSubview(makeButton(title: "Mock Low Disk") {
            CircleBox.breadcrumb("Mock low disk", attrs: ["available_bytes": "1024"])
        })

        stack.addArrangedSubview(makeButton(title: "Add Breadcrumb") {
            CircleBox.breadcrumb("User started Checkout", attrs: ["flow": "checkout"])
        })

        stack.addArrangedSubview(makeButton(title: "Export Logs") { [weak self] in
            do {
                let files = try CircleBox.exportLogs()
                self?.showMessage("Exported \(files.count) file(s)")
            } catch {
                self?.showMessage("Export failed: \(error.localizedDescription)")
            }
        })

        let crashButton = makeButton(title: "Hard Crash") {
            preconditionFailure("Intentional crash")
        }
        crashButton.setTitleColor(.systemRed, for: .normal)
        stack.addArrangedSubview(crashButton)

        view.addSubview(stack)

        NSLayoutConstraint.activate([
            stack.leadingAnchor.constraint(equalTo: view.safeAreaLayoutGuide.leadingAnchor, constant: 16),
            stack.trailingAnchor.constraint(equalTo: view.safeAreaLayoutGuide.trailingAnchor, constant: -16),
            stack.topAnchor.constraint(equalTo: view.safeAreaLayoutGuide.topAnchor, constant: 20)
        ])
    }

    override func viewDidAppear(_ animated: Bool) {
        super.viewDidAppear(animated)
        if CircleBox.hasPendingCrashReport() {
            let alert = UIAlertController(
                title: "Crash Report Found",
                message: "A pending .circlebox report exists. Export now?",
                preferredStyle: .alert
            )
            alert.addAction(UIAlertAction(title: "Later", style: .cancel))
            alert.addAction(UIAlertAction(title: "Export", style: .default) { [weak self] _ in
                do {
                    let files = try CircleBox.exportLogs()
                    self?.showMessage("Exported \(files.count) file(s)")
                } catch {
                    self?.showMessage("Export failed: \(error.localizedDescription)")
                }
            })
            present(alert, animated: true)
        }
    }

    private func makeButton(title: String, action: @escaping () -> Void) -> UIButton {
        let button = CircleBoxActionButton(type: .system)
        button.setTitle(title, for: .normal)
        button.backgroundColor = .systemBlue
        button.setTitleColor(.white, for: .normal)
        button.layer.cornerRadius = 10
        button.contentEdgeInsets = UIEdgeInsets(top: 12, left: 12, bottom: 12, right: 12)
        button.onTap = action
        button.wireTap()
        return button
    }

    private func showMessage(_ message: String) {
        let alert = UIAlertController(title: "CircleBox", message: message, preferredStyle: .alert)
        alert.addAction(UIAlertAction(title: "OK", style: .default))
        present(alert, animated: true)
    }
}
