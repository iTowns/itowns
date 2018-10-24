import {
    TextDecoder as TextDecoderPolyfill,
} from 'text-encoding-utf-8';

export const TextDecoder = typeof global.TextDecoder === 'function' ? global.TextDecoder : TextDecoderPolyfill;

export default new TextDecoder('utf-8');
