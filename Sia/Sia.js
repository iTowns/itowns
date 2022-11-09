/* eslint-disable guard-for-in */
/* eslint-disable default-case */
/* eslint-disable no-throw-literal */
const utfz = require('utfz-lib');
const { Buffer: BufferShim } = require('buffer/');
const builtinConstructors = require('./constructors');
const SIA_TYPES = require('./types');

const BufferClass = typeof Buffer === 'undefined' ? BufferShim : Buffer;

class Sia {
    constructor({ size = 33554432, constructors = builtinConstructors } = {}) {
        this.map = new Map();
        this.buffer = BufferClass.alloc(size);
        this.offset = 0;
        this.constructors = constructors;
        this.strings = 0;
    }
    reset() {
        this.offset = 0;
        this.strings = 0;
        this.map = new Map();
    }
    writeString(str, offset) {
        return this.buffer.write(str, offset);
    }
    writeUInt8(number) {
        this.buffer[this.offset] = number;
        this.offset += 1;
    }
    writeUInt16(number) {
    // this.buffer.writeUInt16LE(number, this.offset);
        this.buffer[this.offset] = number & 0xff;
        this.buffer[this.offset + 1] = number >> 8;
        this.offset += 2;
    }
    writeUInt32(number) {
        this.buffer.writeUInt32LE(number, this.offset);
        this.offset += 4;
    }
    writeInt8(number) {
        this.buffer.writeInt8(number, this.offset);
        this.offset += 1;
    }
    writeInt16(number) {
        this.buffer.writeInt16LE(number, this.offset);
        this.offset += 2;
    }
    writeInt32(number) {
        this.buffer.writeInt32LE(number, this.offset);
        this.offset += 4;
    }
    writeDouble(number) {
        this.buffer.writeDoubleLE(number, this.offset);
        this.offset += 8;
    }
    addString(string) {
        const { length } = string;
        // See benchmarks/string/both
        if (length < 60) {
            this.writeUInt8(SIA_TYPES.utfz);
            const byteLength = utfz.pack(
                string,
                length,
                this.buffer,
                this.offset + 1,
            );
            this.buffer.writeUInt8(byteLength, this.offset);
            this.offset += byteLength + 1;
            return;
        }
        const maxBytes = length * 3;
        if (maxBytes < 0x100) {
            // if (length < 128) {
            this.writeUInt8(SIA_TYPES.string8);
            const byteLength = this.writeString(string, this.offset + 1);
            this.buffer.writeUInt8(byteLength, this.offset);
            this.offset += byteLength + 1;
            // } else {
            //  this.writeUInt8(SIA_TYPES.string8);
            //  const byteLength = this.writeString(string, this.offset + 1);
            //  this.buffer.writeUInt8(byteLength, this.offset);
            //  this.offset += byteLength + 1;
            // }
        } else if (maxBytes < 0x10000) {
            this.writeUInt8(SIA_TYPES.string16);
            const byteLength = this.writeString(string, this.offset + 2);
            this.buffer.writeUInt16LE(byteLength, this.offset);
            this.offset += byteLength + 2;
        } else {
            this.writeUInt8(SIA_TYPES.string32);
            const byteLength = this.writeString(string, this.offset + 4);
            this.buffer.writeUInt32LE(byteLength, this.offset);
            this.offset += byteLength + 4;
        }
    }
    addRef(ref) {
        if (ref < 0x100) {
            this.writeUInt8(SIA_TYPES.ref8);
            this.writeUInt8(ref);
        } else if (ref < 0x10000) {
            this.writeUInt8(SIA_TYPES.ref16);
            this.writeUInt16(ref);
        } else if (ref < 0x100000000) {
            this.writeUInt8(SIA_TYPES.ref32);
            this.writeUInt32(ref);
        } else {
            throw `Ref size ${ref} is too big`;
        }
    }
    addNumber(number) {
    // TODO: make this faster https://jsben.ch/26igA
        if (Number.isInteger(number)) { return this.addInteger(number); }
        return this.addFloat(number);
    }
    addInteger(number) {
        if (number < 0) {
            if (number >= -0x80) {
                this.writeUInt8(SIA_TYPES.int8);
                this.writeInt8(number);
            } else if (number >= -0x8000) {
                this.writeUInt8(SIA_TYPES.int16);
                this.writeInt16(number);
            } else if (number >= -0x80000000) {
                this.writeUInt8(SIA_TYPES.int32);
                this.writeInt32(number);
            } else {
                this.addFloat(number);
            }
        } else if (number < 0x100) {
            this.writeUInt8(SIA_TYPES.uint8);
            this.writeUInt8(number);
        } else if (number < 0x10000) {
            this.writeUInt8(SIA_TYPES.uint16);
            this.writeUInt16(number);
        } else if (number < 0x100000000) {
            this.writeUInt8(SIA_TYPES.uint32);
            this.writeUInt32(number);
        } else {
            this.addFloat(number);
        }
    }
    addFloat(number) {
        this.writeUInt8(SIA_TYPES.float64);
        this.writeDouble(number);
    }
    startArray(length) {
        if (length < 0x100) {
            this.writeUInt8(SIA_TYPES.array8);
            this.writeUInt8(length);
        } else if (length < 0x10000) {
            this.writeUInt8(SIA_TYPES.array16);
            this.writeUInt16(length);
        } else if (length < 0x100000000) {
            this.writeUInt8(SIA_TYPES.array32);
            this.writeUInt32(length);
        } else {
            throw `Array of size ${length} is too big to serialize`;
        }
    }
    startObject() {
        this.writeUInt8(SIA_TYPES.objectStart);
    }
    endObject() {
        this.writeUInt8(SIA_TYPES.objectEnd);
    }
    startMap() {
        this.writeUInt8(SIA_TYPES.mapStart);
    }
    endMap() {
        this.writeUInt8(SIA_TYPES.mapEnd);
    }
    startSet() {
        this.writeUInt8(SIA_TYPES.setStart);
    }
    endSet() {
        this.writeUInt8(SIA_TYPES.setEnd);
    }
    addBoolean(bool) {
        const type = bool ? SIA_TYPES.true : SIA_TYPES.false;
        this.writeUInt8(type);
    }
    addNull() {
        this.writeUInt8(SIA_TYPES.null);
    }
    addUndefined() {
        this.writeUInt8(SIA_TYPES.undefined);
    }
    addCustomType(item, constructor) {
        const { args, code } = this.itemToSia(item, constructor);
        if (code < 0x100) {
            this.writeUInt8(SIA_TYPES.constructor8);
            this.writeUInt8(code);
        } else if (code < 0x10000) {
            this.writeUInt8(SIA_TYPES.constructor16);
            this.writeUInt16(code);
        } else if (code < 0x100000000) {
            this.writeUInt8(SIA_TYPES.constructor32);
            this.writeUInt32(code);
        } else {
            throw `Code ${code} too big for a constructor`;
        }
        this.serializeItem(args);
    }
    serializeItem(item) {
        const type = typeof item;
        switch (type) {
            case 'string':
                this.addString(item);
                return;

            case 'undefined':
                this.addUndefined(item);
                return;

            case 'number':
                this.addNumber(item);
                return;

            case 'boolean':
                this.addBoolean(item);
                return;

            case 'object': {
                if (item === null) {
                    this.addNull(item);
                    return;
                }
                const { constructor } = Object.getPrototypeOf(item);
                // console.log(constructor);
                switch (constructor) {
                    case Object: {
                        this.startObject();
                        for (const key in item) {
                            const ref = this.map.get(key);
                            if (!ref) {
                                this.map.set(key, this.strings++);
                                this.addString(key);
                            } else {
                                this.addRef(ref);
                            }
                            this.serializeItem(item[key]);
                        }
                        this.endObject();
                        return;
                    }

                    case Array: {
                        this.startArray(item.length);
                        for (const member of item) {
                            this.serializeItem(member);
                        }
                        return;
                    }

                    case Set: {
                        this.startSet();
                        for (const member of item) {
                            this.serializeItem(member);
                        }
                        this.endSet();
                        return;
                    }

                    case Map: {
                        this.startMap();
                        for (const [key, value] of item) {
                            this.serializeItem(key);
                            this.serializeItem(value);
                        }
                        this.endMap();
                        return;
                    }

                    case BufferClass: {
                        const { length } = item;
                        if (item.length < 0x100) {
                            this.writeUInt8(SIA_TYPES.bin8);
                            this.writeUInt8(length);
                            item.copy(this.buffer, this.offset);
                            this.offset += length;
                        } else if (item.length < 0x10000) {
                            this.writeUInt8(SIA_TYPES.bin16);
                            this.writeUInt16(length);
                            item.copy(this.buffer, this.offset);
                            this.offset += length;
                        } else if (item.length < 0x100000000) {
                            this.writeUInt8(SIA_TYPES.bin32);
                            this.writeUInt32(length);
                            item.copy(this.buffer, this.offset);
                            this.offset += length;
                        } else {
                            throw `Buffer of size ${length} is too big to serialize`;
                        }
                        return;
                    }

                    default:
                        this.addCustomType(item, constructor);
                }
            }
        }
    }
    itemToSia(item, constructor) {
        for (const entry of this.constructors) {
            if (entry.constructor === constructor) {
                return {
                    code: entry.code,
                    args: entry.args(item),
                };
            }
        }
        throw `Serialization of item ${item} is not supported`;
    }
    serialize(data) {
        this.data = data;
        this.reset();
        this.serializeItem(this.data);
        return this.buffer.slice(0, this.offset);
    }
}

class DeSia {
    constructor({
        constructors = builtinConstructors,
        mapSize = 256 * 1000,
    } = {}) {
        this.constructors = new Array(256);
        for (const item of constructors) {
            this.constructors[item.code] = item;
        }
        this.map = new Array(mapSize);
        this.offset = 0;
        this.strings = 0;
    }
    reset() {
        this.offset = 0;
        this.strings = 0;
    }
    readKey(blockType) {
        switch (blockType) {
            case SIA_TYPES.ref8: {
                const ref = this.readUInt8();
                return this.map[ref];
            }

            case SIA_TYPES.ref16: {
                const ref = this.readUInt16();
                return this.map[ref];
            }

            case SIA_TYPES.ref32: {
                const ref = this.readUInt32();
                return this.map[ref];
            }

            case SIA_TYPES.utfz: {
                const length = this.readUInt8();
                const str = utfz.unpack(this.buffer, length, this.offset);
                this.offset += length;
                this.map[this.strings++] = str;
                return str;
            }

            case SIA_TYPES.string8: {
                const length = this.readUInt8();
                const str = this.readString(length);
                this.map[this.strings++] = str;
                return str;
            }

            case SIA_TYPES.string16: {
                const length = this.readUInt16();
                const str = this.readString(length);
                this.map[this.strings++] = str;
                return str;
            }

            case SIA_TYPES.string32: {
                const length = this.readUInt32();
                const str = this.readString(length);
                this.map[this.strings++] = str;
                return str;
            }

            default:
                throw `Key of type ${blockType} is invalid.`;
        }
    }
    readBlock() {
        const blockType = this.readUInt8();
        // if (this.offset < 200) { console.log(blockType, this.offset); }
        switch (blockType) {
            case SIA_TYPES.utfz: {
                const length = this.readUInt8();
                const str = utfz.unpack(this.buffer, length, this.offset);
                this.offset += length;
                return str;
            }

            case SIA_TYPES.string8: {
                const length = this.readUInt8();
                const str = this.readString(length);
                return str;
            }

            case SIA_TYPES.string16: {
                const length = this.readUInt16();
                const str = this.readString(length);
                return str;
            }

            case SIA_TYPES.string32: {
                const length = this.readUInt32();
                const str = this.readString(length);
                return str;
            }

            case SIA_TYPES.bin8: {
                const length = this.readUInt8();
                const buf = BufferClass.allocUnsafeSlow(length);
                this.buffer.copy(buf, 0, this.offset, this.offset + length);
                this.offset += length;
                return buf;
            }

            case SIA_TYPES.bin16: {
                const length = this.readUInt16();
                const buf = BufferClass.allocUnsafeSlow(length);
                this.buffer.copy(buf, 0, this.offset, this.offset + length);
                this.offset += length;
                return buf;
            }

            case SIA_TYPES.bin32: {
                const length = this.readUInt32();
                const buf = BufferClass.allocUnsafeSlow(length);
                this.buffer.copy(buf, 0, this.offset, this.offset + length);
                this.offset += length;
                return buf;
            }

            case SIA_TYPES.int8: {
                return this.readInt8();
            }

            case SIA_TYPES.int16: {
                return this.readInt16();
            }

            case SIA_TYPES.int32: {
                return this.readInt32();
            }

            case SIA_TYPES.uint8: {
                return this.readUInt8();
            }

            case SIA_TYPES.uint16: {
                return this.readUInt16();
            }

            case SIA_TYPES.uint32: {
                return this.readUInt32();
            }

            case SIA_TYPES.float64: {
                return this.readDouble();
            }

            case SIA_TYPES.constructor8: {
                const code = this.readUInt8();
                const args = this.readBlock();
                const constructor = this.constructors[code];
                if (constructor) {
                    return constructor.build(...args);
                } else {
                    throw `Constructor ${code} is unknown`;
                }
            }

            case SIA_TYPES.constructor16: {
                const code = this.readUInt16();
                const args = this.readBlock();
                const constructor = this.constructors[code];
                if (constructor) {
                    return constructor.build(...args);
                } else {
                    throw `Constructor ${code} is unknown`;
                }
            }

            case SIA_TYPES.constructor32: {
                const code = this.readUInt32();
                const args = this.readBlock();
                const constructor = this.constructors[code];
                if (constructor) {
                    return constructor.build(...args);
                } else {
                    throw `Constructor ${code} is unknown`;
                }
            }

            case SIA_TYPES.false:
                return false;

            case SIA_TYPES.true:
                return true;

            case SIA_TYPES.null:
                return null;

            case SIA_TYPES.undefined:
                return undefined;

            case SIA_TYPES.objectStart: {
                const obj = {};
                let curr = this.buffer[this.offset++];
                while (curr !== SIA_TYPES.objectEnd) {
                    obj[this.readKey(curr)] = this.readBlock();
                    curr = this.buffer[this.offset++];
                }
                return obj;
            }

            case SIA_TYPES.mapStart: {
                const map = new Map();
                let curr = this.buffer[this.offset];
                while (curr !== SIA_TYPES.mapEnd) {
                    map.set(this.readBlock(), this.readBlock());
                    curr = this.buffer[this.offset];
                }
                return map;
            }

            case SIA_TYPES.setStart: {
                const set = new Set();
                let curr = this.buffer[this.offset];
                while (curr !== SIA_TYPES.setEnd) {
                    set.add(this.readBlock());
                    curr = this.buffer[this.offset];
                }
                return set;
            }

            case SIA_TYPES.array8: {
                const length = this.readUInt8();
                const arr = new Array(length);
                for (let i = 0; i < length; i++) {
                    arr[i] = this.readBlock();
                }
                return arr;
            }

            case SIA_TYPES.array16: {
                const length = this.readUInt16();
                const arr = new Array(length);
                for (let i = 0; i < length; i++) {
                    arr[i] = this.readBlock();
                }
                return arr;
            }

            case SIA_TYPES.array32: {
                const length = this.readUInt32();
                const arr = new Array(length);
                for (let i = 0; i < length; i++) {
                    arr[i] = this.readBlock();
                }
                return arr;
            }

            default:
                // const error = `Unsupported type: ${blockType}`;
                throw `ERROR Unsupported type: ${blockType}`;
        }
    }
    readUInt8() {
        return this.buffer[this.offset++];
    }
    readUInt16() {
        return this.buffer[this.offset++] + (this.buffer[this.offset++] << 8);
    }
    readUInt32() {
        const uInt32 = this.buffer.readUInt32LE(this.offset);
        this.offset += 4;
        return uInt32;
    }
    readInt8() {
        return this.buffer.readInt8(this.offset++);
    }
    readInt16() {
        const int16 = this.buffer.readInt16LE(this.offset);
        this.offset += 2;
        return int16;
    }
    readInt32() {
        const int32 = this.buffer.readInt32LE(this.offset);
        this.offset += 4;
        return int32;
    }
    readDouble() {
        try {
            const uInt64 = this.buffer.readDoubleLE(this.offset);
            this.offset += 8;
            return uInt64;
        } catch (error) {
            console.log('error');
            console.log(error);
            console.log('offset:', this.offset);
            console.log('error');
            if (this.offset === 162 || this.offset === 171) {
                this.offset += 8;
            }
        }
    }
    readString(length) {
        const str = this.buffer.toString('utf8', this.offset, this.offset + length);
        this.offset += length;
        return str;
    }
    deserialize(buffer) {
        this.buffer = buffer;
        this.reset();
        return this.readBlock();
    }
}

const _Sia = new Sia();
const _Desia = new DeSia();

const sia = data => _Sia.serialize(data);
const desia = data => _Desia.deserialize(data);

module.exports.sia = sia;
module.exports.desia = desia;

module.exports.Sia = Sia;
module.exports.DeSia = DeSia;
module.exports.constructors = builtinConstructors;
