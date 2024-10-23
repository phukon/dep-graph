import json

def find_top_components(dependency_graph, top_count=10):
    indirect_import_counts = {}

    def count_indirect_imports(file, visited=None):
        if visited is None:
            visited = set()
        if file in visited:
            return set()
        visited.add(file)

        data = dependency_graph.get(file)
        if not data:
            return set()

        all_imports = set()
        for dep in data.get('outgoingDependencies', []):
            resolved_path = dep.get('resolvedPath')
            if resolved_path in dependency_graph:
                all_imports.add(resolved_path)
                indirect_imports = count_indirect_imports(resolved_path, visited)
                all_imports.update(indirect_imports)

        indirect_import_counts[file] = len(all_imports)
        return all_imports

    for file in dependency_graph:
        if file not in indirect_import_counts:
            count_indirect_imports(file)

    # Sort components by import count and return top 'top_count'
    top_components = sorted(
        indirect_import_counts.items(),
        key=lambda x: x[1],
        reverse=True
    )[:top_count]

    return [{'file': file, 'indirectImportCount': count} for file, count in top_components]

with open('dependencyGraph.json', 'r') as f:
    graph_data = json.load(f)

top_components = find_top_components(graph_data, 20)
print("Top 20 components by indirect import count:")
for index, component in enumerate(top_components, 1):
    print(f"{index}. {component['file']}: {component['indirectImportCount']} imports")