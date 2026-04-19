export interface User {
  id: string;
  phone: string;
  name: string | null;
  whatsapp_number: string | null;
  vehicles: Vehicle[];
  created_at: string;
}

export interface Vehicle {
  number: string;
  type: '2w' | '4w';
  label?: string;
}

export interface AuthToken {
  access_token: string;
  token_type: string;
  user: User;
}
