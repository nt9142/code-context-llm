import React, { useEffect, useMemo, useState } from 'react';
import { Box, Text, useApp, useInput } from 'ink';
import fs from 'fs';
import path from 'path';
import {
  getDirectoryStructure,
  tryReadFileContent,
  sanitizeCodeBlockDelimiters,
} from '../utils/index.js';
import { TreeList, SelectableList, Instructions } from './components.js';
import {
  buildInitialTree,
  loadChildren as loadChildrenUtil,
  flattenVisible,
  setSelectionForSubtree,
  pruneSelectedDirs,
  computeExplicitExcludes,
  collectSelectedFiles,
  SEL_NONE,
  SEL_ALL,
} from './tree.js';

const h = React.createElement;

function useTopLevelEntries(rootPath, ig) {
  return useMemo(() => {
    try {
      const entries = fs.readdirSync(rootPath, { withFileTypes: true });
      const items = entries.map((e) => ({
        name: e.name,
        relPath: e.name,
        isDir: e.isDirectory(),
        isDot: e.name.startsWith('.'),
        ignored:
          ig.ignores(e.name) ||
          ig.ignores(e.name + (e.isDirectory() ? '/' : '')),
      }));
      // sort: dirs first, then files
      items.sort((a, b) => {
        if (a.isDir && !b.isDir) return -1;
        if (!a.isDir && b.isDir) return 1;
        return a.name.localeCompare(b.name);
      });
      return items;
    } catch (e) {
      return [];
    }
  }, [rootPath, ig]);
}

function findTopLevelExcludedChildren(rootPath, selectedDirs, ig) {
  const excluded = [];
  for (const d of selectedDirs) {
    const dirAbs = path.join(rootPath, d.relPath);
    let entries = [];
    try {
      entries = fs.readdirSync(dirAbs, { withFileTypes: true });
    } catch (_) {
      continue;
    }
    for (const entry of entries) {
      const rel = path.join(d.relPath, entry.name);
      if (ig.ignores(rel) || entry.name.startsWith('.')) {
        excluded.push({
          name: rel,
          relPath: rel,
          isDir: entry.isDirectory(),
          topLevel: true,
        });
      }
    }
  }
  // unique by relPath
  const seen = new Set();
  const unique = [];
  for (const it of excluded) {
    if (!seen.has(it.relPath)) {
      seen.add(it.relPath);
      unique.push(it);
    }
  }
  return unique;
}

function findRootExcludedTopLevel(rootPath, ig) {
  const out = [];
  let entries = [];
  try {
    entries = fs.readdirSync(rootPath, { withFileTypes: true });
  } catch (_) {
    return out;
  }
  for (const entry of entries) {
    const rel = entry.name; // top-level relative
    if (ig.ignores(rel) || rel.startsWith('.')) {
      out.push({
        name: rel,
        relPath: rel,
        isDir: entry.isDirectory(),
        topLevel: true,
      });
    }
  }
  return out;
}

function addUnignorePatterns(ig, relPath, isDir) {
  const patterns = [];
  // Ensure relative path has no leading './'
  const p = relPath.replace(/^\.\//, '');
  if (isDir) {
    patterns.push(`!/${p}`);
    patterns.push(`!/${p}/**`);
  } else {
    patterns.push(`!/${p}`);
  }
  ig.add(patterns);
}

function writeRootFiles(rootPath, ig, writeStream) {
  const entries = fs.readdirSync(rootPath, { withFileTypes: true });
  for (const entry of entries) {
    if (entry.isFile()) {
      const rel = entry.name;
      if (ig.ignores(rel)) continue;
      const filePath = path.join(rootPath, entry.name);
      const stat = fs.statSync(filePath);
      const size = stat.size;
      const content = tryReadFileContent(filePath);
      writeStream.write(
        `- ${entry.name} ${size > 0 ? `(${size} bytes)` : ''}\n`
      );
      if (content && content.length > 0) {
        const sanitized = sanitizeCodeBlockDelimiters(content);
        writeStream.write(
          `  - Content preview:\n\`\`\`\n${sanitized}\n\`\`\`\n`
        );
      }
    }
  }
}

export default function App({ rootPath, outputFileName, ig }) {
  const { exit } = useApp();
  const topLevelEntries = useTopLevelEntries(rootPath, ig);

  const [step, setStep] = useState('select'); // select | review | generate | done | error
  const [cursor, setCursor] = useState(0);
  const [nodes, setNodes] = useState(() => buildInitialTree(topLevelEntries));

  // Rebuild tree if top-level changes
  useEffect(() => {
    setNodes(buildInitialTree(topLevelEntries));
    setCursor(0);
  }, [topLevelEntries]);

  const flatItems = useMemo(() => flattenVisible(nodes), [nodes]);

  const [excludedItems, setExcludedItems] = useState([]);
  const [status, setStatus] = useState('');
  const [error, setError] = useState(null);

  useEffect(() => {
    if (step === 'review') {
      // Build list of currently selected directories (pruned)
      const selDirs = pruneSelectedDirs(nodes);
      const byChildren = findTopLevelExcludedChildren(rootPath, selDirs, ig);
      const byRoot = findRootExcludedTopLevel(rootPath, ig);
      // merge unique by relPath
      const map = new Map();
      for (const it of [...byRoot, ...byChildren]) {
        if (!map.has(it.relPath)) map.set(it.relPath, it);
      }
      const combined = Array.from(map.values());
      setExcludedItems(combined);
      if (combined.length === 0) {
        setStep('generate');
      }
    }
  }, [step, nodes]);

  useInput((input, key) => {
    if (step === 'select') {
      const items = flatItems;
      if (!items || items.length === 0) return;
      if (key.upArrow) {
        setCursor((c) => (c > 0 ? c - 1 : items.length - 1));
        return;
      }
      if (key.downArrow) {
        setCursor((c) => (c < items.length - 1 ? c + 1 : 0));
        return;
      }
      if (key.rightArrow) {
        const cur = items[Math.min(cursor, items.length - 1)];
        if (!cur) return;
        setNodes((prev) => {
          const n = prev.get(cur.relPath);
          if (!n) return prev;
          let next = prev;
          if (n.isDir && n.children === undefined) {
            next = loadChildrenUtil(ig, rootPath, prev, cur.relPath);
          }
          const nn = { ...next.get(cur.relPath), expanded: true };
          const next2 = new Map(next);
          next2.set(cur.relPath, nn);
          return next2;
        });
        // If expanded and has children, move into first child
        const updated = flattenVisible(nodes);
        const curAfter = updated[Math.min(cursor, updated.length - 1)];
        if (curAfter && curAfter.expanded) {
          setCursor((c) => Math.min(c + 1, updated.length - 1));
        }
        return;
      }
      if (key.leftArrow) {
        const cur = items[Math.min(cursor, items.length - 1)];
        if (!cur) return;
        const n = nodes.get(cur.relPath);
        if (n && n.expanded) {
          setNodes((prev) => {
            const nn = { ...prev.get(cur.relPath), expanded: false };
            const next = new Map(prev);
            next.set(cur.relPath, nn);
            return next;
          });
          return;
        }
        // move to parent
        const parentRel = n ? n.parentRel : '';
        if (parentRel !== null && parentRel !== undefined) {
          const updated = flattenVisible(nodes);
          const idx = updated.findIndex((it) => it.relPath === parentRel);
          if (idx >= 0) setCursor(idx);
        }
        return;
      }
      if (input === 'a') {
        // toggle subtree under cursor
        const cur = items[Math.min(cursor, items.length - 1)];
        if (!cur) return;
        const currentNode = nodes.get(cur.relPath);
        if (!currentNode) return;
        const nextSel = currentNode.selection === SEL_ALL ? SEL_NONE : SEL_ALL;
        setNodes((prev) => setSelectionForSubtree(prev, cur.relPath, nextSel));
        return;
      }
      if (input === ' ' || key.space) {
        const cur = items[Math.min(cursor, items.length - 1)];
        if (!cur) return;
        const currentNode = nodes.get(cur.relPath);
        if (!currentNode) return;
        const nextSel = currentNode.selection === SEL_ALL ? SEL_NONE : SEL_ALL;
        setNodes((prev) => setSelectionForSubtree(prev, cur.relPath, nextSel));
        return;
      }
      if (key.return) {
        // Proceed if any selection exists (dirs or files)
        const anySel =
          pruneSelectedDirs(nodes).length > 0 ||
          collectSelectedFiles(nodes).length > 0;
        if (!anySel) return;
        setCursor(0);
        setStep('review');
        return;
      }
      if (key.escape || input === 'q') {
        exit();
        return;
      }
    } else if (step === 'review') {
      const items = excludedItems;
      if (key.upArrow) {
        setCursor((c) => (c > 0 ? c - 1 : items.length - 1));
      } else if (key.downArrow) {
        setCursor((c) => (c < items.length - 1 ? c + 1 : 0));
      } else if (input === 'a') {
        setExcludedItems((prev) => {
          const all = new Set(prev.map((_, i) => i));
          const flag = prev.__selAllFlag || false;
          const next = prev.slice();
          next.__selAllFlag = !flag;
          next.__selected = !flag ? all : new Set();
          return next;
        });
      } else if (key.return) {
        setStep('generate');
      } else if (key.escape || input === 'q') {
        exit();
      } else if (input === ' ' || key.space) {
        setExcludedItems((prev) => {
          const set = prev.__selected ? new Set(prev.__selected) : new Set();
          if (set.has(cursor)) set.delete(cursor);
          else set.add(cursor);
          const next = prev.slice();
          next.__selected = set;
          return next;
        });
      }
    }
  });

  useEffect(() => {
    if (step !== 'generate') return;

    (async () => {
      try {
        setStatus('Preparing...');
        // Apply unignore patterns for selected excluded items and for selected ignored/dot dirs
        const selectedExcludedIdxs = excludedItems.__selected || new Set();
        for (const idx of selectedExcludedIdxs) {
          const item = excludedItems[idx];
          if (!item) continue;
          addUnignorePatterns(ig, item.relPath, item.isDir);
        }
        const selectedDirNodes = pruneSelectedDirs(nodes);
        for (const n of selectedDirNodes) {
          if (n.isDot || n.ignored) {
            addUnignorePatterns(ig, n.relPath, true);
          }
        }
        // Apply explicit excludes for any deselected subtrees under selected parents
        const explicitExcludes = computeExplicitExcludes(nodes);
        if (explicitExcludes.length) {
          ig.add(explicitExcludes.flatMap((p) => [`/${p}`, `/${p}/**`]));
        }

        // Write output
        const outputPath = path.join(rootPath, outputFileName);
        const stream = fs.createWriteStream(outputPath, {
          flags: 'w',
          encoding: 'utf8',
        });
        await new Promise((resolve, reject) => {
          stream.on('ready', resolve);
          stream.on('error', reject);
        });

        stream.write(`# Project Structure for ${rootPath}\n\n`);

        // Ensure deselected top-level files are excluded from root files section
        const deselectedTopLevelFiles = [];
        for (const [, n] of nodes) {
          if (!n || n.relPath === '' || n.isDir) continue;
          if (n.parentRel === '' && n.selection === SEL_NONE) {
            deselectedTopLevelFiles.push(n.relPath);
          }
        }
        if (deselectedTopLevelFiles.length) {
          ig.add(deselectedTopLevelFiles.map((p) => `/${p}`));
        }

        // Include root-level non-ignored files first
        setStatus('Writing root files...');
        writeRootFiles(rootPath, ig, stream);

        // Then included directories (tree selection + reviewed top-level extras)
        const prunedSelected = pruneSelectedDirs(nodes).map((n) => ({
          name: n.name,
          relPath: n.relPath,
        }));
        const selectedExcludedIdxsArr = Array.from(selectedExcludedIdxs);
        const extraTopLevelDirs = [];
        for (const idx of selectedExcludedIdxsArr) {
          const item = excludedItems[idx];
          if (item && item.topLevel && item.isDir) {
            extraTopLevelDirs.push({ name: item.name, relPath: item.relPath });
          }
        }
        const allDirsMap = new Map();
        for (const d of [...prunedSelected, ...extraTopLevelDirs]) {
          if (!allDirsMap.has(d.relPath)) allDirsMap.set(d.relPath, d);
        }
        const allDirs = Array.from(allDirsMap.values());
        for (const d of allDirs) {
          setStatus(`Processing ${d.name}...`);
          try {
            getDirectoryStructure(
              path.join(rootPath, d.relPath),
              ig,
              stream,
              0,
              rootPath,
              '',
              ''
            );
          } catch (e) {
            // continue with others
          }
        }

        stream.end();
        await new Promise((resolve) => stream.on('finish', resolve));
        setStep('done');
      } catch (e) {
        setError(e?.message || String(e));
        setStep('error');
      }
    })();
  }, [step]);

  // Auto-exit after showing the done screen so the process terminates when finished
  useEffect(() => {
    if (step === 'done') {
      const t = setTimeout(() => exit(), 50);
      return () => clearTimeout(t);
    }
  }, [step, exit]);

  if (step === 'select') {
    return h(
      Box,
      { flexDirection: 'column' },
      h(
        Box,
        {
          borderStyle: 'round',
          borderColor: 'cyan',
          paddingX: 1,
          flexDirection: 'column',
        },
        h(Text, { color: 'cyan', bold: true }, 'Code Context LLM'),
        h(
          Text,
          { dimColor: true },
          'Generate a shareable Markdown overview of your project structure'
        )
      ),
      h(Box, { marginTop: 1 }, h(Text, null, `Root: ${rootPath}`)),
      h(TreeList, {
        flatItems: flatItems,
        cursorIndex: cursor,
        title: 'Select folders and files to include (←/→ to collapse/expand)',
        emptyText: 'No items found.',
      }),
      h(Instructions, {
        lines: [
          '↑/↓ to move, space to toggle, a to toggle subtree',
          '← collapse / → expand, enter to continue, q to quit',
        ],
      })
    );
  }

  if (step === 'review') {
    const selectedSet = excludedItems.__selected || new Set();
    return h(
      Box,
      { flexDirection: 'column' },
      h(Text, null, 'Review excluded items'),
      h(
        Box,
        { marginTop: 1 },
        h(
          Text,
          { dimColor: true },
          'The following items are excluded by .gitignore or defaults. Select any to include anyway.'
        )
      ),
      h(SelectableList, {
        items: excludedItems,
        selectedSet,
        cursorIndex: cursor,
        title: excludedItems.length ? undefined : 'Nothing to review',
        emptyText: 'No excluded items detected in selected folders.',
      }),
      h(Instructions, {
        lines: [
          '↑/↓ to move, space to toggle, a to toggle all',
          'enter to generate, q to quit',
        ],
      })
    );
  }

  if (step === 'generate') {
    return h(
      Box,
      { flexDirection: 'column' },
      h(Text, null, 'Generating markdown...'),
      status ? h(Text, { dimColor: true }, status) : null
    );
  }

  if (step === 'done') {
    return h(
      Box,
      { flexDirection: 'column' },
      h(Text, { color: 'green' }, '✅ Done'),
      h(Text, null, `Saved to: ${path.join(rootPath, outputFileName)}`),
      h(
        Box,
        {
          marginTop: 1,
          paddingX: 1,
          borderStyle: 'round',
          borderColor: 'orange',
        },
        h(
          Text,
          { color: 'orange', bold: true },
          'WARNING: Review the generated Markdown for sensitive info (secrets, tokens, keys, PII) before sharing.'
        )
      )
    );
  }

  if (step === 'error') {
    return h(
      Box,
      { flexDirection: 'column' },
      h(Text, { color: 'red' }, 'Failed'),
      h(Text, null, String(error))
    );
  }

  return null;
}
