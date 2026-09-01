class CanvasPattern {
    setTransform(/* matrix */) { }
}

class CanvasGradient {
    addColorStop(/* offset, color */) { }
}

export function createRenderingContext2D(canvas) {
    return {
        canvas,
        // CanvasCompositing
        globalAlpha: 1.0,
        globalCompositeOperation: 'source-over',
        // CanvasFillStrokeStyles
        fillStyle: 'black',
        strokeStyle: 'black',
        // CanvasPathDrawingStyles
        lineCap: 'butt',
        lineWidth: 1.0,
        setLineDash: () => { },
        // CanvasDrawImage
        drawImage: (img, sx, sy, sw, sh, dx, dy, dw, dh) => {
            const image = global.document.createElement('img');
            image.width = dw;
            image.height = dh;
            return image;
        },
        // CanvasDrawPath
        beginPath: () => { },
        fill: () => { },
        stroke: () => { },
        // CanvasFillStrokeStyles
        createLinearGradient: (/* x0, y0, x1, y1 */) => {
            const canvasGradient = new CanvasGradient();
            return canvasGradient;
        },
        createPattern: (/* image, repetition */) => {
            const canvasPattern = new CanvasPattern();
            return canvasPattern;
        },
        // CanvasImageData
        getImageData: (sx, sy, sw, sh) => {
            const imageData = {
                data: new Uint8ClampedArray(sw * sh * 4),
                colorSpace: 'srgb',
                height: sh,
                width: sw,
            };
            return imageData;
        },
        putImageData: (imageData) => {
            const image = global.document.createElement('img');
            image.width = imageData.sw;
            image.height = imageData.sh;
            return image;
        },
        // CanvasPath
        arc: () => { },
        lineTo: () => { },
        moveTo: () => { },
        rect: () => { },
        // CanvasRect
        fillRect: () => { },
        // CanvasTransform
        setTransform: () => { },
    };
}
