const fs = require('fs');
// Function to find probable entry points in the dependency graph
function findProbableEntryPoints(dependencyGraph) {
  const entryPoints = Object.entries(dependencyGraph)
    .filter(([_, data]) => data.incomingDependencies.length === 0)
    .map(([file, _]) => file);

  if (entryPoints.length === 0) {
    console.warn("No probable entry points found. The project might have circular dependencies.");
  } else if (entryPoints.length > 1) {
    console.warn("Multiple probable entry points found:", entryPoints);
  }

  return entryPoints;
}

const graphData = JSON.parse(fs.readFileSync('dependencyGraph.json', 'utf-8'));
const probableEntryPoints = findProbableEntryPoints(graphData);
console.log('Probable entry points:', probableEntryPoints);