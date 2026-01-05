#!/usr/bin/env python3
import multiprocessing as mp
import asyncio, time, sys
from urllib.parse import urlparse

import aiohttp
import httpx
from aioquic.asyncio import connect
from aioquic.asyncio.protocol import QuicConnectionProtocol
from aioquic.h3.connection import H3_ALPN, H3Connection
from aioquic.h3.events import HeadersReceived
from aioquic.quic.configuration import QuicConfiguration


class RateLimiter:
    def __init__(self, rate):
        self.interval = 1.0 / max(rate, 1)
        self.next = time.time()

    async def wait(self):
        now = time.time()
        if self.next > now:
            await asyncio.sleep(self.next - now)
        self.next = max(self.next, now) + self.interval


# ---------- HTTP/1.1 ----------
async def h1_worker(url, duration, rate):
    limiter = RateLimiter(rate)
    async with aiohttp.ClientSession() as s:
        end = time.time() + duration
        while time.time() < end:
            await limiter.wait()
            try:
                async with s.get(url) as r:
                    await r.read()
            except:
                pass


# ---------- HTTP/2 ----------
async def h2_worker(url, duration, rate):
    limiter = RateLimiter(rate)
    async with httpx.AsyncClient(http2=True, verify=False) as c:
        end = time.time() + duration
        while time.time() < end:
            await limiter.wait()
            try:
                await c.get(url)
            except:
                pass


# ---------- HTTP/3 ----------
class H3Proto(QuicConnectionProtocol):
    def __init__(self, *a, **kw):
        super().__init__(*a, **kw)
        self.h3 = H3Connection(self._quic)
        self.waiting = {}

    def quic_event_received(self, event):
        for ev in self.h3.handle_event(event):
            if isinstance(ev, HeadersReceived):
                fut = self.waiting.pop(ev.stream_id, None)
                if fut and not fut.done():
                    fut.set_result(True)


async def h3_worker(host, port, path, duration, rate):
    limiter = RateLimiter(rate)
    cfg = QuicConfiguration(is_client=True, alpn_protocols=H3_ALPN, verify_mode=False)
    async with connect(host, port, configuration=cfg, create_protocol=H3Proto) as p:
        end = time.time() + duration
        while time.time() < end:
            await limiter.wait()
            try:
                sid = p._quic.get_next_available_stream_id(False)
                fut = asyncio.get_running_loop().create_future()
                p.waiting[sid] = fut
                p.h3.send_headers(
                    sid,
                    [
                        (b":method", b"GET"),
                        (b":scheme", b"https"),
                        (b":authority", host.encode()),
                        (b":path", path.encode()),
                    ],
                    end_stream=True,
                )
                p.transmit()
                await asyncio.wait_for(fut, timeout=5)
            except:
                pass


# ---------- Run process ----------
async def run_process(url, duration, h1, h2, h3):
    u = urlparse(url)
    tasks = []
    if h1 > 0:
        tasks.append(h1_worker(url, duration, h1))
    if h2 > 0:
        tasks.append(h2_worker(url, duration, h2))
    if h3 > 0:
        tasks.append(h3_worker(u.hostname, u.port or 443, u.path or "/", duration, h3))
    await asyncio.gather(*tasks)


def entry(url, duration, h1, h2, h3):
    asyncio.run(run_process(url, duration, h1, h2, h3))


# ---------- Main ----------
if __name__ == "__main__":
    if len(sys.argv) != 7:
        print("Usage: mix_bench_mp.py URL TIME PROC H1_RATE H2_RATE H3_RATE")
        sys.exit(1)

    url = sys.argv[1]
    duration = int(sys.argv[2])
    proc = int(sys.argv[3])
    h1 = int(sys.argv[4])
    h2 = int(sys.argv[5])
    h3 = int(sys.argv[6])

    print("=== MIX BENCH MULTI-PROCESS ===")
    print(f"Target      : {url}")
    print(f"Duration    : {duration}s")
    print(f"Processes   : {proc}")
    print(f"Rate H1     : {h1} rps")
    print(f"Rate H2     : {h2} rps")
    print(f"Rate H3     : {h3} rps")
    print(f"Total RPS   : {proc * (h1+h2+h3)}")
    print("===============================")

    mp.set_start_method("fork")
    jobs = []
    for i in range(proc):
        p = mp.Process(target=entry, args=(url, duration, h1, h2, h3))
        p.start()
        jobs.append(p)

    for p in jobs:
        p.join()