// parseImports.js
const fs = require('fs');
const path = require('path');
const parser = require('@babel/parser');
const traverse = require('@babel/traverse').default;

// Function to recursively get all JS/JSX files in a directory
function getAllFiles(dir, files = []) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (let entry of entries) {
    const fullPath = path.resolve(dir, entry.name);
    if (entry.isDirectory()) {
      // Skip node_modules directory
      if (entry.name !== 'node_modules') {
        getAllFiles(fullPath, files);
      }
    } else if (/\.(js|jsx|ts|tsx)$/.test(entry.name) && !entry.name.endsWith('.d.ts')) {
      files.push(fullPath);
    }
  }
  return files;
}

// Function to extract imports from a file
function extractImports(filePath) {
  const code = fs.readFileSync(filePath, 'utf-8');
  const imports = [];
  try {
    const ast = parser.parse(code, {
      sourceType: 'module',
      plugins: ['jsx', 'typescript'],
    });

    traverse(ast, {
      ImportDeclaration({ node }) {
        imports.push(node.source.value);
      },
    });
  } catch (error) {
    console.error(`Error parsing ${filePath}:`, error.message);
  }
  return imports;
}

// Main function to build dependency graph data
function buildDependencyGraph(rootDir) {
  const files = getAllFiles(rootDir);
  const dependencyGraph = {};

  files.forEach(file => {
    const imports = extractImports(file);
    dependencyGraph[file] = imports
      .filter(imp => imp.startsWith('.')) // Consider only relative imports
      .map(imp => path.resolve(path.dirname(file), imp) + (path.extname(imp) ? '' : '.js')); // Resolve to absolute paths
  });

  return dependencyGraph;
}

// Example usage
const rootDirectory = 'C:\\Users\\rikip\\Desktop\\EXIM\\Work\\iterate-ai\\smallcase-sandbox'
const graphData = buildDependencyGraph(rootDirectory);
fs.writeFileSync('dependencyGraph.json', JSON.stringify(graphData, null, 2));
console.log('Dependency graph data saved to dependencyGraph.json');
