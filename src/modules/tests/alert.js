import Module from "LM:Module";
export default class Alert extends Module {
    constructor(request) {
        super(request);
    }
    $alert(event, text) {
        window.alert(text);
        // console.info(text);
        // return new Promise(resolve=>{
        //     setTimeout(resolve, 2000);
        // })
    }
}
