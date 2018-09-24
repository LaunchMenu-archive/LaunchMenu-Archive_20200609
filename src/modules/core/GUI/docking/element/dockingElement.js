import GUIModule from "LM:GUIModule";
import {throws} from "assert";

/**
 * The way to identify specific edges of the element
 * @typedef {number} DockingElement~EdgeID -1:none, 0:west, 1:east, 2:north, 3:south
 */

/**
 * The way to identify specific edges of the element, and communicate its position
 * @typedef {object} DockingElement~Edge
 * @property {number} xBegin - The start position on the x axis of the box that makes up the edge
 * @property {number} xEnd - The end position on the x axis of the box that makes up the edge
 * @property {number} yBegin - The start position on the y axis of the box that makes up the edge
 * @property {number} yEnd - The end position on the y axis of the box that makes up the edge
 * @property {DockingElement~EdgeID} [ID] - The identifier for what edge of the element this is
 */

export default class DockingElement extends GUIModule {
    /**
     * Create a DockingElement which can contain other GUI elements, and make them resizable and moveable to a docking container
     * @param {Request} request - The request that caused this module to be instantiated
     * @constructs DockingElement
     * @public
     */
    constructor(request) {
        super(...arguments);

        // Load the properties from the data
        const data = request.data;
        this.xBegin = data.xBegin;
        this.yBegin = data.yBegin;
        this.xEnd = data.xEnd;
        this.yEnd = data.yEnd;

        // Bind the dragEdge callback to this module
        this.__dragEdge = this.__dragEdge.bind(this);

        // // A mapping for the edges so a edge identifier can be used
        this.edgeMapping = ["xBegin", "xEnd", "yBegin", "yEnd"];

        // Define a min height and width
        this.minWidth = 5;
        this.minHeight = 5;

        // Store the content that this docking element should display
        this.content = [];

        // Store teh container that this element is a part of
        this.__init(() => {
            this.dockingContainer = this.getSource();
        });

        // A promise that is resolved when the edge is not currently being moved
        this.completeMovingEdge = Promise.resolve();

        //TODO: remove this
        // Random color for testing
        this.bgColor =
            "hsl(" + Math.floor(Math.random() * 360) + ", 100%, 50%)";
    }

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
    }

    // Resize related methods
    /**
     * Updates the UI (called from the dockingContainer to reduce artifacts of async recursion)
     * @param {ChannelReceiver~ChannelEvent} event - The event data sent by the channel
     * @returns {undefined}
     * @public
     */
    $_requestElementUpdate() {
        this.requestElementUpdate();
    }

    /**
     * Check whether this element aligns with the provided edge, and if so, return the aligned edge
     * @param {ChannelReceiver~ChannelEvent} event - The event data sent by the channel
     * @param {DockingElement~Edge} edge - The edge to check alignment with
     * @param {DockingElement~EdgeID} [edgeTypeID] - The type of edge to return
     * @returns {(DockingElement~Edge|boolean)} The edge that was found to connect, or a boolean to indicate if there could be a connection if the edge was longer
     * @public
     */
    $checkConnection(event, edge, edgeTypeID) {
        // Check whether the edge to align with is a vertical line
        if (edge.xBegin == edge.xEnd) {
            // Check whether the line aligns with the left element
            if (
                Math.abs(edge.xBegin - this.xBegin) < 1e-1 &&
                (edgeTypeID == null || edgeTypeID == 0)
            ) {
                // Check whether the line overlaps horizontally with this element
                if (edge.yBegin < this.yEnd && edge.yEnd > this.yBegin) {
                    // Return the edge that has alignment
                    return this.getEdge(0);
                } else {
                    // Indicate that a connection could be possible if the edge was to be extended
                    return true;
                }
            }
            // Check whether the line aligns with the right element
            if (
                Math.abs(edge.xBegin - this.xEnd) < 1e-1 &&
                (edgeTypeID == null || edgeTypeID == 1)
            ) {
                // Check whether the line overlaps horizontally with this element
                if (edge.yBegin < this.yEnd && edge.yEnd > this.yBegin) {
                    // Return the edge that has alignment
                    return this.getEdge(1);
                } else {
                    // Indicate that a connection could be possible if the edge was to be extended
                    return true;
                }
            }

            // Check whether the edge to align with is a horizontal line
        } else if (edge.yBegin == edge.yEnd) {
            // Check whether the line aligns with the top element
            if (
                Math.abs(edge.yBegin - this.yBegin) < 1e-1 &&
                (edgeTypeID == null || edgeTypeID == 2)
            ) {
                // Check whether the line overlaps vertically with this element
                if (edge.xBegin < this.xEnd && edge.xEnd > this.xBegin) {
                    // Return the edge that has alignment
                    return this.getEdge(2);
                } else {
                    // Indicate that a connection could be possible if the edge was to be extended
                    return true;
                }
            }
            // Check whether the line aligns with the bottom element
            if (
                Math.abs(edge.yBegin - this.yEnd) < 1e-1 &&
                (edgeTypeID == null || edgeTypeID == 3)
            ) {
                // Check whether the line overlaps vertically with this element
                if (edge.xBegin < this.xEnd && edge.xEnd > this.xBegin) {
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
     * Gets the edge data by edge ID
     * @param {DockingElement~EdgeID} edgeID - The identifier for the edge to retrieve
     * @returns {DockingElement~Edge} The actual edge (which also contains the ID)
     * @public
     */
    getEdge(edgeID) {
        // Start by making a box the size of this element
        let edge = {
            xBegin: this.xBegin,
            xEnd: this.xEnd,
            yBegin: this.yBegin,
            yEnd: this.yEnd,
            ID: edgeID,
        };

        // Then collapse either the height or width to 0 in a direction
        if (edgeID == 0) edge.xEnd = this.xBegin;
        else if (edgeID == 1) edge.xBegin = this.xEnd;
        else if (edgeID == 2) edge.yEnd = this.yBegin;
        else edge.yBegin = this.yEnd;

        // Return the edge
        return edge;
    }

    /**
     * Check how far an edge can at most be moved (when including the pushing of the opposite edge)
     * @param {DockingElement~EdgeID} edgeID - The edge to move
     * @returns {number} The position that the edge can at most be moved to (When making element smaller)
     * @async
     * @protected
     */
    async $_checkMaxOwnEdgeMove(event, edgeID) {
        // If we target the north or west edge
        if (edgeID == 0 || edgeID == 2) {
            // Get opposite edge and size based on edge ID
            const oppositeEdge = this[this.edgeMapping[edgeID + 1]];
            const minSize = edgeID == 0 ? this.minWidth : this.minHeight;

            // If the opposite edge is the edge of the container, don't attempt to move it
            if (oppositeEdge == 100) return 100 - minSize;

            // Check how far the opposite edge could move at most
            const maxOppositeEdge = await this.__checkMaxEdgeMove(edgeID + 1);

            // Return how far this edge could move at most
            return maxOppositeEdge - minSize;

            // If we target the south or east edge
        } else {
            // Get opposite edge and size based on edge ID
            const oppositeEdge = this[this.edgeMapping[edgeID - 1]];
            const minSize = edgeID == 1 ? this.minWidth : this.minHeight;

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
     * @param {DockingElement~EdgeID} edgeID - The edge to move
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
        return (await this.dockingContainer.checkMaxEdgeMove(edge))[0];
    }

    /**
     * Moves the specified edge to the given position
     * @param {ChannelReceiver~ChannelEvent} event - The event data sent by the channel
     * @param {DockingElement~EdgeID} edgeID - The edge to move
     * @param {number} position - The position to move the edge to
     * @returns {undefined}
     * @async
     * @protected
     */
    async $_moveOwnEdgeUnbounded(event, edgeID, position) {
        // If we target the north oor west edge
        if (edgeID == 0 || edgeID == 2) {
            // Move the edge
            this[this.edgeMapping[edgeID]] = position;

            // Get opposite edge and size based on edge ID
            const oppositeEdge = this[this.edgeMapping[edgeID + 1]];
            const minSize = edgeID == 0 ? this.minWidth : this.minHeight;

            // Check whether the other edge should also be moved to not go below the min width
            const minEnd = position + minSize;
            if (minEnd > oppositeEdge) {
                // Attempt to move the east edge in order to keep the size the same
                await this.__moveEdgeUnbounded(edgeID + 1, minEnd);
            }

            // If we target the south or east edge
        } else {
            // Move the edge
            this[this.edgeMapping[edgeID]] = position;

            // Get opposite edge and size based on edge ID
            const oppositeEdge = this[this.edgeMapping[edgeID - 1]];
            const minSize = edgeID == 1 ? this.minWidth : this.minHeight;

            // Check whether the other edge should also be moved to not go below the min width
            const maxBegin = position - minSize;
            if (maxBegin < oppositeEdge) {
                // Attempt to move the east edge in order to keep the size the same
                await this.__moveEdgeUnbounded(edgeID - 1, maxBegin);
            }
        }

        // Update the GUI
        this.requestElementUpdate();
    }

    /**
     * Moves the specified edge to the given position, and also moves all adjacent edges
     * @param {DockingElement~EdgeID} edgeID - The edge to move
     * @param {number} position - The position to move the edge to
     * @returns {undefined}
     * @async
     * @private
     */
    async __moveEdgeUnbounded(edgeID, position) {
        // Get the edge to move
        const edge = this.getEdge(edgeID);

        // Tell the container to resize any elements touching this edge
        this.dockingContainer._moveEdgeUnbounded(edge, position);
    }

    /**
     * Moves the specified edge to the given position, and also moves all adjacent edges
     * And bounds the passed position to a position that wouldn't allow elements to be smaller than their min size
     * @param {DockingElement~EdgeID} edgeID - The edge to move
     * @param {number} position - The position to move the edge to
     * @param {boolean} [pixelPosition] - Whether the passed position is a percentage or pixel value
     * @returns {number} The position that the edge was moved to
     * @async
     * @public
     */
    async moveEdge(edgeID, position, pixelPosition) {
        // Get the edge to move
        const edge = this.getEdge(edgeID);

        // Tell the container to resize any elements touching this edge
        return this.dockingContainer.moveEdge(edge, position, pixelPosition);
    }

    /**
     * The method to initiate resizing, once initiated, the size  will follow the mouse cursor
     * @returns {undefined}
     * @private
     */
    __startVerticalResize() {
        // Indicate that we are doing a vertical resize
        this.draggingEdgeID = 3;

        // Add the event listener to do the resizing
        window.addEventListener("mousemove", this.__dragEdge);
    }

    /**
     * The method to initiate resizing, once initiated, the size  will follow the mouse cursor
     * @returns {undefined}
     * @private
     */
    __startHorizontalResize() {
        // Indicate we are doing a horizontal resize
        this.draggingEdgeID = 1;

        // Add the event listener to do the resizing
        window.addEventListener("mousemove", this.__dragEdge);
    }

    /**
     * Listens for the mouse moving in order to drag an edge
     * @param {object} event - The native window event
     * @returns {undefined}
     * @private
     */
    __dragEdge(event) {
        event.preventDefault();

        // Get the mouse location from the event
        const x = event.clientX;
        const y = event.clientY;

        // Determine where to move the edge to based on the axis
        if (this.draggingEdgeID == 1) {
            this.nextPos = x;
        } else {
            this.nextPos = y;
        }

        // Try moving the edge (The edge might be moving still, in which case it waits)
        this.__tryMoveEdge();

        // Stop dragging if the mouse button is no longer pressed
        if (event.buttons == 0) {
            window.removeEventListener("mousemove", this.__dragEdge);
        }
    }

    /**
     * Moves the edge, but only when the previous move has finished
     * @returns {undefined}
     * @private
     */
    __tryMoveEdge() {
        this.completeMovingEdge.then(() => {
            if (this.nextPos) {
                this.completeMovingEdge = this.moveEdge(
                    this.draggingEdgeID,
                    this.nextPos,
                    true
                );
                delete this.nextPos;
            }
        });
    }

    // GUI related methods
    /**
     * The method that specifies what the GUI should look like
     * @returns {undefined}
     * @public
     */
    render() {
        const style = this.getStyle();

        return (
            <div
                className="dockingElement"
                style={{
                    ...style.base,
                    left: this.xBegin + "%",
                    top: this.yBegin + "%",
                    width: this.xEnd - this.xBegin + "%",
                    height: this.yEnd - this.yBegin + "%",
                }}>
                <div className="content" style={style.content}>
                    {this.content}
                </div>
                <div
                    className="verticalHandle"
                    style={style.verticalHandle}
                    onMouseDown={this.__startHorizontalResize.bind(this)}
                />
                <div
                    className="horizontalHandle"
                    style={style.horizontalHandle}
                    onMouseDown={this.__startVerticalResize.bind(this)}
                />
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
