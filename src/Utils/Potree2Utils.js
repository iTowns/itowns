import { PointAttribute, PointAttributes, PointAttributeTypes } from 'Core/PointAttributes';

class Potree2Utils {
    static typeNameAttributeMap = {
        double: PointAttributeTypes.DATA_TYPE_DOUBLE,
        float: PointAttributeTypes.DATA_TYPE_FLOAT,
        int8: PointAttributeTypes.DATA_TYPE_INT8,
        uint8: PointAttributeTypes.DATA_TYPE_UINT8,
        int16: PointAttributeTypes.DATA_TYPE_INT16,
        uint16: PointAttributeTypes.DATA_TYPE_UINT16,
        int32: PointAttributeTypes.DATA_TYPE_INT32,
        uint32: PointAttributeTypes.DATA_TYPE_UINT32,
        int64: PointAttributeTypes.DATA_TYPE_INT64,
        uint64: PointAttributeTypes.DATA_TYPE_UINT64,
    };

    static parseAttributes(jsonAttributes) {
        const attributes = new PointAttributes();

        const replacements = {
            rgb: 'rgba',
        };

        for (const jsonAttribute of jsonAttributes) {
            // eslint-disable-next-line no-unused-vars
            const { name, description, size, numElements, elementSize, min, max } = jsonAttribute;

            const type = this.typeNameAttributeMap[jsonAttribute.type];

            const potreeAttributeName = replacements[name] ? replacements[name] : name;

            const attribute = new PointAttribute(potreeAttributeName, type, numElements);

            if (numElements === 1) {
                attribute.range = [min[0], max[0]];
            } else {
                attribute.range = [min, max];
            }

            if (name === 'gps-time') { // HACK: Guard against bad gpsTime range in metadata, see potree/potree#909
                if (attribute.range[0] === attribute.range[1]) {
                    attribute.range[1] += 1;
                }
            }

            attribute.initialRange = attribute.range;

            attributes.add(attribute);
        }

        {
            // check if it has normals
            const hasNormals =
                attributes.attributes.find(a => a.name === 'NormalX') !== undefined &&
                attributes.attributes.find(a => a.name === 'NormalY') !== undefined &&
                attributes.attributes.find(a => a.name === 'NormalZ') !== undefined;

            if (hasNormals) {
                const vector = {
                    name: 'NORMAL',
                    attributes: ['NormalX', 'NormalY', 'NormalZ'],
                };
                attributes.addVector(vector);
            }
        }

        return attributes;
    }
}

export default Potree2Utils;
