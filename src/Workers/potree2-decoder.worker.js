import { processMessage } from 'Workers/potree2-decoder';

if (typeof module === 'undefined' || typeof exports === 'undefined') {
    onmessage = function onMessage({ data }) {
        const {
            message,
            transferables,
        } = processMessage(data);
        postMessage(message, transferables);
    };
}
