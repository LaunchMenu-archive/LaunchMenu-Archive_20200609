import ModuleSequence from "./moduleSequence";
import RequestPath from "./requestPath";

// Load the temporary CFG matcher until empirler V2 has been put on NPM
import CFG from "../../utils/CFG/CFG";
import CFGmatcher from "../../utils/CFG/CFGmatcher";

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
    static __createGrammar() {
        // Only create the grammar if it wasn't created already
        if (this.cfg) return this.cfg;

        // Declare the grammar and semantics

        /**
         * The format that all the rules have
         * @typedef {Object} rule
         * @property {string} type - A type name that isn't used anywhere, it just helps to organize
         * @property {Array<(string|RegExp)>} pattern - A list of either variables or text to match
         * @property {(Object|function)} matchTimes - How often this path part should be matched in the path sequence
         * @property {function} createMatcher - A function that creates the match function
         * @property {(number|function)} priorityWeight - The weight of the this part when comparing requestPathPatterns' priorities
         */

        // prettier-ignore
        this.cfg = new CFG({
            "part": [{
                type: "any number of times",
                pattern: ["exp", /\*\s*/],
                matchTimes: {min:0, max:Infinity},
                createMatcher: pattern => pattern[0].match,
                priorityWeight: pattern => pattern[0].priorityWeight,
            },{
                type: "at least once",
                pattern: ["exp", /\+\s*/],
                matchTimes: {min:1, max:Infinity},
                createMatcher: pattern => pattern[0].match,
                priorityWeight: pattern => pattern[0].priorityWeight,
            },{
                type: "n times",
                pattern: ["exp", /\s*\{\s*/, /\d+\s*/, /\}\s*/],
                matchTimes: pattern => ({min:Number(pattern[2]), max:Number(pattern[2])}),
                createMatcher: pattern => pattern[0].match,
                priorityWeight: pattern => pattern[0].priorityWeight,
            },{
                type: "between n and m times",
                pattern: ["exp", /\s*\{\s*/, /\d+\s*/, /\,\s*/, /\d+\s*/, /\s*\}\s*/],
                matchTimes: pattern => ({min:Number(pattern[2]), max:Number(pattern[4])}),
                createMatcher: pattern => pattern[0].match,
                priorityWeight: pattern => pattern[0].priorityWeight,
            },{
                type: "exactly once",
                pattern: ["exp"],
                matchTimes: {min:1, max:1},
                createMatcher: pattern => pattern[0].match,
                priorityWeight: pattern => pattern[0].priorityWeight,
            }],

            "exp": [{
                type: "group",
                pattern: [/\s*\(/, "exp", /\)\s*/],
                createMatcher: pattern => pattern[1].match,
                priorityWeight: 1,
            },{
                type: "or",
                pattern: ["exp", /\|/, "exp"],
                createMatcher: pattern => pathPart => pattern[0].match(pathPart) || pattern[2].match(pathPart),
                priorityWeight: 1,
            },{
                type: "not",
                pattern: [/\s*\!/, "exp"],
                createMatcher: pattern => pathPart => !pattern[1].match(pathPart),
                priorityWeight: 1,
            },{
                type: "moduleType",
                pattern: [/\s*#([\w\/\\\.]+)\s*/],
                createMatcher: pattern => pathPart => pattern[0][1] == pathPart.getType(),
                priorityWeight: 0.5,
            },{
                type: "module",
                pattern: [/\s*([\w\/\\\.]+)\s*/],
                createMatcher: pattern => pathPart => pattern[0][1] == pathPart.module,
                priorityWeight: 1,
            },{
                type: "anything",
                pattern: [],
                createMatcher: pattern => pathPart => true,
                priorityWeight: 0.01,
            }],
        }, "part");

        // Also return this cfg
        return this.cfg;
    }

    /**
     * Returns the class of this requestPathPattern instance
     * @returns {Class<Module>} The class of this requestPathPattern instance
     * @public
     */
    getClass() {
        // Get the class out of this object instance
        return this.__proto__.constructor;
    }

    /**
     * Gets the object representation of a single module
     * @param {string} text - The string to turn into its object representation
     * @returns {Object} THe object representation of the module
     * @private
     */
    __getModuleID(text) {
        // Get the cfg to use to create the matcher
        const cfg = this.getClass().cfg;

        // Create a cfg matcher
        const cfgMatcher = new CFGmatcher(cfg, text);

        // Match the input text
        const match = cfgMatcher.stepAll();

        // Check if we successfully created a match
        if (match instanceof Error) {
            throw match;
        } else {
            // Go through the tree to create the matcher and the part
            match.walkTree(stackItem => {
                // Get the definition of the stack item
                const definition = stackItem.definition;

                // Get the build of all children (which was created by this method itself, recursively)
                const children = stackItem.match.parts.map(part => {
                    // Check if the child is a stackItem, and if so return its build
                    if (part.variableMatch) return part.build;
                    // Otherwise return the regex match
                    else return part.match;
                });

                // Create the matcher of this stackItem
                const matcher = definition.createMatcher(children);

                // Get the matchTimes of this item
                let matchTimes = definition.matchTimes;
                if (typeof matchTimes == "function")
                    matchTimes = matchTimes(children);

                // Get the pioerityWeight of this item
                let priorityWeight = definition.priorityWeight;
                if (typeof priorityWeight == "function")
                    priorityWeight = priorityWeight(children);

                // Get the source text
                const range = stackItem.match.range;
                const subText = text.substring(range.start, range.end);

                // Combine all the data into one build object
                const build = {
                    match: matcher,
                    matchTimes: matchTimes,
                    priorityWeight: priorityWeight,
                    text: subText,
                };

                // Store the build
                stackItem.build = build;
            });

            // Return the build of the root
            return match.root.build;
        }
    }

    /**
     * gets the string representation of a specific module ID
     * @param {ModuleSequence~ModuleID} moduleID - The module to get the string representation for
     * @returns {string} The string representing this module
     * @private
     */
    __getModuleString(moduleID, unique) {
        return moduleID.text;
    }

    /**
     * Returns whether or not the provided module as stored matches the modulePattern
     * @param {string} modulePattern - The pattern to match
     * @param {object} module - The module to check
     * @returns {boolean} Whether or not the module matches
     * @private
     */
    __moduleMatchesPattern(modulePattern, module) {
        // Apply the matcher on the module
        return modulePattern.match(module);
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
                state.pattern.matchTimes.min == 0 &&
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

                // Check if the pattern matched the minimum required number of times
                if (state.matched + 1 >= pattern.matchTimes.min) {
                    // If so, go to the next pattern if there is any
                    if (!isFinalState)
                        addState(nextStates, {
                            index: state.index + 1,
                        });
                }

                // Check if the pattern hasn't yet matched the maximum allowed number of times
                if (state.matched + 1 < pattern.matchTimes.max) {
                    // If so, match the pattern more
                    addState(nextStates, {
                        index: state.index,
                        matched: state.matched + 1,
                    });
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
            (number, module) => module.priorityWeight + number,
            0
        );
        const otherMatchCount = pattern.modules.reduce(
            (number, module) => module.priorityWeight + number,
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

            // Check if both have a pattern
            if (!thisPattern) return -1;
            if (!otherPattern) return 1;

            // Check what pattern is more precise
            if (thisPattern.priorityWeight > otherPattern.priorityWeight)
                return 1;
            if (thisPattern.priorityWeight < otherPattern.priorityWeight)
                return -1;
        }

        // The patterns are exaaactly as precise
        return 0;
    }
}

// Create the grammar
RequestPathPattern.__createGrammar();

try {
    window.RequestPathPattern = RequestPathPattern;
} catch (e) {}
