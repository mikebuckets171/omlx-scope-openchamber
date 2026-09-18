import AppKit
import Foundation

// The project's existing scope mark, rendered at native icon sizes.
let directory = URL(fileURLWithPath: CommandLine.arguments[1])
try FileManager.default.createDirectory(at: directory, withIntermediateDirectories: true)
for size in [16, 32, 128, 256, 512] {
    for scale in [1, 2] {
        let pixels = size * scale
        let bitmap = NSBitmapImageRep(bitmapDataPlanes: nil, pixelsWide: pixels, pixelsHigh: pixels,
            bitsPerSample: 8, samplesPerPixel: 4, hasAlpha: true, isPlanar: false,
            colorSpaceName: .deviceRGB, bytesPerRow: 0, bitsPerPixel: 0)!
        NSGraphicsContext.saveGraphicsState()
        NSGraphicsContext.current = NSGraphicsContext(bitmapImageRep: bitmap)
        let p = CGFloat(pixels)
        NSColor(calibratedRed: 0.075, green: 0.12, blue: 0.16, alpha: 1).setFill()
        NSBezierPath(roundedRect: NSRect(x: p*0.06, y: p*0.06, width: p*0.88, height: p*0.88), xRadius: p*0.20, yRadius: p*0.20).fill()
        NSColor(calibratedRed: 0.48, green: 0.82, blue: 0.72, alpha: 1).setStroke()
        let circle = NSBezierPath(ovalIn: NSRect(x: p*0.23, y: p*0.23, width: p*0.54, height: p*0.54))
        circle.lineWidth = p*0.025; circle.stroke()
        let line = NSBezierPath(); line.lineWidth = p*0.032; line.lineCapStyle = .round; line.lineJoinStyle = .round
        line.move(to: NSPoint(x: p*0.18, y: p*0.5))
        for point in [(0.36,0.5),(0.45,0.65),(0.56,0.35),(0.65,0.5),(0.82,0.5)] {
            line.line(to: NSPoint(x: p*point.0, y: p*point.1))
        }
        line.stroke(); NSGraphicsContext.restoreGraphicsState()
        let suffix = scale == 2 ? "@2x" : ""
        try bitmap.representation(using: .png, properties: [:])!.write(to: directory.appendingPathComponent("icon_\(size)x\(size)\(suffix).png"))
    }
}
