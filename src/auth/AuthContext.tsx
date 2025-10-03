import React, { createContext, useContext, useState, useEffect } from "react";
import axios from "axios";
import { BASE_URL } from '@/lib/config';

interface S3Config {
  bucket: string;
  access_key: string;
  secret_key: string;
  region: string;
  url: string;
}

interface Company {
  _id: string;
  company_name: string;
  contact_person: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  state: string;
  country: string;
  plan_id: string;
  subscription_status: string;
  user_limit: number;
  current_user_count: number;
  is_active: boolean;
  subscription_start_date: string;
  created_at: string;
  updated_at: string;
  subscription_end_date: string;
  module_access: string[];
  grace_period_end: string;
  number_of_days: number;
  number_of_users: number;
  s3_config: S3Config;
}

interface Dealership {
  _id: string;
  dealership_name: string;
  dealership_address: string;
  dealership_email: string;
  company_id: string;
  is_active: boolean;
  created_by: string;
  created_at: string;
  updated_at: string;
  dealership_id: string;
  __v: number;
}

export interface CompleteUser {
  id: string;
  email: string;
  role: "master_admin" | "company_super_admin" | "company_admin";
  type?: string;
  company_id: Company;
  dealership_ids: Dealership[];
  is_first_login?: boolean;
  is_primary_admin?: boolean;
  subscription_modal_required?: boolean;
  subscription_modal_force?: boolean;
  subscription_status?: string;
  subscription_days_remaining?: number;
  username?: string;
  company_name?: string;
}


interface User {
  id: string;
  email: string;
  role: "master_admin" | "company_super_admin" | "company_admin";
  company_id?: string;
  is_first_login?: boolean;
  username?: string;
  company_name?: string;
  first_name?: string;
  last_name?: string;
  subscription_modal_required?: boolean;
  subscription_modal_force?: boolean;
  subscription_status?: string;
  subscription_days_remaining?: number;
}

interface AuthContextType {
  user: User | null;
  completeUser: CompleteUser | null;
  token: string | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};

// Set default axios base URL
axios.defaults.baseURL = BASE_URL;

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [user, setUser] = useState<User | null>(null);
const [completeUser, setCompleteUser] = useState<CompleteUser | null>(null);
  const [token, setToken] = useState<string | null>(
    sessionStorage.getItem("token")
  );
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (token) {
      axios.defaults.headers.common["Authorization"] = `Bearer ${token}`;
      // Verify token and get user info
      fetchUserInfo();
    } else {
      setIsLoading(false);
    }
  }, [token]);

  const fetchUserInfo = async () => {
    try {
      const response = await axios.get("/api/auth/me");
      const userData = response.data.user;
      setUser(userData);
      setCompleteUser(userData);
      sessionStorage.setItem(
        "user",
        JSON.stringify(
          (({ company_id, dealership_ids, ...rest }) => rest)(userData)
        )
      );
    } catch (error) {
      console.error("Failed to fetch user info:", error);
      logout();
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (email: string, password: string) => {
    try {
      const response = await axios.post("/api/auth/login", { email, password });
      const { token: newToken, user: userData } = response.data;
      setToken(newToken);
      setUser(userData);
      setCompleteUser(userData);
      sessionStorage.setItem("token", newToken);
      sessionStorage.setItem("user", JSON.stringify(userData));
      axios.defaults.headers.common["Authorization"] = `Bearer ${newToken}`;
    } catch (error) {
      console.error("Login error:", error);
      throw error;
    }
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    sessionStorage.removeItem("token");
    sessionStorage.removeItem("user");
    delete axios.defaults.headers.common["Authorization"];
  };

  return (
    <AuthContext.Provider
      value={{ user, token, login, logout, isLoading, completeUser }}
    >
      {children}
    </AuthContext.Provider>
  );
};
