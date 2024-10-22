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
      // Skip node_modules and dist directories
      if (entry.name !== 'node_modules' && entry.name !== 'dist' && entry.name !== '.storybook') {
        getAllFiles(fullPath, files);
      }
    } else if (
      /\.(js|jsx|ts|tsx)$/.test(entry.name) &&
      !entry.name.endsWith('.d.ts') &&
      !entry.name.endsWith('.test.js') &&
      !entry.name.endsWith('.test.ts')
    ) {
      // Skip test files
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
        imports.push({
          source: node.source.value,
          isRelative: node.source.value.startsWith('.'),
        });
      },
    });
  } catch (error) {
    console.error(`Error parsing ${filePath}:`, error.message);
  }
  return imports;
}

// Function to resolve relative imports
function resolveImport(basePath, importPath) {
  if (importPath.startsWith('.')) {
    const resolvedPath = path.resolve(path.dirname(basePath), importPath);
    const extensions = ['.js', '.jsx', '.ts', '.tsx'];
    for (const ext of extensions) {
      const fullPath = resolvedPath + ext;
      if (fs.existsSync(fullPath)) {
        return fullPath;
      }
    }
    // If no file with extension found, try as a directory with index file
    for (const ext of extensions) {
      const indexPath = path.join(resolvedPath, 'index' + ext);
      if (fs.existsSync(indexPath)) {
        return indexPath;
      }
    }
  }
  return importPath; // Return as-is if it's not a relative import
}

// Main function to build dependency graph data
function buildDependencyGraph(rootDir) {
  // Check if 'src' directory exists and use it if available
  const srcDir = path.join(rootDir, 'src');
  const targetDir = fs.existsSync(srcDir) ? srcDir : rootDir;

  const files = getAllFiles(targetDir);
  const dependencyGraph = {};

  files.forEach((file) => {
    const imports = extractImports(file);
    const relativePath = path.relative(rootDir, file);
    dependencyGraph[relativePath] = {
      incomingDependencies: [],
      outgoingDependencies: imports.map((imp) => ({
        source: imp.source,
        resolvedPath: imp.isRelative
          ? path.relative(rootDir, resolveImport(file, imp.source))
          : imp.source,
      })),
    };
  });

  // Populate incoming dependencies
  Object.entries(dependencyGraph).forEach(([file, data]) => {
    data.outgoingDependencies.forEach((dep) => {
      if (dependencyGraph[dep.resolvedPath]) {
        dependencyGraph[dep.resolvedPath].incomingDependencies.push(file);
      }
    });
  });

  return dependencyGraph;
}

// Function to find the entry point of the dependency graph
function findEntryPoint(dependencyGraph) {
  const candidates = Object.entries(dependencyGraph)
    .filter(([_, data]) => data.incomingDependencies.length === 0)
    .map(([file, _]) => file);

  if (candidates.length === 0) {
    console.warn(
      'No entry point found. The project might have circular dependencies.'
    );
    return null;
  }

  if (candidates.length > 1) {
    console.warn('Multiple potential entry points found:', candidates);
  }

  // Prioritize files named 'index.js', 'index.tsx', 'App.js', or 'App.tsx'
  const priorityFiles = ['index.js', 'index.tsx', 'App.js', 'App.tsx'];
  for (const priorityFile of priorityFiles) {
    const found = candidates.find((file) => file.endsWith(priorityFile));
    if (found) return found;
  }

  return candidates[0];
}

// Example usage
const rootDirectory = 'C:\\Users\\rikip\\Desktop\\EXIM\\work\\iterate-ai\\smallcase-sandbox';
const graphData = buildDependencyGraph(rootDirectory);
const entryPoint = findEntryPoint(graphData);

console.log('Entry point:', entryPoint);
fs.writeFileSync('dependencyGraph.json', JSON.stringify(graphData, null, 2));
console.log('Dependency graph data saved to dependencyGraph.json');
