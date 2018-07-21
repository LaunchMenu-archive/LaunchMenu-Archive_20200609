import Registry from "../core/registry/registry";
import Module from "../core/registry/module";
import {serializeSymbol, deserializeSymbol} from "../core/communication/extendedJSON";

export default class TestModule extends Module{
    constructor(name){
        super(undefined, true);
        this.name = name;
    }
    setSomething(something){
        this.something = something;
    }
    getSomething(){
        return this.something;
    }
    [serializeSymbol](){
        return {
            constArgs: [this.name],
            something: this.something
        };
    }
    [deserializeSymbol](data){
        this.setSomething(data.something);
    }
}
Registry.register(TestModule, {type:"test", filter:request=>{
    return true;
}});
