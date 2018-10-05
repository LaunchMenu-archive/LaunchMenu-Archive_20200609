import RequestPath from "../../../registry/requestPath/requestPath";
export default class ModuleSettings {
    /**
     * Create a new ModuleSettings object allowing you to store the data for a specific module instance
     * @constructs ModuleSettings
     * @hideconstructor
     * @param {(string|RequestPath)} requestPath - The requestPath that we want to store data for
     */
    cnstructor(requestPath) {
        // Normalize the request path
        if (!(requestPath instanceof RequestPath))
            requestPath = new RequestPath(requestPath);

        // Store what request path these settings are for
        this.requestPath = requestPath;

        // Track all settings files seperately
        this.settings = [];

        // The outside event listeners that will be called when data changes
        this.listeners = {};
    }

    /**
     * Loads all the settings files that apply to this requestPath
     * @returns {undefined}
     */
    async _init() {
        if (this.settings.length == 0) {
        }
    }
}
