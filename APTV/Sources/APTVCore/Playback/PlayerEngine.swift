import Foundation

public enum PlaybackState: Equatable, Sendable {
    case idle
    case loading
    case playing
    case paused
    case failed(String)
}

/// Contratto di riproduzione indipendente da AVFoundation: l'implementazione AVPlayer sta nell'app.
@MainActor
public protocol PlayerEngine: AnyObject {
    var state: PlaybackState { get }
    var states: AsyncStream<PlaybackState> { get }

    func load(_ streamURL: URL)
    func play()
    func pause()
    func stop()
}
