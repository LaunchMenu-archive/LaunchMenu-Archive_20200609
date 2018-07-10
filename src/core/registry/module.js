export default class Module{
    getClass(){
        return this.__proto__.constructor;
    }
}
