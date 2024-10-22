const fs = require('fs');

// Load and parse the dependency graph
const dependencyGraph = JSON.parse(fs.readFileSync('dependencyGraph.json', 'utf8'));

// Create a map to hold the count of unique imports for each file
const importCount = {};

// Function to recursively count unique imports
function countImports(file, visited) {
    if (visited.has(file)) return;
    visited.add(file);

    const data = dependencyGraph[file];
    if (!data) return;

    const outgoingDependencies = data.outgoingDependencies || [];
    outgoingDependencies.forEach(dep => {
        const resolvedPath = dep.resolvedPath;
        if (!importCount[file]) {
            importCount[file] = new Set();
        }
        importCount[file].add(resolvedPath);
        countImports(resolvedPath, visited);
    });
}

// Count imports for each file
Object.keys(dependencyGraph).forEach(file => {
    countImports(file, new Set());
});

// Convert the importCount map to an array and sort it
const sortedFiles = Object.entries(importCount)
    .map(([file, imports]) => ({ file, count: imports.size }))
    .sort((a, b) => b.count - a.count);

// Get the top 5 files
const top5Files = sortedFiles.slice(0, 15);

// Output the results
console.log('Top 5 files importing the most components:');
top5Files.forEach(({ file, count }) => {
    console.log(`${file}: ${count} unique imports`);
});