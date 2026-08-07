import Style from 'Core/Style';
import { applyFillToPolygon, applyStrokeToPolygon } from 'Converter/Feature2Texture';
import assert from 'assert';

describe('Feature2Texture', () => {
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

    describe('applyStrokeToPolygon()', () => {
        it('with invCtxScale = 0.75', () => {
            const invCtxScale = 0.75;
            const style = new Style(styleOpt);
            applyStrokeToPolygon(style, txtrCtx, invCtxScale);
            assert.equal(txtrCtx.strokeStyle, style.stroke.color);
            assert.equal(txtrCtx.lineWidth, style.stroke.width * invCtxScale);
            assert.equal(txtrCtx.lineCap, style.stroke.lineCap);
            assert.equal(txtrCtx.globalAlpha, style.stroke.opacity);
        });
    });

    describe('applyFillToPolygon()', () => {
        it('with fill.pattern = img', function (done) {
            const invCtxScale = 1;
            const polygon = new Path2D();
            const img = document.createElement('img');
            const style = new Style(styleOpt);
            style.fill.pattern = img;
            style.fill.opacity = 0.1;
            applyFillToPolygon(style, txtrCtx, invCtxScale, polygon)
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
            applyFillToPolygon(style, txtrCtx, invCtxScale, polygon)
                .then(() => {
                    assert.equal(txtrCtx.fillStyle, '#0500fd');
                    assert.equal(txtrCtx.globalAlpha, style.fill.opacity);
                    done();
                }).catch(done);
        });
    });
});
