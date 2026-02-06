import assert from 'assert';
import { HttpsProxyAgent } from 'https-proxy-agent';
import LASParser from 'Parser/LASParser';
import Fetcher from 'Provider/Fetcher';
import proj4 from 'proj4';
import OBB from 'Renderer/OBB';
import { compareWithEpsilon } from './utils';


const baseurl = 'https://raw.githubusercontent.com/iTowns/iTowns2-sample-data/master/pointclouds';
const lasUrl = `${baseurl}/data_test.las`;

const url = 'https://github.com/connormanning/copc.js/raw/master/src/test/data';
const lazV14Url = `${url}/ellipsoid-1.4.laz`;

const copcUrl = `${url}/ellipsoid.copc.laz`;

describe('LASParser', function () {
    let lasData;
    let lazV14Data;
    let copcData;
    describe('fetch binaries', function () {
        const networkOptions = process.env.HTTPS_PROXY ? { agent: new HttpsProxyAgent(process.env.HTTPS_PROXY) } : {};
        it('fetch las data', async function () {
            lasData = await Fetcher.arrayBuffer(lasUrl, networkOptions);
        });
        it('fetch laz data', async function () {
            lazV14Data = await Fetcher.arrayBuffer(lazV14Url, networkOptions);
        });
        it('fetch copc data', async function _it() {
            copcData = await Fetcher.arrayBuffer(copcUrl, networkOptions);
        });
    });

    describe('unit tests', function _describe() {
        const epsilon = 0.01;
        LASParser.enableLazPerf('../../examples/libs/laz-perf');

        afterEach(async function () {
            await LASParser.terminate();
        });

        it('parses a las file to a THREE.BufferGeometry (with reprojection)', async function () {
            if (!lasData) { this.skip(); }
            proj4.defs('EPSG:2994', '+proj=lcc +lat_0=41.75 +lon_0=-120.5 +lat_1=43 +lat_2=45.5 +x_0=399999.9999984 +y_0=0 ' +
                '+ellps=GRS80 +towgs84=-0.991,1.9072,0.5129,-1.25033e-07,-4.6785e-08,-5.6529e-08,0 +units=ft +no_defs +type=crs');

            const boundsConforming = [
                635616, 848977, 407,
                638864, 853362, 536,
            ];
            const clampOBB = new OBB().setFromArray(boundsConforming);
            clampOBB.projOBB('EPSG:2994', 'EPSG:4978');

            const pointCount = 106;

            const options = {
                in: {
                    source: {
                        crs: 'EPSG:2994',
                    },
                    clampOBB,
                    crs: 'EPSG:4978',
                },
            };
            const bufferGeometry = await LASParser.parse(lasData, options);
            assert.strictEqual(bufferGeometry.attributes.position.count, pointCount);
            assert.strictEqual(bufferGeometry.attributes.intensity.count, pointCount);
            assert.strictEqual(bufferGeometry.attributes.classification.count, pointCount);
            assert.strictEqual(bufferGeometry.attributes.color, undefined, 'bufferGeometry.attributes.color');

            assert.ok(compareWithEpsilon(bufferGeometry.boundingBox.min.z, boundsConforming[2], epsilon * boundsConforming[2]), 'bufferGeometry.boundingBox.min.z');
            assert.ok(compareWithEpsilon(bufferGeometry.boundingBox.max.z, boundsConforming[5], epsilon * boundsConforming[2]), 'bufferGeometry.boundingBox.max.z');
        });

        it('parses a laz file to a THREE.BufferGeometry', async function () {
            if (!lazV14Data) { this.skip(); }
            const boundsConforming = [
                -8242746, 4966506, -50,
                -8242446, 4966706, 50,
            ];
            const clampOBB = new OBB().setFromArray(boundsConforming);

            const pointCount = 100000;

            const options = {
                in: {
                    source: {
                        crs: 'EPSG:3857',
                    },
                    clampOBB,
                    crs: 'EPSG:3857',
                },
            };
            const bufferGeometry = await LASParser.parse(lazV14Data, options);

            const origin = bufferGeometry.userData.position;


            assert.strictEqual(bufferGeometry.attributes.position.count, pointCount);
            assert.strictEqual(bufferGeometry.attributes.intensity.count, pointCount);
            assert.strictEqual(bufferGeometry.attributes.classification.count, pointCount);
            assert.strictEqual(bufferGeometry.attributes.color.count, pointCount);

            assert.ok(compareWithEpsilon(bufferGeometry.boundingBox.min.x + origin.x, boundsConforming[0], epsilon), 'min.x');
            assert.ok(compareWithEpsilon(bufferGeometry.boundingBox.min.y + origin.y, boundsConforming[1], epsilon), 'min.y');
            assert.ok(compareWithEpsilon(bufferGeometry.boundingBox.min.z + origin.z, boundsConforming[2], epsilon), 'min.z');
            assert.ok(compareWithEpsilon(bufferGeometry.boundingBox.max.x + origin.x, boundsConforming[3], epsilon), 'max.x');
            assert.ok(compareWithEpsilon(bufferGeometry.boundingBox.max.y + origin.y, boundsConforming[4], epsilon), 'max.y');
            assert.ok(compareWithEpsilon(bufferGeometry.boundingBox.max.z + origin.z, boundsConforming[5], epsilon), 'max.z');
        });

        it('parses a copc chunk to a THREE.BufferGeometry', async function _it() {
            if (!copcData) { this.skip(); }
            const header = {
                fileSignature: 'LASF',
                fileSourceId: 0,
                globalEncoding: 16,
                projectId: '00000000-0000-0000-0000000000000000',
                majorVersion: 1,
                minorVersion: 4,
                systemIdentifier: '',
                generatingSoftware: '',
                fileCreationDayOfYear: 1,
                fileCreationYear: 1,
                headerLength: 375,
                pointDataOffset: 1424,
                vlrCount: 3,
                pointDataRecordFormat: 7,
                pointDataRecordLength: 36,
                pointCount: 100000,
                pointCountByReturn: [
                    50002, 49998, 0, 0,
                    0,     0, 0, 0,
                    0,     0, 0, 0,
                    0,     0, 0,
                ],
                scale: [0.01, 0.01, 0.01],
                offset: [-8242596, 4966606, 0],
                min: [-8242746, 4966506, -50],
                max: [-8242446, 4966706, 50],
                waveformDataOffset: 0,
                evlrOffset: 630520,
                evlrCount: 1,
            };

            const clampOBB = new OBB().setFromArray([...header.min, ...header.max]);
            const options = {
                in: {
                    source: {
                        crs: 'EPSG:3857',
                        header,
                    },
                    clampOBB,
                    numPoints: header.pointCount,
                    // eb,
                    crs: 'EPSG:3857',
                },
            };
            const bufferGeometry = await LASParser.parseChunk(copcData, options);

            assert.strictEqual(bufferGeometry.attributes.position.count, header.pointCount);
            assert.strictEqual(bufferGeometry.attributes.intensity.count, header.pointCount);
            assert.strictEqual(bufferGeometry.attributes.classification.count, header.pointCount);
            assert.strictEqual(bufferGeometry.attributes.color.count, header.pointCount);
        });
    });
});
