// One safe way to write CSV files for every export.
// - Missing values are empty, never the words "null" or "undefined".
// - Quotes inside a value are doubled, so a name like  Jo "JJ" Smith  cannot break the columns.
// - A value that starts with = or @ (or + or - followed by a letter) is prefixed so a spreadsheet never runs it as a formula.
const FORMULA_START = /^(?:[=@\t\r]|[+-](?![\d.]))/;

export function csvCell(value) {
  if (value === null || value === undefined) return '';
  let text = String(value);
  if (FORMULA_START.test(text)) text = "'" + text;
  return '"' + text.replace(/"/g, '""') + '"';
}

export function toCsv(headers, rows) {
  return [headers, ...rows].map(row => row.map(csvCell).join(',')).join('\r\n');
}

export function downloadCsv(filename, csv) {
  const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
