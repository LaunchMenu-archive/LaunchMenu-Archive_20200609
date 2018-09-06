import LM from "LM";
export default class StressTest extends LM.Module {
    constructor(request) {
        super(request, true);
    }
    $test() {
        if (true) {
            const TestModule2 = LM.Registry.requestModule({type: "test2"});

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
                                console.log(
                                    global.encode / 1e6,
                                    global.decode / 1e6
                                );
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
                LM.IPC.send("Stress.test", "", 0).then(() => {
                    if (n - 1 > 0) return sendTest(n - 1);
                    else console.timeEnd("start");
                });

            console.time("start");
            // sendTest(100).then(;
        }
    }
}

if (LM.isMain) {
    LM.IPC.on("Stress.test", event => {
        return "test";
    });
}
