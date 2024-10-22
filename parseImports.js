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
      // Skip node_modules, dist, and other specific directories
      if (entry.name !== 'node_modules' && entry.name !== 'dist' && !entry.name.startsWith('.') && entry.name !== 'test' && entry.name !== 'tests') {
        getAllFiles(fullPath, files);
      }
    } else if (
      /\.(js|jsx|ts|tsx)$/.test(entry.name) &&
      !entry.name.endsWith('.d.ts') &&
      !entry.name.endsWith('.test.js') &&
      !entry.name.endsWith('.test.ts') &&
      !entry.name.endsWith('.test.jsx') &&
      !entry.name.endsWith('.test.tsx') &&
      !entry.name.endsWith('.stories.tsx') &&
      !entry.name.endsWith('.stories.jsx')
    ) {
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

// New function to parse tsconfig.json and extract path aliases
function getPathAliases(rootDir) {
  const tsconfigPath = path.join(rootDir, 'tsconfig.json');
  if (!fs.existsSync(tsconfigPath)) {
    return {};
  }

  try {
    const tsconfig = JSON.parse(fs.readFileSync(tsconfigPath, 'utf-8'));
    const paths = tsconfig.compilerOptions?.paths || {};
    const baseUrl = tsconfig.compilerOptions?.baseUrl || './';

    const aliases = {};
    for (const [alias, [aliasPath]] of Object.entries(paths)) {
      aliases[alias.replace('/*', '')] = path.join(rootDir, baseUrl, aliasPath.replace('/*', ''));
    }
    return aliases;
  } catch (error) {
    console.error('Error parsing tsconfig.json:', error.message);
    return {};
  }
}

// Updated resolveImport function
function resolveImport(rootDir, basePath, importPath, aliases) {
  const extensions = ['.js', '.jsx', '.ts', '.tsx', '.css'];

  // Helper function to check for file existence with extensions
  function findFileWithExtensions(filePath) {
    for (const ext of extensions) {
      const fullPath = filePath + ext;
      if (fs.existsSync(fullPath)) {
        return fullPath;
      }
    }
    return null;
  }

  // Helper function to check for index file in directory
  function findIndexFile(dirPath) {
    for (const ext of extensions) {
      const indexPath = path.join(dirPath, 'index' + ext);
      if (fs.existsSync(indexPath)) {
        return indexPath;
      }
    }
    return null;
  }

  // Check if the import matches any alias
  for (const [alias, aliasPath] of Object.entries(aliases)) {
    if (importPath.startsWith(alias)) {
      const resolvedPath = path.join(aliasPath, importPath.slice(alias.length));
      const fileWithExt = findFileWithExtensions(resolvedPath);
      if (fileWithExt) {
        return path.relative(rootDir, fileWithExt);
      }
      const indexFile = findIndexFile(resolvedPath);
      if (indexFile) {
        return path.relative(rootDir, indexFile);
      }
      // If still not found, return the normalized relative path
      return path.relative(rootDir, resolvedPath);
    }
  }

  if (importPath.startsWith('.')) {
    const absolutePath = path.resolve(path.dirname(basePath), importPath);
    const fileWithExt = findFileWithExtensions(absolutePath);
    if (fileWithExt) {
      return path.relative(rootDir, fileWithExt);
    }
    const indexFile = findIndexFile(absolutePath);
    if (indexFile) {
      return path.relative(rootDir, indexFile);
    }
    // If still not found, return the normalized relative path
    return path.relative(rootDir, absolutePath);
  }

  return importPath; // Return as-is if it's not a relative import or alias
}

// Main function to build dependency graph data
function buildDependencyGraph(rootDir) {
  // Check if 'src' directory exists and use it if available
  const srcDir = path.join(rootDir, 'src');
  const targetDir = fs.existsSync(srcDir) ? srcDir : rootDir;
  const aliases = getPathAliases(rootDir);

  const files = getAllFiles(targetDir);
  const dependencyGraph = {};

  files.forEach((file) => {
    const imports = extractImports(file);
    const relativePath = path.relative(rootDir, file);
    dependencyGraph[relativePath] = {
      incomingDependencies: [],
      outgoingDependencies: imports.map((imp) => ({
        source: imp.source,
        resolvedPath: resolveImport(rootDir, file, imp.source, aliases),
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
const rootDirectory = 'C:\\Users\\rikip\\Desktop\\simorgh';
const graphData = buildDependencyGraph(rootDirectory);
const entryPoint = findEntryPoint(graphData);

console.log('Entry point:', entryPoint);
fs.writeFileSync('dependencyGraph.json', JSON.stringify(graphData, null, 2));
console.log('Dependency graph data saved to dependencyGraph.json');
