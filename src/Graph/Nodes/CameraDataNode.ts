import { OrthographicCamera, PerspectiveCamera } from 'three';
import { BuiltinType, Dependency } from '../Prelude';
import ProcessorNode from './ProcessorNode';

type CameraLike = PerspectiveCamera | OrthographicCamera;

export default class CameraDataNode extends ProcessorNode {
    constructor(camera: Dependency) {
        super(
            { camera: [camera, BuiltinType.Camera] },
            new Map(Object.entries({
                cameraNear: BuiltinType.Number,
                cameraFar: BuiltinType.Number,
            })),
            (_frame, args) => {
                const camera = args.camera as CameraLike;
                this.updateOutputs({ cameraNear: camera.near, cameraFar: camera.far });
            },
        );
    }
}
