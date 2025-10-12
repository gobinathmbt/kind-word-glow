import React, { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { supplierAuthServices } from "@/api/services";
import { useAuth } from "@/auth/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
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
  Wrench,
  Settings,
  ArrowRight,
} from "lucide-react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import SubscriptionModal from "@/components/subscription/SubscriptionModal";

type LoginMode = "company" | "supplier";

const Login = () => {
  const [mode, setMode] = useState<LoginMode>("company");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [showSubscriptionModal, setShowSubscriptionModal] = useState(false);
  const [forceSubscription, setForceSubscription] = useState(false);

  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const from = location.state?.from?.pathname || null;

  // Company login mutation
  const companyLoginMutation = useMutation({
    mutationFn: async () => {
      await login(email, password);
    },
    onSuccess: () => {
      toast.success("Login successful");

      const userData = JSON.parse(sessionStorage.getItem("user") || "{}");

      if (userData.subscription_modal_force) {
        setForceSubscription(true);
        setShowSubscriptionModal(true);
        return;
      }

      handleNavigationAfterLogin(userData);
    },
    onError: (err: any) => {
      console.error("Login error:", err);
      setError(err.response?.data?.message || "Login failed");
      toast.error("Login failed");
    },
  });

  // Supplier login mutation
  const supplierLoginMutation = useMutation({
    mutationFn: async () => {
      const response = await supplierAuthServices.login(email, password);
      return response.data;
    },
    onSuccess: (data) => {
      sessionStorage.setItem("supplier_token", data.data.token);
      sessionStorage.setItem(
        "supplier_user",
        JSON.stringify(data.data.supplier)
      );

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

  const handleSubscriptionComplete = () => {
    setShowSubscriptionModal(false);
    const userData = JSON.parse(sessionStorage.getItem("user") || "{}");
    handleNavigationAfterLogin(userData);
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

  const isLoading =
    companyLoginMutation.isPending || supplierLoginMutation.isPending;

  const vehicleIcons = [
    { icon: Car, position: "top-10 left-10", delay: "0s" },
    { icon: Truck, position: "top-20 right-20", delay: "2s" },
    { icon: Settings, position: "bottom-20 left-16", delay: "4s" },
    { icon: Wrench, position: "bottom-16 right-12", delay: "1s" },
  ];

  return (
    <>
      <div className="min-h-screen relative overflow-hidden bg-gradient-to-br from-slate-900 via-blue-900 to-slate-800">
        {/* Animated Background Elements */}
        <div className="absolute inset-0">
          {vehicleIcons.map((item, index) => (
            <div
              key={index}
              className={`absolute ${item.position} text-white/10 animate-pulse`}
              style={{ animationDelay: item.delay }}
            >
              <item.icon size={48} />
            </div>
          ))}
        </div>

        {/* Floating Particles */}
        <div className="absolute inset-0">
          {[...Array(20)].map((_, i) => (
            <div
              key={i}
              className="absolute w-2 h-2 bg-white/20 rounded-full animate-float"
              style={{
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
                animationDelay: `${Math.random() * 5}s`,
                animationDuration: `${3 + Math.random() * 4}s`,
              }}
            />
          ))}
        </div>

        <div className="relative z-10 min-h-screen flex items-center justify-center p-4">
          <div className="w-full max-w-md">
            {/* Header */}
            <div className="text-center mb-8">
              <div className="flex items-center justify-center space-x-3 mb-6">
                <div className="relative">
                  <div className="w-16 h-16 bg-gradient-to-r from-blue-600 to-blue-700 rounded-2xl flex items-center justify-center shadow-2xl">
                    <Car className="h-8 w-8 text-white" />
                  </div>
                  <div className="absolute -top-1 -right-1 w-6 h-6 bg-orange-500 rounded-full flex items-center justify-center">
                    <Wrench className="h-3 w-3 text-white" />
                  </div>
                </div>
                <div className="text-left">
                  <h1 className="text-3xl font-bold text-white">Auto ERP</h1>
                  <p className="text-blue-200 text-sm">
                    Vehicle Management System
                  </p>
                </div>
              </div>
            </div>

            <Card className="backdrop-blur-lg bg-white/10 border-white/20 shadow-2xl">
              <CardContent className="p-8">
                {/* Login Mode Toggle */}
                <div className="flex rounded-xl bg-white/10 p-1 mb-8 backdrop-blur-sm">
                  <button
                    type="button"
                    onClick={() => setMode("company")}
                    className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg transition-all duration-300 font-medium ${
                      mode === "company"
                        ? "bg-white text-slate-900 shadow-lg"
                        : "text-white/70 hover:text-white hover:bg-white/10"
                    }`}
                  >
                    <Building2 className="h-4 w-4" />
                    Company Login
                  </button>
                  <button
                    type="button"
                    onClick={() => setMode("supplier")}
                    className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg transition-all duration-300 font-medium ${
                      mode === "supplier"
                        ? "bg-white text-slate-900 shadow-lg"
                        : "text-white/70 hover:text-white hover:bg-white/10"
                    }`}
                  >
                    <Truck className="h-4 w-4" />
                    Supplier Login
                  </button>
                </div>

                {/* Welcome Message */}
                <div className="text-center mb-8">
                  <h2 className="text-2xl font-bold text-white mb-2">
                    Welcome Back
                  </h2>
                  <p className="text-blue-200">
                    {mode === "company"
                      ? "Sign in to access your company dashboard"
                      : "Sign in to manage your supplier account"}
                  </p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                  {error && (
                    <Alert
                      variant="destructive"
                      className="bg-red-500/20 border-red-500/30 text-red-100"
                    >
                      <AlertDescription>{error}</AlertDescription>
                    </Alert>
                  )}

                  <div className="space-y-2">
                    <Label htmlFor="email" className="text-white font-medium">
                      Email Address
                    </Label>
                    <div className="relative">
                      <Mail className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-white/50" />
                      <Input
                        id="email"
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="Enter your email"
                        className="pl-12 h-12 bg-white/10 border-white/20 text-white placeholder:text-white/50 focus:bg-white/15 focus:border-white/40 backdrop-blur-sm"
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label
                      htmlFor="password"
                      className="text-white font-medium"
                    >
                      Password
                    </Label>
                    <div className="relative">
                      <Lock className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-white/50" />
                      <Input
                        id="password"
                        type={showPassword ? "text" : "password"}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="Enter your password"
                        className="pl-12 pr-12 h-12 bg-white/10 border-white/20 text-white placeholder:text-white/50 focus:bg-white/15 focus:border-white/40 backdrop-blur-sm"
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-4 top-1/2 transform -translate-y-1/2 text-white/50 hover:text-white transition-colors"
                      >
                        {showPassword ? (
                          <EyeOff className="h-5 w-5" />
                        ) : (
                          <Eye className="h-5 w-5" />
                        )}
                      </button>
                    </div>
                    {mode === "supplier" && (
                      <p className="text-xs text-blue-200/80 mt-1">
                        Default password: Welcome@123
                      </p>
                    )}
                  </div>

                  <Button
                    type="submit"
                    disabled={isLoading}
                    className="w-full h-12 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-semibold shadow-lg hover:shadow-xl transition-all duration-300 group"
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                        Signing in...
                      </>
                    ) : (
                      <>
                        Sign In
                        <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
                      </>
                    )}
                  </Button>
                  <Button
                    type="button"
                    onClick={() =>
                      window.open(
                        "https://docs.google.com/forms/d/e/1FAIpQLSc_LwilruMvE8HoSrmQVaz37IJSQZ9qXf_3pFwVoK1i3rLk8g/viewform?usp=sharing&ouid=117961613046205263423",
                        "_blank"
                      )
                    }
                    className="w-full h-12 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-semibold shadow-lg hover:shadow-xl transition-all duration-300 group"
                  >
                    Delete Account
                  </Button>
                </form>

                {/* Footer */}
                {/* <div className="mt-8 text-center">
                  {mode === 'company' ? (
                    <p className="text-sm text-blue-200">
                      Don't have a company account?{' '}
                      <Link to="/register-company" className="text-white hover:text-blue-100 font-medium underline underline-offset-4 transition-colors">
                        Register your company
                      </Link>
                    </p>
                  ) : (
                    <p className="text-sm text-blue-200">
                      Need help? Contact your workshop administrator
                    </p>
                  )}
                </div> */}
              </CardContent>
            </Card>

            {/* Back to Home
            <div className="text-center mt-8">
              <Link to="/" className="inline-flex items-center text-white/80 hover:text-white text-sm font-medium transition-colors group">
                <ArrowRight className="mr-2 h-4 w-4 rotate-180 group-hover:-translate-x-1 transition-transform" />
                Back to home
              </Link>
            </div> */}
          </div>
        </div>
      </div>

      {/* Subscription Modal */}
      {showSubscriptionModal && (
        <SubscriptionModal
          isOpen={showSubscriptionModal}
          onClose={
            forceSubscription
              ? undefined
              : () => setShowSubscriptionModal(false)
          }
          mode="new"
          canClose={!forceSubscription}
          refetchSubscription={handleSubscriptionComplete}
          fullScreen={forceSubscription}
        />
      )}
    </>
  );
};

export default Login;
