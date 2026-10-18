import APTVCore
import SwiftUI

struct ChannelListView: View {
    @Bindable var viewModel: ChannelListViewModel
    let makeEngine: () -> AVPlayerEngine
    @State private var playing: Channel?

    var body: some View {
        NavigationStack {
            List {
                Section {
                    TextField("URL playlist M3U / M3U8", text: $viewModel.playlistURLText)
                        .textInputAutocapitalization(.never)
                        .keyboardType(.URL)
                        .autocorrectionDisabled()
                        .submitLabel(.go)
                        .onSubmit { Task { await viewModel.load() } }
                    if case .failed(let message) = viewModel.phase {
                        Text(message).foregroundStyle(.red).font(.footnote)
                    }
                }
                if !viewModel.playlist.groups.isEmpty {
                    Picker("Gruppo", selection: $viewModel.selectedGroup) {
                        Text("Tutti").tag(String?.none)
                        ForEach(viewModel.playlist.groups, id: \.self) { Text($0).tag(Optional($0)) }
                    }
                }
                ForEach(viewModel.visibleChannels) { channel in
                    Button(channel.name) { playing = channel }
                        .foregroundStyle(.primary)
                }
            }
            .overlay { if viewModel.phase == .loading { ProgressView() } }
            .searchable(text: $viewModel.searchText)
            .navigationTitle("APTV")
        }
        .fullScreenCover(item: $playing) { channel in
            PlayerScreen(channel: channel, engine: makeEngine())
        }
    }
}
