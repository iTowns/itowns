//
// how to calculate the radius of a projected sphere in screen space
// http://stackoverflow.com/questions/21648630/radius-of-projected-sphere-in-screen-space
// http://stackoverflow.com/questions/3717226/radius-of-projected-sphere
//

define(['THREE', 'Renderer/ThreeExtented/ImageUtils', './Shaders', './PointSizeType', './TreeType','./PointShape', './PointColorType', './ClipMode', './Gradients', './Classification'], 
function(THREE, ImageUtils, Shaders, PointSizeType, TreeType, PointShape, PointColorType, ClipMode, Gradients, Classification){

    var PointCloudMaterial = function(parameters){
	THREE.Material.call( this );

	parameters = parameters || {};

	var color = new THREE.Color( 0xffffff );
	//var map = THREE.ImageUtils.generateDataTexture( 2048, 1, color );
    var map = ImageUtils.generateDataTexture( 2048, 1, color );
	map.magFilter = THREE.NearestFilter;
	this.visibleNodesTexture = map;
	
	var pointSize = parameters.size || 1.0;
	var minSize = parameters.minSize || 1.0;
	var maxSize = parameters.maxSize || 50.0;
	var treeType = parameters.treeType || TreeType.OCTREE;
	var nodeSize = 1.0;
	
	this._pointSizeType = PointSizeType.ATTENUATED;
	this._pointShape = PointShape.SQUARE;
	this._interpolate = false;
	this._pointColorType = PointColorType.RGB;
	this._useClipBox = false;
	this.numClipBoxes = 0;
	this._clipMode = ClipMode.DISABLED;
	this._weighted = false;
	this._depthMap;
	this._gradient = Gradients.RAINBOW;
	this._classification = Classification.DEFAULT;
	this.gradientTexture = PointCloudMaterial.generateGradientTexture(this._gradient);
	this.classificationTexture = PointCloudMaterial.generateClassificationTexture(this._classification);
	this.lights = false;
	this._treeType = treeType;
	this._useLogarithmicDepthBuffer = false;
	this._useEDL = false;
	
	
	
	
	var attributes = {};
	var uniforms = {
		spacing:			{ type: "f", value: 1.0 },
		fov:				{ type: "f", value: 1.0 },
		screenWidth:		{ type: "f", value: 1.0 },
		screenHeight:		{ type: "f", value: 1.0 },
		near:				{ type: "f", value: 0.1 },
		far:				{ type: "f", value: 1.0 },
		uColor:   			{ type: "c", value: new THREE.Color( 0xffffff ) },
		opacity:   			{ type: "f", value: 1.0 },
		size:   			{ type: "f", value: 10 },
		minSize:   			{ type: "f", value: 2 },
		maxSize:   			{ type: "f", value: 2 },
		octreeSize:			{ type: "f", value: 0 },
		bbSize:				{ type: "fv", value: [0,0,0] },
		heightMin:			{ type: "f", value: 0.0 },
		heightMax:			{ type: "f", value: 1.0 },
		intensityMin:		{ type: "f", value: 0.0 },
		intensityMax:		{ type: "f", value: 1.0 },
		clipBoxCount:		{ type: "f", value: 0 },
		visibleNodes:		{ type: "t", value: this.visibleNodesTexture },
		pcIndex:   			{ type: "f", value: 0 },
		gradient: 			{ type: "t", value: this.gradientTexture },
		classificationLUT: 	{ type: "t", value: this.classificationTexture },
		clipBoxes:			{ type: "Matrix4fv", value: [] },
		depthMap: 			{ type: "t", value: null },
		diffuse:			{ type: "fv", value: [1,1,1]},
		ambient:			{ type: "fv", value: [0.1, 0.1, 0.1]},
		ambientLightColor: 			{ type: "fv", value: [1, 1, 1] },
		directionalLightColor: 		{ type: "fv", value: null },
		directionalLightDirection: 	{ type: "fv", value: null },
		pointLightColor: 			{ type: "fv", value: null },
		pointLightPosition: 		{ type: "fv", value: null },
		pointLightDistance: 		{ type: "fv1", value: null },
		pointLightDecay: 			{ type: "fv1", value: null },
		spotLightColor: 			{ type: "fv", value: null },
		spotLightPosition: 			{ type: "fv", value: null },
		spotLightDistance: 			{ type: "fv1", value: null },
		spotLightDecay: 			{ type: "fv1", value: null },
		spotLightDirection: 		{ type: "fv", value: null },
		spotLightAngleCos: 			{ type: "fv1", value: null },
		spotLightExponent: 			{ type: "fv1", value: null },
		hemisphereLightSkyColor: 	{ type: "fv", value: null },
		hemisphereLightGroundColor: { type: "fv", value: null },
		hemisphereLightDirection: 	{ type: "fv", value: null },
	};
	
	this.defaultAttributeValues.normal = [0,0,0];
	
	this.setValues({
		uniforms: uniforms,
		attributes: attributes,
		vertexShader: this.getDefines() + Shaders["pointcloud.vs"],
		fragmentShader: this.getDefines() + Shaders["pointcloud.fs"],
		vertexColors: THREE.VertexColors,
		size: pointSize,
		minSize: minSize,
		maxSize: maxSize,
		nodeSize: nodeSize,
		pcIndex: 0,
		alphaTest: 0.9
	});
};

PointCloudMaterial.prototype = new THREE.ShaderMaterial();

PointCloudMaterial.prototype.updateShaderSource = function(){
	
	var attributes = {};
	if(this.pointColorType === PointColorType.INTENSITY
		|| this.pointColorType === PointColorType.INTENSITY_GRADIENT){
		attributes.intensity = { type: "f", value: [] };
	}else if(this.pointColorType === PointColorType.CLASSIFICATION){
		attributes.classification = { type: "f", value: [] };
	}else if(this.pointColorType === PointColorType.RETURN_NUMBER){
		attributes.returnNumber = { type: "f", value: [] };
		attributes.numberOfReturns = { type: "f", value: [] };
	}else if(this.pointColorType === PointColorType.SOURCE){
		attributes.pointSourceID = { type: "f", value: [] };
	}else if(this.pointColorType === PointColorType.NORMAL || this.pointColorType === PointColorType.PHONG){
		attributes.normal = { type: "f", value: [] };
	}
	
	var vs = this.getDefines() + Shaders["pointcloud.vs"];
	var fs = this.getDefines() + Shaders["pointcloud.fs"];
	
	this.setValues({
		attributes: attributes,
		vertexShader: vs,
		fragmentShader: fs
	});
	
	if(this.depthMap){
		this.uniforms.depthMap.value = this.depthMap;
		this.setValues({
			depthMap: this.depthMap
		});
	}
	
	if(this.opacity === 1.0){
		this.setValues({
			blending: THREE.NoBlending,
			transparent: false,
			depthTest: true,
			depthWrite: true
		});
	}else{
		this.setValues({
			blending: THREE.AdditiveBlending,
			transparent: true,
			depthTest: false,
			depthWrite: true
		});
	}
		
	if(this.weighted){	
		this.setValues({
			blending: THREE.AdditiveBlending,
			transparent: true,
			depthTest: true,
			depthWrite: false
		});	
	}
		
		
		
		
	this.needsUpdate = true;
};

PointCloudMaterial.prototype.getDefines = function(){

	var defines = "";
	
	if(this.pointSizeType === PointSizeType.FIXED){
		defines += "#define fixed_point_size\n";
	}else if(this.pointSizeType === PointSizeType.ATTENUATED){
		defines += "#define attenuated_point_size\n";
	}else if(this.pointSizeType === PointSizeType.ADAPTIVE){
		defines += "#define adaptive_point_size\n";
	}
	
	if(this.pointShape === PointShape.SQUARE){
		defines += "#define square_point_shape\n";
	}else if(this.pointShape === PointShape.CIRCLE){
		defines += "#define circle_point_shape\n";
	}
	
	if(this._interpolate){
		defines += "#define use_interpolation\n";
	}
	
	if(this._useLogarithmicDepthBuffer){
		defines += "#define use_logarithmic_depth_buffer\n";
	}
	
	if(this._useEDL){
		defines += "#define use_edl\n";
	}
	
	if(this._pointColorType === PointColorType.RGB){
		defines += "#define color_type_rgb\n";
	}else if(this._pointColorType === PointColorType.COLOR){
		defines += "#define color_type_color\n";
	}else if(this._pointColorType === PointColorType.DEPTH){
		defines += "#define color_type_depth\n";
	}else if(this._pointColorType === PointColorType.HEIGHT){
		defines += "#define color_type_height\n";
	}else if(this._pointColorType === PointColorType.INTENSITY){
		defines += "#define color_type_intensity\n";
	}else if(this._pointColorType === PointColorType.INTENSITY_GRADIENT){
		defines += "#define color_type_intensity_gradient\n";
	}else if(this._pointColorType === PointColorType.TREE_DEPTH){
		defines += "#define color_type_tree_depth\n";
	}else if(this._pointColorType === PointColorType.POINT_INDEX){
		defines += "#define color_type_point_index\n";
	}else if(this._pointColorType === PointColorType.CLASSIFICATION){
		defines += "#define color_type_classification\n";
	}else if(this._pointColorType === PointColorType.RETURN_NUMBER){
		defines += "#define color_type_return_number\n";
	}else if(this._pointColorType === PointColorType.SOURCE){
		defines += "#define color_type_source\n";
	}else if(this._pointColorType === PointColorType.NORMAL){
		defines += "#define color_type_normal\n";
	}else if(this._pointColorType === PointColorType.PHONG){
		defines += "#define color_type_phong\n";
	}
	
	if(this.clipMode === ClipMode.DISABLED){
		defines += "#define clip_disabled\n";
	}else if(this.clipMode === ClipMode.CLIP_OUTSIDE){
		defines += "#define clip_outside\n";
	}else if(this.clipMode === ClipMode.HIGHLIGHT_INSIDE){
		defines += "#define clip_highlight_inside\n";
	}
	
	if(this._treeType === TreeType.OCTREE){
		defines += "#define tree_type_octree\n";
	}else if(this._treeType === TreeType.KDTREE){
		defines += "#define tree_type_kdtree\n";
	}
	
	if(this.weighted){
		defines += "#define weighted_splats\n";
	}
	
	if(this.numClipBoxes > 0){
		defines += "#define use_clip_box\n";
	}

	return defines;
};

PointCloudMaterial.prototype.setClipBoxes = function(clipBoxes){
	if(!clipBoxes){
		return;
	}

	this.clipBoxes = clipBoxes;
	var doUpdate = (this.numClipBoxes != clipBoxes.length) && (clipBoxes.length === 0 || this.numClipBoxes === 0);

	this.numClipBoxes = clipBoxes.length;
	this.uniforms.clipBoxCount.value = this.numClipBoxes;
	
	if(doUpdate){
		this.updateShaderSource();
	}
	
	this.uniforms.clipBoxes.value = new Float32Array(this.numClipBoxes * 16);
	
	for(var i = 0; i < this.numClipBoxes; i++){
		var box = clipBoxes[i];
		
		this.uniforms.clipBoxes.value.set(box.elements, 16*i);
	}
};


Object.defineProperty(PointCloudMaterial.prototype, "gradient", {
	get: function(){
		return this._gradient;
	},
	set: function(value){
		if(this._gradient !== value){
			this._gradient = value;
			this.gradientTexture = PointCloudMaterial.generateGradientTexture(this._gradient);
			this.uniforms.gradient.value = this.gradientTexture;
		}
	}
});

Object.defineProperty(PointCloudMaterial.prototype, "classification", {
	get: function(){
		return this._classification;
	},
	set: function(value){
		if(this._classification !== value){
			this._classification = value;
			this.classificationTexture = PointCloudMaterial.generateClassificationTexture(this._classification);
			this.uniforms.classificationLUT.value = this.classificationTexture;
		}
	}
});

Object.defineProperty(PointCloudMaterial.prototype, "spacing", {
	get: function(){
		return this.uniforms.spacing.value;
	},
	set: function(value){
		if(this.uniforms.spacing.value !== value){
			this.uniforms.spacing.value = value;
			//this.updateShaderSource();
		}
	}
});

Object.defineProperty(PointCloudMaterial.prototype, "useClipBox", {
	get: function(){
		return this._useClipBox;
	},
	set: function(value){
		if(this._useClipBox !== value){
			this._useClipBox = value;
			this.updateShaderSource();
		}
	}
});

Object.defineProperty(PointCloudMaterial.prototype, "weighted", {
	get: function(){
		return this._weighted;
	},
	set: function(value){
		if(this._weighted !== value){
			this._weighted = value;
			this.updateShaderSource();
		}
	}
});

Object.defineProperty(PointCloudMaterial.prototype, "fov", {
	get: function(){
		return this.uniforms.fov.value;
	},
	set: function(value){
		if(this.uniforms.fov.value !== value){
			this.uniforms.fov.value = value;
			//this.updateShaderSource();
		}
	}
});

Object.defineProperty(PointCloudMaterial.prototype, "screenWidth", {
	get: function(){
		return this.uniforms.screenWidth.value;
	},
	set: function(value){
		if(this.uniforms.screenWidth.value !== value){
			this.uniforms.screenWidth.value = value;
			//this.updateShaderSource();
		}
	}
});

Object.defineProperty(PointCloudMaterial.prototype, "screenHeight", {
	get: function(){
		return this.uniforms.screenHeight.value;
	},
	set: function(value){
		if(this.uniforms.screenHeight.value !== value){
			this.uniforms.screenHeight.value = value;
			//this.updateShaderSource();
		}
	}
});

Object.defineProperty(PointCloudMaterial.prototype, "near", {
	get: function(){
		return this.uniforms.near.value;
	},
	set: function(value){
		if(this.uniforms.near.value !== value){
			this.uniforms.near.value = value;
		}
	}
});

Object.defineProperty(PointCloudMaterial.prototype, "far", {
	get: function(){
		return this.uniforms.far.value;
	},
	set: function(value){
		if(this.uniforms.far.value !== value){
			this.uniforms.far.value = value;
		}
	}
});

Object.defineProperty(PointCloudMaterial.prototype, "opacity", {
	get: function(){
		return this.uniforms.opacity.value;
	},
	set: function(value){
		if(this.uniforms.opacity){
			if(this.uniforms.opacity.value !== value){
				this.uniforms.opacity.value = value;
				this.updateShaderSource();
			}
		}
	}
});

Object.defineProperty(PointCloudMaterial.prototype, "pointColorType", {
	get: function(){
		return this._pointColorType;
	},
	set: function(value){
		if(this._pointColorType !== value){
			this._pointColorType = value;
			this.updateShaderSource();
		}
	}
});

Object.defineProperty(PointCloudMaterial.prototype, "depthMap", {
	get: function(){
		return this._depthMap;
	},
	set: function(value){
		if(this._depthMap !== value){
			this._depthMap = value;
			this.updateShaderSource();
		}
	}
});

Object.defineProperty(PointCloudMaterial.prototype, "pointSizeType", {
	get: function(){
		return this._pointSizeType;
	},
	set: function(value){
		if(this._pointSizeType !== value){
			this._pointSizeType = value;
			this.updateShaderSource();
		}
	}
});

Object.defineProperty(PointCloudMaterial.prototype, "clipMode", {
	get: function(){
		return this._clipMode;
	},
	set: function(value){
		if(this._clipMode !== value){
			this._clipMode = value;
			this.updateShaderSource();
		}
	}
});

Object.defineProperty(PointCloudMaterial.prototype, "interpolate", {
	get: function(){
		return this._interpolate;
	},
	set: function(value){
		if(this._interpolate !== value){
			this._interpolate = value;
			this.updateShaderSource();
		}
	}
});

Object.defineProperty(PointCloudMaterial.prototype, "useEDL", {
	get: function(){
		return this._useEDL;
	},
	set: function(value){
		if(this._useEDL !== value){
			this._useEDL = value;
			this.updateShaderSource();
		}
	}
});

Object.defineProperty(PointCloudMaterial.prototype, "useLogarithmicDepthBuffer", {
	get: function(){
		return this._useLogarithmicDepthBuffer;
	},
	set: function(value){
		if(this._useLogarithmicDepthBuffer !== value){
			this._useLogarithmicDepthBuffer = value;
			this.updateShaderSource();
		}
	}
});

Object.defineProperty(PointCloudMaterial.prototype, "color", {
	get: function(){
		return this.uniforms.uColor.value;
	},
	set: function(value){
		if(this.uniforms.uColor.value !== value){
			this.uniforms.uColor.value.copy(value);
			this.updateShaderSource();
		}
	}
});

Object.defineProperty(PointCloudMaterial.prototype, "pointShape", {
	get: function(){
		return this._pointShape;
	},
	set: function(value){
		if(this._pointShape !== value){
			this._pointShape = value;
			this.updateShaderSource();
		}
	}
});

Object.defineProperty(PointCloudMaterial.prototype, "size", {
	get: function(){
		return this.uniforms.size.value;
	},
	set: function(value){
		this.uniforms.size.value = value;
	}
});

Object.defineProperty(PointCloudMaterial.prototype, "minSize", {
	get: function(){
		return this.uniforms.minSize.value;
	},
	set: function(value){
		this.uniforms.minSize.value = value;
	}
});

Object.defineProperty(PointCloudMaterial.prototype, "maxSize", {
	get: function(){
		return this.uniforms.maxSize.value;
	},
	set: function(value){
		this.uniforms.maxSize.value = value;
	}
});

Object.defineProperty(PointCloudMaterial.prototype, "heightMin", {
	get: function(){
		return this.uniforms.heightMin.value;
	},
	set: function(value){
		this.uniforms.heightMin.value = value;
	}
});

Object.defineProperty(PointCloudMaterial.prototype, "heightMax", {
	get: function(){
		return this.uniforms.heightMax.value;
	},
	set: function(value){
		this.uniforms.heightMax.value = value;
	}
});

Object.defineProperty(PointCloudMaterial.prototype, "intensityMin", {
	get: function(){
		return this.uniforms.intensityMin.value;
	},
	set: function(value){
		this.uniforms.intensityMin.value = value;
	}
});

Object.defineProperty(PointCloudMaterial.prototype, "intensityMax", {
	get: function(){
		return this.uniforms.intensityMax.value;
	},
	set: function(value){
		this.uniforms.intensityMax.value = value;
	}
});

Object.defineProperty(PointCloudMaterial.prototype, "pcIndex", {
	get: function(){
		return this.uniforms.pcIndex.value;
	},
	set: function(value){
		this.uniforms.pcIndex.value = value;
	}
});

Object.defineProperty(PointCloudMaterial.prototype, "treeType", {
	get: function(){
		return this._treeType;
	},
	set: function(value){
		if(this._treeType != value){
			this._treeType = value;
			this.updateShaderSource();
		}
	}
});

Object.defineProperty(PointCloudMaterial.prototype, "bbSize", {
	get: function(){
		return this.uniforms.bbSize.value;
	},
	set: function(value){
		this.uniforms.bbSize.value = value;
	}
});

/**
 * Generates a look-up texture for gradient values (height, intensity, ...)
 *
 */
PointCloudMaterial.generateGradientTexture = function(gradient) {
	var size = 64;

	// create canvas
	canvas = document.createElement( 'canvas' );
	canvas.width = size;
	canvas.height = size;

	// get context
	var context = canvas.getContext( '2d' );

	// draw gradient
	context.rect( 0, 0, size, size );
	var ctxGradient = context.createLinearGradient( 0, 0, size, size );
	
	for(var i = 0;i < gradient.length; i++){
		var step = gradient[i];
		
		ctxGradient.addColorStop(step[0], "#" + step[1].getHexString());
	} 
    
	context.fillStyle = ctxGradient;
	context.fill();
	
	var texture = new THREE.Texture( canvas );
	texture.needsUpdate = true;
	textureImage = texture.image;

	return texture;
};

/**
 * Generates a look up texture for classification colors
 *
 */
PointCloudMaterial.generateClassificationTexture  = function(classification){
	var width = 256;
	var height = 256;
     //   var map = THREE.ImageUtils.generateDataTexture( width, height, new THREE.Color() );
	var map = ImageUtils.generateDataTexture( width, height, new THREE.Color() );
	map.magFilter = THREE.NearestFilter;
	var data = map.image.data;
	
	for(var x = 0; x < width; x++){
		for(var y = 0; y < height; y++){
			var u = 2 * (x / width) - 1;
			var v = 2 * (y / height) - 1;
			
			var i = x + width*y;
			
			var color;
			if(classification[x]){
				color = classification[x];
			}else{
				color = classification.DEFAULT;
			}
			
			
			data[3*i+0] = 255 * color.r;
			data[3*i+1] = 255 * color.g;
			data[3*i+2] = 255 * color.b;
		}
	}
	
	return map;
	
};

return PointCloudMaterial;
    
});
