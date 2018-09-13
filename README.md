# LaunchMenu

## Goal

LaunchMenu is an open source utility application similar to LaunchBar and SpotlightSearch for Mac.
The aim is to make important utilities quickly accessable and usable. For us having them quickly usable involves having full control with solely the keyboard. We will however also support regular mouse events, and the whole UI will be graphical, not command line based.
We want LaunchMenu to always be running in the background, and open up using a shortcut like `windows + space`. Then when it appears (Almost instantly) you will be able to type queries, quickly get the result you were looking for, and hide the window again without needing any mouse interaction.

Feel free to get into contact with us if you are a designer, developer, or can somehow contribute to the project in other ways

### Sub goal

We want to make LaunchMenu as modular as possible, so that many utilities can be added in the future, and people can create and install plugins to personallize it. We want to create a module (plugin) system through npm to make modules easily accessable.

The modularity of LaunchMenu is very important to us. We want to allow people to override almost any core behaviour, without having to hack our code. In order to achieve this, a custom 'require' system has been created. Instead of using the regular require or import that comes with node/es6, you should make use of our system.

The main idea behind our system is that you don't directly import a class, but instead request a module (class) to handle your data. So imagine you want to show an image, you wouldn't import some GUI element to show the image, instead you request a module to handle 'show image' and pass it your image as data. This will then automatically load the module and pass it your data. Of course this doesn't always work, sometimes you really need direct access to the class itself, in which case you can still use import, but it is preferred to also then use our special import system. Doing this is rather simple, instead of importing a path you import `LM:[type]`, where type will be the type of class you want to import. We call this requesting a class. Every module will contain both a class, and a config. The config will indicate what type of requests the class can handle. The main benefit of this system in terms of modularity is that people can now create other modules that can handle request types that already exist, and indicate it has higher priority than the default ones in the config. This makes it so the system will automatically start using their modules instead of the default ones, without any core code having to be altered. This system is largely inspired by the intent system on android, but taken a step further by replacing the import system with it. Below is a more schematic overview of this system and its benefits.

There are two types of requests:

-   Request Handle
    -   Requests a module to handle your data for you
    -   Will automatically create the GUI for the module to handle your data if needed
    -   The created GUI can exist in a separate window and can be moved around by the user
    -   A channel will be created to to communicate with the instantiated module
-   Request Module
    -   Retrieves the module classes themselves
    -   Project contains a babel plugin such that `import module from 'LM:moduleType'` can be used
    -   Shouldn't be used if Request Handle also does the job, but is preferred over the normal import

And the following applies to both request types:

-   Allows modules to easily be overriden
-   Allows users to choose what module they want to handle request if multiple are available

This request system will most likely be released as a standalone project in the future, as we thing this can be very useful for many applications, especially open source ones. This will be similar to how [electron](https://electronjs.org/) and [atom](https://atom.io/) have been released separately, for which we are very gratefull as LaunchMenu makes use of electron.

## Functionality

We have planned the following utilities so far:

-   File search
-   Dictionary
-   Translator
-   Calculator
-   Time tracker (Similar to [toggl](https://toggl.com/))

If you want to see our current idea for the design, you can check out the previous version that had the file search system mostly operational (The file search was our initial goal): https://github.com/sancarn/LaunchMenu

## Current state

The require system is almost done.

## Installation

`npm install`
Tested with npm version 6.4.1 and node version 8.12.0

## Commands

| Action | Command         | Description                                                                                      |
| ------ | --------------- | ------------------------------------------------------------------------------------------------ |
| run    | `npm start`     | Runs the actual program using the code in the dist folder                                        |
| watch  | `npm run watch` | Transpiles src to dist folder, and keeps listening for changes and transpile those automatically |
