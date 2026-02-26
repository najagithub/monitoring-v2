export type UserRole = 'admin' | 'client';
export interface ApiResponse<T> {
  success: boolean;
  message?: string;
  data: T;
}


export interface User {
  id: number;
  name: string;
  username: string;
  email: string;
  phone?: string;
  role: UserRole;
  is_active: boolean;
  network_choice: number;
  profile_image?: string;
  profile_image_url?: string;
  created_at: string;
  updated_at: string;
}

export interface Provider {
  id: number;
  name: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  user_providers?: UserProvider[];
}

export interface UserProvider {
  id: number;
  user_id: number;
  provider_id: number;
  router_ip: string;
  oid_byte_in: string;
  oid_byte_out: string;
  monthly_limit: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  provider?: Provider;
}

export interface ConsumptionHistory {
  id: number;
  user_id: number;
  provider_id: number;
  bytes_in: number;
  bytes_out: number;
  total_bytes: number;
  date: string;
  created_at: string;
  updated_at: string;
  provider?: Provider;
}

export interface MonthlyConsumption {
  user_id: number;
  provider_id: number;
  total_consumption: number;
  monthly_limit: number;
  percentage_used: number;
  is_exceeded: boolean;
  month: string;
  provider?: Provider;
}

export interface AuthContextType {
  user: User | null;
  isAuthLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  updateProfile: (data: UpdateMyProfilePayload) => Promise<void>;
  updatePassword: (currentPassword: string, newPassword: string) => Promise<void>;

  updateUser: (patch: Partial<User>) => void;

}

export interface UpdateMyProfilePayload {
  name?: string;
  username?: string;
  email?: string;
  phone?: string;
  profile_image?: File | null; // upload
}

export type MonthlyConsumptionResponse = {
  user_id: string;
  provider_id: string;
  month: string; // "2026-02"
  total_consumption: string; // "89958348219"
};

export type DailyConsumptionItem = {
  id: number;
  user_id: number;
  provider_id: number;
  bytes_in: number;
  bytes_out: number;
  total_bytes: number;
  date: string;
  created_at: string;
  updated_at: string;
};
export type ClientUser = {
  id: number;
  name: string;
  email: string;
  created_at: string;
  profile_image_url?: string | null;
};

export type UserProviderSummary = {
  router_ip: string;
  // ✅ Champs attendus (nouveau)
  oid_byte_in?: string;
  oid_byte_out?: string;
  // ⚠️ Compat si backend renvoie encore oid_in/out
  oid_in?: string;
  oid_out?: string;
  is_active: boolean;
};

export type UserSummaryRow = {
  id: number;
  profile_image_url: string;
  name: string;
  email: string;
  username: string;
  total_consumption_month: number;
  total_consumption_month_mb: number;
  monthly_limit_mb: number;
  is_active: boolean;
  user_provider: UserProviderSummary | null;
};


export type ProviderRow = {
  provider_id: number | '';
  oid_byte_in: string;
  oid_byte_out: string;
  monthly_limit: string; // MB
};