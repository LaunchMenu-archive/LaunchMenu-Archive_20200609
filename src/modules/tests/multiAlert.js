import LM from "LM";

export default class MultiAlert extends LM.Module {
    constructor(request) {
        super(request);
        this.__init(() => {
            return this.requestHandle({
                type: "alert",
            }).then(channel => {
                this.alertChannel = channel;
            });
        });
    }
    $alert(event, text) {
        return this.alertChannel.alert(text).then(() => {
            return this.alertChannel.alert(text);
        });
    }
}
export const config = {
    type: "multiAlert",
    filter: request => {
        return true;
    },
};
