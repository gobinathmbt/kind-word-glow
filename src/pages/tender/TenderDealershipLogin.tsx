import React, { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { tenderDealershipAuthService } from "@/services/tenderDealershipAuthService";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { toast } from "sonner";
import {
  ClipboardList,
  Eye,
  EyeOff,
  Loader2,
  User,
  Lock,
  Building2,
  Store,
} from "lucide-react";
import { useNavigate } from "react-router-dom";

const TenderDealershipLogin = () => {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [companyId, setCompanyId] = useState("");
  const [dealershipId, setDealershipId] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");

  const navigate = useNavigate();

  const loginMutation = useMutation({
    mutationFn: async () => {
      const response = await tenderDealershipAuthService.login({
        username,
        password,
        company_id: companyId,
        dealership_id: dealershipId,
      });
      return response.data;
    },
    onSuccess: (data) => {
      // Store token and user info in session storage
      sessionStorage.setItem("tender_dealership_token", data.data.token);
      sessionStorage.setItem("tender_dealership_user", JSON.stringify(data.data.user));
      sessionStorage.setItem("tender_dealership_info", JSON.stringify({
        dealership_name: data.data.dealership?.dealership_name || "Dealership",
        company_id: companyId,
        dealership_id: dealershipId,
      }));
      
      toast.success("Login successful");
      navigate("/tender-dealership/dashboard");
    },
    onError: (error: any) => {
      const errorMessage = error.response?.data?.message || "Login failed";
      setError(errorMessage);
      toast.error(errorMessage);
    },
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    // Validate all fields
    if (!username || !password || !companyId || !dealershipId) {
      setError("Please fill in all fields");
      toast.error("Please fill in all fields");
      return;
    }

    loginMutation.mutate();
  };

  const isLoading = loginMutation.isPending;

  return (
    <div className="h-screen overflow-hidden bg-gradient-to-br from-blue-50 via-white to-slate-50 flex">
      {/* Left Side - 70% */}
      <div className="hidden lg:flex lg:w-[70%] bg-gradient-to-br from-blue-600 via-blue-700 to-slate-900 p-8 xl:p-12 flex-col justify-between relative overflow-hidden">
        {/* Decorative Elements */}
        <div className="absolute top-20 right-20 w-64 h-64 bg-white/5 rounded-full blur-3xl"></div>
        <div className="absolute bottom-20 left-20 w-96 h-96 bg-blue-400/10 rounded-full blur-3xl"></div>
        
        <div className="relative z-10">
          <div className="flex items-center space-x-3 mb-8">
            <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center shadow-2xl">
              <ClipboardList className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">Dealership Portal</h1>
              <p className="text-blue-100 text-xs">Tender Management System</p>
            </div>
          </div>

          <div className="space-y-6 max-w-full">
            <div>
              <h2 className="text-4xl font-bold text-white mb-3 leading-tight">
                Streamline Your Tender Responses
              </h2>
              <p className="text-lg text-blue-100">
                Access and respond to vehicle tender requests efficiently
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="bg-white/10 backdrop-blur-sm p-4 rounded-xl border border-white/20 hover:bg-white/15 transition-all">
                <ClipboardList className="h-7 w-7 text-blue-300 mb-2" />
                <h3 className="text-white font-semibold text-base mb-1">View Tenders</h3>
                <p className="text-blue-100 text-xs">Access all incoming tender requests</p>
              </div>

              <div className="bg-white/10 backdrop-blur-sm p-4 rounded-xl border border-white/20 hover:bg-white/15 transition-all">
                <Store className="h-7 w-7 text-blue-300 mb-2" />
                <h3 className="text-white font-semibold text-base mb-1">Submit Quotes</h3>
                <p className="text-blue-100 text-xs">Provide competitive pricing quickly</p>
              </div>

              <div className="bg-white/10 backdrop-blur-sm p-4 rounded-xl border border-white/20 hover:bg-white/15 transition-all">
                <Building2 className="h-7 w-7 text-blue-300 mb-2" />
                <h3 className="text-white font-semibold text-base mb-1">Track Orders</h3>
                <p className="text-blue-100 text-xs">Monitor approved quotes and deliveries</p>
              </div>

              <div className="bg-white/10 backdrop-blur-sm p-4 rounded-xl border border-white/20 hover:bg-white/15 transition-all">
                <User className="h-7 w-7 text-blue-300 mb-2" />
                <h3 className="text-white font-semibold text-base mb-1">Team Management</h3>
                <p className="text-blue-100 text-xs">Manage your dealership users</p>
              </div>
            </div>
          </div>
        </div>

        <div className="relative z-10 text-blue-100 text-xs">
          © {new Date().getFullYear()} Dealership Portal. All rights reserved.
        </div>
      </div>

      {/* Right Side - 30% */}
      <div className="w-full lg:w-[30%] overflow-y-auto bg-gradient-to-br from-blue-50 via-white to-slate-50 lg:bg-white">
        <div className="min-h-full flex items-center justify-center p-6 lg:p-8">
          <div className="w-full max-w-md py-4 bg-white lg:bg-transparent rounded-2xl lg:rounded-none shadow-xl lg:shadow-none p-6 lg:p-0 border lg:border-0 border-slate-200">
            {/* Mobile Logo */}
            <div className="lg:hidden flex items-center justify-center space-x-2 mb-8">
              <div className="w-12 h-12 bg-blue-600 rounded-xl flex items-center justify-center">
                <ClipboardList className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-slate-900">Dealership Portal</h1>
              </div>
            </div>

            <div className="mb-6">
              <h2 className="text-2xl font-bold text-slate-900 mb-1">Welcome Back</h2>
              <p className="text-slate-600 text-sm">
                Sign in to your dealership account
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <Alert variant="destructive" className="py-2">
                  <AlertDescription className="text-sm">{error}</AlertDescription>
                </Alert>
              )}

              <div className="space-y-2">
                <Label htmlFor="username" className="text-slate-700 text-sm">Username</Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <Input
                    id="username"
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="Enter your username"
                    className="pl-10 h-11 border-slate-200 focus:border-blue-500 focus:ring-blue-500"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="password" className="text-slate-700 text-sm">Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter your password"
                    className="pl-10 pr-10 h-11 border-slate-200 focus:border-blue-500 focus:ring-blue-500"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                <p className="text-xs text-slate-500">Default password: Welcome@123</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="companyId" className="text-slate-700 text-sm">Company ID</Label>
                <div className="relative">
                  <Building2 className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <Input
                    id="companyId"
                    type="text"
                    value={companyId}
                    onChange={(e) => setCompanyId(e.target.value)}
                    placeholder="Enter company ID"
                    className="pl-10 h-11 border-slate-200 focus:border-blue-500 focus:ring-blue-500"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="dealershipId" className="text-slate-700 text-sm">Dealership ID</Label>
                <div className="relative">
                  <Store className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <Input
                    id="dealershipId"
                    type="text"
                    value={dealershipId}
                    onChange={(e) => setDealershipId(e.target.value)}
                    placeholder="Enter dealership ID"
                    className="pl-10 h-11 border-slate-200 focus:border-blue-500 focus:ring-blue-500"
                    required
                  />
                </div>
              </div>

              <Button
                type="submit"
                disabled={isLoading}
                className="w-full h-11 bg-blue-600 hover:bg-blue-700 text-white font-medium"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Signing in...
                  </>
                ) : (
                  "Sign In"
                )}
              </Button>
            </form>

            <div className="mt-6 text-center text-sm text-slate-600">
              Need help? Contact your administrator
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TenderDealershipLogin;
