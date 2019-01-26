# LaunchMenu

### Goal

LaunchMenu is an open source utility application similar to LaunchBar and Spotlight for Mac.

The aim, to bring all important utilities (applets) to your fingertips. For us having utilities quickly accessable via the keyboard is vital, however we will also support usage of the mouse.

LaunchMenu runs in the background. Upon pressing `⌘ + space`/`⊞ + space` a menu opens allowing you to type a query. Queries are used to open different applets.

Contact us if you want to contribute to the project. We are currently looking for a designer to improve this look:

![Image](https://github.com/sancarn/LaunchMenu/raw/master/Screen%20shots/general.png)

### Functionality

We have planned the following applet so far:

-   File search
-   Dictionary
-   Translator
-   Calculator
-   Time tracker (Similar to [toggl](https://toggl.com/))

### Current state

Currently we are working on the Core Framework of LaunchMenu which you can read about below. There are currently no working versions of the LaunchMenu application. 

### RoadMap

You can read the full todo list [here](https://github.com/LaunchMenu/LaunchMenu/blob/master/TODO.md).

* Framework
    * UI Customisability 
    * Create the ability to make workspaces for LaunchMenu.
    * Create demo/test applet (E.G. note maker).
    * Common UI controls.
* Start LaunchMenu
    * Build main UI.
    * Query system.
    * FileSearch applet.
    * Release Version 1.0.0
    * ???
    * Profit.

----

# Development

## Installation

```
git clone https://github.com/LaunchMenu/LaunchMenu
npm install
```
Tested with npm version 6.4.1 and node version 8.12.0

## Commands

| Action | Command         | Description                                                                                      |
| ------ | --------------- | ------------------------------------------------------------------------------------------------ |
| run    | `npm start`     | Runs the actual program using the code in the dist folder                                        |
| watch  | `npm run watch` | Transpiles src to dist folder, and keeps listening for changes and transpile those automatically |

# Bollib - The core of LaunchMenu

LaunchMenu is built on the Electron framework. It is built in a modular fashion such that new features can be added easily in the future. We were inspired by the Atom Editor's hackability, and decided LaunchMenu should also be adaptable to the core. This system is being built into a seperate framework.

The adaptability and modularity of the framework makes it ideal for open source projects built in Electron, as it allows people to make additions without having to adapt to other people's code, and these additions can be adopted as a plugin making the features entirely optional.

This framework is called Bollib.

As of 23/01/2019 we have decided that all development on LaunchMenu application will hault to work on the a re-write of the [Bollib framework in TypeScript](https://github.com/LaunchMenu/Bollib).

## Using modules

The framework allows people to override most core behaviour, without having to hack existing code. In order to achieve this, a custom 'require' system has been created.

The syntax is as follows:

```js
this.requestHandle({
    type: "someType"
}).then(channel=>{
    // Do something with channel
});
```

Behind the scenes, the module type is used to find an appropriate module. This module is instantiated and a channel is setup allowing you to communicate with the instance. If multiple modules support the same module type, the module with the highest priority will be chosen, returned and instantiated. The request can also specify that all or a filtered set of modules should be used.

This system is largely inspired by the intent system on android, but taken a step further by replacing the entirity of import system. 

[](EXAMPLE_SHOULD_GO_HERE)

# Importing module classes directly

If you need direct access to the module class, e.g. to extend it, you can import the class directly using the following syntax. 

```js
// Single
import bollib from "LM:SomeType";

// Batched Multiple
import _SomeType from "LM:SomeType";
import _SomethingElse from "LM:SomethingElse";
```

Where `SomeType` and `SomethingElse` are Bollib modules you want to import.

Our Babel plugin will transpile this into code like:

```js
// Single
var bollib = Registry.requestModule({
    type: "SomeType"
});
bollib = bollib.default;

// Batched Multiple
var {
    "SomeType": _SomeType,
    "SomethingElse": _SomethingElse
} = Registry.requestModule("SomeType","SomethingElse");
_SomeType = _SomeType.default;
_SomethingElse = _SomethingElse.default;
```

### Overview


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



## Module Architecture

Every module contains both a class, and a config.

### Config

The config will indicate what type of requests the class can handle and what priority the module has. Priority is used to allow other users to override existing modules. It is also used to define settings of the module which can be dynamically changed by the user. It can also be used to define the location of the module Class files.

### Module Class

Every module class must extend the base Module class. They should also implement the `serialize()` and `deserialize()` methods. This allows the system to store the state of a module and transfer it between processes.

In the below example we store the `someData` property of our class in the serialize method and later set this data in the deserialize method.

```js
import Module from "LM:Module";
class MyClass extends Module {
    serialize(){
        var data = super.serialize();
        data.something = this.someData;
        return data;
    }
    deserialize(data){
        this.someData = data.something;
        super.deserialize(data);
    }
}
```

## Demos

If you want to see demos of the Bollib framework check out the LaunchMenu youtube channel.

[![](https://i.imgur.com/17QWz2E.png)](https://www.youtube.com/channel/UCMBjWTunWsKLoYMbZF07udQ)

## Thanks to

* The contributors of LaunchMenu!
* The contributors of [Electron](https://electronjs.org/).
* The contributors of [React](https://reactjs.org/).
* The contributors of [Babel](https://babeljs.io/).
* The contributors of [Sass](https://sass-lang.com/).
