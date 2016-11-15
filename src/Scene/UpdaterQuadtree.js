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
     this.browser = new BrowseTree(args.scene.gfxEngine);
 }

 UpdaterQuadtree.prototype.update = function (params) {
     this.browser.browse(params.layer, params.cam, this.process, params.layersConfig);
 };

 UpdaterQuadtree.prototype.updateMaterial = function (params) {
     for (var a = 0; a < this.browser.tree.children.length; ++a) {
         var root = this.browser.tree.children[a];
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

 UpdaterQuadtree.prototype.setNodeToSelect = function (params) {
     this.browser.selectedNodeId = params.id;
 };

 export default UpdaterQuadtree;
