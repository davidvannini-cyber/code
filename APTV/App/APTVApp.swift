import APTVCore
import SwiftUI

@main
struct APTVApp: App {
    // Composition root: unico punto che conosce le implementazioni concrete.
    @State private var viewModel = ChannelListViewModel(
        loadPlaylist: LoadPlaylist(source: URLSessionPlaylistSource())
    )

    var body: some Scene {
        WindowGroup {
            ChannelListView(viewModel: viewModel, makeEngine: { AVPlayerEngine() })
        }
    }
}
