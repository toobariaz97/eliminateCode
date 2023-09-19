

// import fs from 'fs-extra';
// import path from 'path';
// import {Glob,glob} from 'glob';
// import {parse} from 'acorn';
// import { generate } from 'escodegen';

// // Define your optimization logic here
// function optimizeCode(code) {
//     // Implement your code elimination logic here
//     // For a simple example, we'll return the code as is.
//     return code;
// }

// // Get command-line arguments for source and destination directories
// const sourceDirectory = process.argv[2];
// const destinationDirectory = process.argv[3];

// if (!sourceDirectory || !destinationDirectory) {
//     console.error('Usage: node your-script.js <source_directory> <destination_directory>');
//     process.exit(1);
// }

// // Check if source directory exists
// if (!fs.existsSync(sourceDirectory) || !fs.lstatSync(sourceDirectory).isDirectory()) {
//     console.error('Source directory does not exist or is not a directory.');
//     process.exit(1);
// }

// // Create the destination directory if it doesn't exist
// fs.ensureDirSync(destinationDirectory);
// console.log(destinationDirectory,sourceDirectory)

// // Use glob to find all JavaScript files in the source directory

// const g = new Glob("*.js", { ignore: "node_modules" })
// const files=await glob(`*.js`, {
//     ignore: "node_modules",
//     cwd:sourceDirectory
// },
//     async (err, files) => {
//     console.log("data");
//     if (err) {
//             console.error(err);
//             return;
//         }

//         // Process each JavaScript file
//         files.forEach((file) => {
//             const sourceFilePath = path.join(sourceDirectory, file);
//             const destinationFilePath = path.join(destinationDirectory, file);

//             // Read the file contents
//             const code = fs.readFileSync(sourceFilePath, 'utf-8');

//             // Parse the code into an Abstract Syntax Tree (AST)
//             const ast = Parser.acorn(code, { ecmaVersion: 'latest' });

//             // Optimize the code (replace this with your optimization logic)
//             const optimizedCode = optimizeCode(generate(ast));

//             // Ensure the destination directory exists
//             fs.ensureDirSync(path.dirname(destinationFilePath));

//             // Write the optimized code to the destination file
//             fs.writeFileSync(destinationFilePath, optimizedCode, 'utf-8');
//         });

//         console.log('Code optimization completed.');
// })

// files.forEach(file => {
//     const sourceFilePath = path.join(sourceDirectory, file);
//     console.log(sourceFilePath, "sourceFilePath");
//     const destinationFilePath = path.join(destinationDirectory, file);
//     const code = fs.readFileSync(sourceFilePath, 'utf-8');
//     const ast = parse(code, { ecmaVersion: 'latest' });
//     ast.body = ast.body.filter((node) => {
//         // Remove function declarations
//         if (node.type === 'FunctionDeclaration') {
//             return false;
//         }
//         const optimizedCode = optimizeCode(generate(ast));
//         fs.ensureDirSync(path.dirname(destinationFilePath));

//         fs.writeFileSync(destinationFilePath, optimizedCode, 'utf-8');
//         return true
//     })
//     console.log('Code optimization completed.');
    
// })

const fs = require('fs');
const parser = require('@babel/parser');
const traverse = require('@babel/traverse').default;
const generate = require('@babel/generator').default;

// Read the JavaScript code from a file
const code = fs.readFileSync('input.js', 'utf-8');

// Parse the code into an Abstract Syntax Tree (AST)
const ast = parser.parse(code, {
    sourceType: 'module',
    // plugins: ['js'],
});

// Identify used function names
const usedFunctionNames = new Set();

// Traverse the AST to find function calls
traverse(ast, {
    CallExpression(path) {
        if (path.node.callee.type === 'Identifier') {
            usedFunctionNames.add(path.node.callee.name);
        }
    },
});

// Remove unused functions from the AST
traverse(ast, {
    FunctionDeclaration(path) {
        if (!usedFunctionNames.has(path.node.id.name)) {
            path.remove();
        }
    },
});

// Generate the optimized code from the modified AST
const optimizedCode = generate(ast).code;

// Write the optimized code to a new file
fs.writeFileSync('output.js', optimizedCode, 'utf-8');
