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

/**
 * Some types of possible point attribute data formats
 *
 * @class
 */
const PointAttributeTypes = {
    DATA_TYPE_DOUBLE: { name: 'double', size: 8 },
    DATA_TYPE_FLOAT: { name: 'float',  size: 4 },
    DATA_TYPE_INT8: { name: 'int8',   size: 1 },
    DATA_TYPE_UINT8: { name: 'uint8',  size: 1 },
    DATA_TYPE_INT16: { name: 'int16',  size: 2 },
    DATA_TYPE_UINT16: { name: 'uint16', size: 2 },
    DATA_TYPE_INT32: { name: 'int32',  size: 4 },
    DATA_TYPE_UINT32: { name: 'uint32', size: 4 },
    DATA_TYPE_INT64: { name: 'int64',  size: 8 },
    DATA_TYPE_UINT64: { name: 'uint64', size: 8 },
};

Object.keys(PointAttributeTypes).forEach((type, index) => {
    PointAttributeTypes[index] = PointAttributeTypes[type];
});

export { PointAttributeTypes };

class PointAttribute {
    constructor(name, type, numElements) {
        this.name = name;
        this.type = type;
        this.numElements = numElements;
        this.byteSize = this.numElements * this.type.size;
        this.description = '';
        this.range = [Infinity, -Infinity];
    }
}

PointAttribute.POSITION_CARTESIAN = new PointAttribute(
    'POSITION_CARTESIAN', PointAttributeTypes.DATA_TYPE_FLOAT, 3);

PointAttribute.RGBA_PACKED = new PointAttribute(
    'COLOR_PACKED', PointAttributeTypes.DATA_TYPE_INT8, 4);

PointAttribute.COLOR_PACKED = PointAttribute.RGBA_PACKED;

PointAttribute.RGB_PACKED = new PointAttribute(
    'COLOR_PACKED', PointAttributeTypes.DATA_TYPE_INT8, 3);

PointAttribute.NORMAL_FLOATS = new PointAttribute(
    'NORMAL_FLOATS', PointAttributeTypes.DATA_TYPE_FLOAT, 3);

PointAttribute.INTENSITY = new PointAttribute(
    'INTENSITY', PointAttributeTypes.DATA_TYPE_UINT16, 1);

PointAttribute.CLASSIFICATION = new PointAttribute(
    'CLASSIFICATION', PointAttributeTypes.DATA_TYPE_UINT8, 1);

PointAttribute.NORMAL_SPHEREMAPPED = new PointAttribute(
    'NORMAL_SPHEREMAPPED', PointAttributeTypes.DATA_TYPE_UINT8, 2);

PointAttribute.NORMAL_OCT16 = new PointAttribute(
    'NORMAL_OCT16', PointAttributeTypes.DATA_TYPE_UINT8, 2);

PointAttribute.NORMAL = new PointAttribute(
    'NORMAL', PointAttributeTypes.DATA_TYPE_FLOAT, 3);

PointAttribute.RETURN_NUMBER = new PointAttribute(
    'RETURN_NUMBER', PointAttributeTypes.DATA_TYPE_UINT8, 1);

PointAttribute.NUMBER_OF_RETURNS = new PointAttribute(
    'NUMBER_OF_RETURNS', PointAttributeTypes.DATA_TYPE_UINT8, 1);

PointAttribute.SOURCE_ID = new PointAttribute(
    'SOURCE_ID', PointAttributeTypes.DATA_TYPE_UINT16, 1);

PointAttribute.INDICES = new PointAttribute(
    'INDICES', PointAttributeTypes.DATA_TYPE_UINT32, 1);

PointAttribute.SPACING = new PointAttribute(
    'SPACING', PointAttributeTypes.DATA_TYPE_FLOAT, 1);

PointAttribute.GPS_TIME = new PointAttribute(
    'GPS_TIME', PointAttributeTypes.DATA_TYPE_DOUBLE, 1);

export { PointAttribute };

export class Potree2PointAttributes {
    constructor() {
        this.attributes = [];
        this.byteSize = 0;
        this.size = 0;
        this.vectors = [];
    }

    add(pointAttribute) {
        this.attributes.push(pointAttribute);
        this.byteSize += pointAttribute.byteSize;
        this.size++;
    }

    addVector(vector) {
        this.vectors.push(vector);
    }

    hasNormals() {
        for (let index = 0; index < this.attributes.length; index++) {
            const name = this.attributes[index];
            const pointAttribute = this.attributes[name];
            if (pointAttribute === PointAttribute.NORMAL_SPHEREMAPPED ||
                pointAttribute === PointAttribute.NORMAL_FLOATS ||
                pointAttribute === PointAttribute.NORMAL ||
                pointAttribute === PointAttribute.NORMAL_OCT16) {
                return true;
            }
        }

        return false;
    }
}
