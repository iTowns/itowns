/* global before, describe, it */
import jsdom from 'jsdom';
import assert from 'assert';
import fs from 'fs';
import provider, { _testing } from '../src/Core/Scheduler/Providers/WMS_Provider';
import Extent from '../src/Core/Geographic/Extent';

const { JSDOM } = jsdom;
const window = new JSDOM().window;
const parser = new window.DOMParser();

function assertExtent(extent, crs, minx, miny, maxx, maxy) {
    assert.equal(extent._crs, crs);
    assert.equal(extent.west(), minx, 'West bound incorrectly parsed');
    assert.equal(extent.south(), miny, 'South bound incorrectly parsed');
    assert.equal(extent.east(), maxx, 'East bound incorrectly parsed');
    assert.equal(extent.north(), maxy, 'North bound incorrectly parsed');
}

describe('WMS Provider >', function () {
    describe('Preprocessing (GetCapabilities disabled >', function () {
        it('should throw an error if layer.projection is missing', function () {
            assert.throws(() => provider.preprocessDataLayer({
                name: 'test',
                disableGetCap: true,
                options: {},
            }), /Layer test: layer.projection is required/);
        });

        it('should throw an error if layer.extent is missing', function () {
            assert.throws(() => provider.preprocessDataLayer({
                name: 'test',
                disableGetCap: true,
                options: {},
                projection: 'EPSG:3857',
            }), /Layer test: layer.extent is required/);
        });

        it('should throw an error if layer.format is not supported', function () {
            assert.throws(() => provider.preprocessDataLayer({
                name: 'test',
                disableGetCap: true,
                options: {},
                projection: 'EPSG:3857',
                extent: { west: 1, east: 2, south: 3, north: 4 },
                format: 'wrong/format',
            }), /Layer test: unsupported format 'wrong\/format', should be one of/);
        });

        it('should default to \'image/png\' format', function () {
            return provider.preprocessDataLayer({
                name: 'test',
                disableGetCap: true,
                options: {},
                projection: 'EPSG:3857',
                extent: { west: 1, east: 2, south: 3, north: 4 },
            }).then((l) => {
                assert.equal(l.format, 'image/png');
            });
        });
    });

    describe('GetCapabilities >', function () {
        describe('CRS parsing >', function () {
            // we test all versions that should support <SRS>CRS1 CRS2 CRS3</SRS> style
            for (const version of ['1.0.0', '1.1.0', '1.1.1']) {
                it(`should parse correctly SRS tag in version ${version} without parent layer`, function () {
                    const xmlString = `
                        <Layer>
                        <SRS>EPSG:1111 EPSG:2222 EPSG:8967</SRS>
                        </Layer>
                        `;
                    const xml = parser.parseFromString(xmlString, 'text/xml');

                    const result = _testing.parseSupportedCrs(version, xml.documentElement);
                    assert.equal(result.size, 3);
                    assert(result.has('EPSG:1111'));
                    assert(result.has('EPSG:2222'));
                    assert(result.has('EPSG:8967'));
                });

                it(`should default to parent layer's SRS list in version ${version}`, function () {
                    const xmlString = `
                        <Layer>
                        <SRS>EPSG:4444 EPSG:2222 EPSG:8967</SRS>
                        <Layer>
                        <Layer id="toTest">
                        <Name>Foo</Name>
                        </Layer>
                        </Layer>
                        </Layer>
                        `;
                    const xml = parser.parseFromString(xmlString, 'text/xml');
                    const xmlNode = xml.getElementById('toTest');

                    const result = _testing.parseSupportedCrs(version, xmlNode);
                    assert.equal(result.size, 3);
                    assert(result.has('EPSG:4444'));
                    assert(result.has('EPSG:2222'));
                    assert(result.has('EPSG:8967'));
                });
            }

            for (const version of ['1.1.0', '1.1.1']) {
                it(`should parse correctly SRS multiple tags in version ${version} without parent layer`, function () {
                    const xmlString = `
                        <Layer>
                        <SRS>EPSG:1111</SRS>
                        <SRS>EPSG:2222</SRS>
                        <SRS>EPSG:8967</SRS>
                        </Layer>
                        `;
                    const xml = parser.parseFromString(xmlString, 'text/xml');

                    const result = _testing.parseSupportedCrs(version, xml.documentElement);
                    assert.equal(result.size, 3);
                    assert(result.has('EPSG:1111'));
                    assert(result.has('EPSG:2222'));
                    assert(result.has('EPSG:8967'));
                });

                it(`should parse correctly SRS multiple tags in version ${version} with parent layer`, function () {
                    const xmlString = `
                        <Layer>
                        <SRS>EPSG:4444</SRS>
                        <Layer>
                        <SRS>EPSG:2222</SRS>
                        <Layer id="toTest">
                        <SRS> EPSG:8967</SRS>
                        <SRS>EPSG:3333</SRS>
                        <Name>Foo</Name>
                        </Layer>
                        </Layer>
                        </Layer>
                        `;
                    const xml = parser.parseFromString(xmlString, 'text/xml');
                    const xmlNode = xml.getElementById('toTest');

                    const result = _testing.parseSupportedCrs(version, xmlNode);
                    assert.equal(result.size, 4);
                    assert(result.has('EPSG:4444'));
                    assert(result.has('EPSG:2222'));
                    assert(result.has('EPSG:3333'));
                    assert(result.has('EPSG:8967'));
                });
            }

            it('should parse correctly CRS multiple tags in version 1.3.0 without parent layer', function () {
                const xmlString = `
                    <Layer>
                    <CRS>EPSG:1111</CRS>
                    <CRS>EPSG:2222</CRS>
                    <CRS>EPSG:8967</CRS>
                    </Layer>
                    `;
                const xml = parser.parseFromString(xmlString, 'text/xml');

                const result = _testing.parseSupportedCrs('1.3.0', xml.documentElement);
                assert.equal(result.size, 3);
                assert(result.has('EPSG:1111'));
                assert(result.has('EPSG:2222'));
                assert(result.has('EPSG:8967'));
            });

            it('should parse correctly CRS multiple tags in version 1.3.0 with parent layer', function () {
                const xmlString = `
                    <Layer>
                    <CRS>EPSG:4444</CRS>
                    <Layer id="toTest1">
                    <CRS>EPSG:2222</CRS>
                    <Layer id="toTest2">
                    <CRS> EPSG:8967</CRS>
                    <CRS>EPSG:3333</CRS>
                    <Name>Foo</Name>
                    </Layer>
                    </Layer>
                    </Layer>
                    `;
                const xml = parser.parseFromString(xmlString, 'text/xml');
                const xmlNode = xml.getElementById('toTest1');

                const result = _testing.parseSupportedCrs('1.3.0', xmlNode);

                assert.equal(result.size, 2);
                assert(result.has('EPSG:4444'));
                assert(result.has('EPSG:2222'));

                const result2 = _testing.parseSupportedCrs('1.3.0', xml.getElementById('toTest2'));
                assert.equal(result2.size, 4);
                assert(result2.has('EPSG:4444'));
                assert(result2.has('EPSG:2222'));
                assert(result2.has('EPSG:3333'));
                assert(result2.has('EPSG:8967'));
            });
        });

        describe('Format parsing >', function () {
            it('should parse correctly v1.0.0 formats', function () {
                const xmlString = `
                    <WMTS_MS_Capabilities>
                        <Capability>
                            <Request>
                                <Map>
                                    <Format>
                                        <PNG />
                                        <JPEG />
                                        <SVG />
                                    </Format>
                                </Map>
                            </Request>
                        </Capability>
                    </WMTS_MS_Capabilities>
                    `;
                const xml = parser.parseFromString(xmlString, 'text/xml');
                const result = _testing.parseSupportedFormats('1.0.0', xml);
                assert.deepEqual(result, ['image/png', 'image/jpeg', 'image/svg+xml']);
            });

            for (const version of ['1.1.0', '1.1.1', '1.3.0']) {
                it(`should correctly parse formats in version ${version}`, function () {
                    const xmlString = `
                        <WMTS_MS_Capabilities>
                            <Capability>
                                <Request>
                                    <GetMap>
                                        <Format>image/png</Format>
                                        <Format>image/jpeg</Format>
                                        <Format>image/gif</Format>
                                    </GetMap>
                                </Request>
                            </Capability>
                        </WMTS_MS_Capabilities>
                        `;
                    const xml = parser.parseFromString(xmlString, 'text/xml');
                    const result = _testing.parseSupportedFormats(version, xml);
                    assert.deepEqual(result, ['image/png', 'image/jpeg', 'image/gif']);
                });
            }
        });

        describe('Extent parsing >', function () {
            for (const version of ['1.0.0', '1.1.0', '1.1.1', '1.3.0']) {
                const geographicBBTagName = version === '1.3.0' ? 'EX_GeographicBoundingBox' : 'LatLonBoundingBox';
                const crsAttrName = version === '1.3.0' ? 'CRS' : 'SRS';
                it(`should parse bounding box of given CRS in version ${version}`, function () {
                    const layerXml = `
                        <Layer>
                            <${geographicBBTagName} minx="2" miny="3" maxx="4" maxy="9" />
                            <BoundingBox ${crsAttrName}="CRS:84" minx="1" miny="2" maxx="3" maxy="4" />
                            <BoundingBox ${crsAttrName}="EPSG:3857" minx="5" miny="6" maxx="7" maxy="8" />
                        </Layer>`;
                    const layerCapa = parser.parseFromString(layerXml, 'text/xml').documentElement;
                    const result = _testing.parseExtent(version, 'EPSG:3857', layerCapa);
                    assertExtent(result, 'EPSG:3857', 5, 6, 7, 8);
                });

                it(`should default to parent's bounding box of given CRS in version ${version}`, function () {
                    const layerXml = `
                        <Layer>
                            <BoundingBox ${crsAttrName}="EPSG:3857" minx="5" miny="6" maxx="7" maxy="8" />
                            <Layer id="toTest">
                                <${geographicBBTagName} minx="2" miny="3" maxx="4" maxy="9" />
                                <BoundingBox ${crsAttrName}="CRS:84" minx="1" miny="2" maxx="3" maxy="4" />
                            </Layer>
                        </Layer>`;
                    const layerCapa = parser.parseFromString(layerXml, 'text/xml').getElementById('toTest');
                    assertExtent(_testing.parseExtent(version, 'EPSG:3857', layerCapa), 'EPSG:3857', 5, 6, 7, 8);
                });

                it(`should fallback to CRS:84 bounding box in version ${version}`, function () {
                    const layerXml = `
                        <Layer>
                            <${geographicBBTagName} minx="2" miny="3" maxx="4" maxy="9" />
                            <BoundingBox ${crsAttrName}="CRS:84" minx="1" miny="2" maxx="3" maxy="4" />
                            <BoundingBox ${crsAttrName}="EPSG:4269" minx="5" miny="6" maxx="7" maxy="8" />
                        </Layer>`;
                    const layerCapa = parser.parseFromString(layerXml, 'text/xml').documentElement;
                    const result = _testing.parseExtent(version, 'EPSG:3857', layerCapa);
                    assertExtent(result, 'CRS:84', 1, 2, 3, 4);
                });

                it(`should fallback to parent's CRS:84 bounding box in version ${version}`, function () {
                    const layerXml = `
                        <Layer>
                            <BoundingBox ${crsAttrName}="CRS:84" minx="1" miny="2" maxx="3" maxy="4" />
                            <Layer id="toTest">
                                <${geographicBBTagName} minx="2" miny="3" maxx="4" maxy="9" />
                                <BoundingBox ${crsAttrName}="EPSG:4269" minx="5" miny="6" maxx="7" maxy="8" />
                            </Layer>
                        </Layer>`;
                    const layerCapa = parser.parseFromString(layerXml, 'text/xml').getElementById('toTest');
                    assertExtent(_testing.parseExtent(version, 'EPSG:3857', layerCapa), 'CRS:84', 1, 2, 3, 4);
                });

                it(`should fallback to any other bounding box in version ${version}`, function () {
                    const layerXml = `
                        <Layer>
                            <${geographicBBTagName} minx="2" miny="3" maxx="4" maxy="9" />
                            <BoundingBox ${crsAttrName}="EPSG:4269" minx="5" miny="6" maxx="7" maxy="8" />
                        </Layer>`;
                    const layerCapa = parser.parseFromString(layerXml, 'text/xml').documentElement;
                    const result = _testing.parseExtent(version, 'EPSG:3857', layerCapa);
                    assertExtent(result, 'EPSG:4269', 5, 6, 7, 8);
                });

                it(`should fallback to any other parent's bounding box in version ${version}`, function () {
                    const layerXml = `
                        <Layer>
                            <BoundingBox ${crsAttrName}="EPSG:4269" minx="5" miny="6" maxx="7" maxy="8" />
                            <Layer id="toTest">
                                <${geographicBBTagName} minx="2" miny="3" maxx="4" maxy="9" />
                            </Layer>
                        </Layer>`;
                    const layerCapa = parser.parseFromString(layerXml, 'text/xml').getElementById('toTest');
                    assertExtent(_testing.parseExtent(version, 'EPSG:3857', layerCapa), 'EPSG:4269', 5, 6, 7, 8);
                });

                // in rigor, this is forbidden by the specs in version 1.3.0, but that's the server problem.
                it(`should fallback to geographic bound if no bounding box is either present in children or parent in ${version}`, function () {
                    const layerXml = `
                        <Layer>
                            <${geographicBBTagName} minx="2" miny="3" maxx="4" maxy="9" />
                        </Layer>
                        `;
                    const layerCapa = parser.parseFromString(layerXml, 'text/xml').documentElement;
                    assertExtent(_testing.parseExtent(version, 'EPSG:3857', layerCapa), 'CRS:84', 2, 3, 4, 9);
                });


                it(`should fallback to geographic bound if no bounding box is either present in children or parent in ${version}`, function () {
                    const layerXml = `
                        <Layer>
                        <${geographicBBTagName} minx="2" miny="3" maxx="4" maxy="9" />
                            <Layer id="toTest">
                            </Layer>
                        </Layer>
                        `;
                    const layerCapa = parser.parseFromString(layerXml, 'text/xml').getElementById('toTest');
                    assertExtent(_testing.parseExtent(version, 'EPSG:3857', layerCapa), 'CRS:84', 2, 3, 4, 9);
                });
            }
        });

        describe('GetCap >', function () {
            let getCapResult;
            before(function (done) {
                fs.readFile('./test/fixtures/getCapBgs.xml', (err, data) => {
                    if (err) done(err);

                    getCapResult = new window.DOMParser().parseFromString(data, 'text/xml');
                    done();
                });
            });

            it('should find the right layer', function () {
                const layerXml = `
                    <Layer>
                        <Name>bazz</Name>
                        <Layer id="layer">
                            <Name>foo</Name>
                            <Layer>
                                <Name>bar</Name>
                            </Layer>
                        </Layer>
                    </Layer>
                    `;
                const layerCapa = parser.parseFromString(layerXml, 'text/xml');
                const result = _testing.findXmlLayer('foo', layerCapa);
                assert.equal(result.getAttribute('id'), 'layer');
            });

            it('should check layer.name', function () {
                // wrong name
                const layer = {
                    name: 'foo',
                    projection: 'EPSG:3857',
                    version: '1.3.0',
                    format: 'image/png',
                };
                assert.throws(() => _testing.checkCapabilities(layer, getCapResult), /Cannot find layer foo in capabilities/);

                // good name
                layer.name = 'GBR_BGS_625k_BLT';
                _testing.checkCapabilities(layer, getCapResult);
            });

            it('should check layer projection', function () {
                const layer = {
                    name: 'GBR_BGS_625k_BLT',
                    projection: 'EPSG:3858',
                    version: '1.3.0',
                    format: 'image/png',
                };
                assert.throws(() => _testing.checkCapabilities(layer, getCapResult), /Layer GBR_BGS_625k_BLT does not support projection EPSG:3858/);

                layer.projection = 'EPSG:3857';
                _testing.checkCapabilities(layer, getCapResult);
            });

            it('should check layer format', function () {
                const layer = {
                    name: 'GBR_BGS_625k_BLT',
                    projection: 'EPSG:3857',
                    version: '1.3.0',
                    format: 'image/foo',
                };
                assert.throws(() => _testing.checkCapabilities(layer, getCapResult), /Declared layer.format image\/foo is not supported by the wms server for GBR_BGS_625k_BLT/);

                layer.format = 'image/png';
                _testing.checkCapabilities(layer, getCapResult);
            });

            it('should set layer extent if not configured', function () {
                const layer = {
                    name: 'GBR_BGS_625k_BLT',
                    projection: 'EPSG:3857',
                    version: '1.3.0',
                    format: 'image/png',
                };
                _testing.checkCapabilities(layer, getCapResult);
                assert(layer.extent);
                assertExtent(layer.extent, 'EPSG:3857', -962742, 6.42272e+006, 196776, 8.59402e+006);
                assertExtent(layer.validExtent, 'EPSG:3857', -962742, 6.42272e+006, 196776, 8.59402e+006);
            });

            it('should check layer extent and set it to intersection with validityExtent', function () {
                let layer = {
                    name: 'GBR_BGS_625k_BLT',
                    projection: 'EPSG:3857',
                    version: '1.3.0',
                    format: 'image/png',
                    extent: new Extent('EPSG:3857', -90000, 150000, 7e+006, 8e+006),
                };
                // should not throw
                _testing.checkCapabilities(layer, getCapResult);
                assertExtent(layer.validExtent, 'EPSG:3857', -962742, 6.42272e+006, 196776, 8.59402e+006);
                assertExtent(layer.extent, 'EPSG:3857', -90000, 7e+006, 150000, 8e+006);

                layer = {
                    name: 'GBR_BGS_625k_BLT',
                    projection: 'EPSG:3857',
                    version: '1.3.0',
                    format: 'image/png',
                    extent: new Extent('EPSG:3857', -100000, 150000, 7e+006, 9e+006),
                };
                _testing.checkCapabilities(layer, getCapResult);
                assertExtent(layer.validExtent, 'EPSG:3857', -962742, 6.42272e+006, 196776, 8.59402e+006);
                assertExtent(layer.extent, 'EPSG:3857', -100000, 7e+006, 150000, 8.59402e+006);
            });

            it('should throw an exception if layer.extent is completely outside validExtent', function () {
                const layer = {
                    name: 'GBR_BGS_625k_BLT',
                    projection: 'EPSG:3857',
                    version: '1.3.0',
                    format: 'image/png',
                    extent: new Extent('EPSG:3857', 200000, 250000, 7e+006, 9e+006),
                };
                assert.throws(() => _testing.checkCapabilities(layer, getCapResult), /Layer.extent outside of validity extent for layer GBR_BGS_625k_BLT/);
            });
        });
    });
});
