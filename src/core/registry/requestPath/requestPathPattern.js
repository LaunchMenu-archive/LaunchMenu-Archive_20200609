import ModuleSequence from "./moduleSequence";
import RequestPath from "./requestPath";

export default class RequestPathPattern extends ModuleSequence {
    /**
     * Create a request path pattern that can be used to uniquely identifying module instances
     * @param {string} pattern - The string representation of the request path pattern
     * @constructs RequestPathPattern
     */
    constructor(pattern) {
        super(pattern);
    }

    /**
     * Returns all the rules for how to interpret each section of the requestPath
     * @returns {Object[]} A list of parse patterns
     * @private
     */
    __getParseModules() {
        // Declare the symbols
        const start = Symbol("start");
        const recurse = Symbol("recurse");

        // Declare the grammar and semantics
        return {
            start: start,
            [start]: [
                recurse,
                {
                    type: "anything, any number of times",
                    pattern: ["*"],
                    matchTimes: [0, Infinity],
                },
                {
                    type: "anything, at least once",
                    pattern: ["+"],
                    matchTimes: [1, Infinity],
                },
                {
                    type: "anything, n times",
                    pattern: ["{", /\d+/, "}"],
                    matchTimes: pattern => {
                        const times = pattern[1];
                        return [times, times];
                    },
                },
                {
                    type: "anything, between n and m times",
                    pattern: ["{", /\d+/, ",", /\d+/, "}"],
                    matchTimes: pattern => {
                        const min = pattern[1];
                        const max = pattern[3];
                        return [min, max];
                    },
                },
                {
                    type: "pattern, any number of times",
                    pattern: [recurse, "*"],
                    matchTimes: [0, Infinity],
                },
                {
                    type: "pattern, at least once",
                    pattern: [recurse, "+"],
                    matchTimes: [1, Infinity],
                },
                {
                    type: "pattern, n times",
                    pattern: [recurse, "{", /\d+/, "}"],
                    matchTimes: pattern => {
                        const times = pattern[1];
                        return [times, times];
                    },
                },
                {
                    type: "pattern, between n and m times",
                    pattern: [recurse, "{", /\d+/, ",", /\d+/, "}"],
                    matchTimes: pattern => {
                        const min = pattern[1];
                        const max = pattern[3];
                        return [min, max];
                    },
                },
            ],
            [recurse]: [
                {
                    type: "group",
                    pattern: ["(", recurse, ")"],
                    match: (module, pattern) => pattern[1].match(module),
                },
                {
                    type: "or",
                    pattern: [recurse, "|", recurse],
                    match: (module, pattern) =>
                        pattern[0].match(module) || pattern[2].match(module),
                },
                {
                    type: "not",
                    pattern: ["!", recurse],
                    match: (module, pattern) => !pattern[1].match(module),
                },
                {
                    type: "module",
                    pattern: [/\s*/, /[\w\/\\]*/, /\s*/],
                    match: (module, pattern) => pattern[1] == module,
                },
            ],
        };
    }

    /**
     * Gets the object representation of a single module
     * @param {string} text - The string to turn into its object representation
     * @returns {Object} The object representation of the module
     * @private
     */
    __getModuleID(text) {
        // Check if the text is some sort of flag
        if (text == "**") {
            // Indicate that this should match any module any number of times
            return {
                matchTimes: -1,
            };
        } else if (text == "*") {
            // Indicate that this should match any module only once
            return {
                matchTimes: 1,
            };
        }

        // Otherwise return a regular modulePath
        const data = text.split(ModuleSequence.IDseperator);
        return {
            module: data[0],
            matchTimes: 1,
            ...(data[1] != undefined ? {ID: Number(data[1])} : {}),
        };
    }

    /**
     * gets the string representation of a specific module ID
     * @param {ModuleSequence~ModuleID} moduleID - The module to get the string representation for
     * @returns {string} The string representing this module
     * @private
     */
    __getModuleString(moduleID, unique) {
        // Check whether it was a matching any module
        if (!moduleID.module) {
            // Check whether it was matching any mdoule once or multiple times
            if (moduleID.matchTimes == 1) return "*";
            if (moduleID.matchTimes == -1) return "**";
        }

        // Always add the ID if present
        return (
            moduleID.module +
            (moduleID.ID != undefined
                ? ModuleSequence.IDseperator + moduleID.ID
                : "")
        );
    }

    /**
     * Returns whether or not the provided module as stored matches the modulePattern
     * @param {string} modulePattern - The pattern to match
     * @param {object} module - The module to check
     * @returns {boolean} Whether or not the module matches
     * @private
     */
    __moduleMatchesPattern(modulePattern, module) {
        // If the modulePattern contains no module, match anything
        if (!modulePattern.module) return true;

        // Check whether this module matches the pattern
        return (
            modulePattern.module == module.module &&
            (modulePattern.ID == undefined || modulePattern.ID == module.ID)
        );
    }

    /**
     * Returns whether or not the given requestPath matches this pattern
     * @param {(RequestPath|string)} path - The path to test
     * @returns {boolean} Whether or not the path matches the pattern
     * @public
     */
    test(requestPath) {
        // Normalize the requestPath
        if (typeof requestPath == "string")
            requestPath = new RequestPath(requestPath);

        // Treat the pattern as sort of a NFA with multiple states,
        //  where every state is the pattern that could next be matched
        let states = [];

        // Helper method to insert only unique states
        const addState = (states, state) => {
            // Check if the state isn't already in there
            const containsState = !!states.find(
                s => s.index == state.index && s.matched == state.matched
            );

            // Don't insert if it is already present
            if (containsState) return;

            // Augment the state with the pattern
            state.pattern = this.modules[state.index];
            if (!state.matched) state.matched = 0;

            // Add the state
            states.push(state);

            // Check if the pattern could match 0 times, if so also add the subsequent state
            if (
                state.pattern.matchTimes == -1 &&
                state.index + 1 != this.modules.length
            )
                addState(states, {index: state.index + 1, matched: 0});
        };

        // Add the first state
        addState(states, {index: 0});

        // Keep track of whether we are in a final state or not,
        //  if we just matched a final pattern, we are
        let finalStateReached = false;

        // Go through each module of the request path, and check if it matches
        for (var i = 0; i < requestPath.modules.length; i++) {
            const module = requestPath.modules[i];

            // Compute the next states
            const nextStates = [];

            // Indicate that we are not in a final state
            finalStateReached = false;

            // Go through all states to determine the next state set
            states.forEach(state => {
                // Check the pattern
                const pattern = state.pattern;

                // Check if the pattern matches this module
                if (!this.__moduleMatchesPattern(pattern, module)) {
                    // The module failed to match, so this state leads to a dead end
                    return;
                }

                // Check if this state was a final state
                const isFinalState = state.index == this.modules.length - 1;

                // Check if the pattern could match a random amount of times
                if (pattern.matchTimes == -1) {
                    // If so, indicate that we can match this pattern more often,
                    //  which will automatically also add the next state
                    //  (as this state might match 0 times)
                    addState(nextStates, {
                        index: state.index,
                        matched: state.matched + 1,
                    });
                } else {
                    // Check if the pattern matched the correct number of times
                    if (pattern.matchTimes == state.matched + 1) {
                        // If so, go to the next pattern if there is any
                        if (!isFinalState)
                            addState(nextStates, {
                                index: state.index + 1,
                            });
                    } else {
                        // Otherwise match the pattern more
                        addState(nextStates, {
                            index: state.index,
                            matched: state.matched + 1,
                        });
                    }
                }

                // If this was a final state, mark finalStateReached to be true
                if (isFinalState) finalStateReached = true;
            });

            // Replace the current state by the next state
            states = nextStates;
        }

        // Return whether we stopped in a final state
        return finalStateReached;
    }

    /**
     * Compare the priority with another pattern for priority sorting
     * @param {RequestPathPattern} pattern - The pattern to compare this pattern to
     * @returns {number} The priority
     * @public
     */
    comparePriority(pattern) {
        // First check what the number of exact module matches for both patterns is
        const thisMatchCount = this.modules.reduce(
            (number, module) => (module.module ? 1 : 0) + number,
            0
        );
        const otherMatchCount = pattern.modules.reduce(
            (number, module) => (module.module ? 1 : 0) + number,
            0
        );

        // IF this match count is not equal, return the most precise pattern
        if (thisMatchCount != otherMatchCount)
            return thisMatchCount > otherMatchCount ? 1 : -1;

        // If the patterns are as precise as one and another, prioritise on precision at the start

        // Check how for we should at most loop
        const max = Math.max(pattern.modules.length, this.modules.length);

        // Loop through all the patterns
        for (var i = 0; i < max; i++) {
            // Get both patterns
            const thisPattern = this.modules[i];
            const otherPattern = pattern.modules[i];

            // Check what pattern is more precise
            if (
                thisPattern &&
                thisPattern.module &&
                (!otherPattern || !otherPattern.module)
            )
                return 1;
            if (
                (!thisPattern || !thisPattern.module) &&
                otherPattern.module &&
                otherPattern
            )
                return -1;
        }

        // The patterns are exaaactly as precise
        return 0;
    }
}
