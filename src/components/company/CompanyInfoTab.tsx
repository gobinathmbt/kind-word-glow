import { useState, useEffect, useRef } from "react";
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
import { companyServices, paymentSettingsServices } from "@/api/services";
import { countries } from "countries-list";
import { getAllCountries } from "countries-and-timezones";

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
  description: string;
  place_id: string;
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

  const autocompleteServiceRef = useRef<google.maps.places.AutocompleteService | null>(null);
  const placesServiceRef = useRef<google.maps.places.PlacesService | null>(null);
  const googleMapsLoadedRef = useRef(false);
  const addressInputRef = useRef<HTMLInputElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);
  const [googleMapsApiKey, setGoogleMapsApiKey] = useState<string>("");

  // Safe string getter
  const getSafeString = (value: unknown): string => {
    return typeof value === "string" ? value : "";
  };

  // Get country code from country name
  const getCountryCode = (countryName: string): string => {
    if (!countryName) return "";

    // Try exact match first
    const exactMatch = Object.entries(countries).find(
      ([code, country]) =>
        country.name.toLowerCase() === countryName.toLowerCase()
    );

    if (exactMatch) {
      return exactMatch[0];
    }

    // Try partial match
    const partialMatch = Object.entries(countries).find(
      ([code, country]) =>
        country.name.toLowerCase().includes(countryName.toLowerCase()) ||
        countryName.toLowerCase().includes(country.name.toLowerCase())
    );

    if (partialMatch) {
      return partialMatch[0];
    }

    // Special cases for common country name variations
    const countryMap: { [key: string]: string } = {
      "united states": "US",
      "usa": "US",
      "united kingdom": "GB",
      "uk": "GB",
      "uae": "AE",
      "united arab emirates": "AE",
    };

    const lowerCountryName = countryName.toLowerCase();
    if (countryMap[lowerCountryName]) {
      return countryMap[lowerCountryName];
    }

    return "";
  };

  // Get currency for a country
  const getCurrencyForCountry = (countryName: string): string => {
    if (!countryName) return "";

    const countryCode = getCountryCode(countryName);
    if (!countryCode) {
      return "";
    }

    try {
      const countryData = countries[countryCode as keyof typeof countries];
      
      if (countryData) {
        // Handle if currency is an array (take first element)
        if (Array.isArray(countryData.currency)) {
          const currencyValue = countryData.currency[0];
          return getSafeString(currencyValue);
        }
        // Handle if currency is a string
        else if (countryData.currency) {
          return getSafeString(countryData.currency);
        }
      }
    } catch (error) {
      console.error("Error getting currency for country:", error);
    }

    return "";
  };

  // Get timezone for a country
  const getTimezoneForCountry = (countryName: string): string => {
    if (!countryName) return "";

    const countryCode = getCountryCode(countryName);
    if (!countryCode) {
      return "";
    }

    try {
      // Get all countries data
      const allCountries = getAllCountries();
      
      // Find country by code
      const countryData = allCountries[countryCode];

      if (countryData && Array.isArray(countryData.timezones) && countryData.timezones.length > 0) {
        return getSafeString(countryData.timezones[0]);
      }
    } catch (error) {
      console.error("Error getting timezone for country:", error);
    }

    return "";
  };

  // Fetch Google Maps API key from backend
  useEffect(() => {
    const fetchGoogleMapsApiKey = async () => {
      try {
        const response = await paymentSettingsServices.getPublicPaymentSettings();
        if (response.data.success && response.data.data.google_maps_api_key) {
          setGoogleMapsApiKey(response.data.data.google_maps_api_key);
        } else {
          console.error("Google Maps API key is not configured");
          toast.error("Google Maps API key is not configured. Address autocomplete will not work. Please contact your administrator.");
        }
      } catch (error) {
        console.error("Failed to fetch Google Maps API key:", error);
        toast.error("Failed to load address autocomplete service.");
      }
    };

    fetchGoogleMapsApiKey();
  }, []);

  // Load Google Maps API
  useEffect(() => {
    // Don't load if API key is not available yet
    if (!googleMapsApiKey) {
      return;
    }

    const loadGoogleMapsAPI = () => {
      if (googleMapsLoadedRef.current || window.google?.maps?.places) {
        // Already loaded
        if (window.google?.maps?.places) {
          autocompleteServiceRef.current = new google.maps.places.AutocompleteService();
          const mapDiv = document.createElement('div');
          const map = new google.maps.Map(mapDiv);
          placesServiceRef.current = new google.maps.places.PlacesService(map);
          googleMapsLoadedRef.current = true;
        }
        return;
      }

      const script = document.createElement('script');
      script.src = `https://maps.googleapis.com/maps/api/js?key=${googleMapsApiKey}&libraries=places`;
      script.async = true;
      script.defer = true;
      script.onload = () => {
        autocompleteServiceRef.current = new google.maps.places.AutocompleteService();
        const mapDiv = document.createElement('div');
        const map = new google.maps.Map(mapDiv);
        placesServiceRef.current = new google.maps.places.PlacesService(map);
        googleMapsLoadedRef.current = true;
      };
      script.onerror = () => {
        console.error("Failed to load Google Maps API");
        toast.error("Failed to load address search. Please refresh the page.");
      };
      document.head.appendChild(script);
    };

    loadGoogleMapsAPI();
  }, [googleMapsApiKey]);

  // Search address using Google Maps Places API
  const searchAddress = async (query: string) => {
    if (query.length < 2) {
      setAddressSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    if (!autocompleteServiceRef.current) {
      console.error("Google Maps Autocomplete service not initialized");
      return;
    }

    setIsSearchingAddress(true);
    try {
      autocompleteServiceRef.current.getPlacePredictions(
        {
          input: query,
        },
        (predictions, status) => {
          setIsSearchingAddress(false);
          if (status === google.maps.places.PlacesServiceStatus.OK && predictions) {
            const suggestions: AddressSuggestion[] = predictions.map((prediction) => ({
              description: prediction.description,
              place_id: prediction.place_id,
            }));
            setAddressSuggestions(suggestions);
            setShowSuggestions(true);
          } else if (status === google.maps.places.PlacesServiceStatus.ZERO_RESULTS) {
            setAddressSuggestions([]);
            setShowSuggestions(false);
          } else {
            console.error("Address search error:", status);
            setAddressSuggestions([]);
            setShowSuggestions(false);
          }
        }
      );
    } catch (err) {
      console.error("Address search error:", err);
      setIsSearchingAddress(false);
      setAddressSuggestions([]);
      setShowSuggestions(false);
    }
  };

  // Handle address selection
  const handleAddressSelect = (suggestion: AddressSuggestion) => {
    if (!placesServiceRef.current) {
      console.error("Google Maps Places service not initialized");
      toast.error("Address service not ready. Please try again.");
      return;
    }

    setIsSearchingAddress(true);
    
    placesServiceRef.current.getDetails(
      {
        placeId: suggestion.place_id,
        fields: ['address_components', 'formatted_address'],
      },
      (place, status) => {
        setIsSearchingAddress(false);
        
        if (status === google.maps.places.PlacesServiceStatus.OK && place) {
          let selectedCity = '';
          let selectedState = '';
          let selectedCountry = '';
          let selectedPincode = '';

          // Parse address components
          place.address_components?.forEach((component) => {
            const types = component.types;
            
            if (types.includes('locality')) {
              selectedCity = component.long_name;
            } else if (types.includes('administrative_area_level_3') && !selectedCity) {
              selectedCity = component.long_name;
            } else if (types.includes('administrative_area_level_2') && !selectedCity) {
              selectedCity = component.long_name;
            }
            
            if (types.includes('administrative_area_level_1')) {
              selectedState = component.long_name;
            }
            
            if (types.includes('country')) {
              selectedCountry = component.long_name;
            }
            
            if (types.includes('postal_code')) {
              selectedPincode = component.long_name;
            }
          });

          // Auto-fill timezone and currency based on country
          const timezone = getTimezoneForCountry(selectedCountry);
          const currency = getCurrencyForCountry(selectedCountry);

          setCompanyInfo((prev) => ({
            ...prev,
            address: place.formatted_address || suggestion.description,
            city: selectedCity,
            state: selectedState,
            country: selectedCountry,
            pincode: selectedPincode,
            timezone,
            currency,
          }));

          // Show success message
          if (timezone && currency) {
            toast.success(`Address auto-filled with timezone (${timezone}) and currency (${currency})`);
          } else if (!timezone || !currency) {
            toast.warning("Address filled, but timezone/currency could not be detected. Please verify.");
          }

          setShowSuggestions(false);
          setAddressSuggestions([]);
        } else {
          console.error("Failed to get place details:", status);
          toast.error("Failed to get address details");
        }
      }
    );
  };

  // Load company info on mount
  useEffect(() => {
    loadCompanyInfo();
  }, []);

  // Close suggestions when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        addressInputRef.current &&
        !addressInputRef.current.contains(event.target as Node) &&
        suggestionsRef.current &&
        !suggestionsRef.current.contains(event.target as Node)
      ) {
        setShowSuggestions(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
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
                <MapPin className="absolute left-3 top-3 h-4 w-4 text-muted-foreground z-10" />
                <Input
                  ref={addressInputRef}
                  id="address"
                  value={companyInfo.address}
                  onChange={(e) =>
                    handleInfoChange("address", e.target.value)
                  }
                  onFocus={() => {
                    if (addressSuggestions.length > 0) {
                      setShowSuggestions(true);
                    }
                  }}
                  placeholder="Search for address..."
                  className="pl-10 pr-10"
                  required
                  autoComplete="off"
                />
                {isSearchingAddress && (
                  <Loader2 className="absolute right-3 top-3 h-4 w-4 animate-spin text-muted-foreground z-10" />
                )}
              </div>

              {showSuggestions && addressSuggestions.length > 0 && (
                <div 
                  ref={suggestionsRef}
                  className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-80 overflow-auto"
                >
                  {addressSuggestions.map(
                    (suggestion, index) => (
                      <button
                        key={suggestion.place_id || index}
                        type="button"
                        className="w-full text-left px-4 py-3 hover:bg-gray-100 transition-colors duration-150 border-b last:border-b-0 flex items-start space-x-3"
                        onClick={() => handleAddressSelect(suggestion)}
                      >
                        <MapPin className="h-5 w-5 mt-0.5 text-gray-400 flex-shrink-0" />
                        <span className="text-sm text-gray-900 flex-1">
                          {suggestion.description}
                        </span>
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
              <h4 className="font-semibold mb-2 text-blue-900 flex items-center gap-2">
                <MapPin className="h-5 w-5" />
                Address Search - Powered by Google Maps
              </h4>
              <p className="text-sm text-blue-800 mb-2">
                Start typing your address in the Address field above. The search works exactly like Google Maps:
              </p>
              <ul className="text-sm text-blue-800 space-y-1 ml-4">
                <li>• Type at least 2 characters to see suggestions</li>
                <li>• Search for any location worldwide</li>
                <li>• Select from the dropdown to auto-fill all address fields</li>
                <li>• City, State, Country, Pin Code, Timezone, and Currency are automatically populated</li>
              </ul>
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