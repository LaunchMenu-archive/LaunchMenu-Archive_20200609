export default class State {
    /**
     * Create a new State object to track an async boolean state
     * @param {('0'|'1'|'2'|'3')} [state] - The initial state
     * @constructs State
     * @public
     */
    constructor(state) {
        this.state = state || 0;

        // Listeners that check for state changes
        this.listeners = [];
    }

    /**
     * Check whether the state is true, or turn it to true
     * @param {boolean} [setState] - Whether to turn the state to true
     * @returns {boolean} If the state is true
     * @public
     */
    true(setState) {
        if (setState) this.__setState(2);
        return this.state == 2;
    }

    /**
     * Check whether the state is false, or turn it to false
     * @param {boolean} [setState] - Whether to turn the state to false
     * @returns {boolean} If the state is false
     * @public
     */
    false(setState) {
        if (setState) this.__setState(0);
        return this.state == 0;
    }

    /**
     * Check whether the state is turning true, or turn it to turning true
     * @param {boolean} [setState] - Whether to turn the state to turning true
     * @returns {boolean} If the state is turning true
     * @public
     */
    turningTrue(setState) {
        if (setState) this.__setState(1);
        return this.state == 1;
    }

    /**
     * Check whether the state is turning false, or turn it to turning false
     * @param {boolean} [setState] - Whether to turn the state to turning false
     * @returns {boolean} If the state is turning false
     * @public
     */
    turningFalse(setState) {
        if (setState) this.__setState(3);
        return this.state == 3;
    }

    /**
     * Check whether the state is true ot turning true
     * @returns {boolean} If the state is true orturning true
     * @public
     */
    trueOrTurningTrue() {
        return this.state == 1 || this.state == 2;
    }

    /**
     * Check whether the state is false ot turning false
     * @returns {boolean} If the state is false orturning false
     * @public
     */
    falseOrTurningFalse() {
        return this.state == 0 || this.state == 3;
    }

    // Listener related methods
    /**
     * Adds a listener to check for changes
     * @param {function} listener - The listener to be called when the state is changed
     * @returns {undefined}
     * @public
     */
    addListener(listener) {
        // Check if the listener isn't already in the list
        if (this.listeners.indexOf(listener) == -1)
            // Add the listener
            this.listeners.push(listener);
    }

    /**
     * Adds a listener to check for changes
     * @param {function} listener - The listener to be called when the state is changed
     * @returns {undefined}
     * @public
     */
    removeListener(listener) {
        // Get the index of the listener
        const index = this.listeners.indexOf(listener);

        // Check if the listener is in the list
        if (index != -1)
            // Remove the listener
            this.listeners.splice(index, 1);
    }

    /**
     * Changes the state and calls all listeners
     * @param {('0'|'1'|'2'|'3')} newState - The new state we should have
     * @returns {undefined}
     * @private
     */
    __setState(state) {
        // Store the old state
        const oldState = this.state;

        // Set the new state
        this.state = state;

        // Go through all listeners and call them
        this.listeners.forEach(listener => {
            listener.call(this, this.state, oldState);
        });
    }
}
