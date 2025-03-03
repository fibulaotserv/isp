export interface Plan {
  id: string;
  name: string;
  download_speed: number;
  upload_speed: number;
  data_limit: number | null;
  price: number;
  active: boolean;
  created_at: string;
  updated_at: string;
}