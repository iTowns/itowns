/* global document, window */
import { setTimeout } from 'node:timers/promises';
import { launch } from 'puppeteer';

const baseUrl = process.env.BENCHMARK_URL || 'http://localhost:8080';
const windowMs = 30_000;
const layerName = 'ELEVATION.ELEVATIONGRIDCOVERAGE.HIGHRES';
const formats = {
    rgb: 'image/png',
    xbil: 'image/x-bil;bits=32',
};

const browser = await launch({
    executablePath: process.env.CHROME_PATH,
    args: ['--enable-gpu', '--use-gl=angle', '--use-angle=gl', '--ignore-gpu-blocklist'],
});

try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1024, height: 768, deviceScaleFactor: 1 });
    const cdp = await page.createCDPSession();
    await cdp.send('Network.enable');
    await cdp.send('Network.setCacheDisabled', { cacheDisabled: true });

    await page.evaluateOnNewDocument(() => {
        window.queueSamples = [];
        setInterval(() => {
            const scheduler = window.view?.mainLoop.scheduler;
            if (scheduler) {
                window.queueSamples.push([Math.round(performance.now()), scheduler.commandsWaitingExecutionCount()]);
            }
        }, 250);
    });

    let active;
    page.on('pageerror', error => active?.pageErrors.push(error.message));
    cdp.on('Network.requestWillBeSent', ({ requestId, request, timestamp }) => {
        const url = new URL(request.url);
        if (url.hostname === 'data.geopf.fr' && url.searchParams.get('LAYERS') === layerName
            && url.searchParams.get('REQUEST') === 'GetMap') {
            active?.requests.set(requestId, {
                bbox: url.searchParams.get('BBOX'),
                format: url.searchParams.get('FORMAT'),
                started: timestamp,
            });
        }
    });
    cdp.on('Network.responseReceived', ({ requestId, response }) => {
        const request = active?.requests.get(requestId);
        if (request) {
            request.status = response.status;
            request.mimeType = response.mimeType;
        }
    });
    cdp.on('Network.loadingFinished', ({ requestId, timestamp, encodedDataLength }) => {
        const request = active?.requests.get(requestId);
        if (request) {
            request.finished = timestamp;
            request.bytes = encodedDataLength;
        }
    });
    cdp.on('Network.loadingFailed', ({ requestId, errorText }) => {
        const request = active?.requests.get(requestId);
        if (request) {
            request.error = errorText;
        }
    });

    console.log(JSON.stringify({ date: new Date().toISOString(), browser: await browser.version(), windowMs }));
    for (const kind of ['rgb', 'xbil', 'xbil', 'rgb', 'rgb', 'xbil']) {
        active = { requests: new Map(), pageErrors: [] };
        const response = await page.goto(new URL(`/examples/source_wms_terrain_${kind}.html`, baseUrl).href, {
            waitUntil: 'domcontentloaded',
        });
        if (!response?.ok()) {
            throw new Error(`Could not load the ${kind} example: HTTP ${response?.status()}`);
        }
        await setTimeout(windowMs);
        const state = await page.evaluate(() => {
            const view = window.view;
            const gl = view?.mainLoop.gfxEngine.renderer.getContext();
            const debug = gl?.getExtension('WEBGL_debug_renderer_info');
            return {
                format: view?.getLayers(layer => layer.isElevationLayer)[0]?.source.format,
                visible: document.visibilityState === 'visible',
                renderer: debug && gl.getParameter(debug.UNMASKED_RENDERER_WEBGL),
                remaining: view?.mainLoop.scheduler.commandsWaitingExecutionCount(),
                queueSamples: window.queueSamples,
            };
        });
        const requests = [...active.requests.values()];
        const { pageErrors } = active;
        active = undefined;
        if (!state.visible || state.format !== formats[kind] || !requests.length
            || requests.some(request => request.format !== formats[kind])) {
            throw new Error(`Invalid ${kind} run: ${JSON.stringify({ ...state, requestCount: requests.length, pageErrors })}`);
        }
        console.log(JSON.stringify({ kind, ...state, pageErrors, requests }));
    }
} finally {
    await browser.close();
}
