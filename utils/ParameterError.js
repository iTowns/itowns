function ParameterError(message) {
    this.message = message || 'Default message';
    this.name = 'ParameterError';
}

ParameterError.prototype = new Error();

export default ParameterError;
