import React from "react";
import GUIModule from "LM:GUIModule";

/*
    [Algorithm:] Resize:
        -Resize initiation (when grabbing handle):
            -For all sections:
                -Store current shape as elastic shape
            -Caclulate max edge position `max` using `max position` algorithm
            -Caclulate min edge position `min` using `max position` algorithm
        -Resizing itself (when moving handle):
            -limit movement to the calculated min and max
            -snap to snap value if found by the `snap` algorithm
            -Apply `move edge` algorithm on selected edge

        [Algorithm:] maxPosition(edge):
            -Get connected edges as `edges` using `connected edges` on edge
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

        [Algorithm:] connectedEdges(edge):
            -Create copy `k`, of the list of docking elements
            -Create edge list `edges`
            -Loop:
                -For each element `e1ement` in `k`:
                    -Check for alignment between `e1ement` and `edge`:
                        -If a connected edge `e` is found:
                            -Remove `el` from `k`
                            -Add tuple of `e1ement` and `e` edge to `edges`
                            -Extend the length of `edge` by `e`s length
                        -If there was the possibility to connect if `edge` had been longer:
                            -Do nothing
                        -Else:
                            -Remove `element` from `k`
                -If no connected edge was found at all:
                    -Break the loop
            -return `edges`

        [Algorithm] moveEdge(edge):
            -Get connected edges as `edges` using `connected edges` on edge
            -Go through all tuples in `edges`:
                -Move the edge
                -If the element size would become smaller than the min element size:
                    -Apply the 'move algorithm' on the opposite edge         
        
        [Algorithm] snap(edge, position):
            -For all sections:
                -Check if the section's the edge lines up with `edge`
                -Check if the section's edge is close enough to `position`
                -If both conditions above are satisfied, return the section's edge position
            -Compute the distance to all the returned edge positions
            -Return the edge position with the lowest distance
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
                return this.__createDockingSection(section).then(section => {
                    // Make the section identifiable
                    section.ID = sectionID;

                    // Foward section
                    return section;
                });
            });

            // Wait for all modules to return
            this.sections = await Promise.all(promises);
            console.log(this.sections);
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
                section.$_updateContainerShape(this.shape);
            });
        }

        // Return this data (may also be accessed directly if there was no change)
        return this.shape;
    }

    /**
     * Opens the GUI of a module in a specific section
     * @param {ChannelReceiver~ChannelEvent} event - The event data sent by the channel
     * @param {string} requestPath - The requestPath to the module to open
     * @param {number} sectionID - The ID of the section to open this module in
     * @return {undefined}
     * @public
     */
    $openModule(event, requestPath, sectionID) {
        // Get the section from the sectionID
        const section = this.sections.find(section => section.ID == sectionID);
        if (section) {
            // Open the module
            section.$openModule(requestPath);
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
            return section.$_storeElasticShape();
        });

        // Wait for all shapes to be updated
        await Promise.all(promises);
    }

    /**
     * Checks for values to snap to to give alignment with other edges
     * @param {ChannelReceiver~ChannelEvent} event - The event data sent by the channel
     * @param {DockingSection~Edge} edge - The edge to get the snap position for
     * @param {number} position - The position that the edge will be moved to
     * @returns {(number|undefined)} The position to snap to, or undefined if there is none
     * @async
     * @public
     */
    async $getSnapValue(event, edge, position) {
        // Get snapping properties from the settings, hardcoded for now
        let range = 3;
        const indirectAlignment = false;

        // Convert the range from a pixel value into a percentage value
        const horizontalMove = edge.xEnd == edge.xBegin;
        range *= 100 / (horizontalMove ? this.shape.width : this.shape.height);

        // Check for alignment in all sections
        const promises = this.sections.map(section => {
            return section.$getAlignment(
                edge,
                position,
                range,
                indirectAlignment
            );
        });

        // Wait for their responses
        let values = await Promise.all(promises);

        // Filter out undefined values (if no alignment could be found)
        values = values.filter(val => val);

        // Don't return anything if no alignment values could be found
        if (values.length == 0) return;

        // Get the value closest to the edge position
        const value = values.reduce((a, b) => {
            return Math.abs(a - position) > Math.abs(b - position) ? b : a;
        }, Infinity);

        // Return the value
        return value;
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
            return data.section.$_checkMaxOwnEdgeMove(data.edge.ID);
        });

        // Wait for the promises to resolve
        const maxPositions = await Promise.all(promises);

        // Check whether to get the min or max value
        let max;
        if (edge.ID % 2 == 0) {
            // Get the lowest value
            max = maxPositions.reduce(
                (max, resp) => Math.min(max, resp),
                Infinity
            );
        } else {
            // Get the highest value
            max = maxPositions.reduce(
                (max, resp) => Math.max(max, resp),
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
            return data.section.$_stretchOppositeEdge(data.edge.ID, position);
        });

        // Wait for all edges to move
        await Promise.all(promises);

        // Move all edges
        promises = edges.map(data => {
            return data.section.$_moveOwnEdgeUnbounded(data.edge.ID, position);
        });

        // Wait for all edges to move
        await Promise.all(promises);

        // Move all opposite edges inwards back to their initial location if possible, now that the edge has moved
        promises = edges.map(data => {
            return data.section.$_contractOppositeEdge(data.edge.ID);
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
                return section.$checkConnection(edge, edgeTypeID);
            });

            // Wait for the promises to resolve
            let connections = await Promise.all(promises);

            // Turn connections array into a tuple array
            connections = connections.map((edgeResp, index) => {
                return {section: sections[index], edge: edgeResp};
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
