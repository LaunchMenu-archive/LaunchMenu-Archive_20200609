export default function({types:t}){
    return {
        visitor: {
            InterpreterDirective(path){
                console.log(path.node);
            },
            CallExpression(path){
                const node = path.node;

                // Check if the call is to a require method
                const name = node.callee.name;
                if(name!=="require") return;

                // Check if argument is a string literal
                const arg = node.arguments[0];
                if(arg.type!=="StringLiteral") return;

                // Check if string has the LM prefix
                const text = arg.value;
                if(!text.match(/^LM\:/)) return;

                // Replace require with Registry.request
                arg.value = text.substring(3); // Remove LM: from string
                path.replaceWith(
                    t.CallExpression(
                        t.MemberExpression(
                            t.Identifier("Registry"),
                            t.Identifier("request")
                        ),
                        [arg]
                    )
                );
            }
        }
    };
}
