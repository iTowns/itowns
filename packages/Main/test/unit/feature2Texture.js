import assert from 'assert';
import { createSandbox, assert as spyAssert, match as spyMatch } from 'sinon';

import * as THREE from 'three';
import { Extent } from '@itowns/geographic';

import Feature2Texture, {
    applyFillStyle,
    applyStrokeStyle,
    applyPointStyle,
    drawFeature,
    drawPoint,
    drawPolygon,
} from 'Converter/Feature2Texture';
import { FEATURE_TYPES } from 'Core/Feature';

import { createRenderingContext2D } from './stubs/dom';

const canvas = Object.freeze({ width: 300, height: 150 });

function createStroke(options) {
    if (!options.color) { throw new Error('color is required'); }
    return { width: 1, opacity: 1, lineCap: 'butt', dasharray: [], ...options };
}

function createColorFill(options) {
    if (!options.color) { throw new Error('color is required'); }
    // Style properties are getters, returning undefined if not set
    return { pattern: undefined, color: 'black', opacity: 1, ...options };
}

function createImagePatternFill(options) {
    if (!options.pattern) { throw new Error('pattern is required'); }
    // Style properties are getters, returning undefined if not set
    return { color: undefined, opacity: 1, ...options };
}

function createImageRegionPatternFill(options) {
    if (!options?.pattern?.source) { throw new Error('pattern.source is required'); }
    // Style properties are getters, returning undefined if not set
    return { color: undefined, pattern: options.pattern, opacity: 1, ...options };
}

function createPointStyle(options) {
    if (!options.color || !options.line) { throw new Error('color is required'); }
    // Style properties are getters, returning undefined if not set
    return { color: undefined, line: undefined, width: 1, opacity: 1, ...options };
}

function createLayerStyle(options = {}) {
    return { setContext() {}, zoom: {}, ...options };
}

function createCollection(options = {}) {
    return {
        crs: 'EPSG:4326',
        features: [],
        matrixWorld: new THREE.Matrix4(),
        matrixWorldInverse: new THREE.Matrix4(),
        isInverted: false,
        ...options,
    };
}

/**
 * @param {sinon.SinonSandbox} sandbox
 * @param {CanvasRenderingContext2D} context
 * @returns {[CanvasRenderingContext2D, sinon.SinonSpy]} `context` behind a proxy,
 * together with a spy recording each assignment made through that proxy.
 */
function spyRenderingContext2D(sandbox, context) {
    const setProperty = sandbox.spy(Reflect.set);
    return [new Proxy(context, { set: setProperty }), setProperty];
}

/**
 * Hands `context` out to every canvas created while the sandbox is active, so
 * that the context a texture is drawn into can be observed from the test.
 *
 * @param {sinon.SinonSandbox} sandbox
 * @param {CanvasRenderingContext2D} context
 */
function stubTextureContext(sandbox, context) {
    const createElement = document.createElement;
    sandbox.stub(document, 'createElement').callsFake(type => (type === 'canvas' ?
        Object.assign(context.canvas, { getContext: () => context }) :
        createElement(type)));
}

describe('Feature2Texture', function () {
    let /** @type {sinon.SinonSandbox} */ sandbox;

    beforeEach(function () {
        sandbox = createSandbox();
    });

    afterEach(function () {
        sandbox.restore();
    });

    describe('applyStrokeStyle()', function () {
        const scale = 0.75;

        const strokeStyle = createStroke({
            color: 'red',
            width: 2,
            opacity: 0.5,
            lineCap: 'round',
            dasharray: [2, 4],
        });

        let /** @type {CanvasRenderingContext2D} */ context;

        beforeEach(function () {
            context = createRenderingContext2D(canvas);
        });

        it('updates the rendering context from the stroke style', function () {
            const lineDashSpy = sandbox.spy(context, 'setLineDash');
            applyStrokeStyle(context, strokeStyle, scale);

            assert.equal(context.strokeStyle, strokeStyle.color);
            assert.equal(context.lineWidth, 1.5);
            assert.equal(context.globalAlpha, strokeStyle.opacity);
            assert.equal(context.lineCap, strokeStyle.lineCap);
            spyAssert.calledOnceWithExactly(lineDashSpy, [3, 6]);
        });
    });

    describe('applyFillStyle()', function () {
        const scale = 0.75;

        const image = document.createElement('img');
        const colorFill = createColorFill({ color: '#0500fd', opacity: 0.2 });
        const imageFill = createImagePatternFill({ pattern: image, opacity: 0.1 });
        const regionFill = createImageRegionPatternFill({
            pattern: { source: image },
            opacity: 0.1,
        });

        let /** @type {CanvasRenderingContext2D} */ context;

        beforeEach(function () {
            context = createRenderingContext2D(canvas);
        });

        it('updates context from a color fill', async function () {
            await applyFillStyle(context, colorFill, scale);

            assert.equal(context.fillStyle, colorFill.color);
            assert.equal(context.globalAlpha, colorFill.opacity);
        });

        it('updates context from an image pattern fill', async function () {
            await applyFillStyle(context, imageFill, scale);

            assert.equal(context.fillStyle.constructor.name, 'CanvasPattern');
            assert.equal(context.globalAlpha, imageFill.opacity);
        });

        it('updates context from an image region pattern fill', async function () {
            await applyFillStyle(context, regionFill, scale);

            assert.equal(context.fillStyle.constructor.name, 'CanvasPattern');
            assert.equal(context.globalAlpha, regionFill.opacity);
        });
    });

    describe('applyPointStyle()', function () {
        const scale = 0.75;

        const pointStyle = createPointStyle({
            color: 'red',
            line: 'black',
            width: 2,
            opacity: 0.5,
        });

        let /** @type {CanvasRenderingContext2D} */ context;

        beforeEach(function () {
            context = createRenderingContext2D(canvas);
        });

        it('updates context from the point style', function () {
            applyPointStyle(context, pointStyle, scale);

            assert.equal(context.strokeStyle, pointStyle.line);
            assert.equal(context.lineWidth, 1.5);
            assert.equal(context.globalAlpha, pointStyle.opacity);
        });
    });

    describe('drawPolygon()', function () {
        const scale = 0.75;
        const extent = new Extent('EPSG:4326', 0, 1, 0, 1);
        // two segments, the second one lying outside of the extent
        const feature = {
            type: FEATURE_TYPES.LINE,
            vertices: [0.2, 0.3, 0.4, 0.5, 5.2, 5.3, 5.4, 5.5],
            size: 2,
        };
        const geometry = {
            indices: [
                { offset: 0, count: 2, extent: new Extent('EPSG:4326', 0.2, 0.4, 0.3, 0.5) },
                { offset: 2, count: 2, extent: new Extent('EPSG:4326', 5.2, 5.4, 5.3, 5.5) },
            ],
        };

        let /** @type {CanvasRenderingContext2D} */ context;
        let /** @type {sinon.SinonSpy} */ moveToSpy;
        let /** @type {sinon.SinonSpy} */ lineToSpy;

        beforeEach(function () {
            context = createRenderingContext2D(canvas);
            moveToSpy = sandbox.spy(Path2D.prototype, 'moveTo');
            lineToSpy = sandbox.spy(Path2D.prototype, 'lineTo');
        });

        it('builds the path from indices intersecting the extent', function () {
            const style = { stroke: createStroke({ color: 'red' }) };
            const strokeSpy = sandbox.spy(context, 'stroke');

            drawPolygon(context, feature, geometry, style, extent, scale);

            spyAssert.calledOnceWithExactly(moveToSpy, 0.2, 0.3);
            spyAssert.calledOnceWithExactly(lineToSpy, 0.4, 0.5);
            spyAssert.calledOnceWithExactly(strokeSpy, spyMatch.instanceOf(Path2D));
        });

        it('draws nothing when the polygon has no vertices', function () {
            const style = { stroke: createStroke({ color: 'red' }) };
            const strokeSpy = sandbox.spy(context, 'stroke');

            drawPolygon(context, { ...feature, vertices: [] }, geometry, style, extent, scale);

            spyAssert.notCalled(moveToSpy);
            spyAssert.notCalled(strokeSpy);
        });

        it('does not draw a zero-width stroke', function () {
            const style = { stroke: createStroke({ color: 'red', width: 0 }) };
            const strokeSpy = sandbox.spy(context, 'stroke');

            drawPolygon(context, feature, geometry, style, extent, scale);

            spyAssert.notCalled(strokeSpy);
        });

        it('fills only a polygon that can be filled', function () {
            const style = { fill: createColorFill({ color: 'red' }) };
            const fillSpy = sandbox.spy(context, 'fill');

            drawPolygon(context, feature, geometry, style, extent, scale);
            spyAssert.notCalled(fillSpy);

            drawPolygon(context, { ...feature, type: FEATURE_TYPES.POLYGON }, geometry, style, extent, scale);
            spyAssert.calledOnceWithExactly(fillSpy, spyMatch.instanceOf(Path2D));
        });

        it('does not fill when the style has neither color nor pattern', function () {
            const style = { fill: {} };
            const fillSpy = sandbox.spy(context, 'fill');

            drawPolygon(context, { ...feature, type: FEATURE_TYPES.POLYGON }, geometry, style, extent, scale);

            spyAssert.notCalled(fillSpy);
        });
    });

    describe('drawPoint()', function () {
        const scale = 0.75;
        const scaleRadius = 1;
        const extent = new Extent('EPSG:4326', 0, 1, 0, 1);
        const radius = 4;
        // two points, the second one lying outside of the extent
        const feature = {
            vertices: [0.2, 0.3, 5.2, 5.3],
            size: 2,
        };
        const geometry = {
            indices: [
                { offset: 0, count: 1 },
                { offset: 1, count: 1 },
            ],
        };

        let /** @type {CanvasRenderingContext2D} */ context;
        let /** @type {sinon.SinonSpy} */ beginPathSpy;
        let /** @type {sinon.SinonSpy} */ arcSpy;
        let /** @type {sinon.SinonSpy} */ fillSpy;
        let /** @type {sinon.SinonSpy} */ strokeSpy;

        beforeEach(function () {
            context = createRenderingContext2D(canvas);
            beginPathSpy = sandbox.spy(context, 'beginPath');
            arcSpy = sandbox.spy(context, 'arc');
            fillSpy = sandbox.spy(context, 'fill');
            strokeSpy = sandbox.spy(context, 'stroke');
        });

        it('draws points inside the extent', function () {
            const style = { point: createPointStyle({ color: 'red', line: 'black', radius }) };

            drawPoint(context, feature, geometry, style, extent, scale, scaleRadius);

            spyAssert.calledOnce(beginPathSpy);
            spyAssert.calledOnceWithExactly(arcSpy, 0.2, 0.3, 3, 0, 2 * Math.PI, false);
            spyAssert.calledOnce(fillSpy);
            spyAssert.calledOnce(strokeSpy);
        });

        it('draws nothing when the point has no vertices', function () {
            const style = { point: createPointStyle({ color: 'red', line: 'black', radius }) };

            drawPoint(context, { ...feature, vertices: [] }, geometry, style, extent, scale, scaleRadius);

            spyAssert.notCalled(beginPathSpy);
            spyAssert.notCalled(arcSpy);
            spyAssert.notCalled(fillSpy);
            spyAssert.notCalled(strokeSpy);
        });

        it('draws nothing when there is no style', function () {
            drawPoint(context, feature, geometry, {}, extent, scale, scaleRadius);

            spyAssert.notCalled(beginPathSpy);
            spyAssert.notCalled(arcSpy);
            spyAssert.notCalled(fillSpy);
            spyAssert.notCalled(strokeSpy);
        });

        it('does not fill when the style has no color', function () {
            const style = { point: { color: undefined, line: 'black', radius, width: 1, opacity: 1 } };

            drawPoint(context, feature, geometry, style, extent, scale, scaleRadius);

            spyAssert.calledOnce(arcSpy);
            spyAssert.notCalled(fillSpy);
            spyAssert.calledOnce(strokeSpy);
        });

        it('does not stroke when the style has no line', function () {
            const style = { point: { color: 'red', line: undefined, radius, width: 1, opacity: 1 } };

            drawPoint(context, feature, geometry, style, extent, scale, scaleRadius);

            spyAssert.calledOnce(arcSpy);
            spyAssert.calledOnce(fillSpy);
            spyAssert.notCalled(strokeSpy);
        });
    });

    describe('drawFeature()', function () {
        const scale = 0.75;
        const zoom = 10;
        const extent = new Extent('EPSG:4326', 0, 1, 0, 1);
        const vertices = [0.2, 0.3, 0.4, 0.5, 5.2, 5.3, 5.4, 5.5];
        const insideGeometry = {
            extent: new Extent('EPSG:4326', 0.2, 0.4, 0.3, 0.5),
            indices: [{ offset: 0, count: 2, extent: new Extent('EPSG:4326', 0.2, 0.4, 0.3, 0.5) }],
        };
        const outsideGeometry = {
            extent: new Extent('EPSG:4326', 5.2, 5.4, 5.3, 5.5),
            indices: [{ offset: 2, count: 2, extent: new Extent('EPSG:4326', 5.2, 5.4, 5.3, 5.5) }],
        };
        const lineFeature = {
            type: FEATURE_TYPES.LINE,
            vertices,
            size: 2,
            geometries: [insideGeometry, outsideGeometry],
        };
        const polygonFeature = {
            type: FEATURE_TYPES.POLYGON,
            vertices,
            size: 2,
            geometries: [insideGeometry, outsideGeometry],
        };
        const pointFeature = {
            type: FEATURE_TYPES.POINT,
            vertices: [0.2, 0.3],
            size: 2,
            geometries: [{
                extent: new Extent('EPSG:4326', 0.15, 0.25, 0.25, 0.35),
                indices: [{ offset: 0, count: 1 }],
            }],
        };

        let /** @type {CanvasRenderingContext2D} */ context;

        beforeEach(function () {
            context = createRenderingContext2D(canvas);
        });

        it('draws a line from geometries intersecting the extent', function () {
            const style = { zoom: {}, stroke: createStroke({ color: 'red' }) };
            const moveToSpy = sandbox.spy(Path2D.prototype, 'moveTo');
            const strokeSpy = sandbox.spy(context, 'stroke');

            drawFeature(context, lineFeature, style, extent, scale, zoom);

            spyAssert.calledOnceWithExactly(moveToSpy, 0.2, 0.3);
            spyAssert.calledOnceWithExactly(strokeSpy, spyMatch.instanceOf(Path2D));
        });

        it('fills only a polygon feature', function () {
            const style = { zoom: {}, fill: createColorFill({ color: 'red' }) };
            const fillSpy = sandbox.spy(context, 'fill');

            drawFeature(context, lineFeature, style, extent, scale, zoom);
            spyAssert.notCalled(fillSpy);

            drawFeature(context, polygonFeature, style, extent, scale, zoom);
            spyAssert.calledOnceWithExactly(fillSpy, spyMatch.instanceOf(Path2D));
        });

        it('draws a point feature', function () {
            const style = { zoom: {}, point: createPointStyle({ color: 'red', line: 'black', radius: 4 }) };
            const arcSpy = sandbox.spy(context, 'arc');
            const fillSpy = sandbox.spy(context, 'fill');
            const strokeSpy = sandbox.spy(context, 'stroke');

            drawFeature(context, pointFeature, style, extent, scale, zoom);

            spyAssert.calledOnceWithExactly(arcSpy, 0.2, 0.3, 3, 0, 2 * Math.PI, false);
            spyAssert.calledOnce(fillSpy);
            spyAssert.calledOnce(strokeSpy);
        });

        it('does not draw a point feature without a point style', function () {
            const style = { zoom: {} };
            const arcSpy = sandbox.spy(context, 'arc');

            drawFeature(context, pointFeature, style, extent, scale, zoom);

            spyAssert.notCalled(arcSpy);
        });

        it('skips geometries that have no extent', function () {
            const style = { zoom: {}, stroke: createStroke({ color: 'red' }) };
            const strokeSpy = sandbox.spy(context, 'stroke');
            const feature = {
                type: FEATURE_TYPES.LINE,
                vertices,
                size: 2,
                geometries: [{ indices: insideGeometry.indices }],
            };

            drawFeature(context, feature, style, extent, scale, zoom);

            spyAssert.notCalled(strokeSpy);
        });

        it('does not draw when zoom is outside the style range', function () {
            const style = { zoom: { min: 5, max: 10 }, stroke: createStroke({ color: 'red' }) };
            const strokeSpy = sandbox.spy(context, 'stroke');

            drawFeature(context, lineFeature, style, extent, scale, 4);
            drawFeature(context, lineFeature, style, extent, scale, 10);

            spyAssert.notCalled(strokeSpy);
        });
    });

    describe('createTextureFromFeature()', function () {
        const extent = new Extent('EPSG:4326', 0, 1, 0, 1);
        const sizeTexture = 256;
        const zoom = 10;
        const feature = {
            type: FEATURE_TYPES.POLYGON,
            vertices: [0.2, 0.3, 0.4, 0.5],
            size: 2,
            geometries: [{
                extent: new Extent('EPSG:4326', 0.2, 0.4, 0.3, 0.5),
                indices: [{ offset: 0, count: 2, extent: new Extent('EPSG:4326', 0.2, 0.4, 0.3, 0.5) }],
            }],
        };

        let /** @type {CanvasRenderingContext2D} */ context;
        let collection;
        let style;

        beforeEach(function () {
            context = createRenderingContext2D({ width: sizeTexture, height: sizeTexture });
            collection = createCollection({ features: [feature] });
            style = createLayerStyle({ stroke: createStroke({ color: 'red' }) });
        });

        it('returns an empty texture when there is no collection nor background', async function () {
            const texture = await Feature2Texture.createTextureFromFeature(
                null, extent, zoom, sizeTexture,
            );

            assert.ok(texture.isTexture);
            assert.ok(!texture.isCanvasTexture);
            assert.ok(!texture.isDataTexture);
        });

        it('returns a data texture filled with the background color', async function () {
            const backgroundColor = new THREE.Color(1, 0, 0);

            const texture = await Feature2Texture.createTextureFromFeature(
                null, extent, zoom, sizeTexture, undefined, backgroundColor,
            );

            assert.ok(texture.isDataTexture);
            assert.equal(texture.image.data[0], 255);
            assert.equal(texture.image.data[1], 0);
            assert.equal(texture.image.data[2], 0);
        });

        it('returns a canvas texture drawn from the collection', async function () {
            stubTextureContext(sandbox, context);
            const moveToSpy = sandbox.spy(Path2D.prototype, 'moveTo');
            const strokeSpy = sandbox.spy(context, 'stroke');

            const texture = await Feature2Texture.createTextureFromFeature(
                collection, extent, zoom, sizeTexture, style,
            );

            assert.ok(texture.isCanvasTexture);
            assert.equal(texture.image, context.canvas);
            assert.equal(texture.flipY, false);
            spyAssert.calledOnceWithExactly(moveToSpy, 0.2, 0.3);
            spyAssert.calledOnceWithExactly(strokeSpy, spyMatch.instanceOf(Path2D));
        });

        it('flips the texture when the collection is inverted', async function () {
            stubTextureContext(sandbox, context);
            collection.isInverted = true;

            const texture = await Feature2Texture.createTextureFromFeature(
                collection, extent, zoom, sizeTexture, style,
            );

            assert.equal(texture.flipY, true);
        });

        it('fills the canvas with the background color', async function () {
            stubTextureContext(sandbox, context);
            const fillRectSpy = sandbox.spy(context, 'fillRect');
            const backgroundColor = new THREE.Color(1, 0, 0);

            await Feature2Texture.createTextureFromFeature(
                collection, extent, zoom, sizeTexture, style, backgroundColor,
            );

            assert.equal(context.fillStyle, backgroundColor.getStyle());
            spyAssert.calledOnceWithExactly(fillRectSpy, 0, 0, sizeTexture, sizeTexture);
        });
    });
});
