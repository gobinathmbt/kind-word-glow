import React, { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { supplierAuthServices } from "@/api/services";
import { useAuth } from "@/auth/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { toast } from "sonner";
import {
  Car,
  Eye,
  EyeOff,
  Loader2,
  Mail,
  Lock,
  Building2,
  Truck,
  CheckCircle2,
  Sparkles,
  Shield,
  Zap,
  Phone,
  MapPin,
  User,
} from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";
import SubscriptionModal from "@/components/subscription/SubscriptionModal";
import axios from "axios";
import { BASE_URL } from "@/lib/config";

type LoginMode = "company" | "supplier";
type ViewMode = "login" | "register";

interface RegisterFormData {
  company_name: string;
  contact_person: string;
  email: string;
  phone: string;
  address: string;
  password: string;
  confirm_password: string;
}

const Login = () => {
  const redirect = sessionStorage.getItem("redirect_after_refresh");
  if (redirect) {
    sessionStorage.removeItem("redirect_after_refresh");
    window.location.href = redirect;
  }

  const [mode, setMode] = useState<LoginMode>("company");
  const [viewMode, setViewMode] = useState<ViewMode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [showSubscriptionModal, setShowSubscriptionModal] = useState(false);
  const [forceSubscription, setForceSubscription] = useState(false);

  const [registerData, setRegisterData] = useState<RegisterFormData>({
    company_name: "",
    contact_person: "",
    email: "",
    phone: "",
    address: "",
    password: "",
    confirm_password: "",
  });
  const [showRegisterPassword, setShowRegisterPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isRegistering, setIsRegistering] = useState(false);

  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const from = location.state?.from?.pathname || null;

  const companyLoginMutation = useMutation({
    mutationFn: async () => {
      await login(email, password);
    },
    onSuccess: () => {
      const userData = JSON.parse(sessionStorage.getItem("user") || "{}");

      if (userData.subscription_modal_force) {
        setForceSubscription(true);
        setShowSubscriptionModal(true);
        if (!userData.is_new_registration) {
          toast.success("Login successful");
        }
        return;
      }

      toast.success("Login successful");
      handleNavigationAfterLogin(userData);
    },
    onError: (err: any) => {
      console.error("Login error:", err);
      setError(err.response?.data?.message || "Login failed");
      toast.error("Login failed");
    },
  });

  const supplierLoginMutation = useMutation({
    mutationFn: async () => {
      const response = await supplierAuthServices.login(email, password);
      return response.data;
    },
    onSuccess: (data) => {
      sessionStorage.setItem("supplier_token", data.data.token);
      sessionStorage.setItem("supplier_user", JSON.stringify(data.data.supplier));
      toast.success("Login successful");
      navigate("/supplier/dashboard");
    },
    onError: (error: any) => {
      setError(error.response?.data?.message || "Login failed");
      toast.error(error.response?.data?.message || "Login failed");
    },
  });

  const handleNavigationAfterLogin = (userData: any) => {
    if (from) {
      navigate(from);
    } else {
      switch (userData.role) {
        case "master_admin":
          navigate("/master/dashboard");
          break;
        case "company_super_admin":
        case "company_admin":
          navigate("/company/dashboard");
          break;
        default:
          navigate("/");
      }
    }
  };

  const handleSubscriptionComplete = async () => {
    setShowSubscriptionModal(false);
    try {
      await login(email, password);
      const userData = JSON.parse(sessionStorage.getItem("user") || "{}");
      let dashboardRoute = "/company/dashboard";
      if (userData.role === "master_admin") {
        dashboardRoute = "/master/dashboard";
      }
      sessionStorage.setItem("redirect_after_refresh", dashboardRoute);
      window.location.reload();
    } catch (error) {
      console.error("Post-payment login error =>", error);
      toast.error("Something went wrong. Please login again.");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!email || !password) {
      setError("Please enter both email and password");
      toast.error("Please enter both email and password");
      return;
    }

    if (mode === "company") {
      companyLoginMutation.mutate();
    } else {
      supplierLoginMutation.mutate();
    }
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (registerData.password !== registerData.confirm_password) {
      setError("Passwords do not match");
      toast.error("Passwords do not match");
      return;
    }

    if (registerData.password.length < 6) {
      setError("Password must be at least 6 characters long");
      toast.error("Password must be at least 6 characters long");
      return;
    }

    setIsRegistering(true);

    try {
      const response = await axios.post(`${BASE_URL}/api/auth/register-company`, {
        company_name: registerData.company_name,
        contact_person: registerData.contact_person,
        email: registerData.email,
        phone: registerData.phone,
        address: registerData.address,
        city: "N/A",
        state: "N/A",
        country: "N/A",
        pincode: "000000",
        timezone: "UTC",
        currency: "USD",
        password: registerData.password,
      });

      if (response.data.success) {
        toast.success("Company registered successfully! Please login.");
        setViewMode("login");
        setEmail(registerData.email);
        setPassword(registerData.password);
      }
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || "Registration failed";
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setIsRegistering(false);
    }
  };

  const isLoading = companyLoginMutation.isPending || supplierLoginMutation.isPending;

  return (
    <>
      <div className="h-screen overflow-hidden bg-gradient-to-br from-emerald-50 via-white to-slate-50 flex">
        {/* Left Side - 70% */}
        <div className="hidden lg:flex lg:w-[70%] bg-gradient-to-br from-emerald-600 via-emerald-700 to-slate-900 p-8 xl:p-12 flex-col justify-between relative overflow-hidden">
          {/* Decorative Elements */}
          <div className="absolute top-20 right-20 w-64 h-64 bg-white/5 rounded-full blur-3xl"></div>
          <div className="absolute bottom-20 left-20 w-96 h-96 bg-emerald-400/10 rounded-full blur-3xl"></div>
          
          <div className="relative z-10">
            <div className="flex items-center space-x-3 mb-8">
              <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center shadow-2xl">
                <Car className="h-6 w-6 text-emerald-600" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-white">Auto ERP</h1>
                <p className="text-emerald-100 text-xs">Vehicle Management System</p>
              </div>
            </div>

            <div className="space-y-6 max-w-full">
              <div>
                <h2 className="text-4xl font-bold text-white mb-3 leading-tight">
                  Complete Vehicle Management Solution
                </h2>
                <p className="text-lg text-emerald-100">
                  Streamline your automotive business with our comprehensive platform
                </p>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="bg-white/10 backdrop-blur-sm p-4 rounded-xl border border-white/20 hover:bg-white/15 transition-all">
                  <Sparkles className="h-7 w-7 text-emerald-300 mb-2" />
                  <h3 className="text-white font-semibold text-base mb-1">Custom Modules</h3>
                  <p className="text-emerald-100 text-xs">Flexible configurations for your business</p>
                </div>

                <div className="bg-white/10 backdrop-blur-sm p-4 rounded-xl border border-white/20 hover:bg-white/15 transition-all">
                  <Shield className="h-7 w-7 text-emerald-300 mb-2" />
                  <h3 className="text-white font-semibold text-base mb-1">Secure & Reliable</h3>
                  <p className="text-emerald-100 text-xs">Enterprise-grade security & encryption</p>
                </div>

                <div className="bg-white/10 backdrop-blur-sm p-4 rounded-xl border border-white/20 hover:bg-white/15 transition-all">
                  <Zap className="h-7 w-7 text-emerald-300 mb-2" />
                  <h3 className="text-white font-semibold text-base mb-1">Real-time Updates</h3>
                  <p className="text-emerald-100 text-xs">Instant notifications & live tracking</p>
                </div>

                <div className="bg-white/10 backdrop-blur-sm p-4 rounded-xl border border-white/20 hover:bg-white/15 transition-all">
                  <CheckCircle2 className="h-7 w-7 text-emerald-300 mb-2" />
                  <h3 className="text-white font-semibold text-base mb-1">Easy Integration</h3>
                  <p className="text-emerald-100 text-xs">Connect with Trade Me & more</p>
                </div>

                <div className="bg-white/10 backdrop-blur-sm p-4 rounded-xl border border-white/20 hover:bg-white/15 transition-all">
                  <Car className="h-7 w-7 text-emerald-300 mb-2" />
                  <h3 className="text-white font-semibold text-base mb-1">Fleet Management</h3>
                  <p className="text-emerald-100 text-xs">Track inventory & vehicle lifecycle</p>
                </div>

                <div className="bg-white/10 backdrop-blur-sm p-4 rounded-xl border border-white/20 hover:bg-white/15 transition-all">
                  <Truck className="h-7 w-7 text-emerald-300 mb-2" />
                  <h3 className="text-white font-semibold text-base mb-1">Workshop Tools</h3>
                  <p className="text-emerald-100 text-xs">Service scheduling & supplier quotes</p>
                </div>
              </div>

              {/* Additional Features - Compact */}
              <div className="space-y-2.5">
                <div className="flex items-center space-x-2.5">
                  <div className="w-5 h-5 rounded-full bg-emerald-400 flex items-center justify-center flex-shrink-0">
                    <CheckCircle2 className="h-3 w-3 text-slate-900" />
                  </div>
                  <p className="text-white text-sm font-medium">Vehicle Inspection & Trade-in Management</p>
                </div>

                <div className="flex items-center space-x-2.5">
                  <div className="w-5 h-5 rounded-full bg-emerald-400 flex items-center justify-center flex-shrink-0">
                    <CheckCircle2 className="h-3 w-3 text-slate-900" />
                  </div>
                  <p className="text-white text-sm font-medium">Workshop & Service Bay Scheduling</p>
                </div>

                <div className="flex items-center space-x-2.5">
                  <div className="w-5 h-5 rounded-full bg-emerald-400 flex items-center justify-center flex-shrink-0">
                    <CheckCircle2 className="h-3 w-3 text-slate-900" />
                  </div>
                  <p className="text-white text-sm font-medium">Multi-Dealership Support & Centralized Control</p>
                </div>

                <div className="flex items-center space-x-2.5">
                  <div className="w-5 h-5 rounded-full bg-emerald-400 flex items-center justify-center flex-shrink-0">
                    <CheckCircle2 className="h-3 w-3 text-slate-900" />
                  </div>
                  <p className="text-white text-sm font-medium">Advanced Analytics & Reporting Dashboards</p>
                </div>
              </div>
            </div>
          </div>

          <div className="relative z-10 text-emerald-100 text-xs">
            © {new Date().getFullYear()} Auto ERP. All rights reserved.
          </div>
        </div>

        {/* Right Side - 30% */}
        <div className="w-full lg:w-[30%] overflow-y-auto bg-gradient-to-br from-emerald-50 via-white to-slate-50 lg:bg-white">
          <div className="min-h-full flex items-center justify-center p-6 lg:p-8">
            <div className="w-full max-w-md py-4 bg-white lg:bg-transparent rounded-2xl lg:rounded-none shadow-xl lg:shadow-none p-6 lg:p-0 border lg:border-0 border-slate-200">
            {/* Mobile Logo */}
            <div className="lg:hidden flex items-center justify-center space-x-2 mb-8">
              <div className="w-12 h-12 bg-emerald-600 rounded-xl flex items-center justify-center">
                <Car className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-slate-900">Auto ERP</h1>
              </div>
            </div>

            {/* Login/Register Toggle */}
            <div className="flex rounded-xl bg-slate-100 p-1 mb-6">
              <button
                type="button"
                onClick={() => setViewMode("login")}
                className={`flex-1 px-4 py-2.5 rounded-lg transition-all duration-300 font-medium text-sm ${
                  viewMode === "login"
                    ? "bg-white text-slate-900 shadow-sm"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                Login
              </button>
              <button
                type="button"
                onClick={() => setViewMode("register")}
                className={`flex-1 px-4 py-2.5 rounded-lg transition-all duration-300 font-medium text-sm ${
                  viewMode === "register"
                    ? "bg-white text-slate-900 shadow-sm"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                Register
              </button>
            </div>

            {viewMode === "login" ? (
              <>
                {/* Mode Toggle */}
                <div className="flex rounded-xl bg-slate-100 p-1 mb-6">
                  <button
                    type="button"
                    onClick={() => setMode("company")}
                    className={`flex-1 flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg transition-all duration-300 font-medium text-sm ${
                      mode === "company"
                        ? "bg-emerald-600 text-white shadow-sm"
                        : "text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    <Building2 className="h-4 w-4" />
                    Company
                  </button>
                  <button
                    type="button"
                    onClick={() => setMode("supplier")}
                    className={`flex-1 flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg transition-all duration-300 font-medium text-sm ${
                      mode === "supplier"
                        ? "bg-emerald-600 text-white shadow-sm"
                        : "text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    <Truck className="h-4 w-4" />
                    Supplier
                  </button>
                </div>

                <div className="mb-6">
                  <h2 className="text-2xl font-bold text-slate-900 mb-1">Welcome Back</h2>
                  <p className="text-slate-600 text-sm">
                    {mode === "company" ? "Sign in to your company account" : "Sign in as supplier"}
                  </p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                  {error && (
                    <Alert variant="destructive" className="py-2">
                      <AlertDescription className="text-sm">{error}</AlertDescription>
                    </Alert>
                  )}

                  <div className="space-y-2">
                    <Label htmlFor="email" className="text-slate-700 text-sm">Email</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
                      <Input
                        id="email"
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="Enter your email"
                        className="pl-10 h-11 border-slate-200 focus:border-emerald-500 focus:ring-emerald-500"
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
                        className="pl-10 pr-10 h-11 border-slate-200 focus:border-emerald-500 focus:ring-emerald-500"
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
                    {mode === "supplier" && (
                      <p className="text-xs text-slate-500">Default password: Welcome@123</p>
                    )}
                  </div>

                  <Button
                    type="submit"
                    disabled={isLoading}
                    className="w-full h-11 bg-emerald-600 hover:bg-emerald-700 text-white font-medium"
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
                  New to Auto ERP?{" "}
                  <button
                    onClick={() => setViewMode("register")}
                    className="text-emerald-600 hover:text-emerald-700 font-medium"
                  >
                    Create an account
                  </button>
                </div>
              </>
            ) : (
              <>
                <div className="mb-6">
                  <h2 className="text-2xl font-bold text-slate-900 mb-1">Create Account</h2>
                  <p className="text-slate-600 text-sm">Register your company to get started</p>
                </div>

                <form onSubmit={handleRegisterSubmit} className="space-y-4">
                  {error && (
                    <Alert variant="destructive" className="py-2">
                      <AlertDescription className="text-sm">{error}</AlertDescription>
                    </Alert>
                  )}

                  <div className="space-y-2">
                    <Label htmlFor="company_name" className="text-slate-700 text-sm">Company Name</Label>
                    <div className="relative">
                      <Building2 className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
                      <Input
                        id="company_name"
                        value={registerData.company_name}
                        onChange={(e) => setRegisterData({ ...registerData, company_name: e.target.value })}
                        placeholder="Your company name"
                        className="pl-10 h-11 border-slate-200 focus:border-emerald-500 focus:ring-emerald-500"
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="contact_person" className="text-slate-700 text-sm">Contact Person</Label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
                      <Input
                        id="contact_person"
                        value={registerData.contact_person}
                        onChange={(e) => setRegisterData({ ...registerData, contact_person: e.target.value })}
                        placeholder="Full name"
                        className="pl-10 h-11 border-slate-200 focus:border-emerald-500 focus:ring-emerald-500"
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="reg_email" className="text-slate-700 text-sm">Email</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
                      <Input
                        id="reg_email"
                        type="email"
                        value={registerData.email}
                        onChange={(e) => setRegisterData({ ...registerData, email: e.target.value })}
                        placeholder="company@example.com"
                        className="pl-10 h-11 border-slate-200 focus:border-emerald-500 focus:ring-emerald-500"
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="phone" className="text-slate-700 text-sm">Phone</Label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
                      <Input
                        id="phone"
                        value={registerData.phone}
                        onChange={(e) => setRegisterData({ ...registerData, phone: e.target.value })}
                        placeholder="Phone number"
                        className="pl-10 h-11 border-slate-200 focus:border-emerald-500 focus:ring-emerald-500"
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="address" className="text-slate-700 text-sm">Address</Label>
                    <div className="relative">
                      <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
                      <Input
                        id="address"
                        value={registerData.address}
                        onChange={(e) => setRegisterData({ ...registerData, address: e.target.value })}
                        placeholder="Company address"
                        className="pl-10 h-11 border-slate-200 focus:border-emerald-500 focus:ring-emerald-500"
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="reg_password" className="text-slate-700 text-sm">Password</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
                      <Input
                        id="reg_password"
                        type={showRegisterPassword ? "text" : "password"}
                        value={registerData.password}
                        onChange={(e) => setRegisterData({ ...registerData, password: e.target.value })}
                        placeholder="Min 6 characters"
                        className="pl-10 pr-10 h-11 border-slate-200 focus:border-emerald-500 focus:ring-emerald-500"
                        required
                        minLength={6}
                      />
                      <button
                        type="button"
                        onClick={() => setShowRegisterPassword(!showRegisterPassword)}
                        className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-slate-600"
                      >
                        {showRegisterPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="confirm_password" className="text-slate-700 text-sm">Confirm Password</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
                      <Input
                        id="confirm_password"
                        type={showConfirmPassword ? "text" : "password"}
                        value={registerData.confirm_password}
                        onChange={(e) => setRegisterData({ ...registerData, confirm_password: e.target.value })}
                        placeholder="Confirm password"
                        className="pl-10 pr-10 h-11 border-slate-200 focus:border-emerald-500 focus:ring-emerald-500"
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-slate-600"
                      >
                        {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>

                  <Button
                    type="submit"
                    disabled={isRegistering}
                    className="w-full h-11 bg-emerald-600 hover:bg-emerald-700 text-white font-medium"
                  >
                    {isRegistering ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Creating Account...
                      </>
                    ) : (
                      "Create Account"
                    )}
                  </Button>
                </form>

                <div className="mt-6 text-center text-sm text-slate-600">
                  Already have an account?{" "}
                  <button
                    onClick={() => setViewMode("login")}
                    className="text-emerald-600 hover:text-emerald-700 font-medium"
                  >
                    Sign in here
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>

      {showSubscriptionModal && (
        <SubscriptionModal
          isOpen={showSubscriptionModal}
          onClose={forceSubscription ? undefined : () => setShowSubscriptionModal(false)}
          mode="new"
          canClose={!forceSubscription}
          refetchSubscription={handleSubscriptionComplete}
          onSuccess={handleSubscriptionComplete}
          fullScreen={forceSubscription}
        />
      )}
    </>
  );
};

export default Login;
