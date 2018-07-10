import Module from "../registry/module";
var pathSymbol = Symbol("path");
var cleanSymbol = Symbol("clean");
var serializeSymbol = Symbol("serialize");
var deserializeSymbol = Symbol("deserialize");
export default class ExtendedJSON{
    /**
     * Encode more complicated data into a serializable object
     * @param  {Object} object The data you want to map
     * @return {Object}        The object that represents your data as as serializable string
     */
    static encode(object){
        /*
            TODO:
            -map recursive structures to none recursive structures
            -map primitive values to strings
            -map modules to their paths
         */
        var encodeValue = function(object, path){
            if(object instanceof Object){ // Encode an object of data into the extended format
                // If object is null, return null object in the extended format
                if(!object)
                    return {
                        type: "object",
                        value: null
                    };

                // If object has already been encoded, return a path instead (handles recursive structures)
                if(object[pathSymbol]!=null)
                    return {
                        type: "object",
                        subType: "path",
                        value: object[pathSymbol]
                    };

                // If object is an array or plain js object, recurse on this object
                if(object.__proto__==Object.prototype || object.__proto__==Array.prototype){
                    // Indicate that this object is currently being handled, and prevent recusion
                    object[pathSymbol] = path;

                    // Go through all children and append their values to this value
                    var value = {};
                    for(var key in object)
                        value[key] = encodeValue(object[key], path+"."+key);

                    // Return either a plain js object type, or an array type
                    var ret = {
                        type: "object",
                        value: value
                    };
                    if(object instanceof Array) ret.subType = "array";
                    return ret;
                }

                // If object is a module and serializable, serialize it
                if(object instanceof Module && object[serializeSymbol] && object[deserializeSymbol]){
                    var module = object.getClass().modulePath;
                    var data = object[serializeSymbol]();
                    return {
                        type: "object",
                        subType: "moduleInstance:"+module,
                        value: data
                    };
                }

                // If object is a module class, return the path of the class
                if(typeof(object)=="function" && object.modulePath)
                    return {
                        type: "object",
                        subType: "module:"+object.modulePath,
                        value: undefined
                    };

                // If none of the previous conditions apply, there is nothing left but ignore this value
                return {
                    type: "undefined",
                    value: undefined
                };
            }else{ // Encode a primitive value in the extended format
                var type = typeof(object);
                return {
                    type:type,
                    value:object
                };
            }
        }
        var cleanupObject = function(object){
            // Only clean the object if it really is an object, if it isn't already cleaned and if there is still something to clean
            if(object instanceof Object && !object[cleanSymbol] && object[pathSymbol]!=null){
                // Prevent recursion while cleaning the object
                object[cleanSymbol] = true;

                // Remove the path if it is present
                if(object[pathSymbol]!=null)
                    delete object[pathSymbol];

                // If no path is present, recurse on its children
                for(var key in object)
                    cleanupObject(object[key]);

                // Remove the cleanSymbol which prevent recursion
                delete object[cleanSymbol];
            }
        };

        // Encode data
        var encodedObject = encodeValue(object, "");
        // Remove data added to the original object during the process
        cleanupObject(object);

        // Return the encoded data
        return encodedObject;
    }
    /**
     * Decode the more complicated data that was encoded into a serializable object
     * @param  {Object} object The data you want return into its source data
     * @return {Object}        The source data in its format before encoding was applied
     */
    static decode(object){
        /*
            TODO:
            -map none recursive structure representations to their recursive structures
            -map primitive value strings representations to their value
            -map module paths to their module
         */
        /*
            TODO implement module decoding, properly comment everything
         */
        var writeDecodedValue = function(parent, key, value, obj){
            if(value.type=="object"){
                if(value.subType){
                    if(value.subType=="path"){
                        var path = value.value.split(".");
                        path.shift();

                        var fieldKey;
                        while((fieldKey = path.shift()) && obj)
                            obj = obj[fieldKey];

                        parent[key] = obj;
                        return;
                    }

                    var m;
                    if(m = value.subType.match(/module\:(.*)/)){

                    }
                    if(m = value.subType.match(/moduleInstance\:(.*)/)){

                    }
                }

                if(value.value==null){
                    parent[key] = null;
                    return;
                }

                var val = value.subType=="array"?[]:{};
                parent[key] = val;
                for(var fieldKey in value.value)
                    writeDecodedValue(val, fieldKey, value.value[fieldKey], obj||val);
                return;
            }else{
                parent[key] = value.value;
                return;
            }
        };

        var obj = {};
        writeDecodedValue(obj, "root", object);
        return obj.root;
    }

    /**
     * Use ExtendedJSON to turn a string into an object just like JSON would
     * @param  {String} string The string to translate back into an object
     * @return {Object}        The source object that the string was made from
     */
    static parse(string){
        return this.decode(JSON.parse(string));
    }
    /**
     * Use ExtendedJSON to turn an object into a string just like JSON would
     * @param  {Object} object The source object to turn into a string
     * @return {String}        The string that the object was translated into
     */
    static stringify(object){
        return JSON.stringify(this.encode(object));
    }

    /**
     * Get the serializeSymbol to use as a function name in your own class, allowing said class to be serialized by ExtendedJSON
     * @type {Symbol}
     */
    static get serializeSymbol(){
        return serializeSymbol;
    }
    /**
     * Get the deserializeSymbol to use as a function name in your own class, allowing said class to be deserialized by ExtendedJSON
     * @type {[type]}
     */
    static get deserializeSymbol(){
        return deserializeSymbol;
    }
}
