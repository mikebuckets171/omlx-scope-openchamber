import AppKit
import SwiftUI

/// A narrow AppKit bridge for actual window visibility, including minimisation and occlusion.
struct WindowPresence: NSViewRepresentable {
    var changed: (Bool) -> Void
    func makeNSView(context: Context) -> Probe { let view = Probe(); view.changed = changed; return view }
    func updateNSView(_ view: Probe, context: Context) { view.changed = changed }
    static func dismantleNSView(_ view: Probe, coordinator: ()) { view.detach() }
    final class Probe: NSView {
        var changed: ((Bool) -> Void)?
        private var observers: [NSObjectProtocol] = []
        override func viewDidMoveToWindow() {
            super.viewDidMoveToWindow(); detach()
            guard let window else { return }
            for name in [NSWindow.didChangeOcclusionStateNotification, NSWindow.didMiniaturizeNotification, NSWindow.didDeminiaturizeNotification, NSWindow.willCloseNotification] {
                observers.append(NotificationCenter.default.addObserver(forName: name, object: window, queue: .main) { [weak self] note in
                    MainActor.assumeIsolated {
                        guard let self else { return }
                        self.report(closing: note.name == NSWindow.willCloseNotification)
                    }
                })
            }
            DispatchQueue.main.async { [weak self] in self?.report() }
        }
        private func report(closing: Bool = false) {
            let visible = !closing && window?.isVisible == true && window?.isMiniaturized == false && window?.occlusionState.contains(.visible) == true
            changed?(visible)
        }
        func detach() {
            observers.forEach { NotificationCenter.default.removeObserver($0) }; observers.removeAll()
            changed?(false)
        }
    }
}
