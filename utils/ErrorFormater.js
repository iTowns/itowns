function ErrorFormater() {}

ErrorFormater.prototype.constructor = ErrorFormater;

ErrorFormater.prototype.errorTypeMessages = {
    PARAM_MISSING: 'Parameter(s) %var% missing',
    PARAM_EMPTY: 'Parameter(s) "%var%" empty',
    PARAM_TYPE: 'Wrong type(s) for parameter(s) "%var%"',
    PARAM_FORMAT: 'Parameter(s) "%var%" not correctly formatted',
    PARAM_NOT_SUPPORT: 'Value(s) for parameter(s) "%var%" not supported',
    PARAM_UNKNOWN: 'Value(s) for parameter(s) "%var%" unknown',
};

ErrorFormater.prototype.errorLevels = [
    'INFO',
    'DEBUG',
    'WARN',
    'ERROR',
];

ErrorFormater.prototype.getMessage = function getMessage(errorType, parameters, errorLevel) {
    if (!errorType || !parameters) {
        return '[ErrorFormater.getMessage] message undefined !';
    }

    errorLevel = errorLevel || 'ERROR';

    if (this.errorLevels.indexOf(errorLevel) < 0) {
        return `[ErrorFormater.getMessage] the message level must be in [${this.errorLevels.join(', ')}]`;
    }

    var message = `[${errorLevel}] `;
    message += this.errorTypeMessages[errorType];

    if (!Array.isArray(parameters)) {
        parameters = [parameters];
    }
    message = message.replace('%var%', parameters.join(' - '));

    return message;
};

export default ErrorFormater;
