import React from 'react';
import { Box, Text } from 'ink';

const h = React.createElement;

export function SelectableList({
  items,
  selectedSet,
  cursorIndex,
  title,
  emptyText,
}) {
  return h(
    Box,
    { flexDirection: 'column' },
    title ? h(Box, { marginBottom: 1 }, h(Text, { bold: true }, title)) : null,
    items.length === 0
      ? h(Text, { dimColor: true }, emptyText || 'Nothing to show')
      : items.map((item, idx) => {
          const active = idx === cursorIndex;
          const selected = selectedSet.has(idx);
          const bullet = selected ? '[x]' : '[ ]';
          return h(
            Text,
            {
              key: item.relPath || item.name || idx,
              color: active ? 'cyan' : undefined,
            },
            `${active ? '› ' : '  '}${bullet} ${item.name}`
          );
        })
  );
}

export function TreeList({ flatItems, cursorIndex, title, emptyText }) {
  return h(
    Box,
    { flexDirection: 'column' },
    title ? h(Box, { marginBottom: 1 }, h(Text, { bold: true }, title)) : null,
    flatItems.length === 0
      ? h(Text, { dimColor: true }, emptyText || 'Nothing to show')
      : flatItems.map((item, idx) => {
          const active = idx === cursorIndex;
          let checkbox = '[ ]';
          if (item.selection === 2) checkbox = '[x]';
          else if (item.selection === 1) checkbox = '[-]';
          const indent = '  '.repeat(item.depth);
          const glyph = item.isDir ? (item.expanded ? '▾' : '▸') : ' ';
          // Files intentionally have no triangle glyph
          const line = `${active ? '› ' : '  '}${indent}${glyph} ${checkbox} ${item.name}`;
          const props = active
            ? { color: 'cyan' }
            : item.isDot || item.ignored
              ? { dimColor: true }
              : {};
          return h(Text, { key: item.relPath, ...props }, line);
        })
  );
}

export function Instructions({ lines }) {
  return h(
    Box,
    { flexDirection: 'column', marginTop: 1 },
    ...lines.map((l, i) => h(Text, { key: i, dimColor: true }, l))
  );
}
