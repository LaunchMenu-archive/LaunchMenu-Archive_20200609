import ModuleSequence from "./moduleSequence";
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
     * Gets the object representation of a single module
     * @param {string} text - The string to turn into its object representation
     * @returns {Object} THe object representation of the module
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

        // The part of the pattern we are currently considering
        let patternIndex = 0;

        // Track how often the current pattern has been matched
        let matchedTimes = 0;

        // Go through each module of the request path, and check if it matches
        for (var i = 0; i < requestPath.modules.length; i++) {
            const module = requestPath.modules[i];

            // The pattern we are considering
            const pattern = this.modules[patternIndex];
            // Check if this pattern exists, if not, the requestPath is too long
            if (!pattern) return false;

            // Check if the pattern must match the module
            if (pattern.matchTimes == -1) {
                // Check if the next pattern matches
                const nextPattern = this.modules[patternIndex + 1];
                if (
                    nextPattern &&
                    this.__moduleMatchesPattern(nextPattern, module)
                ) {
                    // Go to the next pattern, and check this module again
                    patternIndex++;
                    matchedTimes = 0;
                    i--;
                    continue;
                }
            }

            // Check if the pattern matches this module
            if (!this.__moduleMatchesPattern(pattern, module)) {
                // The module failed to match, so return false
                return false;
            }

            // Check if the matchedTimes reached the pattern's matchTimes
            if (++matchedTimes == pattern.matchTimes) {
                // If this is the case, go to the next pattern
                patternIndex++;
                matchedTimes = 0;
            }
        }

        // Skip any patterns that don't need matching
        while (
            this.modules[patternIndex] &&
            this.modules[patternIndex].matchTimes == -1
        )
            patternIndex++;

        // If the pattern index hasn't reached the end, return false
        if (patternIndex != this.modules.length) return false;

        // If all checks above were successfull, the pattern matches
        return true;
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
            (module, number) => (module.module ? 1 : 0) + number,
            0
        );
        const otherMatchCount = pattern.modules.reduce(
            (module, number) => (module.module ? 1 : 0) + number,
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
            if (thisPattern.module && !otherPattern.module) return 1;
            if (!thisPattern.module && otherPattern.module) return -1;
        }

        // The patterns are exaaactly as precise
        return 0;
    }
}
