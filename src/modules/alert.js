import Module from "../core/registry/module";

export default class Alert extends Module{
    constructor(request){
        super(request, false);
    }
    alert(text){
        window.alert(text);
    }
}
export const config = {
    type: "alert",
    filter: request=>{
        return true;
    }
};
