import fs from 'fs';
import path from 'path';

export const SEL_NONE = 0;
export const SEL_PARTIAL = 1;
export const SEL_ALL = 2;

// Build initial tree from top-level entries (dirs and files)
// topLevelEntries: [{name, relPath, isDir, isDot, ignored}]
export function buildInitialTree(topLevelEntries) {
  const nodes = new Map();
  nodes.set('', {
    name: '',
    relPath: '',
    isDir: true,
    isDot: false,
    ignored: false,
    expanded: false,
    selection: SEL_NONE,
    parentRel: null,
    children: topLevelEntries.map((d) => d.relPath),
  });
  for (const d of topLevelEntries) {
    nodes.set(d.relPath, {
      name: d.name,
      relPath: d.relPath,
      isDir: !!d.isDir,
      isDot: d.isDot,
      ignored: d.ignored,
      expanded: false,
      selection: !d.isDot && !d.ignored ? SEL_ALL : SEL_NONE,
      parentRel: '',
      children: undefined, // lazy
    });
  }
  return nodes;
}

function cloneNode(n) {
  return {
    ...n,
    children: Array.isArray(n.children) ? n.children.slice() : n.children,
  };
}

// Load both directories and files under dirRel (relative to root)
export function loadChildren(ig, rootPath, map, dirRel, fsApi = fs) {
  const next = new Map(map);
  const parent = cloneNode(next.get(dirRel));
  const dirAbs = path.join(rootPath, dirRel);
  let entries = [];
  try {
    entries = fsApi.readdirSync(dirAbs, { withFileTypes: true });
  } catch (_) {
    parent.children = [];
    next.set(dirRel, parent);
    return next;
  }
  // sort: dirs first, then files, by name
  entries.sort((a, b) => {
    if (a.isDirectory() && !b.isDirectory()) return -1;
    if (!a.isDirectory() && b.isDirectory()) return 1;
    return a.name.localeCompare(b.name);
  });

  const children = [];
  for (const entry of entries) {
    const rel = path.join(dirRel, entry.name);
    const isDot = entry.name.startsWith('.');
    const isIgnored =
      ig.ignores(rel) || ig.ignores(rel + (entry.isDirectory() ? '/' : ''));
    const preselected = parent.selection === SEL_ALL && !isDot && !isIgnored;
    const node = {
      name: entry.name,
      relPath: rel,
      isDir: entry.isDirectory(),
      isDot,
      ignored: isIgnored,
      expanded: false,
      selection: preselected ? SEL_ALL : SEL_NONE,
      parentRel: dirRel,
      children: entry.isDirectory() ? undefined : undefined,
    };
    next.set(rel, node);
    children.push(rel);
  }
  parent.children = children;
  next.set(dirRel, parent);
  return next;
}

export function flattenVisible(map) {
  const out = [];
  function walk(rel, depth) {
    const n = map.get(rel);
    if (!n || !Array.isArray(n.children)) return;
    for (const childRel of n.children) {
      const c = map.get(childRel);
      if (!c) continue;
      out.push({
        relPath: c.relPath,
        name: c.name,
        isDir: !!c.isDir,
        isDot: !!c.isDot,
        ignored: !!c.ignored,
        expanded: !!c.expanded,
        selection: c.selection,
        depth,
      });
      if (c.isDir && c.expanded) walk(c.relPath, depth + 1);
    }
  }
  walk('', 0);
  return out;
}

export function setSelectionForSubtree(map, rel, sel) {
  const next = new Map(map);
  function apply(r) {
    const n = cloneNode(next.get(r));
    if (!n) return;
    // When selecting ALL, do not auto-select dot/ignored nodes.
    // They remain NONE unless explicitly un-ignored via review.
    let desired = sel;
    if (sel === SEL_ALL && (n.isDot || n.ignored)) {
      desired = SEL_NONE;
    }
    n.selection = desired;
    next.set(r, n);
    if (n.isDir && Array.isArray(n.children)) {
      for (const ch of n.children) apply(ch);
    }
  }
  apply(rel);
  // bubble up
  function bubble(r) {
    const n = next.get(r);
    if (!n || !n.parentRel) return;
    const p = cloneNode(next.get(n.parentRel));
    if (Array.isArray(p.children) && p.children.length) {
      let all = 0;
      let none = 0;
      for (const ch of p.children) {
        const c = next.get(ch);
        if (!c) continue;
        if (c.selection === SEL_ALL) all++;
        else if (c.selection === SEL_NONE) none++;
      }
      const total = p.children.length;
      let newSel = SEL_PARTIAL;
      if (all === total) newSel = SEL_ALL;
      else if (none === total) newSel = SEL_NONE;
      p.selection = newSel;
      next.set(p.relPath, p);
      bubble(p.relPath);
    }
  }
  bubble(rel);
  return next;
}

export function pruneSelectedDirs(map) {
  // return array of nodes with selection ALL, excluding those whose ancestor is also ALL
  const selected = [];
  for (const [, n] of map) {
    if (!n || n.relPath === '' || !n.isDir) continue;
    // Treat PARTIAL as selected root as well; only NONE is excluded
    if (n.selection !== SEL_NONE) selected.push(n);
  }
  const selectedSet = new Set(selected.map((n) => n.relPath));
  function hasSelectedAncestor(n) {
    let p = n.parentRel;
    while (p) {
      if (selectedSet.has(p)) return true;
      const pn = map.get(p);
      p = pn ? pn.parentRel : null;
    }
    return false;
  }
  return selected.filter((n) => !hasSelectedAncestor(n));
}

export function computeExplicitExcludes(map) {
  const includedRoots = new Set(pruneSelectedDirs(map).map((n) => n.relPath));
  const excludes = [];
  for (const [, n] of map) {
    if (!n || n.relPath === '') continue;
    if (n.selection !== SEL_NONE) continue;
    // Check if any ancestor is an included root
    let p = n.parentRel;
    let underIncluded = false;
    while (p) {
      if (includedRoots.has(p)) {
        underIncluded = true;
        break;
      }
      const pn = map.get(p);
      p = pn ? pn.parentRel : null;
    }
    if (underIncluded) excludes.push(n.relPath);
  }
  return Array.from(new Set(excludes));
}

export function collectSelectedFiles(map) {
  const selectedDirs = new Set(pruneSelectedDirs(map).map((n) => n.relPath));
  const files = [];
  for (const [, n] of map) {
    if (!n || n.relPath === '' || n.isDir !== false) continue;
    if (n.selection !== SEL_ALL) continue;
    // prune files under selected dir (they'll be included by dir traversal)
    let p = n.parentRel;
    let underSelectedDir = false;
    while (p) {
      if (selectedDirs.has(p)) {
        underSelectedDir = true;
        break;
      }
      const pn = map.get(p);
      p = pn ? pn.parentRel : null;
    }
    if (!underSelectedDir) files.push(n);
  }
  return files;
}
