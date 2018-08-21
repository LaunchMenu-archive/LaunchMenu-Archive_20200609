import Module from "../core/registry/module";

export default class MultiAlert extends Module{
    constructor(request){
        super(request, false);
        this.__init(()=>{
            return this.requestHandle({
                type: "alert"
            }).then(channel=>{
                this.alertChannel = channel;
            });
        });
    }
    alert(text){
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
