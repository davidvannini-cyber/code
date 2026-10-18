import APTVCore
import Foundation
import Observation

@MainActor
@Observable
final class ChannelListViewModel {
    enum Phase: Equatable {
        case idle, loading, loaded, failed(String)
    }

    var playlistURLText = ""
    var searchText = ""
    var selectedGroup: String?
    private(set) var playlist = Playlist(channels: [])
    private(set) var phase: Phase = .idle

    private let loadPlaylist: LoadPlaylist

    init(loadPlaylist: LoadPlaylist) {
        self.loadPlaylist = loadPlaylist
    }

    var visibleChannels: [Channel] {
        playlist.channels.filter { channel in
            (selectedGroup == nil || channel.group == selectedGroup)
                && (searchText.isEmpty || channel.name.localizedCaseInsensitiveContains(searchText))
        }
    }

    func load() async {
        guard let url = URL(string: playlistURLText.trimmingCharacters(in: .whitespaces)),
              url.scheme?.hasPrefix("http") == true
        else {
            phase = .failed("Inserisci un URL http(s) valido")
            return
        }
        phase = .loading
        do {
            playlist = try await loadPlaylist(url: url)
            selectedGroup = nil
            phase = .loaded
        } catch {
            phase = .failed(error.localizedDescription)
        }
    }
}
