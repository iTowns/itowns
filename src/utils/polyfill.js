import {
  TextDecoder as TextDecoderPolyfill,
  TextEncoder as TextEncoderPolyfill,
} from 'text-encoding-utf-8';

export const TextDecoder = typeof global.TextDecoder === 'function' ? global.TextDecoder : TextDecoderPolyfill;
export const TextEncoder = typeof global.TextEncoder === 'function' ? global.TextEncoder : TextEncoderPolyfill;
