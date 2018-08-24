export default class State {
    /**
     * Create a new State object to track an async boolean state
     * @param {'0'|'1'|'2'|'3'} [state] - The initial state
     * @constructs State
     * @public
     */
    constructor(state) {
        this.state = state || 0;
    }

    /**
     * Check whether the state is true, or turn it to true
     * @param {boolean} [setState] - Whether to turn the state to true
     * @returns {boolean} If the state is true
     * @public
     */
    true(setState) {
        if (setState) this.state = 2;
        return this.state == 2;
    }

    /**
     * Check whether the state is false, or turn it to false
     * @param {boolean} [setState] - Whether to turn the state to false
     * @returns {boolean} If the state is false
     * @public
     */
    false(setState) {
        if (setState) this.state = 0;
        return this.state == 0;
    }

    /**
     * Check whether the state is turning true, or turn it to turning true
     * @param {boolean} [setState] - Whether to turn the state to turning true
     * @returns {boolean} If the state is turning true
     * @public
     */
    turningTrue(setState) {
        if (setState) this.state = 1;
        return this.state == 1;
    }

    /**
     * Check whether the state is turning false, or turn it to turning false
     * @param {boolean} [setState] - Whether to turn the state to turning false
     * @returns {boolean} If the state is turning false
     * @public
     */
    turningFalse(setState) {
        if (setState) this.state = 3;
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
}
