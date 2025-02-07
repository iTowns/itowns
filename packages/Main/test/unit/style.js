import Style from 'Core/Style';
import assert from 'assert';
import { TextureLoader } from 'three';
import Fetcher from 'Provider/Fetcher';
import sinon from 'sinon';

describe('Style', function () {
    const textureLoader = new TextureLoader();
    let stubFetcherTexture;
    before(function () {
        stubFetcherTexture = sinon.stub(Fetcher, 'texture')
            .callsFake((url, options = {}) => {
                let res;
                let rej;

                textureLoader.crossOrigin = options.crossOrigin;

                const promise = new Promise((resolve, reject) => {
                    res = resolve;
                    rej = reject;
                });

                textureLoader.load(url, (x) => {
                    x.image = document.createElement('img');
                    return res(x);
                }, () => {}, rej);
                return promise;
            });
    });

    after(function () {
        stubFetcherTexture.restore();
    });

    const styleOpt = {
        fill: {
            color: 'blue',
            opacity: {
                stops: [[10, '{opacity}']], // Mapbox vectorTile
            },
            pattern: {
                // Mock MapBox StyleExpression() instance
                expression: { evaluate: () => 'pattern' },
            },
            extrusion_height: {
                stops: [[10, (p, ctx) => 10 + ctx.coordinates.z]],
            },
        },
    };
    const ctx = {
        coordinates: { z: -2 },
        properties: {
            opacity: -3,
        },
    };

    const style = new Style(styleOpt);
    style.point.color = 'red';
    style.setContext(ctx);
    // mock StyleContext() instance
    style.context.featureStyle = { stroke: { color: 'pink' } };

    it('Instanciate style from styleOpt and context', function _it() {
        // no default value
        assert.equal(style.point.line, undefined);
        // defaultValue is value
        assert.equal(style.point.radius, 2.0);
        // defaultValue is fonction
        assert.equal(style.point.base_altitude, ctx.coordinates.z);
        // userValue
        assert.equal(style.fill.color, styleOpt.fill.color);
        // userValue with stops & {}
        assert.equal(style.fill.opacity, ctx.properties.opacity);
        // userValue as MapBox expression
        assert.equal(style.fill.pattern, styleOpt.fill.pattern.expression.evaluate());
        // userValue with stops & function
        assert.equal(style.fill.extrusion_height, styleOpt.fill.extrusion_height.stops[0][1](ctx.properties, ctx));
        // value set after instanciation
        assert.equal(style.point.color, 'red');
        // value from Feature.style
        assert.equal(style.stroke.color, style.context.featureStyle.stroke.color);
        assert.equal(style.stroke.color, 'pink');
    });

    describe('applyToCanvasPolygon()', () => {
        const styleOpt = {
            point: {},
            fill: {},
            stroke: {},
            text: {},
        };
        styleOpt.point.color = 'red';
        styleOpt.fill.color = 'blue';
        styleOpt.stroke.color = 'black';
        styleOpt.text.haloWidth = 1;

        const c = document.createElement('canvas');
        const txtrCtx = c.getContext('2d');
        describe('_applyStrokeToPolygon()', () => {
            it('with invCtxScale = 0.75', () => {
                const invCtxScale = 0.75;
                const style = new Style(styleOpt);
                style._applyStrokeToPolygon(txtrCtx, invCtxScale);
                assert.equal(txtrCtx.strokeStyle, style.stroke.color);
                assert.equal(txtrCtx.lineWidth, style.stroke.width * invCtxScale);
                assert.equal(txtrCtx.lineCap, style.stroke.lineCap);
                assert.equal(txtrCtx.globalAlpha, style.stroke.opacity);
            });
        });
        describe('_applyFillToPolygon()', () => {
            it('with fill.pattern = img', function (done) {
                const invCtxScale = 1;
                const polygon = new Path2D();
                const img = document.createElement('img');
                const style = new Style(styleOpt);
                style.fill.pattern = img;
                style.fill.opacity = 0.1;
                style._applyFillToPolygon(txtrCtx, invCtxScale, polygon)
                    .then(() => {
                        assert.equal(txtrCtx.fillStyle.constructor.name, 'CanvasPattern');
                        assert.equal(txtrCtx.globalAlpha, style.fill.opacity);
                        done();
                    }).catch(done);
            });
            it('with fill.color = #0500fd', function (done) {
                const invCtxScale = 1;
                const polygon = new Path2D();
                const style = new Style(styleOpt);
                style.fill.color = '#0500fd';
                style.fill.opacity = 0.2;
                style._applyFillToPolygon(txtrCtx, invCtxScale, polygon)
                    .then(() => {
                        assert.equal(txtrCtx.fillStyle, '#0500fd');
                        assert.equal(txtrCtx.globalAlpha, style.fill.opacity);
                        done();
                    }).catch(done);
            });
        });
    });

    describe('applyToHTML()', () => {
        const styleOpt = {
            point: {},
            fill: {},
            stroke: {},
            text: {},
        };
        styleOpt.point.color = 'red';
        styleOpt.fill.color = 'blue';
        styleOpt.stroke.color = 'black';
        styleOpt.text.haloWidth = 1;

        it('with no icon.source', () => {
            const dom = document.createElement('canvas');
            const style = new Style(styleOpt);
            style.applyToHTML(dom);
            assert.equal(dom.style.padding, '2px');
            assert.equal(dom.style.maxWidth, '10em');
            assert.equal(dom.style.color, '#000000');
            assert.equal(dom.style.fontSize, '16px');
            assert.equal(dom.style.fontFamily, 'Open Sans Regular,Arial Unicode MS Regular,sans-serif');
            assert.equal(dom.style.textTransform, 'none');
            assert.equal(dom.style.letterSpacing, '0em');
            assert.equal(dom.style.textAlign, 'center');
            assert.equal(dom.style['--text_stroke_width'], '1px');
        });

        const sourceString = 'https://earthquake.usgs.gov/earthquakes/feed/v1.0/images/kml_circle.png';
        describe('with icon.source (test getImage())', () => {
            it('with icon.source as img', function (done) {
                const dom = document.createElement('div');
                const img = document.createElement('img');
                const style = new Style(styleOpt);
                style.icon.source = img;
                style.applyToHTML(dom)
                    .then((icon) => {
                        icon.emitEvent('load');
                        assert.equal(dom.children[0].class, 'itowns-icon');
                        assert.equal(dom.children[0].style['z-index'], -1);
                        done();
                    }).catch(done);
            });
            it('with icon.source as string', function (done) {
                const dom = document.createElement('div');
                const style = new Style(styleOpt);
                style.icon.source = sourceString;
                style.applyToHTML(dom)
                    .then((icon) => {
                        icon.emitEvent('load');
                        assert.equal(dom.children[0].class, 'itowns-icon');
                        assert.equal(dom.children[0].style['z-index'], -1);
                        done();
                    }).catch(done);
            });
            it('icon.source as string and icon.color=#0400fd', function (done) {
                const dom = document.createElement('div');
                const style = new Style(styleOpt);
                style.icon.source = sourceString;
                style.icon.color = '#0400fd';
                style.applyToHTML(dom)
                    .then((icon) => {
                        icon.emitEvent('load');
                        assert.equal(dom.children.length, 1);
                        assert.equal(dom.children[0].class, 'itowns-icon');
                        assert.equal(dom.children[0].style['z-index'], -1);
                        done();
                    }).catch(done);
            });
            it('icon.source and cropValues', function (done) {
                const dom = document.createElement('div');
                const style = new Style(styleOpt);
                style.icon.id = 'fill-pattern';
                style.icon.source = 'icon';
                style.icon.cropValues = { x: 0, y: 0, width: 10, height: 10 };

                style.applyToHTML(dom)
                    .then((icon) => {
                        icon.emitEvent('load');
                        assert.equal(dom.children[0].class, 'itowns-icon');
                        assert.equal(dom.children[0].style['z-index'], -1);
                        done();
                    }).catch(done);
            });
        });

        describe('icon anchor position (test addIcon())', () => {
            const style = new Style(styleOpt);
            style.icon.source = 'icon';
            it('icon.anchor is center (default)', function (done) {
                const dom = document.createElement('div');
                style.applyToHTML(dom)
                    .then((icon) => {
                        icon.emitEvent('load');
                        assert.equal(dom.children[0].style.top, `${-0.5 * icon.height}px`);
                        assert.equal(dom.children[0].style.left, `${-0.5 * icon.width}px`);
                        done();
                    }).catch(done);
            });
            it('icon.anchor is left', function (done) {
                const dom = document.createElement('div');
                style.icon.anchor = 'left';

                style.applyToHTML(dom)
                    .then((icon) => {
                        icon.emitEvent('load');
                        assert.equal(dom.children[0].style.top, `${-0.5 * icon.height}px`);
                        assert.equal(dom.children[0].style.left, 0);
                        done();
                    }).catch(done);
            });
            it('icon.anchor is right', function (done) {
                const dom = document.createElement('div');
                style.icon.anchor = 'right';
                style.applyToHTML(dom)
                    .then((icon) => {
                        icon.emitEvent('load');
                        assert.equal(dom.children[0].style.top, `${-0.5 * icon.height}px`);
                        assert.equal(dom.children[0].style.left, `${-icon.width}px`);
                        done();
                    }).catch(done);
            });
            it('icon.anchor is top', function (done) {
                const dom = document.createElement('div');
                style.icon.anchor = 'top';
                style.applyToHTML(dom)
                    .then((icon) => {
                        icon.emitEvent('load');
                        assert.equal(dom.children[0].style.top, 0);
                        assert.equal(dom.children[0].style.left, `${-0.5 * icon.height}px`);
                        done();
                    }).catch(done);
            });
            it('icon.anchor is bottom', function (done) {
                const dom = document.createElement('div');
                style.icon.anchor = 'bottom';
                style.applyToHTML(dom)
                    .then((icon) => {
                        icon.emitEvent('load');
                        assert.equal(dom.children[0].style.top, `${-icon.height}px`);
                        assert.equal(dom.children[0].style.left, `${-0.5 * icon.width}px`);
                        done();
                    }).catch(done);
            });
            it('icon.anchor is bottom-left', function (done) {
                const dom = document.createElement('div');
                style.icon.anchor = 'bottom-left';
                style.applyToHTML(dom)
                    .then((icon) => {
                        icon.emitEvent('load');
                        assert.equal(dom.children[0].style.top, `${-icon.height}px`);
                        assert.equal(dom.children[0].style.left, 0);

                        done();
                    }).catch(done);
            });
            it('icon.anchor is bottom-right', function (done) {
                const dom = document.createElement('div');
                style.icon.anchor = 'bottom-right';
                style.applyToHTML(dom)
                    .then((icon) => {
                        icon.emitEvent('load');
                        assert.equal(dom.children[0].style.top, `${-icon.height}px`);
                        assert.equal(dom.children[0].style.left, `${-icon.width}px`);
                        done();
                    }).catch(done);
            });
            it('icon.anchor is top-left', function (done) {
                const dom = document.createElement('div');
                style.icon.anchor = 'top-left';
                style.applyToHTML(dom)
                    .then((icon) => {
                        icon.emitEvent('load');
                        assert.equal(dom.children[0].style.top, 0);
                        assert.equal(dom.children[0].style.left, 0);
                        done();
                    }).catch(done);
            });
            it('icon.anchor is top-right', function (done) {
                const dom = document.createElement('div');
                style.icon.anchor = 'top-right';
                style.applyToHTML(dom)
                    .then((icon) => {
                        icon.emitEvent('load');
                        assert.equal(dom.children[0].style.top, 0);
                        assert.equal(dom.children[0].style.left, `${-icon.width}px`);
                        done();
                    }).catch(done);
            });
        });
    });
});
