import LM from "LM";

export default class Alert extends LM.Module {
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
export const config = {
    type: "alert",
    filter: request => {
        return true;
    },
};
