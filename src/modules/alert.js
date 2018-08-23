import Module from "../core/registry/module";

export default class Alert extends Module{
    constructor(request){
        super(request);
        console.log(this);
    }
    $alert(event, text){
        window.alert(text);
        // console.info(text);
        // return new Promise(resolve=>{
        //     setTimeout(resolve, 2000);
        // })
    }
}
export const config = {
    type: "alert",
    filter: request=>{
        return true;
    }
};
