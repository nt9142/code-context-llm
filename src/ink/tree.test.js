import { describe, it, expect } from 'vitest';
import {
  SEL_NONE,
  SEL_PARTIAL,
  SEL_ALL,
  buildInitialTree,
  loadChildren,
  flattenVisible,
  setSelectionForSubtree,
  pruneSelectedDirs,
  computeExplicitExcludes,
  collectSelectedFiles,
} from './tree.js';

function dirent(name, isDir) {
  return {
    name,
    isDirectory: () => isDir,
    isFile: () => !isDir,
  };
}

describe('tree utilities', () => {
  it('buildInitialTree handles top-level dirs and files with default selections', () => {
    const top = [
      {
        name: 'src',
        relPath: 'src',
        isDir: true,
        isDot: false,
        ignored: false,
      },
      {
        name: 'README.md',
        relPath: 'README.md',
        isDir: false,
        isDot: false,
        ignored: false,
      },
      {
        name: '.env',
        relPath: '.env',
        isDir: false,
        isDot: true,
        ignored: false,
      },
    ];
    const nodes = buildInitialTree(top);

    const root = nodes.get('');
    expect(root).toBeDefined();
    expect(root.children).toEqual(['src', 'README.md', '.env']);

    const src = nodes.get('src');
    const readme = nodes.get('README.md');
    const dotEnv = nodes.get('.env');

    expect(src.isDir).toBe(true);
    expect(readme.isDir).toBe(false);
    expect(dotEnv.isDot).toBe(true);

    // default selections
    expect(src.selection).toBe(SEL_ALL);
    expect(readme.selection).toBe(SEL_ALL);
    expect(dotEnv.selection).toBe(SEL_NONE);
  });

  it('loadChildren sorts, marks ignored/dot, and preselects when parent is ALL', () => {
    const ig = {
      ignores: (rel) =>
        rel.includes('node_modules') ||
        rel.endsWith('ignored.txt') ||
        rel.endsWith('node_modules/'),
    };
    const rootPath = '/proj';
    const fsApi = {
      readdirSync: (p, _opts) => {
        if (p === '/proj/src') {
          return [
            dirent('lib', true),
            dirent('.hidden', true),
            dirent('node_modules', true),
            dirent('a.js', false),
            dirent('b.txt', false),
          ];
        }
        if (p === '/proj/src/lib') {
          return [dirent('util.js', false), dirent('ignored.txt', false)];
        }
        return [];
      },
    };

    const top = [
      {
        name: 'src',
        relPath: 'src',
        isDir: true,
        isDot: false,
        ignored: false,
      },
    ];
    let nodes = buildInitialTree(top);

    // expand src
    nodes.set('src', { ...nodes.get('src'), expanded: true });
    nodes = loadChildren(ig, rootPath, nodes, 'src', fsApi);

    const lib = nodes.get('src/lib');
    const hidden = nodes.get('src/.hidden');
    const nm = nodes.get('src/node_modules');
    const a = nodes.get('src/a.js');

    expect(lib.isDir).toBe(true);
    expect(hidden.isDir).toBe(true);
    expect(nm.isDir).toBe(true);
    expect(a.isDir).toBe(false);

    expect(hidden.isDot).toBe(true);
    expect(nm.ignored).toBe(true);

    // preselected due to parent ALL (but not hidden/ignored)
    expect(lib.selection).toBe(SEL_ALL);
    expect(a.selection).toBe(SEL_ALL);
    expect(hidden.selection).toBe(SEL_NONE);
    expect(nm.selection).toBe(SEL_NONE);

    // flattenVisible should include src (depth 0) and its children (depth 1)
    const flat = flattenVisible(nodes);
    const srcRow = flat.find((r) => r.relPath === 'src');
    const libRow = flat.find((r) => r.relPath === 'src/lib');
    const aRow = flat.find((r) => r.relPath === 'src/a.js');
    expect(srcRow.depth).toBe(0);
    expect(libRow.depth).toBe(1);
    expect(aRow.depth).toBe(1);
  });

  it('setSelectionForSubtree bubbles to parent as PARTIAL when mixed', () => {
    const ig = { ignores: () => false };
    const rootPath = '/proj';
    const fsApi = {
      readdirSync: (p) => {
        if (p === '/proj/src')
          return [dirent('lib', true), dirent('a.js', false)];
        if (p === '/proj/src/lib') return [dirent('util.js', false)];
        return [];
      },
    };

    const top = [
      {
        name: 'src',
        relPath: 'src',
        isDir: true,
        isDot: false,
        ignored: false,
      },
    ];
    let nodes = buildInitialTree(top);
    nodes.set('src', { ...nodes.get('src'), expanded: true });
    nodes = loadChildren(ig, rootPath, nodes, 'src', fsApi);

    // deselect lib subtree
    nodes = setSelectionForSubtree(nodes, 'src/lib', SEL_NONE);

    expect(nodes.get('src/lib').selection).toBe(SEL_NONE);
    expect(nodes.get('src').selection).toBe(SEL_PARTIAL);

    // select src entirely -> all children ALL
    nodes = setSelectionForSubtree(nodes, 'src', SEL_ALL);
    expect(nodes.get('src').selection).toBe(SEL_ALL);
    expect(nodes.get('src/lib').selection).toBe(SEL_ALL);
    expect(nodes.get('src/a.js').selection).toBe(SEL_ALL);
  });

  it('pruneSelectedDirs and computeExplicitExcludes work as expected', () => {
    const ig = { ignores: (rel) => rel.includes('node_modules') };
    const rootPath = '/proj';
    const fsApi = {
      readdirSync: (p) => {
        if (p === '/proj/src')
          return [dirent('lib', true), dirent('node_modules', true)];
        if (p === '/proj/src/lib') return [dirent('util.js', false)];
        return [];
      },
    };

    const top = [
      {
        name: 'src',
        relPath: 'src',
        isDir: true,
        isDot: false,
        ignored: false,
      },
      {
        name: 'README.md',
        relPath: 'README.md',
        isDir: false,
        isDot: false,
        ignored: false,
      },
    ];
    let nodes = buildInitialTree(top);
    nodes.set('src', { ...nodes.get('src'), expanded: true });
    nodes = loadChildren(ig, rootPath, nodes, 'src', fsApi);

    // select everything then explicitly deselect lib
    nodes = setSelectionForSubtree(nodes, 'src', SEL_ALL);
    nodes = setSelectionForSubtree(nodes, 'src/lib', SEL_NONE);

    const pruned = pruneSelectedDirs(nodes).map((n) => n.relPath);
    expect(pruned).toEqual(['src']);

    const excludes = computeExplicitExcludes(nodes);
    expect(excludes).toContain('src/lib');
    expect(excludes).toContain('src/node_modules');
  });

  it('collectSelectedFiles returns top-level files and prunes those under selected dirs', () => {
    const ig = { ignores: () => false };
    const rootPath = '/proj';
    const fsApi = {
      readdirSync: (p) => {
        if (p === '/proj/src') return [dirent('a.js', false)];
        return [];
      },
    };

    const top = [
      {
        name: 'src',
        relPath: 'src',
        isDir: true,
        isDot: false,
        ignored: false,
      },
      {
        name: 'README.md',
        relPath: 'README.md',
        isDir: false,
        isDot: false,
        ignored: false,
      },
    ];
    let nodes = buildInitialTree(top);
    // expand and load src with a.js
    nodes.set('src', { ...nodes.get('src'), expanded: true });
    nodes = loadChildren(ig, rootPath, nodes, 'src', fsApi);

    // ensure src selected and a.js under it selected (default), README is top-level selected
    const files = collectSelectedFiles(nodes).map((n) => n.relPath);
    expect(files).toEqual(['README.md']);

    // If we deselect README, nothing remains
    nodes = setSelectionForSubtree(nodes, 'README.md', SEL_NONE);
    expect(collectSelectedFiles(nodes)).toEqual([]);
  });
});
