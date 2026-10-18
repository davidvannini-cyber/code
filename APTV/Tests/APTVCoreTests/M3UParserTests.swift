import XCTest
@testable import APTVCore

final class M3UParserTests: XCTestCase {
    private let parser = M3UParser()

    func testParsesAttributesAndTitle() throws {
        let text = """
        #EXTM3U
        #EXTINF:-1 tvg-id="rai1.it" tvg-logo="https://x.it/l.png" group-title="Generali, Italia",Rai 1
        https://example.com/rai1/index.m3u8
        """
        let channel = try XCTUnwrap(parser.parse(text).channels.first)
        XCTAssertEqual(channel.name, "Rai 1")
        XCTAssertEqual(channel.group, "Generali, Italia")
        XCTAssertEqual(channel.tvgID, "rai1.it")
        XCTAssertEqual(channel.logoURL, URL(string: "https://x.it/l.png"))
        XCTAssertEqual(channel.streamURL.absoluteString, "https://example.com/rai1/index.m3u8")
    }

    func testHandlesBOMAndCRLFAndExtGrp() throws {
        let text = "\u{FEFF}#EXTM3U\r\n#EXTINF:-1,Canale\r\n#EXTGRP:Sport\r\nhttp://h/s.m3u8\r\n"
        let channel = try XCTUnwrap(parser.parse(text).channels.first)
        XCTAssertEqual(channel.name, "Canale")
        XCTAssertEqual(channel.group, "Sport")
    }

    func testSkipsNonHTTPAndKeepsOrder() throws {
        let text = """
        #EXTM3U
        #EXTINF:-1,A
        rtmp://h/a
        #EXTINF:-1,B
        https://h/b.m3u8
        #EXTINF:-1,C
        https://h/c.m3u8
        """
        XCTAssertEqual(try parser.parse(text).channels.map(\.name), ["B", "C"])
    }

    func testMissingHeaderThrows() {
        XCTAssertThrowsError(try parser.parse("https://h/a.m3u8")) {
            XCTAssertEqual($0 as? PlaylistError, .missingHeader)
        }
    }

    func testHLSManifestIsDetected() {
        let text = "#EXTM3U\n#EXT-X-STREAM-INF:BANDWIDTH=1000\nlow/index.m3u8"
        XCTAssertThrowsError(try parser.parse(text)) {
            XCTAssertEqual($0 as? PlaylistError, .hlsManifest)
        }
    }
}
