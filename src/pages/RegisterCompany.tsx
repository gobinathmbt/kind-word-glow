import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Car,
  Building,
  Mail,
  Phone,
  MapPin,
  Eye,
  EyeOff,
  Loader2,
} from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import axios from "axios";
import { BASE_URL } from "@/lib/config";
import { countries } from "countries-list";
import { getCountry } from "countries-and-timezones";

// Types
interface FormData {
  company_name: string;
  contact_person: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  state: string;
  country: string;
  pincode: string;
  timezone: string;
  currency: string;
  password: string;
  confirm_password: string;
}

interface AddressSuggestion {
  display_name: string;
  address: {
    country?: string;
    city?: string;
    town?: string;
    village?: string;
    county?: string;
    state?: string;
    region?: string;
    postcode?: string;
  };
}

const RegisterCompany = () => {
  const [formData, setFormData] = useState<FormData>({
    company_name: "",
    contact_person: "",
    email: "",
    phone: "",
    address: "",
    city: "",
    state: "",
    country: "",
    pincode: "",
    timezone: "",
    currency: "",
    password: "",
    confirm_password: "",
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [addressSuggestions, setAddressSuggestions] = useState<
    AddressSuggestion[]
  >([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isSearchingAddress, setIsSearchingAddress] = useState(false);
  const navigate = useNavigate();

  // Safe string getter
  const getSafeString = (value: unknown): string => {
    return typeof value === "string" ? value : "";
  };

  // Get currency for a country
  const getCurrencyForCountry = (countryName: string): string => {
    if (!countryName) return "";

    const countryEntry = Object.entries(countries).find(
      ([code, country]) =>
        country.name.toLowerCase() === countryName.toLowerCase()
    );

    if (countryEntry) {
      const [_, countryData] = countryEntry;
      return getSafeString(countryData.currency);
    }

    return "";
  };

  // Get timezone for a country
  const getTimezoneForCountry = (countryName: string): string => {
    if (!countryName) return "";

    try {
      const countryData = getCountry(countryName);
      if (
        countryData &&
        countryData.timezones &&
        countryData.timezones.length > 0
      ) {
        return getSafeString(countryData.timezones[0]);
      }
    } catch (error) {
      console.error("Error getting timezone for country:", error);
    }

    return "";
  };

  // Search address using OpenStreetMap Nominatim API
  const searchAddress = async (query: string) => {
    if (query.length < 3) {
      setAddressSuggestions([]);
      return;
    }

    setIsSearchingAddress(true);
    try {
      const response = await axios.get<AddressSuggestion[]>(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
          query
        )}&addressdetails=1&limit=5`
      );
      setAddressSuggestions(response.data);
      setShowSuggestions(true);
    } catch (err) {
      console.error("Address search error:", err);
      toast.error("Failed to search address");
    } finally {
      setIsSearchingAddress(false);
    }
  };

  // Handle address selection
  const handleAddressSelect = (suggestion: AddressSuggestion) => {
    const addr = suggestion.address;

    const selectedCountry = getSafeString(addr.country);
    const selectedCity = getSafeString(
      addr.city || addr.town || addr.village || addr.county
    );
    const selectedState = getSafeString(addr.state || addr.region);
    const selectedPincode = getSafeString(addr.postcode);

    // Auto-fill timezone and currency based on country
    const timezone = getTimezoneForCountry(selectedCountry);
    const currency = getCurrencyForCountry(selectedCountry);

    setFormData((prev) => ({
      ...prev,
      address: getSafeString(suggestion.display_name),
      city: selectedCity,
      state: selectedState,
      country: selectedCountry,
      pincode: selectedPincode,
      timezone,
      currency,
    }));

    setShowSuggestions(false);
    setAddressSuggestions([]);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    // Validate passwords match
    if (formData.password !== formData.confirm_password) {
      setError("Passwords do not match");
      toast.error("Passwords do not match");
      return;
    }

    // Validate password length
    if (formData.password.length < 6) {
      setError("Password must be at least 6 characters long");
      toast.error("Password must be at least 6 characters long");
      return;
    }

    // Validate timezone and currency
    if (!formData.timezone || !formData.currency) {
      setError(
        "Timezone and currency are required. Please select an address from suggestions."
      );
      toast.error(
        "Please select an address from suggestions to auto-fill timezone and currency"
      );
      return;
    }

    setIsLoading(true);

    try {
      const response = await axios.post(
        `${BASE_URL}/api/auth/register-company`,
        {
          company_name: formData.company_name,
          contact_person: formData.contact_person,
          email: formData.email,
          phone: formData.phone,
          address: formData.address,
          city: formData.city,
          state: formData.state,
          country: formData.country,
          pincode: formData.pincode,
          timezone: formData.timezone,
          currency: formData.currency,
          password: formData.password,
        }
      );

      if (response.data.success) {
        toast.success(
          "Company registered successfully! Please login to set up your subscription."
        );
        navigate("/login");
      }
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || "Registration failed";
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (field: keyof FormData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));

    // Trigger address search when address field changes
    if (field === "address") {
      searchAddress(value);
    }
  };

  // Close suggestions when clicking outside
  useEffect(() => {
    const handleClickOutside = () => {
      setShowSuggestions(false);
    };

    document.addEventListener("click", handleClickOutside);
    return () => {
      document.removeEventListener("click", handleClickOutside);
    };
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 to-accent/5 p-4">
      <div className="w-full max-w-6xl">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center space-x-2 mb-4">
            <Car className="h-10 w-10 text-primary" />
            <span className="text-3xl font-bold">Auto Erp</span>
          </div>
          <p className="text-muted-foreground">
            Register your company to get started
          </p>
        </div>

        <Card className="automotive-shadow">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Building className="h-6 w-6" />
              <span>Company Registration</span>
            </CardTitle>
            <CardDescription>
              Fill in your company details to create your Auto Erp account
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {error && (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="company_name">Company Name</Label>
                  <Input
                    id="company_name"
                    value={formData.company_name}
                    onChange={(e) =>
                      handleInputChange("company_name", e.target.value)
                    }
                    placeholder="Enter company name"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="contact_person">Contact Person</Label>
                  <Input
                    id="contact_person"
                    value={formData.contact_person}
                    onChange={(e) =>
                      handleInputChange("contact_person", e.target.value)
                    }
                    placeholder="Enter contact person name"
                    required
                  />
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email Address</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="email"
                      type="email"
                      value={formData.email}
                      onChange={(e) =>
                        handleInputChange("email", e.target.value)
                      }
                      placeholder="company@example.com"
                      className="pl-10"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="phone">Phone Number</Label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="phone"
                      value={formData.phone}
                      onChange={(e) =>
                        handleInputChange("phone", e.target.value)
                      }
                      placeholder="Enter phone number"
                      className="pl-10"
                      required
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-2 relative">
                <Label htmlFor="address">Address</Label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="address"
                    value={formData.address}
                    onChange={(e) =>
                      handleInputChange("address", e.target.value)
                    }
                    placeholder="Start typing your address..."
                    className="pl-10 pr-10"
                    required
                    autoComplete="off"
                  />
                  {isSearchingAddress && (
                    <Loader2 className="absolute right-3 top-3 h-4 w-4 animate-spin text-muted-foreground" />
                  )}
                </div>

                {showSuggestions && addressSuggestions.length > 0 && (
                  <div className="absolute z-10 w-full mt-1 bg-white border rounded-md shadow-lg max-h-60 overflow-auto">
                    {addressSuggestions.map(
                      (suggestion: any, index: number) => (
                        <button
                          key={index}
                          type="button"
                          className="w-full text-left px-4 py-2 hover:bg-gray-100 border-b last:border-b-0"
                          onClick={() => handleAddressSelect(suggestion)}
                        >
                          <div className="flex items-start space-x-2">
                            <MapPin className="h-4 w-4 mt-1 text-gray-400 flex-shrink-0" />
                            <span className="text-sm">
                              {suggestion.display_name}
                            </span>
                          </div>
                        </button>
                      )
                    )}
                  </div>
                )}
              </div>

              <div className="grid md:grid-cols-4 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="city">City</Label>
                  <Input
                    id="city"
                    value={formData.city}
                    onChange={(e) => handleInputChange("city", e.target.value)}
                    placeholder="City"
                    required
                    readOnly
                    className="bg-gray-50"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="state">State</Label>
                  <Input
                    id="state"
                    value={formData.state}
                    onChange={(e) => handleInputChange("state", e.target.value)}
                    placeholder="State"
                    required
                    readOnly
                    className="bg-gray-50"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="pincode">Pin Code</Label>
                  <Input
                    id="pincode"
                    value={formData.pincode}
                    onChange={(e) =>
                      handleInputChange("pincode", e.target.value)
                    }
                    placeholder="Pin code"
                    readOnly
                    className="bg-gray-50"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="country">Country</Label>
                  <Input
                    id="country"
                    value={formData.country}
                    onChange={(e) =>
                      handleInputChange("country", e.target.value)
                    }
                    placeholder="Country"
                    required
                    readOnly
                    className="bg-gray-50"
                  />
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="timezone">Timezone</Label>
                  <Input
                    id="timezone"
                    value={formData.timezone}
                    placeholder="Auto-filled from address"
                    readOnly
                    className="bg-gray-50"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="currency">Currency</Label>
                  <Input
                    id="currency"
                    value={formData.currency}
                    placeholder="Auto-filled from address"
                    readOnly
                    className="bg-gray-50"
                    required
                  />
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      value={formData.password}
                      onChange={(e) =>
                        handleInputChange("password", e.target.value)
                      }
                      placeholder="Enter password (min 6 characters)"
                      required
                      minLength={6}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="confirm_password">Confirm Password</Label>
                  <div className="relative">
                    <Input
                      id="confirm_password"
                      type={showConfirmPassword ? "text" : "password"}
                      value={formData.confirm_password}
                      onChange={(e) =>
                        handleInputChange("confirm_password", e.target.value)
                      }
                      placeholder="Confirm your password"
                      required
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                      onClick={() =>
                        setShowConfirmPassword(!showConfirmPassword)
                      }
                    >
                      {showConfirmPassword ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </div>
              </div>

              <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg">
                <h4 className="font-semibold mb-2 text-blue-900">
                  💡 Address Auto-Fill
                </h4>
                <p className="text-sm text-blue-800">
                  Start typing your address and select from suggestions. City,
                  State, Country, Pin Code, Timezone, and Currency will be
                  automatically filled.
                </p>
              </div>

              <div className="bg-muted p-4 rounded-lg">
                <h4 className="font-semibold mb-2">What happens next?</h4>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>• Your company will be registered in our system</li>
                  <li>• You can login with your credentials</li>
                  <li>
                    • Set up your subscription plan to access all features
                  </li>
                  <li>• Configure your dashboard and manage users</li>
                </ul>
              </div>

              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Registering Company...
                  </>
                ) : (
                  "Register Company"
                )}
              </Button>
            </form>

            <div className="mt-6 text-center text-sm">
              <p className="text-muted-foreground">
                Already have an account?{" "}
                <Link to="/login" className="text-primary hover:underline">
                  Sign in here
                </Link>
              </p>
            </div>
          </CardContent>
        </Card>

        <div className="text-center mt-6">
          <Link to="/" className="text-primary hover:underline text-sm">
            ← Back to home
          </Link>
        </div>
      </div>
    </div>
  );
};

export default RegisterCompany;
