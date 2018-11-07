import GUIModule from "LM:GUIModule";
export default class TabsContainer extends GUIModule {
    /**
     * Create a TabsContainer which is a container that can hold Tabs
     * @param {Request} request - The request that caused this module to be instantiated
     * @constructs TabsContainer
     * @public
     */
    constructor(request) {
        super(...arguments);
    }

    // GUI related methods
    /**
     * The method that specifies what the GUI should look like
     * @return {undefined}
     * @public
     */
    render() {
        return <span>placeholder</span>;
    }
}
