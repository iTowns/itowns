/**
 * Custom error thrown when cancelling commands. Allows the caller to act differently if needed.
 * @class
 * @param {Command} command
 */
class CancelledCommandException {
    constructor(command) {
        this.command = command;
        this.isCancelledCommandException = true;
    }

    toString() {
        return `Cancelled command ${this.command.requester.id}/${this.command.layer.id}`;
    }
}
export default CancelledCommandException;
