import Foundation

public struct Channel: Identifiable, Hashable, Sendable {
    public let id: String
    public let name: String
    public let streamURL: URL
    public let logoURL: URL?
    public let group: String?
    public let tvgID: String?

    public init(id: String, name: String, streamURL: URL, logoURL: URL? = nil, group: String? = nil, tvgID: String? = nil) {
        self.id = id
        self.name = name
        self.streamURL = streamURL
        self.logoURL = logoURL
        self.group = group
        self.tvgID = tvgID
    }
}

public struct Playlist: Equatable, Sendable {
    public let channels: [Channel]

    public init(channels: [Channel]) {
        self.channels = channels
    }

    public var groups: [String] {
        Array(Set(channels.compactMap(\.group))).sorted()
    }
}
