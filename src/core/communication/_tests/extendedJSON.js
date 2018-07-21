import ExtendedJSON from "../extendedJSON";

// // Test if recursive structures are properly turned into strings and back
// describe("ExtendedJSON: ", ()=>{
//     describe("Recursive structures", ()=>{
//         // Create an object to test with
//         const srcObject = {
//             f: "field",
//             obj1: {
//                 f: "field",
//                 obj2: {
//                     obj3: {
//                         obj2copy: null // Will be copied afterwards
//                     }
//                 }
//             },
//             obj2copy: null // Will be copied afterards
//         }
//         srcObject.obj1.obj2.obj3.obj2copy = srcObject.obj1.obj2;
//         srcObject.obj2copy = srcObject.obj1.obj2;
//
//         // Stringify the object
//         const stringObject = ExtendedJSON.stringify(srcObject);
//
//         it("should be serializable to data to a string", ()=>{
//             expect(typeof(stringObject)).toBe("number");
//         });
//         // t.true(typeof(stringObject)=="string", "ExtendedJSON stringify didn't output a string");
//
//         // Turn the string back into an object
//         const destObject = ExtendedJSON.parse(stringObject);
//
//         // Test if the data copies are in tact
//         it("should retain object references", ()=>{
//             expect(destObject.obj1.obj2.obj3.obj2copy==destObject.obj1.obj2).toBe(true);
//             expect(destObject.obj2copy==destObject.obj1.obj2).toBe(true);
//         });
//         // t.true(destObject.obj1.obj2.obj3.obj2copy==destObject.obj1.obj2, "ExtendedJSON didn't retain the circular structure");
//         // t.true(destObject.obj2copy==destObject.obj1.obj2, "ExtendedJSON didn't retain the copied object");
//
//         // Test if the destObject and srcObject are identical
//         it("should be serializable and reverseable", ()=>{
//             expect(srcObject).toEqual(destObject);
//         });
//         // t.deepEqual(srcObject, destObject, "ExtendedJSON didn't successfully convert object to string and back");
//     });
// });
import IPC from "../IPC";

export default async(process, sync)=>{
    if(isWindow){ // Client side
        IPC.on("message", event=>{
            IPC.send("message back");
        });
    }
    if(!isWindow){ // Server side
        IPC.on("message back", event=>{
            IPC.send("some callback", "some data");
        });
    }
    if(isWindow){
        IPC.on("some callback", event=>{
            IPC.send("callback response", event.data);
        });
    }
    if(!isWindow){
        IPC.on("callback response", event=>{
            expect(event.data).toBe("some data");
        });
    }

    await sync();

    if(!isWindow){
        // Invoke first client side listener
        IPC.send("message");
    }

    await new Promise((res, rej)=>{
        setTimeout(res, 5000);
    });
}
