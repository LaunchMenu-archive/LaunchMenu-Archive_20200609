import GUIModule from "LM:GUIModule";
import {throws} from "assert";

/**
 * The way to identify specific edges of the element
 * @typedef {number} DockingSection~EdgeID -1:none, 0:west, 1:east, 2:north, 3:south
 */

/**
 * The way to identify specific edges of the element, and communicate its position
 * @typedef {object} DockingSection~Edge
 * @property {number} xBegin - The start position on the x axis of the box that makes up the edge
 * @property {number} xEnd - The end position on the x axis of the box that makes up the edge
 * @property {number} yBegin - The start position on the y axis of the box that makes up the edge
 * @property {number} yEnd - The end position on the y axis of the box that makes up the edge
 * @property {DockingSection~EdgeID} [ID] - The identifier for what edge of the element this is
 */

/**
 * The format to store a dockingSection/section as json
 * @typedef {object} DockingSection~Data
 * @property {number} xBegin - The start position on the x axis of the section
 * @property {number} xEnd - The end position on the x axis of the section
 * @property {number} yBegin - The start position on the y axis of the section
 * @property {number} yEnd - The end position on the y axis of the section
 */

// A mapping for the edges so a edge identifier can be used
const edgeMapping = ["xBegin", "xEnd", "yBegin", "yEnd"];

export default class DockingSection extends GUIModule {
    /**
     * Create a DockingSection which can contain other GUI elements, and make them resizable and moveable to a docking container
     * @param {Request} request - The request that caused this module to be instantiated
     * @constructs DockingSection
     * @public
     */
    constructor(request) {
        super(...arguments);

        // Store information about the dockingContainer shape (in pixels)
        this.containerShape = request.data.containerShape;

        // Load the properties from the data
        const data = request.data.sectionData;
        // Set the shape in percentages
        this.shape = {
            xBegin: data.xBegin,
            yBegin: data.yBegin,
            xEnd: data.xEnd,
            yEnd: data.yEnd,
        };

        // Store a copy of the shape for elastic resizing,
        // This is the shape that the element wants to return to while resizing, if possible
        this.elasticShape = {...this.shape};

        // Tracks what edges the algorithm is currently async moving, used to ensure no infinite recursion can occur
        this.movingEdges = {};

        // Bind the dragEdge callback to this module
        this.__dragEdge = this.__dragEdge.bind(this);

        // Define a min height and width
        this.minSize = {
            width: 5,
            height: 5,
        };

        // Store the content that this docking element should display
        this.content = [];

        // Store teh container that this element is a part of
        this.__init(() => {
            this.dockingContainer = this.getSource();
        });

        //TODO: remove this
        // Random color for testing
        this.bgColor =
            "hsl(" + Math.floor(Math.random() * 360) + ", 100%, 50%)";
    }

    // Container related methods
    /**
     * Informs the module about the new size of the dockingContainer
     * @param {ChannelReceiver~ChannelEvent} event - The event data sent by the channel
     * @param {Object} shape - The shape described by a x, y, width and height value
     * @protected
     */
    $_updateContainerShape(event, shape) {
        this.containerShape = shape;
    }

    /**
     * Converts pixel coordinates to percentage coordinates
     * @param {Object} coordinate - The coordinates to convert
     * @param {number} coordinate.x - The x coordinate
     * @param {number} coordinate.y - The x coordinate
     * @returns {Object} The converted coordinates described by x and y in percentages
     * @protected
     */
    _convertPixelToPercent(coordinate) {
        return {
            x:
                ((coordinate.x - this.containerShape.x) /
                    this.containerShape.width) *
                100,
            y:
                ((coordinate.y - this.containerShape.y) /
                    this.containerShape.height) *
                100,
        };
    }

    /**
     * Converts percentage coordinates to pixel coordinates
     * @param {Object} coordinate - The coordinates to convert
     * @param {number} coordinate.x - The x coordinate
     * @param {number} coordinate.y - The x coordinate
     * @returns {Object} The converted coordinates described by x and y in pixels
     * @protected
     */
    _convertPercentToPixel(coordinate) {
        return {
            x:
                this.containerShape.x +
                (coordinate.x / 100) * this.containerShape.width,
            y:
                this.containerShape.y +
                (coordinate.y / 100) * this.containerShape.height,
        };
    }

    // Content related methods
    /**
     * Get the React element creator from the path
     * @param {string} requestPath - The request path to the module you want to get the GUI of
     * @returns {reactConnector} The React element that belongs to a module
     * @private
     */
    __getGUIFromPath(requestPath) {
        const module = Registry._getModuleInstance(modulePath);
        return module && module.core.elementCreator;
    }

    /**
     * Opens the GUI of a module in this section
     * @param {ChannelReceiver~ChannelEvent} event - The event data sent by the channel
     * @param {string} modulePath - The requestPath to the module to open
     * @returns {undefined}
     * @public
     */
    $openModule(event, modulePath) {
        const element = this.__getGUIFromPath(modulePath);
        this.content = [element];
    }

    // Resize related methods
    /**
     * Stores the current shape for elastic resizing
     * @param {ChannelReceiver~ChannelEvent} event - The event data sent by the channel
     * @returns {undefined}
     * @protected
     */
    $_storeElasticShape(event) {
        this.elasticShape = {...this.shape};
    }

    /**
     * Check whether this element aligns with the provided edge, and if so, return the aligned edge
     * @param {ChannelReceiver~ChannelEvent} event - The event data sent by the channel
     * @param {DockingSection~Edge} edge - The edge to check alignment with
     * @param {DockingSection~EdgeID} [edgeTypeID] - The type of edge to return
     * @returns {(DockingSection~Edge|boolean)} The edge that was found to connect, or a boolean to indicate if there could be a connection if the edge was longer
     * @public
     */
    $checkConnection(event, edge, edgeTypeID) {
        // Check whether the edge to align with is a vertical line
        if (edge.xBegin == edge.xEnd) {
            // Check whether the line aligns with the left edge
            if (
                Math.abs(edge.xBegin - this.shape.xBegin) < 1e-2 &&
                (edgeTypeID == null || edgeTypeID == 0)
            ) {
                // Check whether the line overlaps horizontally with this element
                if (
                    edge.yBegin < this.shape.yEnd &&
                    edge.yEnd > this.shape.yBegin
                ) {
                    // Return the edge that has alignment
                    return this.getEdge(0);
                } else {
                    // Indicate that a connection could be possible if the edge was to be extended
                    return true;
                }
            }
            // Check whether the line aligns with the right edge
            if (
                Math.abs(edge.xBegin - this.shape.xEnd) < 1e-2 &&
                (edgeTypeID == null || edgeTypeID == 1)
            ) {
                // Check whether the line overlaps horizontally with this element
                if (
                    edge.yBegin < this.shape.yEnd &&
                    edge.yEnd > this.shape.yBegin
                ) {
                    // Return the edge that has alignment
                    return this.getEdge(1);
                } else {
                    // Indicate that a connection could be possible if the edge was to be extended
                    return true;
                }
            }

            // Check whether the edge to align with is a horizontal line
        } else if (edge.yBegin == edge.yEnd) {
            // Check whether the line aligns with the top edge
            if (
                Math.abs(edge.yBegin - this.shape.yBegin) < 1e-2 &&
                (edgeTypeID == null || edgeTypeID == 2)
            ) {
                // Check whether the line overlaps vertically with this element
                if (
                    edge.xBegin < this.shape.xEnd &&
                    edge.xEnd > this.shape.xBegin
                ) {
                    // Return the edge that has alignment
                    return this.getEdge(2);
                } else {
                    // Indicate that a connection could be possible if the edge was to be extended
                    return true;
                }
            }
            // Check whether the line aligns with the bottom edge
            if (
                Math.abs(edge.yBegin - this.shape.yEnd) < 1e-2 &&
                (edgeTypeID == null || edgeTypeID == 3)
            ) {
                // Check whether the line overlaps vertically with this element
                if (
                    edge.xBegin < this.shape.xEnd &&
                    edge.xEnd > this.shape.xBegin
                ) {
                    // Return the edge that has alignment
                    return this.getEdge(3);
                } else {
                    // Indicate that a connection could be possible if the edge was to be extended
                    return true;
                }
            }
        }

        // If no connection could be found
        return false;
    }

    /**
     * Checks whether there is an edge that nearly aligns, and return it
     * @param {ChannelReceiver~ChannelEvent} event - The event data sent by the channel
     * @param {DockingSection~Edge} edge - The edge to check alignment with
     * @param {number} position - The position that the edge will be moved to
     * @param {number} range - The maximum distance that the edge may be in order to be returned
     * @param {boolean} [indirectAlignment=false] - Whether to also allow to align with edges that can't connect
     * @returns {number} The position that the passed edge should have for perfect alignment with one of this section's edges
     * @public
     */
    $getAlignment(event, edge, position, range, indirectAlignment) {
        // Check if the edge isn't contained in this shape
        if (
            edge.xBegin >= this.shape.xBegin &&
            edge.xEnd <= this.shape.xEnd &&
            edge.yBegin >= this.shape.yBegin &&
            edge.yEnd <= this.shape.yEnd
        )
            return;

        // Check whether the edge to align with is a vertical line
        if (edge.xBegin == edge.xEnd) {
            // Check whether the line connects with the element
            if (
                indirectAlignment ||
                (edge.yBegin == this.shape.yEnd ||
                    edge.yEnd == this.shape.yBegin)
            ) {
                // Check if the line aligns with the left edge
                if (Math.abs(position - this.shape.xBegin) < range) {
                    // Return the position of the edge that almost aligns
                    return this.shape.xBegin;

                    // Check if the line aligns with the right edge
                } else if (Math.abs(position - this.shape.xEnd) < range) {
                    // Return the position of the edge that almost aligns
                    return this.shape.xEnd;
                }
            }

            // Check whether the edge to align with is a horizontal line
        } else if (edge.yBegin == edge.yEnd) {
            // Check whether the line connects with the element
            if (
                indirectAlignment ||
                (edge.xBegin == this.shape.xEnd ||
                    edge.xEnd == this.shape.xBegin)
            ) {
                // Check if the line aligns with the top edge
                if (Math.abs(position - this.shape.yBegin) < range) {
                    // Return the position of the edge that almost aligns
                    return this.shape.yBegin;

                    // Check if the line aligns with the bottom edge
                } else if (Math.abs(position - this.shape.yEnd) < range) {
                    // Return the position of the edge that almost aligns
                    return this.shape.yEnd;
                }
            }
        }
    }

    /**
     * Gets the edge data by edge ID
     * @param {DockingSection~EdgeID} edgeID - The identifier for the edge to retrieve
     * @returns {DockingSection~Edge} The actual edge (which also contains the ID)
     * @public
     */
    getEdge(edgeID) {
        // Start by making a box the size of this element
        let edge = {
            xBegin: this.shape.xBegin,
            xEnd: this.shape.xEnd,
            yBegin: this.shape.yBegin,
            yEnd: this.shape.yEnd,
            ID: edgeID,
        };

        // Then collapse either the height or width to 0 in a direction
        if (edgeID == 0) edge.xEnd = this.shape.xBegin;
        else if (edgeID == 1) edge.xBegin = this.shape.xEnd;
        else if (edgeID == 2) edge.yEnd = this.shape.yBegin;
        else edge.yBegin = this.shape.yEnd;

        // Return the edge
        return edge;
    }

    /**
     * Check how far an edge can at most be moved (when including the pushing of the opposite edge)
     * @param {DockingSection~EdgeID} edgeID - The edge to move
     * @returns {number} The position that the edge can at most be moved to (When making element smaller)
     * @async
     * @protected
     */
    async $_checkMaxOwnEdgeMove(event, edgeID) {
        // If we target the north or west edge
        if (edgeID == 0 || edgeID == 2) {
            // Get opposite edge and size based on edge ID
            const oppositeEdge = this.shape[edgeMapping[edgeID + 1]];
            const minSize =
                edgeID == 0 ? this.minSize.width : this.minSize.height;

            // If the opposite edge is the edge of the container, don't attempt to move it
            if (oppositeEdge == 100) return 100 - minSize;

            // Check how far the opposite edge could move at most
            const maxOppositeEdge = await this.__checkMaxEdgeMove(edgeID + 1);

            // Return how far this edge could move at most
            return maxOppositeEdge - minSize;

            // If we target the south or east edge
        } else {
            // Get opposite edge and size based on edge ID
            const oppositeEdge = this.shape[edgeMapping[edgeID - 1]];
            const minSize =
                edgeID == 1 ? this.minSize.width : this.minSize.height;

            // If the opposite edge is the edge of the container, don't attempt to move it
            if (oppositeEdge == 0) return minSize;

            // Check hoow ar the opposite edge could move at most
            const maxOppositeEdge = await this.__checkMaxEdgeMove(edgeID - 1);

            // Return how far this edge could move at most
            return maxOppositeEdge + minSize;
        }
    }

    /**
     * Check how far an edge can at most be moved (by checking the adjacent edge from other elements)
     * @param {DockingSection~EdgeID} edgeID - The edge to move
     * @returns {number} The position that the edge can at most be moved to (When making element bigger)
     * @async
     * @private
     */
    async __checkMaxEdgeMove(edgeID) {
        // Get the edge to check
        const edge = this.getEdge(edgeID);

        // Set the ID to the opposite edge, because that's the edge direction we want to check
        edge.ID = edgeID % 2 == 0 ? edgeID + 1 : edgeID - 1;

        // Then ask the container to check how far this edge could at most be moved
        return this.dockingContainer.$checkMaxEdgeMove(edge);
    }

    /**
     * Moves the opposite edge of the passed edge such that the section would remain the min size,
     * even if the edge is moved to the passed position
     * @param {ChannelReceiver~ChannelEvent} event - The event data sent by the channel
     * @param {DockingSection~EdgeID} edgeID - The edge to move
     * @param {number} position - The position to move the edge to
     * @returns {undefined}
     * @async
     * @protected
     */
    async $_stretchOppositeEdge(event, edgeID, position) {
        // If we target the north oor west edge
        if (edgeID == 0 || edgeID == 2) {
            // Get opposite edge and size based on edge ID
            const oppositeEdge = this.shape[edgeMapping[edgeID + 1]];
            const minSize =
                edgeID == 0 ? this.minSize.width : this.minSize.height;

            // Check whether the other edge should also be moved to not go below the min width
            const minEnd = position + minSize;
            if (minEnd > oppositeEdge) {
                // Attempt to move the edge in order to keep the size the same
                await this.__moveEdgeUnbounded(edgeID + 1, minEnd);
            }

            // If we target the south or east edge
        } else {
            // Get opposite edge and size based on edge ID
            const oppositeEdge = this.shape[edgeMapping[edgeID - 1]];
            const minSize =
                edgeID == 1 ? this.minSize.width : this.minSize.height;

            // Check whether the other edge should also be moved to not go below the min width
            const maxBegin = position - minSize;
            if (maxBegin < oppositeEdge) {
                // Attempt to move the edge in order to keep the size the same
                await this.__moveEdgeUnbounded(edgeID - 1, maxBegin);
            }
        }
    }

    /**
     * Moves the opposite edge of the passed edge such that it returns to the stored 'elasticShape'
     * without making the section smaller than the min size
     * @param {ChannelReceiver~ChannelEvent} event - The event data sent by the channel
     * @param {DockingSection~EdgeID} edgeID - The edge to move
     * @returns {undefined}
     * @async
     * @protected
     */
    async $_contractOppositeEdge(event, edgeID) {
        // If we target the north oor west edge
        if (edgeID == 0 || edgeID == 2) {
            // Get opposite edge and size based on edge ID
            const oppositeEdge = this.shape[edgeMapping[edgeID + 1]];
            const minSize =
                edgeID == 0 ? this.minSize.width : this.minSize.height;

            // Check whether the other edge should also be moved to not go below the min width
            const minEnd = this.shape[edgeMapping[edgeID]] + minSize;

            // Check if this edge wants to move back
            if (minEnd <= oppositeEdge) {
                // Check what the position of the edge was before resizing
                const oppositeEdgePrev = this.elasticShape[
                    edgeMapping[edgeID + 1]
                ];

                // Check if he opppositeEdge is currently bigger than it was before resizing
                if (oppositeEdge > oppositeEdgePrev) {
                    // Make sure to not return further than what the min size allows
                    const newOppositeEdge = Math.max(oppositeEdgePrev, minEnd);

                    // Move the edge back
                    await this.__moveEdgeUnbounded(edgeID + 1, newOppositeEdge);
                }
            }

            // If we target the south or east edge
        } else {
            // Get opposite edge and size based on edge ID
            const oppositeEdge = this.shape[edgeMapping[edgeID - 1]];
            const minSize =
                edgeID == 1 ? this.minSize.width : this.minSize.height;

            // Check whether the other edge should also be moved to not go below the min width
            const maxBegin = this.shape[edgeMapping[edgeID]] - minSize;

            // Check if this edge wants to move back
            if (maxBegin > oppositeEdge) {
                // Check what the position of the edge was before resizing
                const oppositeEdgePrev = this.elasticShape[
                    edgeMapping[edgeID - 1]
                ];
                // Check if he opppositeEdge is currently bigger than it was before resizing
                if (oppositeEdge < oppositeEdgePrev) {
                    // Make sure to not return further than what the min size allows
                    const newOppositeEdge = Math.min(
                        oppositeEdgePrev,
                        maxBegin
                    );
                    // Move the edge back
                    await this.__moveEdgeUnbounded(edgeID - 1, newOppositeEdge);
                }
            }
        }
    }

    /**
     * Moves the specified edge to the given position
     * @param {ChannelReceiver~ChannelEvent} event - The event data sent by the channel
     * @param {DockingSection~EdgeID} edgeID - The edge to move
     * @param {number} position - The position to move the edge to
     * @returns {undefined}
     * @async
     * @protected
     */
    async $_moveOwnEdgeUnbounded(event, edgeID, position) {
        // Change the value of the edge
        this.shape[edgeMapping[edgeID]] = position;

        // Update the GUI
        this.requestElementUpdate();
    }

    /**
     * Moves the specified edge to the given position, and also moves all adjacent edges
     * @param {DockingSection~EdgeID} edgeID - The edge to move
     * @param {number} position - The position to move the edge to
     * @returns {undefined}
     * @async
     * @private
     */
    async __moveEdgeUnbounded(edgeID, position) {
        // Check if we are not already in the process of moving this edge (ensures no infinite recursion can occur)
        if (!this.movingEdges[edgeID]) {
            // Indicate that we are now in the process of moving this edge
            this.movingEdges[edgeID] = true;

            // Get the edge to move
            const edge = this.getEdge(edgeID);

            // Tell the container to resize any elements touching this edge
            await this.dockingContainer.$_moveEdgeUnbounded(edge, position);

            // Indicate that we are no longer in the process of moving this edge
            delete this.movingEdges[edgeID];
        }
    }

    /**
     * Moves the specified edge to the given position, and also moves all adjacent edges
     * And bounds the passed position to a position that wouldn't allow elements to be smaller than their min size
     * @param {DockingSection~EdgeID} edgeID - The edge to move
     * @param {number} position - The position to move the edge to
     * @returns {number} The position that the edge was moved to
     * @async
     * @public
     */
    async moveEdge(edgeID, position) {
        // Get the edge to move
        const edge = this.getEdge(edgeID);

        // Bound the position
        position = Math.max(
            this.moveRange.min,
            Math.min(position, this.moveRange.max)
        );

        // Check if there is a position to snap to
        const snapPos = await this.dockingContainer.$getSnapValue(
            edge,
            position
        );
        if (snapPos) position = snapPos;

        // Tell the container to resize any elements touching this edge
        return this.dockingContainer.$_moveEdgeUnbounded(edge, position);
    }

    /**
     * The method to initiate resizing, once initiated, the size  will follow the mouse cursor
     * @param {object} event - The native window event
     * @returns {undefined}
     * @async
     * @private
     */
    async __startVerticalResize(event) {
        // Indicate that we are doing a vertical resize
        this.draggingEdgeID = 3;

        // Set cursor style
        window.document.body.style.cursor = "ns-resize";

        // Perform the direction independant initial resize methods
        return this.__startResize();
    }

    /**
     * The method to initiate resizing, once initiated, the size  will follow the mouse cursor horizontally
     * @param {object} event - The native window event
     * @returns {undefined}
     * @async
     * @private
     */
    async __startHorizontalResize(event) {
        // Indicate we are doing a horizontal resize
        this.draggingEdgeID = 1;

        // Set cursor style
        window.document.body.style.cursor = "ew-resize";

        // Perform the direction independant initial resize methods
        return this.__startResize();
    }

    /**
     * The method to initiate resizing, once initiated, the size  will follow the mouse cursor
     * @returns {undefined}
     * @async
     * @private
     */
    async __startResize() {
        // Tell the container that it should request all sections to store their elastic shapes
        await this.dockingContainer.$_storeElasticShapes();

        // Check how far the edge can be moved in either direction
        this.moveRange = {};

        // Check what the max position is that the edge can be moved to the right/down
        const edge = this.getEdge(this.draggingEdgeID);
        this.moveRange.min = await this.dockingContainer.$checkMaxEdgeMove(
            edge
        );

        // Check what the max position is that the edge can be moved to the left/up
        edge.ID--; // The direction is based on the ID
        this.moveRange.max = await this.dockingContainer.$checkMaxEdgeMove(
            edge
        );

        // Add the event listener to do the resizing
        window.addEventListener("mousemove", this.__dragEdge);
    }

    /**
     * Listens for the mouse moving in order to drag an edge
     * @param {object} event - The native window event
     * @returns {undefined}
     * @async
     * @private
     */
    async __dragEdge(event) {
        event.preventDefault();

        // Get the mouse location from the event
        const {x, y} = this._convertPixelToPercent({
            x: event.clientX,
            y: event.clientY,
        });

        // Determine where to move the edge to based on the axis
        if (this.draggingEdgeID == 1) {
            await this.moveEdge(1, x);
        } else {
            await this.moveEdge(3, y);
        }

        // Stop dragging if the mouse button is no longer pressed
        if (event.buttons == 0) {
            window.removeEventListener("mousemove", this.__dragEdge);

            // Delete the move range data
            delete this.moveRange;

            // Reset the cursor
            window.document.body.style.cursor = "default";
        }
    }

    // GUI related methods
    /**
     * The method that specifies what the GUI should look like
     * @returns {undefined}
     * @public
     */
    render() {
        // The static style to apply to the elements
        const style = this.getStyle();

        // A method to increase the size a tiny bit, to prevent html rounding errors from showing
        const roundFix = val => val + 0.01;

        return (
            <div
                className="dockingSection"
                style={{
                    ...style.base,
                    left: this.shape.xBegin + "%",
                    top: this.shape.yBegin + "%",
                    width: roundFix(this.shape.xEnd - this.shape.xBegin) + "%",
                    height: roundFix(this.shape.yEnd - this.shape.yBegin) + "%",
                }}>
                <div className="content" style={style.content}>
                    {this.getPath().getModuleID().ID}
                </div>
                {this.shape.xEnd != 100 && (
                    <div
                        className="verticalHandle"
                        style={style.verticalHandle}
                        onMouseDown={this.__startHorizontalResize.bind(this)}
                    />
                )}
                {this.shape.yEnd != 100 && (
                    <div
                        className="horizontalHandle"
                        style={style.horizontalHandle}
                        onMouseDown={this.__startVerticalResize.bind(this)}
                    />
                )}
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
                position: "absolute",
                borderRight: "1px solid black",
                borderBottom: "1px solid black",
                boxSizing: "border-box",
                backgroundColor: this.bgColor,
            },
            // The container that hold the actual content of this component
            content: {
                width: "100%",
                height: "100%",
            },
            // The handle for horizontal resizing that will appear on the right edge
            verticalHandle: {
                position: "absolute",
                right: 0,
                top: 0,
                height: "100%",
                width: "10px",
                cursor: "ew-resize",
            },
            // The handle for vertical resizing that will appear on the bottom edge
            horizontalHandle: {
                position: "absolute",
                left: 0,
                bottom: 0,
                width: "100%",
                height: "10px",
                cursor: "ns-resize",
            },
        };
    }
}
