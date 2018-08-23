import Module from "../core/registry/module";

export default class MultiAlert extends Module{
    constructor(request){
        super(request);
        this.__init(()=>{
            console.log(this.core.source.requestPath.toString(true));
            return this.requestHandle({
                type: "alert"
            }).then(channel=>{
                this.alertChannel = channel;
            });
        });
        console.log(this);
    }
    $alert(event, text){
        return this.alertChannel.alert(text).then(()=>{
            return this.alertChannel.alert(text);
        });
    }
}
export const config = {
    type: "multiAlert",
    filter: request=>{
        return true;
    }
};
