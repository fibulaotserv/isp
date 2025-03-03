import { Pool } from 'pg';
import { DatabaseConfig } from '../types/database';

const config: DatabaseConfig = {
  user: process.env.DB_USER || 'postgres',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'ftth_management',
  password: process.env.DB_PASSWORD || 'sua_senha',
  port: parseInt(process.env.DB_PORT || '5432'),
};

const pool = new Pool(config);

// Teste de conexão
pool.on('connect', () => {
  console.log('Database connected successfully');
});

pool.on('error', (err) => {
  console.error('Unexpected error on idle client', err);
  process.exit(-1);
});

export default pool; 