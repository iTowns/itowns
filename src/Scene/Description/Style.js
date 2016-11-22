/**
 * Generated On: 2015-10-5
 * Class: Style
 * Description: style's Node. style is used to create the material's node
 */

const STYLE =
    {
	// State
        ST_Active: 0,
        ST_Selected: 1,
        ST_Frozen: 2,
	// Alignement
        AL_Left: 0,
        AL_Center: 1,
        AL_Right: 2,
    };


function PaintingTool(color, type) {
    this.name = null;
    this.color = color;
    this.opacity = null;
    this.visible = true;
    this.contentType = type;

    this.texture = null;
    this.position = null;
    this.scale = null;
    this.effects = [];
}

PaintingTool.prototype = Object.create(PaintingTool.prototype);

PaintingTool.prototype.constructor = PaintingTool;

PaintingTool.prototype.setTexture = function (texture) {
    this.texture = texture;
};

PaintingTool.prototype.addEffect = function (effect) {
    this.effects.push(effect);
};

function Pen(color) {
    PaintingTool.call(this, color);
    this.width = 1;
}

Pen.prototype = Object.create(PaintingTool.prototype);

Pen.prototype.constructor = Pen;

function Font(color) {
    PaintingTool.call(this, color);
	// Text alignment, valid values are "Left", "Right" and "Center"
    this.alignment = STYLE.AL_Left;
}

Font.prototype = Object.create(PaintingTool.prototype);

Font.prototype.constructor = Font;


function Brush() {
    PaintingTool.call(this);
}

Brush.prototype = Object.create(PaintingTool.prototype);

Brush.prototype.constructor = Brush;

function SurfaceStyle() {
    Brush.call(this);
    this.pen = new Pen();
    this.extrusion = 0;
    this.colorExtrusion = 0;
}

SurfaceStyle.prototype = Object.create(Brush.prototype);

SurfaceStyle.prototype.constructor = SurfaceStyle;

function TextStyle() {
    SurfaceStyle.call(this);

    this.font = new Font();

	// Alignement
    this.alignement = STYLE.AL_Left;

	// The padding around the text for border computation, 1.0 is equal to font size. Default is 0.25
    this.framePadding = 0.25;

	// Activate a border around the text
    this.borderEnabled = false;
}

TextStyle.prototype = Object.create(SurfaceStyle.prototype);

TextStyle.prototype.constructor = TextStyle;


function Effect() {
    this.name = null;
}

Effect.prototype = Object.create(Effect.prototype);

Effect.prototype.constructor = Effect;

function Extrusion() {
    Effect.call(this);

    this.color = null;
    this.amount = 0;
}

Extrusion.prototype = Object.create(Effect.prototype);

Extrusion.prototype.constructor = Extrusion;

function Style(name) {
    this.name = name;

	// Icon
    this.iconStyle = new SurfaceStyle();

	// Line
    this.line = new Pen();

	// Surface
    this.surface = new SurfaceStyle();
    this.surface.addEffect(new Extrusion());

	// Text
    this.text = new TextStyle();
}

Style.prototype = Object.create(Style.prototype);

Style.prototype.constructor = Style;

Style.prototype.applyPalette = function (palette) {
    this.line.color = palette.colorLine;
    this.surface.color = palette.colorLine;
    this.surface.pen.color = palette.colorLineSurface;
    this.text.font.color = palette.colorFont;
    this.surface.effects[0].color = palette.colorExtrusion;
};

export {
    Style,
};
