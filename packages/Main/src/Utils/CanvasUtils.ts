let ctx2D: CanvasRenderingContext2D;
let rCtx2D: CanvasRenderingContext2D;

/**
 * Creates a dedicated 2D canvas context.
 *
 * @remarks
 * The caller has exclusive ownership of the returned context and may safely
 * retains it across asynchronous work.
 *
 * @param width - Canvas width (in pixels)
 * @param height - Canvas height (in pixels)
 * @param options - Options passed to {@link HTMLCanvasElement.getContext}
 * @returns A new 2D rendering context sized to `width` x `height`
 */
export function createContext2D(
    width: number, height: number,
    options?: CanvasRenderingContext2DSettings,
): CanvasRenderingContext2D {
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    return canvas.getContext('2d', options) as CanvasRenderingContext2D;
}

/**
 * Returns a shared 2D canvas context for draw-only synchronous work.
 *
 * @remarks
 * The canvas dimensions must be set before use. Setting them clears the canvas
 * and resets its context state.
 *
 * **Warning**: The context is shared and reused between calls, it must not
 * be retained or used across asynchronous work.
 *
 * Use {@link sharedReadContext2D} when frequent pixel access is required.
 *
 * @returns A shared 2D canvas context for draw-only synchronous work.
 */
export function sharedContext2D(): CanvasRenderingContext2D {
    if (!ctx2D) {
        ctx2D = createContext2D(1, 1);
    }
    return ctx2D;
}

/**
 * Returns a shared 2D canvas context for synchronous pixel readback work.
 *
 * @remarks
 * The canvas dimensions must be set before use. Setting them clears the canvas
 * and resets its context state.
 *
 * The context hints the browser that pixel data will be read back frequently
 * (e.g. using {@link CanvasRenderingContext2D.getImageData},
 * {@link HTMLCanvasElement.toDataURL} or {@link HTMLCanvasElement.toBlob}).
 * Browsers may optimize for read performance at the cost of drawing speed.
 *
 * **Warning**: The context is shared and reused between calls, it must not
 * be retained or used across asynchronous work.
 *
 * Use {@link sharedContext2D} for draw-only operations.
 *
 * @returns A shared 2D canvas context for synchronous pixel readback work.
 */
export function sharedReadContext2D(): CanvasRenderingContext2D {
    if (!rCtx2D) {
        rCtx2D = createContext2D(1, 1, { willReadFrequently: true });
    }
    return rCtx2D;
}
