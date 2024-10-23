const fs = require('fs')

function findTopComponents(dependencyGraph, topCount = 10) {
  const indirectImportCounts = {};

  function countIndirectImports(file, visited = new Set()) {
    if (visited.has(file)) return new Set();
    visited.add(file);

    const data = dependencyGraph[file];
    if (!data) return new Set();

    let allImports = new Set();
    data.outgoingDependencies.forEach(dep => {
      if (dependencyGraph[dep.resolvedPath]) {
        allImports.add(dep.resolvedPath);
        const indirectImports = countIndirectImports(dep.resolvedPath, visited);
        indirectImports.forEach(imp => allImports.add(imp));
      }
    });

    indirectImportCounts[file] = allImports.size;
    return allImports;
  }

  Object.keys(dependencyGraph).forEach(file => {
    if (!indirectImportCounts[file]) {
      countIndirectImports(file);
    }
  });

  // Sort components by import count and return top 'topCount'
  const topComponents = Object.entries(indirectImportCounts)
    .sort(([, countA], [, countB]) => countB - countA)
    .slice(0, topCount)
    .map(([file, count]) => ({ file, indirectImportCount: count }));

  return topComponents;
}

// Usage
const graphData = JSON.parse(fs.readFileSync('dependencyGraph.json', 'utf-8'));
const topComponents = findTopComponents(graphData, 20);
console.log("Top 20 components by indirect import count:");
topComponents.forEach((component, index) => {
  console.log(`${index + 1}. ${component.file}: ${component.indirectImportCount} imports`);
});
