import * as itowns from 'itowns';
import View from '../Views/View';

export type Scene = {
    placement: {
        coord: itowns.Coordinates,
        range: number,
        tilt?: number,
        heading?: number,
    },
    layers: itowns.Layer[],
    view: View,
    ready: boolean,
    event?: () => void,
    onCreate: () => Promise<void>,
    onEnter?: () => void,
    onExit?: () => void,
};
