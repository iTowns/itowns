/**
 *
 * @author AD IGN
 * Class generating shaders for projective texturing of MULTIPLE IMAGES in a single shader. This class can be used
 * to texture any mesh. We need to set the matrix of Orientation of the projector
 * and its projective camera information.
 */

import graphicEngine from 'Renderer/c3DEngine';
import THREE from 'three';
import Ori from 'MobileMapping/Ori';
import Shader from 'MobileMapping/Shader';
import url from 'url';
import Ellipsoid from 'Core/Math/Ellipsoid';
import CoordCarto from 'Core/Geographic/CoordCarto';

window.requestAnimSelectionAlpha = (function() {
    return window.requestAnimationFrame ||
        window.webkitRequestAnimationFrame ||
        window.mozRequestAnimationFrame ||
        window.oRequestAnimationFrame ||
        window.msRequestAnimationFrame ||
        function(callback) {
            window.setTimeout(callback, 1000 / 60);
        };
})();

var _shaderMat = null;
var _initPromise = null;
var _alpha = 1;
var _infos = {};
var ellipsoid = new Ellipsoid(new THREE.Vector3(6378137, 6356752.3142451793, 6378137));

var ProjectiveTexturingMaterial = {

    init: function(infos, panoInfo, pivot) {
        if (_initPromise == null) {
            _initPromise = Ori.init(infos).then(function() {
                // compute Camera Frame Rotation
                var matRotationFrame = this.getCameraFrameRotation(panoInfo);
                this.createShaderMat(panoInfo, matRotationFrame, pivot);
                return _shaderMat;
            })
        }
        return _initPromise;
    },


    isInitiated: function() {
        // XXX: this only says whether this.init() has been called, not whether it has resolved!
        return _initPromise != null;
    },

    setGeneralOpacity: function(value) {
        _alpha = value;
    },

    tweenGeneralOpacityUp: function() {
        if (_alpha < 1) {
            _alpha += ((_alpha + 0.01)) * 0.04;
            if (_alpha > 1) _alpha = 1;
            window.requestAnimSelectionAlpha(this.tweenGeneralOpacityUp.bind(this));
        }
    },


    getCameraFrameRotation: function(panoInfo) {

        var matRotation = Ori.computeMatOriFromHeadingPitchRoll(
            panoInfo.heading,
            panoInfo.pitch,
            panoInfo.roll
        );

        // Then correct with position on ellipsoid
        // Orientation on normal
        var posPanoWGS84 = new CoordCarto().setFromDegreeGeo(panoInfo.longitude, panoInfo.latitude, panoInfo.altitude);
        var posPanoCartesian = ellipsoid.cartographicToCartesian(posPanoWGS84);

        var normal = ellipsoid.geodeticSurfaceNormalCartographic(posPanoWGS84);
        var quaternion = new THREE.Quaternion();
        quaternion.setFromAxisAngle(new THREE.Vector3(1, 0, 0), Math.PI / 2);

        var child = new THREE.Object3D();
        var localTarget = new THREE.Vector3().addVectors(posPanoCartesian.clone(), normal);
        child.lookAt(localTarget);
        child.quaternion.multiply(quaternion);
        //child.position.copy(posCartesien.clone());
        child.updateMatrix();
        //console.log("matrice originale", matRotation,"MAtrice normale",child.matrix, "normal vec", normal );

        var c = child.matrix; //.elements;
        var m3 = new THREE.Matrix3().fromMatrix4(c);
        //console.log(m3);
        var matRotationOnGlobe = new THREE.Matrix3().multiplyMatrices(matRotation.clone(), m3); //child.matrix);

        return matRotationOnGlobe;

    },


    // display all the images of the panoramics
    nbImages: function() {
        return Ori.sensors.length;
    },

    nbMasks: function() {
        if (!_infos.noMask) return 0;
        var count = 0;
        for (var i = 0; i < this.nbImages(); ++i)
            if (Ori.getMask(i)) ++count;
        return count;
    },

    // throttle down the number of panoramics to meet the gl.MAX_* constraints
    nbPanoramics: function() {
        var N = this.nbImages();
        var gl = graphicEngine().getRenderer().getContext();
        var M = this.nbMasks();
        var maxVaryingVec = gl.getParameter(gl.MAX_VARYING_VECTORS);
        var maxTextureImageUnits = gl.getParameter(gl.MAX_TEXTURE_IMAGE_UNITS);
        var maxNbPanoramics = Math.floor(Math.min(maxVaryingVec, (maxTextureImageUnits - M)) / N);
        var P = Math.min(_infos.targetNbPanoramics, maxNbPanoramics);
        /*       console.log("Masks : ", M);
              console.log("Images per panoramic  : ", N );
              console.log("Panoramics : ", P ," displayed /",_infos.targetNbPanoramics, " targeted");
              console.log("Varyings : ", (N*P) ," used /",maxVaryingVec, " available");
              console.log("Texture units : ", (M+N*P) ," used /",maxTextureImageUnits," available");
         */
        return P;
    },

    loadTexture: function(src, infos, onload, data) {

        //  console.log("src: ",src,"  infos: ",infos);
        src = src.format(infos); // console.log("src: ",src);
        var img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = function() {
            var tex = new THREE.Texture(this, THREE.UVMapping,
                THREE.RepeatWrapping, THREE.RepeatWrapping, THREE.LinearFilter, THREE.LinearFilter, THREE.RGBFormat);
            tex.needsUpdate = true;
            tex.flipY = false;
            onload(tex, data);
        }
        var baseUrl = "../dist/itowns-sample-data/cameraCalibration.json"; //_infos.url;//PanoramicProvider.getMetaDataSensorURL();
        img.src = url.resolve(baseUrl, src);
    },

    createShaderMat: function(panoInfo, rot, pivot) {

        var posPanoWGS84 = new CoordCarto().setFromDegreeGeo(panoInfo.longitude, panoInfo.latitude, panoInfo.altitude);
        var posPanoCartesian = ellipsoid.cartographicToCartesian(posPanoWGS84);
        //console.log("posPanoCartesian: ",posPanoCartesian);
        var spherePosPano = new THREE.Mesh(new THREE.SphereGeometry(0.5, 12, 12), new THREE.MeshBasicMaterial({
            side: THREE.DoubleSide,
            color: 0xff00ff
        }));
        spherePosPano.position.copy(posPanoCartesian);
        graphicEngine().add3DScene(spherePosPano);

        var posPiv = posPanoCartesian.clone().sub(pivot);
        var posFrameWithPivot = new THREE.Vector4(posPiv.x, posPiv.y, posPiv.z, 1.);
        var N = this.nbImages();
        var P = this.nbPanoramics();
        var uniforms = {
            RTC: {
                type: "i",
                value: 1
            },
            mVPMatRTC: {
                type: "m4",
                value: new THREE.Matrix4()
            },
            distortion: {
                type: 'v4v',
                value: []
            },
            pps: {
                type: 'v2v',
                value: []
            },
            size: {
                type: 'v2v',
                value: []
            },
            alpha: {
                type: 'fv1',
                value: []
            },
            mvpp: {
                type: 'm3v',
                value: []
            },
            translation: {
                type: 'v3v',
                value: []
            },
            texture: {
                type: 'tv',
                value: []
            },
            mask: {
                type: 'tv',
                value: []
            }
        };
        var idmask = [];
        var iddist = [];
        for (var i = 0; i < N; ++i) {

            var mat = Ori.getMatrix(i).clone();
            var mvpp = (new THREE.Matrix3().multiplyMatrices(rot, mat)).transpose();
            var trans = posFrameWithPivot.clone().add(Ori.getSommet(i).clone().applyMatrix3(rot));
            var m = -1;
            if (!_infos.noMask && Ori.getMask(i)) {
                m = uniforms.mask.value.length;
                uniforms.mask.value[m] = null;
            }
            var d = -1;
            if (!_infos.noDistortion && Ori.getDistortion(i)) {
                d = uniforms.distortion.value.length;
                uniforms.distortion.value[d] = Ori.getDistortion(i);
                uniforms.pps.value[d] = Ori.getPPS(i);
            }
            for (var pano = 0; pano < P; ++pano) {
                var j = i + N * pano;
                uniforms.size.value[j] = Ori.getSize(i);
                uniforms.alpha.value[j] = _alpha * (1 - pano);
                uniforms.mvpp.value[j] = mvpp;
                uniforms.translation.value[j] = trans;
                uniforms.texture.value[j] = null;
                idmask[j] = m;
                iddist[j] = d;
            }
        }

        // create the shader material for Three
        _shaderMat = new THREE.ShaderMaterial({
            uniforms: uniforms,
            vertexShader: Shader.shaderTextureProjectiveVS(P * N),
            fragmentShader: Shader.shaderTextureProjectiveFS(P * N, idmask, iddist),
            side: THREE.DoubleSide, //THREE.BackSide,
            transparent: true
                // depthTest: false
                //depthWrite: false
        });

        _infos.pano = panoInfo;
        _infos.lod = _infos.lods[0];
        for (i = 0; i < N; ++i) {
            _infos.cam = Ori.sensors[i].infos; // console.log(_infos.cam);
            m = idmask[i];
            if (m >= 0) {
                this.loadTexture(Ori.getMask(i), {}, function(tex, m) {
                    _shaderMat.uniforms.mask.value[m] = tex;
                }, m);
            }
            this.loadTexture(_infos.url, _infos, function(tex, i) {
                _shaderMat.uniforms.texture.value[i] = tex;
            }, i);
        }
        this.changePanoTextureAfterloading(panoInfo, posFrameWithPivot, rot, 1);

        return _shaderMat;
    },

    updateUniforms: function(panoInfo, pivot) {

        var matRotationFrame = this.getCameraFrameRotation(panoInfo);

        // compute translation
        var posPanoWGS84 = new CoordCarto().setFromDegreeGeo(panoInfo.longitude, panoInfo.latitude, panoInfo.altitude);
        var posPanoCartesian = ellipsoid.cartographicToCartesian(posPanoWGS84);
        var posPiv = posPanoCartesian.clone().sub(pivot);
        var posFrameWithPivot = new THREE.Vector4(posPiv.x, posPiv.y, posPiv.z, 1.);

        this.changePanoTextureAfterloading(panoInfo, posFrameWithPivot, matRotationFrame, 0);
    },

    tweenIndiceTime: function(i) {

        var alpha = _shaderMat.uniforms.alpha.value[i];
        graphicEngine().renderScene(); // TEMP CAUSE NO GLOBAL RENDERING LOOP
        if (alpha < 1) {
            var j = i + this.nbImages();
            alpha += 0.03;
            if (alpha > 1) alpha = 1;
            _shaderMat.uniforms.alpha.value[i] = _alpha * alpha;
            _shaderMat.uniforms.alpha.value[j] = _alpha * (1 - alpha);
            var that = this;
            window.requestAnimSelectionAlpha(function() {
                that.tweenIndiceTime(i);
            });
        }
    },


    changePanoTextureAfterloading: function(panoInfo, translation, rotation, lod) {


        this.todo = [];
        _infos.pano = panoInfo;
        this.translation = translation || new THREE.Vector3();
        this.rotation = rotation || new THREE.Matrix3();
        for (var l = lod || 0; l < _infos.lods.length; ++l)
            for (var i = 0; i < Ori.sensors.length; ++i)
                this.todo.push({
                    l: l,
                    i: i
                });

        this.chargeOneImageCam();
    },

    // Load an Image(html) then use it as a texture. Wait loading before passing to the shader to avoid black effect
    chargeOneImageCam: function() {

        if (this.todo.length == 0) return;
        var todo = this.todo.shift();
        var i = todo.i;
        var lod = todo.l;
        var that = this;
        _infos.cam = Ori.sensors[todo.i].infos;
        _infos.lod = _infos.lods[todo.l];
        this.loadTexture(_infos.url, _infos, function(tex) {

            var mat = Ori.getMatrix(i).clone();
            var mvpp = (new THREE.Matrix3().multiplyMatrices(that.rotation, mat)).transpose();
            var trans = Ori.getSommet(i).clone().applyMatrix3(that.rotation);
            var j = i + that.nbImages();
            if (lod === 0 && j < _shaderMat.uniforms.mvpp.value.length) {
                _shaderMat.uniforms.mvpp.value[j] = _shaderMat.uniforms.mvpp.value[i];
                _shaderMat.uniforms.translation.value[j] = _shaderMat.uniforms.translation.value[i];
                _shaderMat.uniforms.texture.value[j] = _shaderMat.uniforms.texture.value[i];
                _shaderMat.uniforms.alpha.value[j] = _alpha;
                _shaderMat.uniforms.alpha.value[i] = 0;
                that.tweenIndiceTime(i);
            }

            _shaderMat.uniforms.mvpp.value[i] = mvpp;
            _shaderMat.uniforms.translation.value[i] = that.translation.clone().add(trans);
            _shaderMat.uniforms.texture.value[i] = tex;

            if (lod == 0) {
                that.chargeOneImageCam();
            } else {
                setTimeout(function() {
                    that.chargeOneImageCam();
                }, 500);
            }
        });

    },


    getShaderMat: function() {
        return _shaderMat;
    }

};
export default ProjectiveTexturingMaterial;
