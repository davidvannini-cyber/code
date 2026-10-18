import APTVCore
import AVKit
import SwiftUI

struct PlayerScreen: View {
    let channel: Channel
    let engine: AVPlayerEngine
    @State private var state: PlaybackState = .idle
    @Environment(\.dismiss) private var dismiss

    var body: some View {
        ZStack(alignment: .topLeading) {
            VideoPlayer(player: engine.player).ignoresSafeArea()
            overlay
            Button { dismiss() } label: {
                Image(systemName: "xmark.circle.fill").font(.title).padding()
            }
            .tint(.white)
        }
        .background(.black)
        .task {
            engine.load(channel.streamURL)
            for await newState in engine.states { state = newState }
        }
        .onDisappear { engine.stop() }
    }

    @ViewBuilder private var overlay: some View {
        switch state {
        case .loading: ProgressView().tint(.white).frame(maxWidth: .infinity, maxHeight: .infinity)
        case .failed(let message):
            Text(message).foregroundStyle(.white).padding()
                .frame(maxWidth: .infinity, maxHeight: .infinity)
        default: EmptyView()
        }
    }
}
