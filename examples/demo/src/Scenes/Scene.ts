import * as itowns from 'itowns';
import View from '../Views/View';

export type Scene = {
    placement: {
        coord: { long: number, lat: number },
        range: number,
        tilt: number,
        heading: number,
    },
    layers: itowns.Layer[],
    view: View,
    onEnter: () => void,
    onExit: () => void,
};
