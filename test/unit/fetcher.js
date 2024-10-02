import assert from 'assert';
import { HttpsProxyAgent } from 'https-proxy-agent';
import Fetcher from 'Provider/Fetcher';
import { DataTexture, Texture } from 'three';

const itownsdataUrl = 'https://raw.githubusercontent.com/iTowns/iTowns2-sample-data/master';

describe('Fetcher', function () {
    const networkOptions = process.env.HTTPS_PROXY ? { agent: new HttpsProxyAgent(process.env.HTTPS_PROXY) } : {};
    describe('text', function () {
        const url = `${itownsdataUrl}/altitude-conversion-grids/EGM2008.gdf`;
        it('should load a text file', (done) => {
            Fetcher.text(url, networkOptions)
                .then((text) => {
                    const rows = text.split('\n');
                    const firstMeasureLine = rows.indexOf(rows.find(row => row.includes('end_of_head'))) + 1;
                    const rawHeaderData = rows.slice(0, firstMeasureLine);
                    assert.ok(rows.length > 1);
                    assert.equal(rawHeaderData.length, firstMeasureLine);
                    done();
                })
                .catch(done);
        });
        it('should fail [test checkResponse()]', (done) => {
            const url = `${itownsdataUrl}/noFile.txt`;
            let res;
            Fetcher.text(url, networkOptions)
                .then((text) => {
                    res = text;
                })
                .catch((err) => {
                    res = err;
                })
                .finally(() => {
                    if (res.response?.status === 404) {
                        done();
                    } else {
                        done(new Error('response.status !== 404'));
                    }
                });
        });
    });

    describe('json', function () {
        const url =  `${itownsdataUrl}/immersive/exampleParis1/cameraCalibration.json`;
        it('should load a json file', (done) => {
            Fetcher.json(url, networkOptions)
                .then((json) => {
                    assert.ok(Array.isArray(json));
                    assert.ok(Object.keys(json[0]).includes('id'));
                    done();
                })
                .catch(done);
        });
    });

    describe('xml', function () {
        const url =  `${itownsdataUrl}/ULTRA2009.gpx`;
        it('should load a xml file', (done) => {
            Fetcher.xml(url, networkOptions)
                .then((xml) => {
                    assert.ok(Object.keys(xml).includes('childNodes'));
                    assert.ok(xml.childNodes.length > 2);
                    done();
                })
                .catch(done);
        });
    });

    describe('texture', function () {
        // Fetcher.texture always send a texture even with a false url...
        const url = 'https://data.geopf.fr/wmts?' +
        'LAYER=ORTHOIMAGERY.ORTHOPHOTOS&FORMAT=image/jpeg' +
        '&SERVICE=WMTS&VERSION=1.0.0&' +
        'REQUEST=GetTile&STYLE=normal&' +
        'TILEMATRIXSET=PM&TILEMATRIX=2&TILEROW=1&TILECOL=1';
        it('should load a texture', (done) => {
            Fetcher.texture(url, networkOptions)
                .then((texture) => {
                    assert.ok(texture instanceof Texture);
                    assert.ok(texture.isTexture);
                    done();
                })
                .catch(done);
        });
    });

    describe('arrayBuffer', function () {
        const url =  `${itownsdataUrl}/altitude-conversion-grids/RAF20_float.gtx`;
        it('should load a json file', (done) => {
            Fetcher.arrayBuffer(url, networkOptions)
                .then((buffer) => {
                    assert.ok(buffer instanceof ArrayBuffer && buffer.byteLength !== undefined);
                    done();
                })
                .catch(done);
        });
    });

    describe('textureFloat', function () {
        const url = 'https://data.geopf.fr/wmts?' +
        'LAYER=ELEVATION.ELEVATIONGRIDCOVERAGE.SRTM3&FORMAT=image/x-bil;bits=32' +
        '&SERVICE=WMTS&VERSION=1.0.0&REQUEST=GetTile&STYLE=normal&' +
        'TILEMATRIXSET=WGS84G&TILEMATRIX=3&TILEROW=2&TILECOL=8';
        it('should get a WebGl2 texture float', (done) => {
            Fetcher.textureFloat(url, networkOptions)
                .then((texture) => {
                    assert.ok(texture instanceof DataTexture);
                    assert.equal(texture.internalFormat, 'R32F');
                    assert.equal(texture.version, 1);
                    done();
                })
                .catch(done);
        }).timeout(10000);
    });

    describe('multiple', function () {
        const url =  `${itownsdataUrl}/vrt/velib-disponibilite-en-temps-reel`;
        const extension = {
            xml: ['vrt'],
            text: ['csv'],
        };
        const fileExtensions = new Set();
        Object.values(extension).forEach((extension) => {
            fileExtensions.add(...extension);
        });
        it('should load a multi file', (done) => {
            Fetcher.multiple(url, extension, networkOptions)
                .then((res) => {
                    const fileType = new Set(Object.keys(res));
                    assert.ok(fileType.size === fileExtensions.size);
                    assert.ok([...fileType].every(file => fileExtensions.has(file)));
                    done();
                })
                .catch(done);
        });
        it('should fail (fetchType not valid)', (done) => {
            extension.badfetchType = ['badExtension'];
            try {
                Fetcher.multiple(url, extension, networkOptions)
                    .then(() => {
                        const error = new Error('Fetcher.multiple did work');
                        done(error);
                    });
            } catch (err) {
                assert.ok(err instanceof Error);
                assert.equal(err.message, 'badfetchType is not a valid Fetcher method.');
                done();
            }
        });
    });
});

