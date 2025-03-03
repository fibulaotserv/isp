export interface DatabaseConfig {
  user: string;
  host: string;
  database: string;
  password: string;
  port: number;
}

export interface QueryResult<T> {
  rows: T[];
  rowCount: number;
} 