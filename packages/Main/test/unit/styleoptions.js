import { FEATURE_TYPES } from 'Core/Feature';
import StyleOptions from 'Core/StyleOptions';
import assert from 'assert';
// import { TextureLoader } from 'three';
// import Fetcher from 'Provider/Fetcher';
// import sinon from 'sinon';

describe('StyleOptions', function () {
    // const textureLoader = new TextureLoader();
    // let stubFetcherTexture;
    // before(function () {
    //     stubFetcherTexture = sinon.stub(Fetcher, 'texture')
    //         .callsFake((url, options = {}) => {
    //             let res;
    //             let rej;

    //             textureLoader.crossOrigin = options.crossOrigin;

    //             const promise = new Promise((resolve, reject) => {
    //                 res = resolve;
    //                 rej = reject;
    //             });

    //             textureLoader.load(url, (x) => {
    //                 x.image = document.createElement('img');
    //                 return res(x);
    //             }, () => {}, rej);
    //             return promise;
    //         });
    // });

    // after(function () {
    //     stubFetcherTexture.restore();
    // });

    describe('setFromProperties', () => {
        it('FEATURE_TYPES.POINT', () => {
            const properties = {
                radius: 2,
                'label-color': '#eba55f',
                'icon-color': '#eba55f',
            };
            const style = StyleOptions.setFromProperties(properties, { type: FEATURE_TYPES.POINT });
            assert.equal(style.point.radius, 2);
            assert.equal(style.text.color, '#eba55f');
            assert.equal(style.icon.color, '#eba55f');
        });
        it('FEATURE_TYPES.POLYGON', () => {
            const properties = {
                fill: '#eba55f',
                stroke: '#eba55f',
            };
            const style = StyleOptions.setFromProperties(properties, { type: FEATURE_TYPES.POLYGON });
            assert.equal(style.stroke.color, '#eba55f');
            assert.equal(style.fill.color, '#eba55f');
        });
    });

    describe('setFromVectorTileLayer', () => {
        describe('test sub-function', () => {
            it('rgba2rgb(color)', () => {
                const vectorTileLayer = {
                    type: 'fill',
                };
                let style = StyleOptions.setFromVectorTileLayer(vectorTileLayer);
                // origin is undefined
                assert.equal(style.fill.color, undefined);
                // origin has stops or expression
                vectorTileLayer.paint = {
                    'fill-color': {
                        stops: [[10, '#eba55f']],
                    },
                    'fill-outline-color': ['string', 'blue'],
                };
                style = StyleOptions.setFromVectorTileLayer(vectorTileLayer);
                assert.equal(style.fill.color, vectorTileLayer.paint['fill-color']);
                assert.equal(style.stroke.color.constructor.name, 'StyleExpression');
                assert.equal(style.stroke.color.evaluate().constructor.name, 'Color');
                // origin is string (named or hex)
                vectorTileLayer.paint = {
                    'fill-color': 'red',
                    'fill-outline-color': '#aabbccdd',
                };
                style = StyleOptions.setFromVectorTileLayer(vectorTileLayer);
                assert.equal(style.fill.color, vectorTileLayer.paint['fill-color']);
                assert.equal(style.fill.opacity, 1);
                assert.equal(style.stroke.color, '#aabbcc');
                assert.equal(style.stroke.opacity, 221 / 255);
                // origin is string (rgba or hsl)
                vectorTileLayer.paint = {
                    'fill-color': 'rgba(120, 130, 140, 12)',
                    'fill-outline-color': 'hsl(220, 230, 240)',
                };
                style = StyleOptions.setFromVectorTileLayer(vectorTileLayer);
                assert.equal(style.fill.color, 'rgb(120,130,140)');
                assert.equal(style.fill.opacity, 12);
                assert.equal(style.stroke.color, 'hsl(220,230,240)');
                assert.equal(style.stroke.opacity, 1);
            });
        });

        describe("layer.type==='fill'", () => {
            const imgId = 'filler';
            const vectorTileLayer = {
                type: 'fill',
            };
            it('without fill-pattern (or sprites)', () => {
                vectorTileLayer.paint = {
                    'fill-outline-color': '#eba55f',
                    'fill-opacity': 0.5,
                };
                const style = StyleOptions.setFromVectorTileLayer(vectorTileLayer);
                // fill-outline-color
                assert.equal(style.stroke.color, '#eba55f');
                // fill-opacity
                assert.equal(style.fill.opacity, vectorTileLayer.paint['fill-opacity']);
            });

            it('with fill-pattern (and sprites)', () => {
                vectorTileLayer.paint['fill-pattern'] = imgId;
                const sprites = {
                    filler: { x: 0, y: 0, width: 0, height: 0, pixelRatio: 1 },
                    source: 'ImgUrl',
                };
                const style = StyleOptions.setFromVectorTileLayer(vectorTileLayer, sprites);
                // fill-pattern
                assert.equal(style.fill.pattern.id, imgId);
                assert.equal(style.fill.pattern.cropValues, sprites[imgId]);
            });
        });

        it("layer.type==='line'", () => {
            const vectorTileLayer = {
                type: 'line',
                paint: {
                    'line-color': '#eba55f',
                },
            };
            const style = StyleOptions.setFromVectorTileLayer(vectorTileLayer);
            assert.equal(style.stroke.color, '#eba55f');
        });

        it("layer.type==='circle'", () => {
            const vectorTileLayer = {
                type: 'circle',
                paint: {
                    'circle-color': '#eba55f',
                },
            };
            const style = StyleOptions.setFromVectorTileLayer(vectorTileLayer);
            assert.equal(style.point.color, '#eba55f');
        });

        describe("layer.type==='symbol'", () => {
            const vectorTileLayer = {
                type: 'symbol',
            };
            it('without icon-image', () => {
                vectorTileLayer.layout = {
                    'symbol-z-order': 'auto',
                    'text-justify': 'center',
                };
                const style = StyleOptions.setFromVectorTileLayer(vectorTileLayer);
                // symbol-z-order
                assert.equal(style.text.zOrder, 'Y');
                // text-justify
                assert.equal(style.text.justify, vectorTileLayer.layout['text-justify']);
            });

            describe('with icon-image (and sprites)', () => {
                it("with icon-image = 'icon-13'", () => {
                    const imgId = 'icon-13';
                    vectorTileLayer.layout = {
                        'icon-image': imgId,
                    };
                    const sprites = {
                        [imgId]: { x: 0, y: 0, width: 0, height: 0, pixelRatio: 1 },
                        source: 'ImgUrl',
                    };
                    const style = StyleOptions.setFromVectorTileLayer(vectorTileLayer, sprites);
                    assert.equal(style.icon.id, vectorTileLayer.layout['icon-image']);
                    assert.equal(style.icon.cropValues, sprites[vectorTileLayer.layout['icon-image']]);
                });

                it("with icon-image = '{name}'", () => {
                    const imgId = '{name}';
                    vectorTileLayer.layout = {
                        'icon-image': imgId,
                    };
                    const sprites = {
                        [imgId]: { x: 0, y: 0, width: 0, height: 0, pixelRatio: 1 },
                        source: 'ImgUrl',
                    };
                    const style = StyleOptions.setFromVectorTileLayer(vectorTileLayer, sprites);
                    assert.equal(style.icon.id, vectorTileLayer.layout['icon-image']);
                    assert.equal(typeof style.icon.cropValues, 'function');
                });

                it("with icon-image = {stops: [$zoom, 'icon-13']", () => {
                    const imgId = 'icon-13';
                    vectorTileLayer.layout = {
                        'icon-image': {
                            base: 1,
                            stops: [[13, imgId]],
                        },
                    };
                    const sprites = {
                        [imgId]: { x: 0, y: 0, width: 0, height: 0, pixelRatio: 1 },
                        source: 'ImgUrl',
                    };
                    const style = StyleOptions.setFromVectorTileLayer(vectorTileLayer, sprites);
                    assert.equal(style.icon.id, vectorTileLayer.layout['icon-image']);
                    assert.equal(style.icon.cropValues.stops[0][1], sprites[vectorTileLayer.layout['icon-image'].stops[0][1]]);
                });

                it("with icon-image = {stops: [$zoom, '{name}']", () => {
                    const imgId = '{name}';
                    vectorTileLayer.layout = {
                        'icon-image': {
                            base: 1,
                            stops: [[13, imgId]],
                        },
                    };
                    const sprites = {
                        [imgId]: { x: 0, y: 0, width: 0, height: 0, pixelRatio: 1 },
                        source: 'ImgUrl',
                    };
                    const style = StyleOptions.setFromVectorTileLayer(vectorTileLayer, sprites);
                    assert.equal(style.icon.id, vectorTileLayer.layout['icon-image']);
                    assert.equal(typeof style.icon.cropValues.stops[0][1], 'function');
                });
            });
        });
    });
});
