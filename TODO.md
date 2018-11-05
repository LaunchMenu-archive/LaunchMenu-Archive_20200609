# Tar's priority list

-   [x] test if the subIDS of mudles work properly
-   [x] make modules useable without registration
-   [x] only require class once a request for it has been made
-   [x] automatically load modules in the main thread
-   [x] allow module handles to return the GUI for embeding
-   [x] Add the settings system to the module system
-   [ ] Extend the requestPathPattern, to allow for more extensive expressions
-   [x] Add module serialisation system that allows modules to be moved:

    -   [x] Make a way to indicate a module is being moved, and pause channel traffic
    -   [x] Add a way to easily move a module to another window
    -   [ ] Make module become embedable
    -   [ ] Close window when all modules are moved out of the window

-   [x] Add moduleSearch method to Registry, that allows to find a module with a certain request path

*   [ ] GUI system

    -   [x] Make dockingContainers that can store and manage dockingElements
    -   [ ] Make dockingElements that are resizable and moveable in their dockingContainer
    -   [ ] Make tabContainers that can store an manage multiple tabs:
        -   [ ] Make tab groups such that if GUI defines the same tab group, it will show up under the same tab and pop to the front when requesting focus
    -   [ ] Make tabElements that can be put into these tabContainers
    -   [ ] Make module GUI moveable, such that you can drag it into a specific tab, or to the side of a dockingElement, to create a new dockingElement
    -   [x] Get rid of Sass:
        -   [ ] create an style helper module instead

*   [ ] make config be able to declare whether:
    -   [ ] The module can only be requested, but can't handle data
    -   [ ] The module can only have its GUI embeded
    -   [ ] The module can only have its GUI dockable
    -   [ ] The module has any GUI
    -   [ ] The module doesn't care where it gets instanciated
*   [ ] clean up code
    -   [ ] Clean up the registry \_\_request method to be less confusing
    -   [x] turn from promises to async methods
    -   [x] separate all classes into dedicated files
    -   [x] consistently name classes
    -   [ ] consider to pull apart front end and backend in classes
    -   [x] properly comment all code
    -   [x] properly type classes, fields and methods
    -   [ ] update jsdoc such that async methods always return a promise of some type
    -   [ ] seperate setup methods and place at relevant areas
    -   [ ] make all method descriptions "verb phrases(?)" E.G. "opens a module", "loads the settings", etc
*   [ ] Test if making module's \_\_getMethods method static improves performance
*   [ ] add way of skipping an 'extends' in the chain of an requestModule
*   [ ] allow modules to run in a negative window number to run in a windowless thread

# Sancarn's priority list

-   [x] Create file deletion watcher, usable from cmd line
-   [ ] Create file tracker:
    -   [ ] Handle usb drives and other drives that can disconnect
    -   [ ] Enable accessibility in electron? ~ tiny.cc/hldwzy
-   [ ] Web scrapping system
-   [ ] Preview:
    -   [ ] Word/powerpoint/excel previews through a google API
    -   [ ] Pdf preview
    -   [ ] Image preview
    -   [ ] Code preview
    -   [ ] Markdown preview
    -   [ ] MDB and ACCDB parsers for preview: https://www.npmjs.com/package/mdb-parse
-   [ ] Program interaction:
    -   [ ] .net framework
-   [ ] LMF file format, a file that can be launched using LM
-   [ ] Mac spotlight disable module
-   [ ] File tagging / custom file attributes

# Overall todo list

-   [ ] History tracker, for undo/redo
-   [ ] Memonics system that applets can use
-   [ ] Settings module to alter settings

-   [ ] Create applets:
    -   [ ] File search/management
        -   [ ] Custom regex like system to match files efficiently
    -   [ ] Language packk
        -   [ ] Dictionary applet
        -   [ ] Translator
        -   [ ] Typo thing
    -   [ ] A color selector
    -   [ ] Calculator
        -   [ ] Graphing
        -   [ ] Wolfram Alpha
    -   [ ] Console, to wrap native repls
    -   [ ] Task tracker
    -   [ ] File editors module
        -   [ ] Hex editor
        -   [ ] Code editor
        -   [ ] Text editor
        -   [ ] Csv editor
    -   [ ] Agenda
    -   [ ] A chat app, or rather integration with an existing one like discord
    -   [ ] Data manipulation applet
        -   [ ] decimal to hex to bin to ascii to unicode converter
        -   [ ] base64 image convertor
    -   [ ] Either recreate sharex or bind with sharex
    -   [ ] Differences checker
    -   [ ] Something like regex101 and regexr
    -   [ ] Some random game, like tetris
-   [ ] Software interaction:
    -   [ ] dll/so interaction?
    -   [ ] COM/JXA Interop
    -   [ ] Python/Ruby/C Interop
    -   [ ] NodeRT for UWP APIs
-   [ ] JSDocs patching for non-github users
-   [ ] Deep learning file search prioritisation
