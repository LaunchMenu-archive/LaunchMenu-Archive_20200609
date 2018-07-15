# LaunchMenu format (LMF)

## Description

For displaying specific files or file structures with preview interfaces or specific behaviour.

# Spec:

## Specific file previews

Let's say we have a `.BAT` file which runs the following code:

```
set arg1=%1
set arg2=%2
shift
shift
copy %arg1% %arg2%
```

The bat script copies the 1st file to the location indicated by the 2nd file.

It may be desirable that the preview for such application either:

1. Displays special information / logo for the bat file.

2. Displays a full interface for using the .BAT file (2 file selectors in this case)

The LMF is to facilitate this behaviour.

```
someBat.bat
someBat.lmf
```

### Example 1

With lmf code:

```js
    export default class Preview {
        constructor(name){
            this.title = "Awesome script!";
            this.icon = "<<DATA-URL>>";
            this.description = "Some awesome bat script which copies files!"
        }
    }
```

### Example 2

```js
    import * from "PreviewWrapper"
    export default class Preview extends PreviewWrapper {
        constructor(name){
            super();
            this.body.appendElement($(`
              <!--< REALLY TERRIBLE GUI >-->
              <button onclick="selectFile(e)"> Select file 1 </button>
              <button onclick="selectFile(e)"> Select file 2 </button>
              <button onclick="doStuff(e)">Execute</button>
            `))
        }
    }
```

## Displaying file-list details:

Imagine the following file structure:

```
root/index.html
root/main.js
```

When you search for root in LaunchMenu you might only want to:

1. Execute `main.js`
2. Render `root` as an applet rather than as a folder.

The LMF is to caitor for this behaviour.

```
root.lmf
root/index.html
root/main.js
```

Might also want to include `root.dir.lmf` and `root.file.lmf` extensions for distinguishing between files and folders.
