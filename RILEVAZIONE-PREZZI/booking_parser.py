"""Lettura dei risultati di ricerca Booking.com (pagina in italiano, prezzi in euro).

La funzione `parse_results(html)` e' pura: riceve l'HTML della pagina dei risultati
e restituisce gli annunci. Non fa richieste di rete (quelle spettano al "fetcher").
"""
import html as htmllib
import re

CARD_SPLIT = re.compile(r'data-testid="property-card"')


def _text(fragment: str) -> str:
    t = re.sub(r"<[^>]+>", "|", fragment)
    t = htmllib.unescape(t)
    return re.sub(r"\s*\|[\s|]*", " | ", t).strip(" |")


def _block(card: str, testid: str) -> str:
    """Contenuto approssimativo dell'elemento con data-testid=<testid>."""
    m = re.search(r'data-testid="%s"[^>]*>(.*?)(?=data-testid="|$)' % re.escape(testid), card, re.S)
    return m.group(1) if m else ""


def _eur(s: str):
    """'€ 1.234' -> 1234.0"""
    m = re.search(r"€\s*([\d\.]+)(?:,(\d+))?", s)
    if not m:
        return None
    return float(m.group(1).replace(".", "") + ("." + m.group(2) if m.group(2) else ""))


def parse_results(page_html: str):
    out = []
    for card in CARD_SPLIT.split(page_html)[1:]:
        title_m = re.search(r'data-testid="title"[^>]*>(.*?)</div>', card, re.S)
        if not title_m:
            continue
        name = _text(title_m.group(1))
        href_m = re.search(r'data-testid="title-link"[^>]*href="([^"]+)"', card) or \
                 re.search(r'href="([^"]+)"[^>]*data-testid="title-link"', card)
        url = htmllib.unescape(href_m.group(1)).split("?")[0] if href_m else ""

        town = ""
        addr = re.search(r'data-testid="address-link"[^>]*>(.*?)</a>', card, re.S)
        if addr:
            town = _text(addr.group(1)).split("|")[0].strip()

        rating = None
        rs = _text(_block(card, "review-score"))
        m = re.search(r"(\d+),(\d)", rs)
        if m:
            rating = float(f"{m.group(1)}.{m.group(2)}")

        # prezzi: totale del soggiorno e prezzo a notte
        price_block = card[card.find('data-testid="availability-rate-information"'):] \
            if 'data-testid="availability-rate-information"' in card else ""
        ptxt = _text(price_block)
        nights = None
        m = re.search(r"(\d+)\s+nott[ei]", ptxt)
        if m:
            nights = int(m.group(1))
        total = None
        m = re.search(r"Prezzo:\s*(€\s*[\d\.,]+)", ptxt)
        if m:
            total = _eur(m.group(1))
        per_night = None
        m = re.search(r"A notte[ |]*(€\s*[\d\.,]+)", ptxt)
        if m:
            per_night = _eur(m.group(1))
        # il prezzo che si paga davvero e' il totale: il "a notte" mostrato puo' non
        # coincidere (sconti/tasse), quindi si preferisce totale / notti
        if total and nights:
            per_night = round(total / nights, 0)
        elif total is None and per_night and nights:
            total = per_night * nights

        # capienza non e' sempre esposta: tipo di sistemazione e camere
        j = card.find('data-testid="recommended-units"')
        unit = _text(card[j:j + 3000]) if j >= 0 else ""
        m = re.search(r"(\d+)\s+camer[ae] da letto", unit)
        bedrooms = int(m.group(1)) if m else None

        out.append({
            "name": name, "url": url, "town": town, "rating": rating,
            "price_night": per_night, "price_total": total, "nights": nights,
            "bedrooms": bedrooms,
            "entire_place": "Intero appartamento" in unit or "Intera" in unit,
        })
    return out


if __name__ == "__main__":
    import sys
    for r in parse_results(open(sys.argv[1], encoding="utf-8").read()):
        print(r)
