// // buildGraph.js
// const fs = require('fs');
// const path = require('path');
// const graphlib = require('graphlib');
// const Graph = graphlib.Graph;

// // Load the dependency graph data
// const graphData = JSON.parse(fs.readFileSync('dependencyGraph.json', 'utf-8'));

// // Initialize a directed graph
// const g = new Graph({ directed: true });

// // Add nodes and edges
// Object.keys(graphData).forEach(file => {
//   g.setNode(file);
//   graphData[file].forEach(imported => {
//     if (fs.existsSync(imported)) { // Ensure the imported file exists
//       g.setEdge(file, imported);
//     }
//   });
// });

// // Optional: Save the graph in DOT format for visualization tools like Graphviz
// const dot = graphlib.dot.write(g);
// fs.writeFileSync('dependencyGraph.dot', dot);
// console.log('Graph saved to dependencyGraph.dot');

// // Alternatively, you can proceed to visualize using a JavaScript library
