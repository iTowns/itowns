/**
 * Generated On: 2016-11-15
 * Class: UpdaterQuadtree
 * Description: Updaters for Quadtrees.
 */

 import BrowseTree from 'Scene/BrowseTree';
 import NodeProcess from 'Scene/NodeProcess';

 function UpdaterQuadtree(args) {
     this.node = args.node;
     this.process = args.process || new NodeProcess(args.scene.currentCamera(), args.map.ellipsoid);
 }

 UpdaterQuadtree.prototype.update = function (params) {
     BrowseTree.browse(params.layer, params.cam, this.process, params.layersConfig, params.sceneParams);
 };

 UpdaterQuadtree.prototype.updateMaterial = function (params) {
     for (var a = 0; a < params.layer.children.length; ++a) {
         var root = params.layer.children[a];
         for (var c = 0; c < root.children.length; c++) {
             var node = root.children[c];
             var lookMaterial = function (obj) {
                 obj.material.uniforms[params.uniformName].value = params.value;
             };
             if (node.traverse)
                { node.traverse(lookMaterial); }
         }
     }
 };

 UpdaterQuadtree.prototype.selectNode = function (params) {
     BrowseTree.selectNode(params.layer, params.id);
 };

 export default UpdaterQuadtree;
