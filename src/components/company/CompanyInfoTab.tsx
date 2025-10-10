import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, Building2, Lock, Save, MapPin } from "lucide-react";
import { toast } from "sonner";
import { companyServices } from "@/api/services";
import axios from "axios";
import { countries } from "countries-list";
import { getCountry } from "countries-and-timezones";

interface CompanyInfo {
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
}

interface PasswordData {
  old_password: string;
  new_password: string;
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

const CompanyInfoTab = () => {
  const [loading, setLoading] = useState(false);
  const [infoLoading, setInfoLoading] = useState(true);
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [isSearchingAddress, setIsSearchingAddress] = useState(false);
  const [addressSuggestions, setAddressSuggestions] = useState<
    AddressSuggestion[]
  >([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [companyInfo, setCompanyInfo] = useState<CompanyInfo>({
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
  });
  const [passwordData, setPasswordData] = useState<PasswordData>({
    old_password: "",
    new_password: "",
    confirm_password: "",
  });

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

    setCompanyInfo((prev) => ({
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

  // Load company info on mount
  useEffect(() => {
    loadCompanyInfo();
  }, []);

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

  const loadCompanyInfo = async () => {
    setInfoLoading(true);
    try {
      const response = await companyServices.getCompanyInfo();
      if (response.data.success) {
        setCompanyInfo(response.data.data);
      }
    } catch (error: any) {
      console.error("Failed to load company info:", error);
      toast.error(
        error.response?.data?.message || "Failed to load company information"
      );
    } finally {
      setInfoLoading(false);
    }
  };

  const handleInfoChange = (field: keyof CompanyInfo, value: string) => {
    setCompanyInfo((prev) => ({ ...prev, [field]: value }));

    // Trigger address search when address field changes
    if (field === "address") {
      searchAddress(value);
    }
  };

  const handlePasswordChange = (field: keyof PasswordData, value: string) => {
    setPasswordData((prev) => ({ ...prev, [field]: value }));
  };

  const handleUpdateInfo = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const response = await companyServices.updateCompanyInfo({
        contact_person: companyInfo.contact_person,
        phone: companyInfo.phone,
        address: companyInfo.address,
        city: companyInfo.city,
        state: companyInfo.state,
        country: companyInfo.country,
        pincode: companyInfo.pincode,
        timezone: companyInfo.timezone,
        currency: companyInfo.currency,
      });
      if (response.data.success) {
        toast.success("Company information updated successfully");
        loadCompanyInfo();
      }
    } catch (error: any) {
      toast.error(
        error.response?.data?.message || "Failed to update company information"
      );
    } finally {
      setLoading(false);
    }
  };

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate passwords
    if (passwordData.new_password !== passwordData.confirm_password) {
      toast.error("New passwords do not match");
      return;
    }

    if (passwordData.new_password.length < 6) {
      toast.error("Password must be at least 6 characters long");
      return;
    }

    setPasswordLoading(true);
    try {
      const response = await companyServices.updateCompanyPassword(passwordData);
      if (response.data.success) {
        toast.success("Password updated successfully");
        setPasswordData({
          old_password: "",
          new_password: "",
          confirm_password: "",
        });
      }
    } catch (error: any) {
      toast.error(
        error.response?.data?.message || "Failed to update password"
      );
    } finally {
      setPasswordLoading(false);
    }
  };

  if (infoLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Company Information */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            Company Information
          </CardTitle>
          <CardDescription>
            Update your company details. Email address and Company name cannot be changed.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleUpdateInfo} className="space-y-6">
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="company_name">Company Name</Label>
                <Input
                  id="company_name"
                  value={companyInfo.company_name}
                  readOnly
                  className="bg-muted"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="contact_person">Contact Person</Label>
                <Input
                  id="contact_person"
                  value={companyInfo.contact_person}
                  onChange={(e) =>
                    handleInfoChange("contact_person", e.target.value)
                  }
                  placeholder="Enter contact person name"
                  required
                />
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email Address</Label>
                <Input
                  id="email"
                  type="email"
                  value={companyInfo.email}
                  readOnly
                  className="bg-muted"
                />
                <p className="text-xs text-muted-foreground">
                  Email cannot be changed
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Phone Number</Label>
                <Input
                  id="phone"
                  value={companyInfo.phone}
                  onChange={(e) => handleInfoChange("phone", e.target.value)}
                  placeholder="Enter phone number"
                  required
                />
              </div>
            </div>

            <div className="space-y-2 relative">
              <Label htmlFor="address">Address</Label>
              <div className="relative">
                <MapPin className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="address"
                  value={companyInfo.address}
                  onChange={(e) =>
                    handleInfoChange("address", e.target.value)
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
                  value={companyInfo.city}
                  onChange={(e) => handleInfoChange("city", e.target.value)}
                  placeholder="City"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="state">State</Label>
                <Input
                  id="state"
                  value={companyInfo.state}
                  onChange={(e) => handleInfoChange("state", e.target.value)}
                  placeholder="State"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="pincode">Pin Code</Label>
                <Input
                  id="pincode"
                  value={companyInfo.pincode}
                  onChange={(e) => handleInfoChange("pincode", e.target.value)}
                  placeholder="Pin code"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="country">Country</Label>
                <Input
                  id="country"
                  value={companyInfo.country}
                  onChange={(e) => handleInfoChange("country", e.target.value)}
                  placeholder="Country"
                  required
                />
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="timezone">Timezone</Label>
                <Input
                  id="timezone"
                  value={companyInfo.timezone}
                  onChange={(e) => handleInfoChange("timezone", e.target.value)}
                  placeholder="Auto-filled from address"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="currency">Currency</Label>
                <Input
                  id="currency"
                  value={companyInfo.currency}
                  onChange={(e) => handleInfoChange("currency", e.target.value)}
                  placeholder="Auto-filled from address"
                  required
                />
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

            <Button type="submit" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Updating...
                </>
              ) : (
                <>
                  <Save className="mr-2 h-4 w-4" />
                  Update Information
                </>
              )}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Change Password */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Lock className="h-5 w-5" />
            Change Password
          </CardTitle>
          <CardDescription>
            Update your account password. You need to provide your current
            password.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleUpdatePassword} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="old_password">Current Password</Label>
              <Input
                id="old_password"
                type="password"
                value={passwordData.old_password}
                onChange={(e) =>
                  handlePasswordChange("old_password", e.target.value)
                }
                placeholder="Enter current password"
                required
              />
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="new_password">New Password</Label>
                <Input
                  id="new_password"
                  type="password"
                  value={passwordData.new_password}
                  onChange={(e) =>
                    handlePasswordChange("new_password", e.target.value)
                  }
                  placeholder="Enter new password (min 6 characters)"
                  required
                  minLength={6}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirm_password">Confirm New Password</Label>
                <Input
                  id="confirm_password"
                  type="password"
                  value={passwordData.confirm_password}
                  onChange={(e) =>
                    handlePasswordChange("confirm_password", e.target.value)
                  }
                  placeholder="Confirm new password"
                  required
                />
              </div>
            </div>

            <Alert>
              <AlertDescription>
                Password must be at least 6 characters long. Make sure your new
                passwords match.
              </AlertDescription>
            </Alert>

            <Button type="submit" disabled={passwordLoading}>
              {passwordLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Updating Password...
                </>
              ) : (
                <>
                  <Lock className="mr-2 h-4 w-4" />
                  Update Password
                </>
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default CompanyInfoTab;