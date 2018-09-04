export default [
    {
        type: "alert",
        module: "alert.js",
    },
    {
        type: "multiAlert",
        filter: request => {
            return true;
        },
        module: "multiAlert.js",
    },
];
