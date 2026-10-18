import APTVCore
import AVFoundation
import Combine

@MainActor
final class AVPlayerEngine: PlayerEngine {
    let player = AVPlayer()
    let states: AsyncStream<PlaybackState>
    private(set) var state: PlaybackState = .idle {
        didSet { if state != oldValue { continuation.yield(state) } }
    }

    private let continuation: AsyncStream<PlaybackState>.Continuation
    private var playerCancellables = Set<AnyCancellable>()
    private var itemCancellables = Set<AnyCancellable>()

    init() {
        (states, continuation) = AsyncStream.makeStream(of: PlaybackState.self)
        player.allowsExternalPlayback = true
        try? AVAudioSession.sharedInstance().setCategory(.playback, mode: .moviePlayback)

        player.publisher(for: \.timeControlStatus)
            .receive(on: DispatchQueue.main)
            .sink { [weak self] _ in self?.refresh() }
            .store(in: &playerCancellables)
    }

    func load(_ streamURL: URL) {
        itemCancellables.removeAll()
        let item = AVPlayerItem(url: streamURL)
        item.publisher(for: \.status)
            .receive(on: DispatchQueue.main)
            .sink { [weak self] _ in self?.refresh() }
            .store(in: &itemCancellables)
        player.replaceCurrentItem(with: item)
        state = .loading
        try? AVAudioSession.sharedInstance().setActive(true)
        player.play()
    }

    func play() { player.play() }
    func pause() { player.pause() }

    func stop() {
        itemCancellables.removeAll()
        player.pause()
        player.replaceCurrentItem(with: nil)
        state = .idle
    }

    private func refresh() {
        guard let item = player.currentItem else { return }
        if item.status == .failed {
            state = .failed(item.error?.localizedDescription ?? "Flusso non riproducibile")
            return
        }
        switch player.timeControlStatus {
        case .playing: state = .playing
        case .paused: state = .paused
        case .waitingToPlayAtSpecifiedRate: state = .loading
        @unknown default: break
        }
    }
}
