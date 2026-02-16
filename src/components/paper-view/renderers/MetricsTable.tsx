import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '@/components/ui/table';

interface MetricRow {
  metric?: string;
  value?: string;
  comparison?: string;
  [key: string]: unknown;
}

export function MetricsTable({ rows }: { rows: MetricRow[] }) {
  if (!rows || rows.length === 0) return null;

  // Detect columns from the first row
  const columns = Object.keys(rows[0]).filter(
    (k) => typeof rows[0][k] === 'string' || typeof rows[0][k] === 'number',
  );

  const humanize = (key: string) =>
    key.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());

  return (
    <Table>
      <TableHeader>
        <TableRow>
          {columns.map((col) => (
            <TableHead key={col} className="text-xs font-semibold">
              {humanize(col)}
            </TableHead>
          ))}
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((row, i) => (
          <TableRow key={i} className={i % 2 === 1 ? 'bg-muted/30' : ''}>
            {columns.map((col, ci) => (
              <TableCell key={col} className={ci === 1 ? 'font-semibold text-sm' : 'text-sm'}>
                {String(row[col] ?? '')}
              </TableCell>
            ))}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
