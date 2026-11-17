import type { Coordinates } from '@itowns/geographic';

/**
 * Options used to transform a camera to look at a coordinate or extent.
 *
 * @category Controls
 */
export interface CameraTransformOptions {
    /** Camera look-at geographic coordinate. */
    coord?: Coordinates;
    /** Camera tilt, in degrees. */
    tilt?: number;
    /** Camera heading, in degrees. */
    heading?: number;
    /** Camera distance to target coordinate, in meters. */
    range?: number;
    /** Animation duration, in milliseconds. */
    time?: number;
    /** Use a proxy to handle the camera transformation. */
    proxy?: boolean;
    /** Easing function for the animation. */
    easing?: (amount: number) => number;
    /** Callback called on each animation frame. */
    callback?: (transform: unknown) => void;
    /** Stop placing the target on the ground when the animation ends. */
    stopPlaceOnGroundAtEnd?: boolean;
}
