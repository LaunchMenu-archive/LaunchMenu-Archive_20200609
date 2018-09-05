import FS from "fs";
import Path from "path";

const classes = {};
function scanDir(path) {
    // Get the files in the directory
    const files = FS.readdirSync(path);

    // Go through all files
    files.forEach(file => {
        // Get the path of the file
        const filePath = Path.join(path, file);

        // Check if path is a directory
        if (FS.lstatSync(filePath).isDirectory()) {
            // Recurse if this path is also a directory
            scanDir(filePath);
        } else if (filePath.match(/\.js(x?)$/)) {
            // If the file is a script, require it
            const Class = require(filePath).default;

            if (Class && Class.prototype) {
                const name = Class.prototype.constructor.name;

                // Store the class
                classes[name] = Class;
            }
        }
    });
}
scanDir(__dirname);

export default classes;
