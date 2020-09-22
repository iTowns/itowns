import Style from 'Core/Style';
import assert from 'assert';

describe('Style', function () {
    const style1 = new Style();
    style1.point.color = 'red';
    style1.fill.color = 'blue';
    style1.stroke.color = 'black';
    style1.text.haloWidth = 1;

    it('Copy style', () => {
        const style2 = new Style().copy(style1);
        assert.equal(style1.point.color, style2.point.color);
        assert.equal(style1.fill.color, style2.fill.color);
        assert.equal(style1.stroke.color, style2.stroke.color);
    });

    it('Clone style', () => {
        const style2 = style1.clone(style1);
        assert.equal(style1.point.color, style2.point.color);
        assert.equal(style1.fill.color, style2.fill.color);
        assert.equal(style1.stroke.color, style2.stroke.color);
    });

    it('applyToHTML', () => {
        const dom = document.createElement('canvas');
        style1.applyToHTML(dom);
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
});
