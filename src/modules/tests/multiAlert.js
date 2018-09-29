import Module from "LM:Module";

export default class MultiAlert extends Module {
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
        return this.alertChannel.$alert(text).then(() => {
            return this.alertChannel.$alert(text);
        });
    }
}
