import { Skeleton, Table, TableBody, TableCell, TableHead, TableRow } from "@mui/material";

export default function TableSkeleton({ rows = 6, cols = 6 }) {
  return (
    <Table size="small">
      <TableHead>
        <TableRow>
          {Array.from({ length: cols }).map((_, idx) => (
            <TableCell key={idx}>
              <Skeleton width="65%" height={18} />
            </TableCell>
          ))}
        </TableRow>
      </TableHead>
      <TableBody>
        {Array.from({ length: rows }).map((_, rIdx) => (
          <TableRow key={rIdx}>
            {Array.from({ length: cols }).map((_, cIdx) => (
              <TableCell key={cIdx}>
                <Skeleton width={cIdx === 0 ? "55%" : "80%"} height={22} />
              </TableCell>
            ))}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
