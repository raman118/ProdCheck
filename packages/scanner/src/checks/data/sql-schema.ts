import type { RepoSnapshot } from "../../snapshot/types";

export interface TableSchema {
  readonly path: string;
  readonly line: number;
  readonly columns: ReadonlySet<string>;
  readonly indexedColumns: ReadonlySet<string>;
}

interface MutableTableSchema {
  path: string;
  line: number;
  columns: Set<string>;
  indexedColumns: Set<string>;
}

function normalizeTable(name: string): string {
  const parts = name.replaceAll('"', "").split(".");
  return parts.length === 1
    ? `public.${parts[0]?.toLowerCase()}`
    : `${parts.at(-2)?.toLowerCase()}.${parts.at(-1)?.toLowerCase()}`;
}

export function migrationFiles(
  snapshot: RepoSnapshot,
): Array<[string, string]> {
  return [...snapshot.files.entries()].filter(
    ([path]) =>
      path.toLowerCase().endsWith(".sql") &&
      /(?:^|\/)supabase\/migrations\//i.test(path),
  );
}

export function parseTableSchemas(
  snapshot: RepoSnapshot,
): Map<string, TableSchema> {
  const tables = new Map<string, MutableTableSchema>();
  const files = migrationFiles(snapshot);
  for (const [path, content] of files) {
    const createTable =
      /create\s+table\s+(?:if\s+not\s+exists\s+)?((?:[\w"]+\.)?[\w"]+)\s*\(([\s\S]*?)\)\s*;/gi;
    for (const match of content.matchAll(createTable)) {
      const tableName = match[1];
      const definition = match[2] ?? "";
      if (!tableName) continue;
      const name = normalizeTable(tableName);
      const offset = match.index ?? 0;
      const line = content.slice(0, offset).split("\n").length;
      const table: MutableTableSchema = {
        path,
        line,
        columns: new Set(),
        indexedColumns: new Set(),
      };
      for (const definitionLine of definition.split(/,\s*(?![^()]*\))/)) {
        const column = definitionLine.trim().match(/^([\w"]+)\s+[\w(]/);
        if (
          !column?.[1] ||
          /^(?:constraint|primary|unique|foreign|check)$/i.test(
            column[1].replaceAll('"', ""),
          )
        )
          continue;
        const columnName = column[1].replaceAll('"', "").toLowerCase();
        table.columns.add(columnName);
        if (/\bprimary\s+key\b|\bunique\b/i.test(definitionLine))
          table.indexedColumns.add(columnName);
      }
      tables.set(name, table);
    }
  }

  for (const [, content] of files) {
    const indexPattern =
      /create\s+(?:unique\s+)?index\b[^;]*?\bon\s+((?:[\w"]+\.)?[\w"]+)\s*(?:using\s+\w+\s*)?\(([^)]+)\)/gi;
    for (const match of content.matchAll(indexPattern)) {
      const tableName = match[1];
      const columns = match[2];
      if (!tableName || !columns) continue;
      const table = tables.get(normalizeTable(tableName));
      if (!table) continue;
      for (const column of columns.split(",")) {
        const name = column
          .trim()
          .replaceAll('"', "")
          .split(/\s+/)[0]
          ?.toLowerCase();
        if (name && table.columns.has(name)) table.indexedColumns.add(name);
      }
    }
  }
  return new Map([...tables].map(([name, table]) => [name, table]));
}

export function findTableSchema(
  tables: ReadonlyMap<string, TableSchema>,
  name: string,
): TableSchema | undefined {
  return tables.get(
    name.includes(".") ? name.toLowerCase() : `public.${name.toLowerCase()}`,
  );
}
