import { View, Text } from '@react-pdf/renderer';
import { createElement } from 'react';
import { styles } from '../styles';

export function createTable(
  headers: string[],
  rows: string[][],
  options?: { rightAlignFrom?: number }
) {
  const rightFrom = options?.rightAlignFrom ?? 1;

  const headerRow = createElement(View, { style: styles.tableHeader },
    ...headers.map((h, i) =>
      createElement(Text, {
        style: i >= rightFrom ? styles.tableCellHeaderRight : styles.tableCellHeader,
        key: `h-${i}`,
      }, h)
    ),
  );

  const dataRows = rows.map((row, rowIdx) =>
    createElement(View, {
      style: rowIdx % 2 === 1 ? styles.tableRowAlt : styles.tableRow,
      key: `r-${rowIdx}`,
    },
      ...row.map((cell, cellIdx) =>
        createElement(Text, {
          style: cellIdx >= rightFrom ? styles.tableCellRight : styles.tableCell,
          key: `c-${cellIdx}`,
        }, cell)
      ),
    )
  );

  return createElement(View, { style: styles.table }, headerRow, ...dataRows);
}

export function createKeyValueTable(rows: Array<[string, string]>) {
  return createElement(View, { style: { marginTop: 6, marginBottom: 6 } },
    ...rows.map(([label, value], i) =>
      createElement(View, { style: styles.kvRow, key: `kv-${i}` },
        createElement(Text, { style: styles.kvLabel }, label),
        createElement(Text, { style: styles.kvValue }, value),
      )
    ),
  );
}
