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
  is_new_registration?: boolean;
  subscription_status?: string;
  subscription_days_remaining?: number;
  username?: string;
  company_name?: string;
  permissions?: string[];
  hasFullAccess?: boolean;
}


interface User {
  id: string;
  email: string;
  role: "master_admin" | "company_super_admin" | "company_admin";
  company_id?: any;
  is_first_login?: boolean;
  username?: string;
  company_name?: string;
  first_name?: string;
  last_name?: string;
  subscription_modal_required?: boolean;
  subscription_modal_force?: boolean;
  is_new_registration?: boolean;
  subscription_status?: string;
  subscription_days_remaining?: number;
}

interface AuthContextType {
  user: User | null;
  completeUser: CompleteUser | null;
  token: string | null;
  login: (email: string, password: string) => Promise<void>;
  supplierLogin: (email: string, password: string, companyId: string) => Promise<void>;
  tenderDealershipLogin: (email: string, password: string, companyId: string, dealershipId: string) => Promise<void>;
  logout: () => void;
  isLoading: boolean;
  updateUserPermissions: (permissions: string[], hasFullAccess: boolean) => void;
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
    sessionStorage.getItem("token") || 
    sessionStorage.getItem("supplier_token") || 
    sessionStorage.getItem("tender_dealership_token")
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
      // Check which type of token we have
      const supplierToken = sessionStorage.getItem("supplier_token");
      const tenderToken = sessionStorage.getItem("tender_dealership_token");
      
      if (supplierToken) {
        // For supplier, get user info from session storage
        const supplierUser = sessionStorage.getItem("supplier_user");
        if (supplierUser) {
          const userData = JSON.parse(supplierUser);
          const completeUserData = {
            id: userData.id,
            email: userData.email,
            role: userData.role || "supplier",
            type: "supplier",
            company_id: userData.company_id,
            dealership_ids: [],
            username: userData.name,
            company_name: userData.company_name,
          } as CompleteUser;
          
          setUser(userData);
          setCompleteUser(completeUserData);
        }
      } else if (tenderToken) {
        // For tender dealership, get user info from session storage
        const tenderUser = sessionStorage.getItem("tender_dealership_user");
        if (tenderUser) {
          const userData = JSON.parse(tenderUser);
          const completeUserData = {
            id: userData.id,
            email: userData.email,
            role: userData.role,
            type: "dealership_user",
            company_id: userData.company_id,
            dealership_ids: [],
            username: userData.username,
            company_name: userData.company_name,
          } as CompleteUser;
          
          setUser(userData);
          setCompleteUser(completeUserData);
        }
      } else {
        // Regular company user
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
      }
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

  const supplierLogin = async (email: string, password: string, companyId: string) => {
    try {
      const response = await axios.post("/api/supplier-auth/login", { 
        email, 
        password, 
        company_id: companyId 
      });
      const { token: newToken, supplier } = response.data.data;
      
      setToken(newToken);
      
      const completeUserData = {
        id: supplier.id,
        email: supplier.email,
        role: supplier.role || "supplier",
        type: "supplier",
        company_id: supplier.company_id,
        dealership_ids: [],
        username: supplier.name,
        company_name: supplier.company_name,
      } as CompleteUser;
      
      setUser(supplier);
      setCompleteUser(completeUserData);
      
      sessionStorage.setItem("supplier_token", newToken);
      sessionStorage.setItem("supplier_user", JSON.stringify(supplier));
      axios.defaults.headers.common["Authorization"] = `Bearer ${newToken}`;
    } catch (error) {
      console.error("Supplier login error:", error);
      throw error;
    }
  };

  const tenderDealershipLogin = async (
    email: string, 
    password: string, 
    companyId: string, 
    dealershipId: string
  ) => {
    try {
      const response = await axios.post("/api/tender-dealership-auth/login", {
        email,
        password,
        company_id: companyId,
        dealership_id: dealershipId,
      });
      const { token: newToken, user: userData } = response.data;
      
      setToken(newToken);
      
      const completeUserData = {
        id: userData.id,
        email: userData.email,
        role: userData.role,
        type: "dealership_user",
        company_id: userData.company_id,
        dealership_ids: [],
        username: userData.username,
        company_name: userData.company_name,
      } as CompleteUser;
      
      setUser(userData);
      setCompleteUser(completeUserData);
      
      sessionStorage.setItem("tender_dealership_token", newToken);
      sessionStorage.setItem("tender_dealership_user", JSON.stringify(userData));
      sessionStorage.setItem("tender_dealership_info", JSON.stringify({
        dealership_name: userData.dealership_name || "Dealership",
        company_id: companyId,
        dealership_id: dealershipId,
      }));
      axios.defaults.headers.common["Authorization"] = `Bearer ${newToken}`;
    } catch (error) {
      console.error("Tender dealership login error:", error);
      throw error;
    }
  };

  const logout = () => {
    setUser(null);
    setCompleteUser(null);
    setToken(null);
    sessionStorage.removeItem("token");
    sessionStorage.removeItem("user");
    sessionStorage.removeItem("supplier_token");
    sessionStorage.removeItem("supplier_user");
    sessionStorage.removeItem("tender_dealership_token");
    sessionStorage.removeItem("tender_dealership_user");
    sessionStorage.removeItem("tender_dealership_info");
    delete axios.defaults.headers.common["Authorization"];
  };

  const updateUserPermissions = (permissions: string[], hasFullAccess: boolean) => {
    setCompleteUser((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        permissions,
        hasFullAccess,
      };
    });
  };

  return (
    <AuthContext.Provider
      value={{ 
        user, 
        token, 
        login, 
        supplierLogin,
        tenderDealershipLogin,
        logout, 
        isLoading, 
        completeUser, 
        updateUserPermissions 
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
