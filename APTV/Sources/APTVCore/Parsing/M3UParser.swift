import Foundation

/// Parser di liste canali M3U/M3U8 estese (#EXTM3U / #EXTINF). Solo Foundation: testabile senza simulatore.
public struct M3UParser: PlaylistParsing {
    public init() {}

    public func parse(_ text: String) throws -> Playlist {
        let lines = text
            .trimmingCharacters(in: CharacterSet(charactersIn: "\u{FEFF}"))
            .split(whereSeparator: \.isNewline)
            .map { $0.trimmingCharacters(in: .whitespaces) }
            .filter { !$0.isEmpty }

        guard let first = lines.first, first.hasPrefix("#EXTM3U") else {
            throw PlaylistError.missingHeader
        }
        if lines.contains(where: { $0.hasPrefix("#EXT-X-STREAM-INF") || $0.hasPrefix("#EXT-X-TARGETDURATION") }) {
            throw PlaylistError.hlsManifest
        }

        var channels: [Channel] = []
        var pending: ExtInf?
        var pendingGroup: String?

        for line in lines.dropFirst() {
            if line.hasPrefix("#EXTINF:") {
                pending = Self.parseExtInf(line.dropFirst("#EXTINF:".count))
            } else if line.hasPrefix("#EXTGRP:") {
                pendingGroup = String(line.dropFirst("#EXTGRP:".count)).trimmingCharacters(in: .whitespaces)
            } else if line.hasPrefix("#") {
                continue
            } else if let url = URL(string: line), ["http", "https"].contains(url.scheme?.lowercased()) {
                let info = pending
                let name = info?.title.nonEmpty
                    ?? info?.attributes["tvg-name"]?.nonEmpty
                    ?? url.host
                    ?? "Canale \(channels.count + 1)"
                let group = info?.attributes["group-title"]?.nonEmpty ?? pendingGroup?.nonEmpty
                channels.append(Channel(
                    id: "\(channels.count):\(url.absoluteString)",
                    name: name,
                    streamURL: url,
                    logoURL: info?.attributes["tvg-logo"].flatMap { URL(string: $0) },
                    group: group,
                    tvgID: info?.attributes["tvg-id"]?.nonEmpty
                ))
                pending = nil
                pendingGroup = nil
            }
        }
        return Playlist(channels: channels)
    }

    struct ExtInf {
        var attributes: [String: String]
        var title: String
    }

    /// Input: tutto cio' che segue "#EXTINF:", es. `-1 tvg-id="a" group-title="News",Rai News`.
    static func parseExtInf(_ s: Substring) -> ExtInf {
        let chars = Array(s)
        var idx = 0
        var attributes: [String: String] = [:]
        var title = ""

        while idx < chars.count, chars[idx] != " ", chars[idx] != "," { idx += 1 }  // durata

        while idx < chars.count {
            let c = chars[idx]
            if c == "," {
                title = String(chars[(idx + 1)...]).trimmingCharacters(in: .whitespaces)
                break
            }
            if c == " " { idx += 1; continue }

            var key = ""
            while idx < chars.count, chars[idx] != "=", chars[idx] != "," { key.append(chars[idx]); idx += 1 }
            guard idx < chars.count, chars[idx] == "=" else { continue }
            idx += 1

            var value = ""
            if idx < chars.count, chars[idx] == "\"" {
                idx += 1
                while idx < chars.count, chars[idx] != "\"" { value.append(chars[idx]); idx += 1 }
                idx += 1
            } else {
                while idx < chars.count, chars[idx] != " ", chars[idx] != "," { value.append(chars[idx]); idx += 1 }
            }
            attributes[key.lowercased()] = value
        }
        return ExtInf(attributes: attributes, title: title)
    }
}

private extension String {
    var nonEmpty: String? { isEmpty ? nil : self }
}
