import Style from 'Core/Style';
import assert from 'assert';
import Fetcher from 'Provider/Fetcher';
import { TextureLoader } from 'three';

const textureLoader = new TextureLoader();
Fetcher.texture = (url, options = {}) => {
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
};

describe('Style', function () {
    const style = new Style();
    style.point.color = 'red';
    style.fill.color = 'blue';
    style.stroke.color = 'black';
    style.text.haloWidth = 1;

    it('Copy style', () => {
        const styleCopy = new Style().copy(style);
        assert.equal(style.point.color, styleCopy.point.color);
        assert.equal(style.fill.color, styleCopy.fill.color);
        assert.equal(style.stroke.color, styleCopy.stroke.color);
    });

    it('Clone style', () => {
        const styleClone = style.clone();
        assert.equal(style.point.color, styleClone.point.color);
        assert.equal(style.fill.color, styleClone.fill.color);
        assert.equal(style.stroke.color, styleClone.stroke.color);
    });

    describe('applyToCanvasPolygon', () => {
        const c = document.createElement('canvas');
        const txtrCtx = c.getContext('2d');
        describe('_applyStrokeToPolygon()', () => {
            const invCtxScale = 0.75;
            style.clone()._applyStrokeToPolygon(txtrCtx, invCtxScale);
            assert.equal(txtrCtx.strokeStyle, style.stroke.color);
            assert.equal(txtrCtx.lineWidth, style.stroke.width * invCtxScale);
            assert.equal(txtrCtx.lineCap, style.stroke.lineCap);
            assert.equal(txtrCtx.globalAlpha, style.stroke.opacity);
        });
        describe('_applyFillToPolygon()', () => {
            it('with fill.pattern = img', function (done) {
                const invCtxScale = 1;
                const polygon = new Path2D();
                const img = document.createElement('img');
                const style1 = style.clone();
                style1.fill.pattern = img;
                style1.fill.opacity = 0.1;
                style1._applyFillToPolygon(txtrCtx, invCtxScale, polygon)
                    .then(() => {
                        assert.equal(txtrCtx.fillStyle.constructor.name, 'CanvasPattern');
                        assert.equal(txtrCtx.globalAlpha, style1.fill.opacity);
                        done();
                    }).catch(done);
            });
            it('with fill.color = #0500fd', function (done) {
                const invCtxScale = 1;
                const polygon = new Path2D();
                const style1 = style.clone();
                style1.fill.color = '#0500fd';
                style1.fill.opacity = 0.2;
                style1._applyFillToPolygon(txtrCtx, invCtxScale, polygon)
                    .then(() => {
                        assert.equal(txtrCtx.fillStyle, '#0500fd');
                        assert.equal(txtrCtx.globalAlpha, style1.fill.opacity);
                        done();
                    }).catch(done);
            });
        });
    });

    describe('applyToHTML', () => {
        it('with no icon.source', () => {
            const dom = document.createElement('canvas');
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
                const style1 = style.clone();
                style1.icon.source = img;
                style1.applyToHTML(dom)
                    .then((icon) => {
                        icon.emitEvent('load');
                        assert.equal(dom.children[0].class, 'itowns-icon');
                        assert.equal(dom.children[0].style['z-index'], -1);
                        done();
                    }).catch(done);
            });
            it('with icon.source as string', function (done) {
                const dom = document.createElement('div');
                const style1 = style.clone();
                style1.icon.source = sourceString;
                style1.applyToHTML(dom)
                    .then((icon) => {
                        icon.emitEvent('load');
                        assert.equal(dom.children[0].class, 'itowns-icon');
                        assert.equal(dom.children[0].style['z-index'], -1);
                        done();
                    }).catch(done);
            });
            it('icon.source as string and icon.color=#0400fd', function (done) {
                const dom = document.createElement('div');
                const style1 = style.clone();
                style1.icon.source = sourceString;
                style1.icon.color = '#0400fd';
                style1.applyToHTML(dom)
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
                const style1 = style.clone();
                style1.icon.id = 'fill-pattern';
                style1.icon.source = 'icon';
                style1.icon.cropValues = { x: 0, y: 0, width: 10, height: 10 };

                style1.applyToHTML(dom)
                    .then((icon) => {
                        icon.emitEvent('load');
                        assert.equal(dom.children[0].class, 'itowns-icon');
                        assert.equal(dom.children[0].style['z-index'], -1);
                        done();
                    }).catch(done);
            });
        });
        describe('icon anchor position (test addIcon())', () => {
            it('icon.anchor is center', function (done) {
                const dom = document.createElement('div');
                const style1 = style.clone();
                style1.icon.source = 'icon';
                style1.applyToHTML(dom)
                    .then((icon) => {
                        icon.emitEvent('load');
                        assert.equal(dom.children[0].style.top, `${-0.5 * icon.height}px`);
                        assert.equal(dom.children[0].style.left, `${-0.5 * icon.width}px`);
                        done();
                    }).catch(done);
            });
            it('icon.anchor is left', function (done) {
                const dom = document.createElement('div');
                const style1 = style.clone();
                style1.icon.source = 'icon';
                style1.icon.anchor = 'left';

                style1.applyToHTML(dom)
                    .then((icon) => {
                        icon.emitEvent('load');
                        assert.equal(dom.children[0].style.top, `${-0.5 * icon.height}px`);
                        assert.equal(dom.children[0].style.left, 0);
                        done();
                    }).catch(done);
            });
            it('icon.anchor is right', function (done) {
                const dom = document.createElement('div');
                const style1 = style.clone();
                style1.icon.source = 'icon';
                style1.icon.anchor = 'right';
                style1.applyToHTML(dom)
                    .then((icon) => {
                        icon.emitEvent('load');
                        assert.equal(dom.children[0].style.top, `${-0.5 * icon.height}px`);
                        assert.equal(dom.children[0].style.left, `${-icon.width}px`);
                        done();
                    }).catch(done);
            });
            it('icon.anchor is top', function (done) {
                const dom = document.createElement('div');
                const style1 = style.clone();
                style1.icon.source = 'icon';
                style1.icon.anchor = 'top';
                style1.applyToHTML(dom)
                    .then((icon) => {
                        icon.emitEvent('load');
                        assert.equal(dom.children[0].style.top, 0);
                        assert.equal(dom.children[0].style.left, `${-0.5 * icon.height}px`);
                        done();
                    }).catch(done);
            });
            it('icon.anchor is bottom', function (done) {
                const dom = document.createElement('div');
                const style1 = style.clone();
                style1.icon.source = 'icon';
                style1.icon.anchor = 'bottom';
                style1.applyToHTML(dom)
                    .then((icon) => {
                        icon.emitEvent('load');
                        assert.equal(dom.children[0].style.top, `${-icon.height}px`);
                        assert.equal(dom.children[0].style.left, `${-0.5 * icon.width}px`);
                        done();
                    }).catch(done);
            });
            it('icon.anchor is bottom-left', function (done) {
                const dom = document.createElement('div');
                const style1 = style.clone();
                style1.icon.source = 'icon';
                style1.icon.anchor = 'bottom-left';
                style1.applyToHTML(dom)
                    .then((icon) => {
                        icon.emitEvent('load');
                        assert.equal(dom.children[0].style.top, `${-icon.height}px`);
                        assert.equal(dom.children[0].style.left, 0);

                        done();
                    }).catch(done);
            });
            it('icon.anchor is bottom-right', function (done) {
                const dom = document.createElement('div');
                const style1 = style.clone();
                style1.icon.source = 'icon';
                style1.icon.anchor = 'bottom-right';
                style1.applyToHTML(dom)
                    .then((icon) => {
                        icon.emitEvent('load');
                        assert.equal(dom.children[0].style.top, `${-icon.height}px`);
                        assert.equal(dom.children[0].style.left, `${-icon.width}px`);
                        done();
                    }).catch(done);
            });
            it('icon.anchor is top-left', function (done) {
                const dom = document.createElement('div');
                const style1 = style.clone();
                style1.icon.source = 'icon';
                style1.icon.anchor = 'top-left';
                style1.applyToHTML(dom)
                    .then((icon) => {
                        icon.emitEvent('load');
                        assert.equal(dom.children[0].style.top, 0);
                        assert.equal(dom.children[0].style.left, 0);
                        done();
                    }).catch(done);
            });
            it('icon.anchor is top-right', function (done) {
                const dom = document.createElement('div');
                const style1 = style.clone();
                style1.icon.source = 'icon';
                style1.icon.anchor = 'top-right';
                style1.applyToHTML(dom)
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
