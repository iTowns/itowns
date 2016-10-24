/**
 *
 * @author AD IGN
 * Class generating shaders for projective texturing of MULTIPLE IMAGES in a single shader. This class can be used
 * to texture any mesh. We need to set the matrix of Orientation of the projector
 * and its projective camera information.
 */

import graphicEngine from 'Renderer/c3DEngine';
import * as THREE from 'THREE';

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



var ElevationEffect = {

    init: function(params) {
      
    },

    isInitiated: function() {

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
    }


};
export default ElevationEffect;
