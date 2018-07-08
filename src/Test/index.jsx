import React from "react";
import ReactDOM from 'react-dom';

var el = (
    <div className="test">
      Click Me
    </div>
);
console.log(document.getElementById('root'));
ReactDOM.render(el, document.getElementById('root'));

//error message test with source mapping:
console.log(somethingThatDoesntExist.poop());
