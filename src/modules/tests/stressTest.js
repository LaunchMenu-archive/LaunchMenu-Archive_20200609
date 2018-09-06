import {IPC, isMain} from "LM";
import TestModule2 from "LM:test2";
import Module from "LM:Module";

export default class StressTest extends Module {
    constructor(request) {
        super(request, true);
    }
    $test() {
        if (true) {
            const modules = [];
            const promises = [];
            let count = 100;
            for (var i = 0; i < count; i++) {
                const module = new TestModule2();
                module.__register();
                promises.push(module.__onRegister());
                modules.push(module);
            }

            global.encode = 0;
            global.decode = 0;

            // Load the first instance and window
            Promise.all(promises).then(() => {
                console.time("Done");
                modules.forEach(module => {
                    module
                        .requestHandle({
                            type: "alert",
                        })
                        .then(channel => {
                            if (--count == 0) {
                                console.timeEnd("Done");
                            }
                            // channel.alert("single alert").then(() => {
                            //     return channel.close();
                            // });
                        });
                    // LM.Registry.requestModule({type: "test2"});
                });
                // console.timeEnd("Done");
            });
        } else {
            const sendTest = n =>
                IPC.send("Stress.test", "", 0).then(() => {
                    if (n - 1 > 0) return sendTest(n - 1);
                    else console.timeEnd("start");
                });

            console.time("start");
            // sendTest(100).then(;
        }
    }
}

if (isMain) {
    IPC.on("Stress.test", event => {
        return "test";
    });
}
