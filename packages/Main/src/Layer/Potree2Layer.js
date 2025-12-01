/*
============
== POTREE ==
============

http://potree.org

Copyright (c) 2011-2020, Markus Schütz
All rights reserved.

    Redistribution and use in source and binary forms, with or without
modification, are permitted provided that the following conditions are met:

    1. Redistributions of source code must retain the above copyright notice, this
list of conditions and the following disclaimer.
2. Redistributions in binary form must reproduce the above copyright notice,
    this list of conditions and the following disclaimer in the documentation
and/or other materials provided with the distribution.

    THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS" AND
ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED
WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE
DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT OWNER OR CONTRIBUTORS BE LIABLE FOR
ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES
(INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES;
LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND
ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
(INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS
SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.

    The views and conclusions contained in the software and documentation are those
of the authors and should not be interpreted as representing official policies,
    either expressed or implied, of the FreeBSD Project.
 */

import PointCloudLayer from 'Layer/PointCloudLayer';
import Potree2Node from 'Core/Potree2Node';

/**
 * @property {boolean} isPotreeLayer - Used to checkout whether this layer
 * is a Potree2Layer. Default is `true`. You should not change this, as it is
 * used internally for optimisation.
 *
 * @extends PointCloudLayer
 */
class Potree2Layer extends PointCloudLayer {
    /**
     * Constructs a new instance of Potree2 layer.
     *
     * @example
     * // Create a new point cloud layer
     * const points = new Potree2Layer('points',
     *  {
     *      source: new Potree2Source({
     *          url: 'https://pointsClouds/',
     *          file: 'metadata.json',
     *      }
     *  });
     *
     * View.prototype.addLayer.call(view, points);
     *
     * @param {string} id - The id of the layer, that should be unique. It is
     * not mandatory, but an error will be emitted if this layer is added a
     * {@link View} that already has a layer going by that id.
     * @param {Object} config - Configuration, all elements in it
     * will be merged as is in the layer. For example, if the configuration
     * contains three elements `name, protocol, extent`, these elements will be
     * available using `layer.name` or something else depending on the property
     * name. See the list of properties to know which one can be specified.
     * @param {string} [config.crs=ESPG:4326] - The CRS of the {@link View} this
     * layer will be attached to. This is used to determine the extent of this
     * layer.  Default to `EPSG:4326`.
     */
    constructor(id, config) {
        super(id, config);

        /**
         * @type {boolean}
         * @readonly
         */
        this.isPotree2Layer = true;

        const resolve = this.addInitializationStep();
        this.whenReady = this.source.whenReady.then((metadata) => {
            this.metadata = metadata;

            const normal = Array.isArray(metadata.attributes) &&
               metadata.attributes.find(elem => elem.name.startsWith('NORMAL'));
            if (normal) {
                this.material.defines[normal.name] = 1;
            }

            this.setElevationRange();

            const { hierarchy } = metadata;
            this.root = new Potree2Node(0, -1, 0, 0, this.source, this.crs);

            this.root.nodeType = 2;
            this.root.hierarchyByteOffset = 0n;
            this.root.hierarchyByteSize = BigInt(hierarchy.firstChunkSize);
            this.root.byteOffset = 0;

            return this.root.loadOctree().then(resolve);
        });
    }
}

export default Potree2Layer;
