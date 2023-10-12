import assert from 'assert';
import { TextureLoader } from 'three';
import Style, { cacheStyle } from 'Core/Style';
import Fetcher from 'Provider/Fetcher';

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
        const styleClone = style.clone(style);
        assert.equal(style.point.color, styleClone.point.color);
        assert.equal(style.fill.color, styleClone.fill.color);
        assert.equal(style.stroke.color, styleClone.stroke.color);
    });

    const sprites = {
        img: '',
        'fill-pattern': { x: 0, y: 0, width: 10, height: 10 },
    };

    describe('applyToHTML', () => {
        it('with icon.source and icon.key undefined', () => {
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
            it('icon.source is string but icon.key is undefined ', () => {
                const dom = document.createElement('canvas');
                const style1 = style.clone(style);
                style1.icon = {
                    source: 'icon',
                };
                style1.applyToHTML(dom);
                const img = cacheStyle.get('icon', 1);
                img.emitEvent('load');
                assert.equal(dom.children[0].class, 'itowns-icon');
                assert.equal(dom.children[0].style['z-index'], -1);
            });
            it('icon.source is string and icon.color=#0400fd', () => {
                const dom = document.createElement('canvas');
                const style1 = style.clone(style);
                style1.icon = {
                    source: sourceString,
                    color: '#0400fd',
                };
                style1.applyToHTML(dom);
                const img = cacheStyle.get(sourceString, 1);

                img.emitEvent('load');
                assert.equal(dom.children.length, 1);
                assert.equal(dom.children[0].class, 'itowns-icon');
                assert.equal(dom.children[0].style['z-index'], -1);
            });
            it('with icon.key and sprites', () => {
                const dom = document.createElement('canvas');
                const style1 = style.clone(style);
                style1.icon = {
                    key: 'fill-pattern',
                };

                style1.applyToHTML(dom, sprites);
                const img = cacheStyle.get('fill-pattern', 1);
                img.emitEvent('load');
                assert.equal(dom.children[0].class, 'itowns-icon');
                assert.equal(dom.children[0].style['z-index'], -1);
            });
        });
    });
});
