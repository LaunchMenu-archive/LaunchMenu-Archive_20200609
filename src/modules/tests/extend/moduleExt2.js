import Module from "LM:Module";
export default class ModuleExt1 extends Module {
    constructor(request, canBeDirectlyInstantiated) {
        super(request, canBeDirectlyInstantiated);
        try {
            // alert("Git rekt");
        } catch (e) {}
    }
}
