import Foundation

/// Sorgente di testo di una playlist (rete, file, ecc.). Implementata nell'app.
public protocol PlaylistTextSource: Sendable {
    func fetchText(from url: URL) async throws -> String
}

public struct LoadPlaylist: Sendable {
    private let source: PlaylistTextSource
    private let parser: PlaylistParsing

    public init(source: PlaylistTextSource, parser: PlaylistParsing = M3UParser()) {
        self.source = source
        self.parser = parser
    }

    /// Se l'URL punta direttamente a un manifest HLS (.m3u8 di stream) lo tratta come canale singolo.
    public func callAsFunction(url: URL) async throws -> Playlist {
        let text = try await source.fetchText(from: url)
        do {
            return try parser.parse(text)
        } catch PlaylistError.hlsManifest {
            let channel = Channel(id: url.absoluteString, name: url.lastPathComponent, streamURL: url)
            return Playlist(channels: [channel])
        }
    }
}
