
export default class Module{
    constructor(request){

    }
    toString(){
        return this.getClass().toString();
    }
    getClass(){
        return this.__proto__.constructor;
    }
    static toString(){
        return this.modulePath;
    }
}
