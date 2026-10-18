import APTVCore
import Foundation

struct URLSessionPlaylistSource: PlaylistTextSource {
    func fetchText(from url: URL) async throws -> String {
        let (data, response) = try await URLSession.shared.data(from: url)
        guard (response as? HTTPURLResponse)?.statusCode == 200,
              let text = String(data: data, encoding: .utf8) ?? String(data: data, encoding: .isoLatin1)
        else { throw PlaylistError.invalidResponse }
        return text
    }
}
