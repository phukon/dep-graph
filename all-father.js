const fs = require('fs')

function findTopLevelComponent(dependencyGraph) {
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

  const topLevelComponent = Object.entries(indirectImportCounts)
    .reduce((max, [file, count]) => count > max[1] ? [file, count] : max, ['', 0]);

  return {
    file: topLevelComponent[0],
    indirectImportCount: topLevelComponent[1]
  };
}

const graphData = JSON.parse(fs.readFileSync('dependencyGraph.json', 'utf-8'));
const topComponent = findTopLevelComponent(graphData);
console.log(`Top-level component: ${topComponent.file}`);
console.log(`Indirect import count: ${topComponent.indirectImportCount}`);