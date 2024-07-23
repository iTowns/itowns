import { Matrix3Tuple, Vector2Tuple, Vector3Tuple } from 'three';
import { BuiltinType, Dependency, type Source } from 'Graph/Types';
import { Extent, Fetcher } from 'Main';
import Cache from 'Core/Scheduler/Cache';
import SourceNode from './SourceNode';

type OISDescriptor = {
    url: string,
    crs: string,
    orientationsUrl?: string,
    calibrationUrl?: string,
}

type CameraCalibrationData = {
    /** Camera ID */
    id: number,
    // TODO: Add documentation
    mask?: string,
    /** Rotation matrix */
    rotation: Matrix3Tuple,
    /** Translation vector */
    position: Vector3Tuple,
    /** Camera intrinsic matrix */
    projection: Matrix3Tuple,
    /** Width and height */
    size: Vector2Tuple,
    distortion: {
        /** Principal Point of Symmetry */
        pps: Vector2Tuple,
        // TODO: Add documentation
        poly357: Vector3Tuple,
        limit: number,
    },
    // TODO: Find spec for calibration data and remove this catch-all
} & { [name: string]: unknown };

type OrientationsData = {
    type: string,
    features: {
        type: string,
        geometry: {
            type: string,
            coordinates: Vector3Tuple,
        },
        properties: {
            id: number,
            easting: number,
            northing: number,
            altitude: number,
            heading: number,
            roll: number,
            pitch: number,
            date: Date,
        }
    }[],
    properties: CameraCalibrationData[],
    crs: {
        type: string,
        properties: {
            code: number,
        },
    },
};

type OISConfig = { calibration: CameraCalibrationData[], orientations: OrientationsData };

type OISDataLoadInput = { crs: string };

// FIXME: replace unknown with the actual types
export class OrientedImageSource implements Source<OISDataLoadInput, unknown> {
    private url: string;
    private crs: string;
    private whenReady: Promise<OISConfig>;
    private cache: { [crs: string]: Cache };

    constructor(descriptor: OISDescriptor) {
        this.url = descriptor.url;
        this.crs = descriptor.crs;

        const promises = [
            descriptor.calibrationUrl ? Fetcher.json(descriptor.calibrationUrl) : Promise.resolve(),
            descriptor.orientationsUrl ? Fetcher.json(descriptor.orientationsUrl) : Promise.resolve(),
        ];

        this.whenReady = Promise.all(promises).then(([calibration, orientations]) => ({
            calibration: calibration as CameraCalibrationData[],
            orientations: orientations as OrientationsData,
        }));

        this.cache = {};
    }

    public loadData(extent: Extent, input: OISDataLoadInput): Promise<unknown> {
        const cache = this.getCache(input.crs);

        const key = this.requestToKey(extent);

        // TODO:
        throw new Error('Method not implemented.');
    }

    private imageUrl(cameraId: string, panoId: string): string {
        return this.url.replace('{cameraId}', cameraId).replace('{panoId}', panoId);
    }

    // TODO:
    private requestToKey(extent: Extent): unknown {
        throw new Error('Method not implemented.');
    }

    private getCache(crs: string): Cache {
        if (this.cache[crs] === undefined) {
            this.cache[crs] = new Cache();
        }
        return this.cache[crs];
    }

    public removeCache(crs: string): void {
        delete this.cache[crs];
    }
}

export default class OrientedImageSourceNode extends SourceNode {
    constructor(
        url: Dependency,
        crs: Dependency,
        orientationsUrl?: Dependency,
        calibrationUrl?: Dependency,
    ) {
        super(
            args => new OrientedImageSource(args as OISDescriptor),
            url,
            crs,
            {
                ...(orientationsUrl ? { orientationsUrl: [orientationsUrl, BuiltinType.String] } : {}),
                ...(calibrationUrl ? { calibrationUrl: [calibrationUrl, BuiltinType.String] } : {}),
            },
        );
    }
}
