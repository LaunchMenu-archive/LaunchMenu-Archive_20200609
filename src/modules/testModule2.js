import stuff from "LM:crap";
export default async()=>{
    const Test = await Registry.request("test");
    const n = stuff;

    class S extends Test{

    }

    return {
        config: {

        },
        default: S
    };
}
