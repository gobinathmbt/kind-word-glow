import React, { useState, useEffect, useRef } from "react";
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
import { getAllCountries } from "countries-and-timezones";
import { paymentSettingsServices } from "@/api/services";

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
  description: string;
  place_id: string;
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

  // Fetch Google Maps API key from backend (public endpoint - no auth required)
  useEffect(() => {
    const fetchGoogleMapsApiKey = async () => {
      try {
        const response = await paymentSettingsServices.getGoogleMapsApiKey();
        if (response.data.success && response.data.data.google_maps_api_key) {
          setGoogleMapsApiKey(response.data.data.google_maps_api_key);
        } else {
          console.error("Google Maps API key is not configured");
          toast.error("Google Maps API key is not configured. Address autocomplete will not work.");
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
          // Remove types restriction to allow all types of places like Google Maps
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

          setFormData((prev) => ({
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

  // Handle keyboard navigation in suggestions
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Escape") {
      setShowSuggestions(false);
    }
  };

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
                  <MapPin className="absolute left-3 top-3 h-4 w-4 text-muted-foreground z-10" />
                  <Input
                    ref={addressInputRef}
                    id="address"
                    value={formData.address}
                    onChange={(e) =>
                      handleInputChange("address", e.target.value)
                    }
                    onKeyDown={handleKeyDown}
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
                          <MapPin className="h-5 w-5 mt-0.5 text-gray-500 flex-shrink-0" />
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
