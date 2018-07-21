// import Jasmine from "jasmine";
// import ElectronReporter from "./reporter";
//
// var jasmine = new Jasmine();
// jasmine.loadConfig({
//     spec_files: [
//         'dist/**/_tests/*.js',
//     ],
//     random: false
// });
// // jasmine.configureDefaultReporter({
// //     showColors: true
// // });
// jasmine.clearReporters();
// jasmine.addReporter(new ElectronReporter({}));
// // jasmine.execute(['dist/core/communication/_tests/extendedJSON.js']);
// // jasmine.execute(['dist/core/communication/_tests/extendedJSON.js']);
// // jasmine.onComplete(function(passed){
// //     process.exit();
// // });
// global.describe = describe;
// import ExtendedJSON from "../../dist/core/communication/_tests/extendedJSON";


import runner from "./runner/serverRunner";
require = function(module){
    console.log(module);
}
import madge from "madge";
import Fs from "fs";
import Path from "path";

const dir = "dist/";
const ordered = false; //Whether to order tests on their dependencies
if(ordered){
    //TODO implement version that tries to perform tests of dependencies before own test
    // const madge = require('madge');
    madge("dist/").then(res=>{
        const map = res.obj();
        const testFiles = Object.keys(map).filter(file=>{
            return file.match(/_tests\/.*\.jsx?/);
        });
        console.log(map, testFiles);
    });
}else{
    const walk = function(dirs, fileCallback, complete){
        if(!(dirs instanceof Array)) dirs = [{path:dirs, name:dirs}];
        var dir = dirs[dirs.length-1];
        if(!dir){
            if(complete) complete();
            return;
        }
        Fs.stat(dir.path, (err, stats)=>{
            var isDir = stats.isDirectory();
            if(!dir.handled){
                dir.handled = true;
                if(isDir){
                    Fs.readdir(dir.path, (err, files)=>{
                        files.reverse().forEach(file=>{
                            var p = Path.join(dir.path, file);
                            dirs.push({path:p, name:file});
                        });
                        walk(dirs, fileCallback);
                    });
                }else{
                    fileCallback(dir.path, ()=>{
                        walk(dirs, fileCallback);
                    })
                }
            }else{
                dirs.pop();
                walk(dirs, fileCallback);
            }
        });
    };
    walk(dir, (file, callback)=>{
        if(file.match(/_tests(\/|\\).*\.jsx?$/)){
            var path = Path.join("..","..","..",file);
            runner(path, ()=>{
                callback();
            })
        }else
            callback();
    }, ()=>{
        process.exit();
    });
}

// runner("../../../dist/core/communication/_tests/extendedJSON");
