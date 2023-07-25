import { processMessage } from 'Workers/potree2-brotli-decoder';

if (typeof module === 'undefined' || typeof exports === 'undefined') {
    onmessage = async function onMessage({ data }) {
        const {
            message,
            transferables,
        } = await processMessage(data);
        postMessage(message, transferables);
    };
}
