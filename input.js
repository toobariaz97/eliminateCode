const da = require('buffer');
const data = er => {
    console.log(er);
};

const files = (file) => {
    console.log(file);
}

document.addEventListener("click", function () {
    document.getElementById("demo").innerHTML = "Hello World";
});
const asyncFunction = async () => {
    const result = await fetch('https://example.com');
    console.log(result);
};

// Run the async function
asyncFunction();
module.exports = data