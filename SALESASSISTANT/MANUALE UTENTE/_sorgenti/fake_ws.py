# Server WebSocket "finto" sulla porta 8765: serve solo perché il pannello di chiamata mostri "connesso" durante le schermate.
import asyncio
import websockets


async def gestore(ws):
    try:
        async for _ in ws:
            pass
    except Exception:
        pass


async def main():
    async with websockets.serve(gestore, "localhost", 8765):
        await asyncio.Future()

asyncio.run(main())
