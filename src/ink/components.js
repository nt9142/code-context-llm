import React from 'react';
import { Box, Text, useStdout } from 'ink';
import fs from 'fs';
import path from 'path';
import {
  tryReadFileContent,
  estimateTokensFromText,
  formatSize,
} from '../utils/index.js';

const h = React.createElement;

export function SelectableList({
  items,
  selectedSet,
  cursorIndex,
  title,
  emptyText,
  reservedLines = 10,
}) {
  const { stdout } = useStdout();
  const rows = (stdout && stdout.rows) || 24;
  // Compute how many item rows we can show, accounting for title and up/down indicators
  const available = Math.max(0, rows - reservedLines);
  // Title renders as a line plus marginBottom: 1 -> effectively 2 rows
  const titleBlockLines = title ? 2 : 0;
  const availableAfterTitle = Math.max(0, available - titleBlockLines);

  const total = items.length;
  // First pass: assume both indicators could be shown so we don't overflow
  const maxVisibleCandidate = Math.max(1, availableAfterTitle - 2);
  const start1 = Math.max(
    0,
    Math.min(
      cursorIndex - Math.floor(maxVisibleCandidate / 2),
      Math.max(0, total - maxVisibleCandidate)
    )
  );
  const end1 = Math.min(total, start1 + maxVisibleCandidate);
  const hasMoreAbove1 = start1 > 0;
  const hasMoreBelow1 = end1 < total;

  const indicatorLines = (hasMoreAbove1 ? 1 : 0) + (hasMoreBelow1 ? 1 : 0);
  const maxVisible = Math.max(1, availableAfterTitle - indicatorLines);

  const start = Math.max(
    0,
    Math.min(
      cursorIndex - Math.floor(maxVisible / 2),
      Math.max(0, total - maxVisible)
    )
  );
  const end = Math.min(total, start + maxVisible);
  const hasMoreAbove = start > 0;
  const hasMoreBelow = end < total;

  return h(
    Box,
    { flexDirection: 'column' },
    title ? h(Box, { marginBottom: 1 }, h(Text, { bold: true }, title)) : null,
    items.length === 0
      ? h(Text, { dimColor: true }, emptyText || 'Nothing to show')
      : h(
          Box,
          { flexDirection: 'column' },
          hasMoreAbove ? h(Text, { dimColor: true }, '↑ more...') : null,
          ...items.slice(start, end).map((item, visibleIdx) => {
            const actualIdx = start + visibleIdx;
            const active = actualIdx === cursorIndex;
            const selected = selectedSet.has(actualIdx);
            const bullet = selected ? '[x]' : '[ ]';
            return h(
              Text,
              {
                key: item.relPath || item.name || actualIdx,
                color: active ? 'cyan' : undefined,
              },
              `${active ? '› ' : '  '}${bullet} ${item.name}`
            );
          }),
          hasMoreBelow ? h(Text, { dimColor: true }, '↓ more...') : null
        )
  );
}

export function TreeList({
  flatItems,
  cursorIndex,
  title,
  emptyText,
  reservedLines = 12,
  rootPath,
  showSizes = true,
}) {
  const { stdout } = useStdout();
  const rows = (stdout && stdout.rows) || 24;
  // Compute how many item rows we can show, accounting for title and up/down indicators
  const available = Math.max(0, rows - reservedLines);
  // Title renders as a line plus marginBottom: 1 -> effectively 2 rows
  const titleBlockLines = title ? 2 : 0;
  const availableAfterTitle = Math.max(0, available - titleBlockLines);

  const total = flatItems.length;
  // First pass: assume both indicators could be shown so we don't overflow
  const maxVisibleCandidate = Math.max(1, availableAfterTitle - 2);
  const start1 = Math.max(
    0,
    Math.min(
      cursorIndex - Math.floor(maxVisibleCandidate / 2),
      Math.max(0, total - maxVisibleCandidate)
    )
  );
  const end1 = Math.min(total, start1 + maxVisibleCandidate);
  const hasMoreAbove1 = start1 > 0;
  const hasMoreBelow1 = end1 < total;

  const indicatorLines = (hasMoreAbove1 ? 1 : 0) + (hasMoreBelow1 ? 1 : 0);
  const maxVisible = Math.max(1, availableAfterTitle - indicatorLines);

  const start = Math.max(
    0,
    Math.min(
      cursorIndex - Math.floor(maxVisible / 2),
      Math.max(0, total - maxVisible)
    )
  );
  const end = Math.min(total, start + maxVisible);
  const hasMoreAbove = start > 0;
  const hasMoreBelow = end < total;

  return h(
    Box,
    { flexDirection: 'column' },
    title ? h(Box, { marginBottom: 1 }, h(Text, { bold: true }, title)) : null,
    flatItems.length === 0
      ? h(Text, { dimColor: true }, emptyText || 'Nothing to show')
      : h(
          Box,
          { flexDirection: 'column' },
          hasMoreAbove ? h(Text, { dimColor: true }, '↑ more...') : null,
          ...flatItems.slice(start, end).map((item, visibleIdx) => {
            const idx = start + visibleIdx;
            const active = idx === cursorIndex;
            let checkbox = '[ ]';
            if (item.selection === 2) checkbox = '[x]';
            else if (item.selection === 1) checkbox = '[-]';
            const indent = '  '.repeat(item.depth);
            const glyph = item.isDir ? (item.expanded ? '▾' : '▸') : ' ';

            let sizeSuffix = '';
            if (showSizes && rootPath && !item.isDir) {
              try {
                const abs = path.join(rootPath, item.relPath);
                const bytes = fs.statSync(abs).size;
                const content = tryReadFileContent(abs);
                const tokens = content
                  ? estimateTokensFromText(content)
                  : Math.round(bytes / 4);
                sizeSuffix = ` (${formatSize(bytes)}, ~${tokens} tokens)`;
              } catch (_) {
                // ignore per-item size errors
              }
            }

            const line = `${active ? '› ' : '  '}${indent}${glyph} ${checkbox} ${item.name}${sizeSuffix}`;
            const props = active
              ? { color: 'cyan' }
              : item.isDot || item.ignored
                ? { dimColor: true }
                : {};
            return h(Text, { key: item.relPath, ...props }, line);
          }),
          hasMoreBelow ? h(Text, { dimColor: true }, '↓ more...') : null
        )
  );
}

export function Instructions({ lines }) {
  return h(
    Box,
    { flexDirection: 'column', marginTop: 1 },
    ...lines.map((l, i) => h(Text, { key: i, dimColor: true }, l))
  );
}
