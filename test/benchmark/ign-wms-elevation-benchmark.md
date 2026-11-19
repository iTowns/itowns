# IGN WMS elevation benchmark: Terrain-RGB vs. XBIL float32

**Terrain-RGB transferred about 60% fewer elevation bytes for the same WMS tile extents.** The two formats triggered nearly the same number of elevation requests. This benchmark does not establish a CPU or GPU performance advantage.

## Setup

Compared [Terrain-RGB](../examples/source_wms_terrain_rgb.html) (`terrainrgb`, `image/png`) and [XBIL float32](../examples/source_wms_terrain_xbil.html) (`normal`, `image/x-bil;bits=32`) on the live IGN WMS 1.3.0 layer `ELEVATION.ELEVATIONGRIDCOVERAGE.HIGHRES`. Both examples use `GlobeView`, the same initial camera over the French Alps, an `EPSG:4326` elevation grid with 256 × 256 WMS tiles, the same orthophoto, the default elevation update strategy, a minimum elevation zoom of 8, and altitude clamps of −100 m and 5,000 m. The camera remained stationary.

Measured on 2026-11-19, on Linux with Chrome 157.0.8103.78 (headless, hardware-accelerated), an Intel Core i7-10750H and an NVIDIA Quadro T1000 with Max-Q Design. The viewport was 1024 × 768 at device pixel ratio 1. The browser HTTP cache was disabled; IGN's server and CDN caches were not controlled. Three pairs were run in order, reversing the format order for the middle pair. Each observation lasted 30 seconds from `DOMContentLoaded`.

## Results

The network columns count only IGN elevation `GetMap` requests, not orthophotos. Transfer is Chrome DevTools Protocol's `encodedDataLength`, summed over completed HTTP 200 responses (1 MB = 1,000,000 bytes). Request duration is measured from request start to response completion; it does not include time spent waiting in the iTowns scheduler. The scheduler columns count **all** iTowns commands waiting or executing, sampled every 250 ms for the peak.

| Pair | Format | Elevation requests started / completed (HTTP 200) | Transfer (MB) | Median request duration (ms) | First request to last completed response (s) | Scheduler peak / remaining |
|---:|---|---:|---:|---:|---:|---:|
| 1 | Terrain-RGB | 104 / 104 | 11.06 | 387 | 12.86 | 307 / 0 |
| 1 | XBIL | 105 / 105 | 27.62 | 374 | 14.12 | 298 / 2 |
| 2 | XBIL | 103 / 103 | 27.09 | 392 | 16.49 | 307 / 2 |
| 2 | Terrain-RGB | 109 / 108 | 11.35 | 392 | 25.85 | 305 / 3 |
| 3 | Terrain-RGB | 103 / 103 | 10.91 | 357 | 12.58 | 303 / 0 |
| 3 | XBIL | 104 / 104 | 27.35 | 398 | 15.98 | 298 / 1 |

All received elevation responses were HTTP 200; one Terrain-RGB request was still pending at the cutoff in pair 2. Accordingly, the last-completed response in that run is not the time at which all elevation finished loading. A nonzero scheduler count does not, by itself, mean elevation is still loading.

| Pair | Matching completed tile extents (`BBOX`) | Terrain-RGB transfer (MB) | XBIL transfer (MB) | Reduction |
|---:|---:|---:|---:|---:|
| 1 | 102 | 10.77 | 26.83 | 59.8% |
| 2 | 102 | 10.80 | 26.83 | 59.8% |
| 3 | 101 | 10.74 | 26.57 | 59.6% |

### Interpretation

- **Bandwidth:** The matched-extent comparison confirms the transfer saving without relying on small differences in which tiles were requested. The exact saving depends on the terrain and the server's encoding and compression.
- **Requests and loading time:** Both formats started roughly 105 elevation requests per run. Per-request timings overlapped, and the last-response interval varied between runs. Neither establishes a consistent loading-time advantage.
- **Client processing:** Terrain-RGB incurs PNG decoding and pixel readback, and its bounds calculation scans covered pixels; XBIL reads float32 samples directly and estimates bounds by sampling. The benchmark does not isolate those costs, GPU time, frame rate or memory. Fewer transferred bytes does not imply less client processing.

## Reproduce

From the repository root, with the project dependencies installed:

```sh
# Terminal 1: serve the examples and current iTowns bundle.
npm start

# Terminal 2: run the benchmark with Puppeteer's Chrome or set CHROME_PATH.
node test/benchmark/ign-wms-elevation.mjs > ign-wms-elevation.jsonl
```

Set `BENCHMARK_URL` to use a different local server. A working connection to `data.geopf.fr` and to the examples' CDN dependencies is required. The [runner](../test/benchmark/ign-wms-elevation.mjs) records the browser and GPU, request timing, status, transfer bytes, bounding boxes and scheduler samples as JSON Lines. To reproduce the matched comparison, keep only completed HTTP 200 responses, intersect the `BBOX` sets per pair and sum `bytes` for those extents in each format. This is a manual benchmark against a live service, not a CI regression threshold.
