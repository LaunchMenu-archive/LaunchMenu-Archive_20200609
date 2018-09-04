import Registry from "../../core/registry/registry";
import Module from "../../core/registry/module";
import {
    serializeSymbol,
    deserializeSymbol,
} from "../../core/communication/extendedJSON";

export default class TestModule2 extends Module {
    constructor(request, name) {
        super(request, true);
        this.name = name;
    }
    setSomething(something) {
        console.log(`something is now ${something}`);
        this.something = something;
        return 3;
    }
    getSomething() {
        return this.something;
    }
    [serializeSymbol]() {
        return {
            constArgs: [this.name],
            something: this.something,
        };
    }
    [deserializeSymbol](data) {
        this.setSomething(data.something);
    }
}
