import Foundation

public enum PlaylistError: Error, Equatable {
    case missingHeader
    /// Il testo e' un manifest HLS (master/media), non una lista di canali M3U.
    case hlsManifest
    case invalidResponse
}

public protocol PlaylistParsing: Sendable {
    func parse(_ text: String) throws -> Playlist
}
