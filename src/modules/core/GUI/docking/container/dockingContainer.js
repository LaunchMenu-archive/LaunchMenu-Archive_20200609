import React from "react";
import GUIModule from "LM:GUIModule";

/*
    Get connected edges to edge `e` algorithm:
        -Create copy `k`, of the list of docking elements
        -Create edge list `edges`
        -Loop:
            -For each element `e1ement` in `k`:
                -Check for alignment between `e1ement` and `e`:
                    -If a connected edge `e2` is found:
                        -Remove `el` from `k`
                        -Add tuple of `e1ement` and `e2` edge to `edges`
                        -Extend the length of `e` by `e2`s length
                    -If there was the possibility to connect if `e` had been longer:
                        -Do nothing
                    -Else:
                        -Remove `element` from `k`
            -If no connected edge was found at all:
                -Break the loop
        -return `edges`

    Recursive 'Check maximum move algorithm':
        -Get connected edges as `edges`
        -Go through all tuples in `edges`:
            -If the edge is opposite to the movement direction (E.G. when moving right, the west edge):
                -Check how far the edge can move:
                    -Check where the opposite edge can at most move to and store in `opposite`:
                        -If the opposite edge is at the container edge:
                            -Return it's current position
                        -Else:
                            -Execute 'check maximum move algorithm' on this edge
                    -Perform simple calculation with the element's min size and `opposite`
        -Return the min of how far each edge can move

    Recursive 'Move algorithm':
        -Get connected edges as `edges`
        -Go through all tuples in `edges`:
            -Move the edge
            -If the element size would become smaller than the min element size:
                -Apply the 'move algorithm' on the opposite edge


    Resize abstract algorithm:
        -Check how far the edge can at most move using the 'check maximum move algorithm'
        -Move the edge at most to this max position using the 'Move algorithm'
            
*/

export default class DockingContainer extends GUIModule {
    /**
     * Create a DockingContainer which is a container that can hold DockingSections
     * @param {Request} request - The request that caused this module to be instantiated
     * @constructs DockingContainer
     * @public
     */
    constructor(request) {
        super(...arguments);
        const sections = request.data;

        // Get docking elements to put in this container
        this.__init(async () => {
            // Go through all sections
            var promises = Object.keys(sections).map(sectionID => {
                // Get the section, and attach its ID
                var section = sections[sectionID];
                section.ID = sectionID;

                // Create docking section
                return this.__createDockingSection(section);
            });

            // Wait for all modules to return
            this.sections = await Promise.all(promises);
        });

        // Store a reference to the container element in order to get its position
        this.elementRef = React.createRef();

        // Store the size in pixels of the actual element (values will be assigned in the _setElement method)
        this.shape = {
            x: 0,
            y: 0,
            width: 0,
            height: 0,
        };

        // // Elements that require a GUI update
        // this.dirtySections = [];
    }

    // Section setup related methods
    /**
     * Creates a dockingSection that will get placed in this dockingContainer
     * @param {DockingSection~Data} sectionData - The data to create a sectuib
     * @returns {undefined}w
     * @async
     * @private
     */
    async __createDockingSection(sectionData) {
        // Request a section for this sectionData
        return this.requestHandle({
            type: "DockingSection",
            data: {
                sectionData,
                containerShape: this.shape,
            },
            embedGUI: true,
        });
    }

    /**
     * Attaches the React component to this module, will get called by ReactConnecter once a connection is established
     * @param {React.Component} element - The element instance that will render this module's GUI
     * @return {undefined}
     * @protected
     */
    _setElement(element) {
        // Set the element
        super._setElement(element);

        // Update the shape data
        this.__retrieveElementShape(true);
    }

    /**
     * Updates and retrieves the data that describes the shape of the element
     * @param {boolean} [updateSections=false] - Whether to send the newly retrieved shape to the dockingSections
     * @returns {Object} The shape described by a x, y, width and height value
     * @private
     */
    __retrieveElementShape(updateSections) {
        // Get the container element
        const container = this.elementRef.current;

        // Check if the container exists
        if (container) {
            // Get the top left corner of the element
            const offset = container.getBoundingClientRect();
            this.shape.x = offset.left;
            this.shape.y = offset.top;

            // Get the size of the element
            this.shape.width = container.offsetWidth;
            this.shape.height = container.offsetHeight;
        }

        // Check whether we want to send this data to the sections
        if (updateSections) {
            // Iterate through all the sections and send the new shape
            this.sections.forEach(section => {
                section._updateContainerShape(this.shape);
            });
        }

        // Return this data (may also be accessed directly if there was no change)
        return this.shape;
    }

    /**
     * Opens the GUI of a module in a specific section
     * @param {ChannelReceiver~ChannelEvent} event - The event data sent by the channel
     * @param {string} modulePath - The requestPath to the module to open
     * @param {number} sectionID - The ID of the section to open this module in
     * @return {undefined}
     * @public
     */
    $openModule(event, modulePath, sectionID) {
        // Get the section from the sectionID
        const section = this.sections.find(section => section.ID == sectionID);
        if (section) {
            // Open the module
            section.openModule(modulePath);
        }
    }

    // Resize related methods
    /**
     * Tells all sections that they should udpate their elastic shapes
     * @param {ChannelReceiver~ChannelEvent} event - The event data sent by the channel
     * @returns {undefined}
     * @async
     * @protected
     */
    async $_storeElasticShapes(event) {
        // Tell all sections to update their elastic shapes
        const promises = this.sections.map(section => {
            return section._storeElasticShape();
        });

        // Return a promise that waits for all shapes to be updated
        return Promise.all(promises);
    }

    /**
     * Checks how far the passed edge can at most move
     * @param {ChannelReceiver~ChannelEvent} event - The event data sent by the channel
     * @param {DockingSection~EdgeID} edgeID - The edge to move
     * @returns {number} The position that the edge can at most be moved to (When making element smaller)
     * @async
     * @public
     */
    async $checkMaxEdgeMove(event, edge) {
        // Get all the adjacent edges to check
        const edges = await this.__getAdjacentEdges(edge, edge.ID);

        // Go through all edges and check their maximum move
        const promises = edges.map(data => {
            return data.section._checkMaxOwnEdgeMove(data.edge.ID);
        });

        // Wait for the promises to resolve
        const maxPositions = await Promise.all(promises);

        // Check whether to get the min or max value
        let max;
        if (edge.ID % 2 == 0) {
            // Get the lowest value
            max = maxPositions.reduce(
                (max, resp) => Math.min(max, resp[0]),
                Infinity
            );
        } else {
            // Get the highest value
            max = maxPositions.reduce(
                (max, resp) => Math.max(max, resp[0]),
                -Infinity
            );
        }

        // Return the max position
        return max;
    }

    /**
     * Moves the specified edge to the given position, and also moves all adjacent edges
     * @param {ChannelReceiver~ChannelEvent} event - The event data sent by the channel
     * @param {DockingSection~Edge} edge - The edge to move
     * @param {number} position - The position to move the edge to
     * @returns {undefined}
     * @async
     * @protected
     */
    async $_moveEdgeUnbounded(event, edge, position) {
        // Get all the adjacent edges to move
        const edges = await this.__getAdjacentEdges(edge);

        // Create a variable to store the lists of promises for parallel computation
        let promises;

        // Move all opposite edges outwards if needed such that there is enough space to move the edge
        promises = edges.map(data => {
            return data.section._stretchOppositeEdge(data.edge.ID, position);
        });

        // Wait for all edges to move
        await Promise.all(promises);

        // Move all edges
        promises = edges.map(data => {
            return data.section._moveOwnEdgeUnbounded(data.edge.ID, position);
        });

        // Wait for all edges to move
        await Promise.all(promises);

        // Move all opposite edges inwards back to their initial location if possible, now that the edge has moved
        promises = edges.map(data => {
            return data.section._contractOppositeEdge(data.edge.ID);
        });

        // Wait for all edges to move
        await Promise.all(promises);
    }

    /**
     * Retrieves all the edges that are adjacent to the spacified edge
     * @param {DockingSection~Edge} edge - The edge to check connections with
     * * @param {DockingSection~EdgeID} [edgeTypeID] - The type of edge to return
     * @returns {Object[]} An array of tuples of edges and dockingSections
     * @async
     * @private
     */
    async __getAdjacentEdges(edge, edgeTypeID) {
        // Create a copy of the sections
        const sections = this.sections.concat();

        // Create a list of the tuples to return
        const edges = [];

        // Keeping looping as long as a new section is found
        let sectionFound = false;
        do {
            // Default sectionFound to false
            sectionFound = false;

            // Go through all sections
            const promises = sections.map(section => {
                return section.checkConnection(edge, edgeTypeID);
            });

            // Wait for the promises to resolve
            let connections = await Promise.all(promises);

            // Turn connections array into a tuple array
            connections = connections.map((edgeResp, index) => {
                return {section: sections[index], edge: edgeResp[0]};
            });

            // Check whether there is alignment for any of the sections
            connections.forEach(data => {
                // Check if there is no possibility of connecting
                if (data.edge == false) {
                    // If there is no way to connect, remove the section
                    sections.splice(sections.indexOf(data.section), 1);

                    // Check if an edge was returned (either an edge or boolean is returned)
                } else if (data.edge != true) {
                    // As we have found a connection with this section, don't continue checking it
                    sections.splice(sections.indexOf(data.section), 1);

                    // Extend the searching edge by the edge we found
                    if (edge.xBegin == edge.xEnd) {
                        edge.yBegin = Math.min(edge.yBegin, data.edge.yBegin);
                        edge.yEnd = Math.max(edge.yEnd, data.edge.yEnd);
                    } else {
                        edge.xBegin = Math.min(edge.xBegin, data.edge.xBegin);
                        edge.xEnd = Math.max(edge.xEnd, data.edge.xEnd);
                    }

                    // Store the type of the section and the edge we found
                    edges.push(data);

                    // Indicate that a section was found, so there are new chances to connect other sections
                    sectionFound = true;
                }
            });
        } while (sectionFound);

        // Return the list of retrieved sections with their edges
        return edges;
    }

    // GUI related methods
    /**
     * The method that specifies what the GUI should look like
     * @return {undefined}
     * @public
     */
    render() {
        const style = this.getStyle();
        return (
            <div style={style.base} ref={this.elementRef}>
                {this.sections}
            </div>
        );
    }

    /**
     * The method to set up the style for the element (Can easily be overriden when extending this class)
     * @returns {Object} The object representing the style of the html elements
     * @public
     */
    getStyle() {
        return {
            // The root div of the component
            base: {
                position: "relative",
                boxSizing: "border-box",
                height: "100%",
                width: "100%",
                overflow: "hidden",
            },
        };
    }
}
