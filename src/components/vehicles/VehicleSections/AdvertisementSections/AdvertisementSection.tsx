import React, { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Plus, Edit, Trash2, Send, CheckCircle2, XCircle, Clock, Ban, ExternalLink, Image as ImageIcon, FileText } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import axios from "axios";
import AdvertisementLogsDialog from "./AdvertisementLogsDialog";

interface Advertisement {
  _id: string;
  provider: string;
  status: "draft" | "published" | "failed" | "sold" | "withdrawn";
  is_active: boolean;
  payload: any;
  published_at?: string;
  withdrawn_at?: string;
  created_at: string;
  updated_at: string;
}

interface AdvertisementSectionProps {
  vehicle: any;
  onUpdate: () => void;
}

const PROVIDERS = ["OnlyCars", "TradeMe"];

const AdvertisementSection: React.FC<AdvertisementSectionProps> = ({
  vehicle,
  onUpdate,
}) => {
  const [advertisements, setAdvertisements] = useState<Advertisement[]>([]);
  const [loading, setLoading] = useState(false);
  const [sideModalOpen, setSideModalOpen] = useState(false);
  const [selectedProvider, setSelectedProvider] = useState<string>("");
  const [editMode, setEditMode] = useState(false);
  const [editingAdId, setEditingAdId] = useState<string>("");
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [adToDelete, setAdToDelete] = useState<string>("");
  const [withdrawDialogOpen, setWithdrawDialogOpen] = useState(false);
  const [adToWithdraw, setAdToWithdraw] = useState<string>("");
  const [logsDialogOpen, setLogsDialogOpen] = useState(false);
  const [selectedAdForLogs, setSelectedAdForLogs] = useState<Advertisement | null>(null);

  // Form state for OnlyCars - Complete payload fields
  const [formData, setFormData] = useState({
    dealer_id: "",
    yard_id: "",
    dealer_name: "",
    item_id: "",
    stock_number: "",
    title: "",
    subtitle: "",
    year: "",
    make: "",
    model: "",
    series: "",
    variant: "",
    body: "",
    price: "",
    price_special: "",
    price_info: "",
    description: "",
    summary: "",
    features: "",
    condition: "",
    safety_features: [],
    interior_features: [],
    other_feature: [],
    colour: "",
    odometer: "",
    engine_make: "",
    engine_number: "",
    engine_size: "",
    engine_power: "",
    cylinders: "",
    fuel_type: "",
    fuel_capacity: "",
    fuel_consumption: "",
    fuel_cost: "",
    transmission: "",
    gears: "",
    doors: "",
    seats: "",
    drive_type: "",
    towing: "",
    induction: "",
    VIN: "",
    rego_number: "",
    rego_expiry: "",
    build_date: "",
    compliance_date: "",
    images: [],
    images_updated_at: "",
    status: "pending",
    // TradeMe specific fields
    duration: "45",
    price_type: "",
    excludes_gst: false,
    orc_included: false,
    orc_amount: "",
    chassis: "",
    pickup_type: "",
    is_shipping_arranged: false,
    shipping_options: [],
    youtube_url: "",
    site_link: "",
  });

  // Form state for Trade Me - Specific payload fields
  const [tradeMeFormData, setTradeMeFormData] = useState({
    Title: "",
    Subtitle: "",
    Description: "",
    PriceDisplay: "",
    Odometer: "",
    OdometerUnits: "Kilometres",
    Year: "",
    Make: "",
    Model: "",
    BodyStyle: "",
    Transmission: "",
    FuelType: "",
    NumberOfDoors: "",
    NumberOfSeats: "",
    EngineSize: "",
    NumberOfCylinders: "",
    VIN: "",
    RegistrationPlate: "",
    Photos: [] as string[],
  });

  const [vehicleImages, setVehicleImages] = useState<any[]>([]);
  const [loadingImages, setLoadingImages] = useState(false);

  useEffect(() => {
    if (vehicle) {
      fetchAdvertisements();
      fetchVehicleImages();
    }
  }, [vehicle]);

  const fetchVehicleImages = async () => {
    try {
      setLoadingImages(true);
      
      // Fetch vehicle attachments
      const vehicleType = vehicle.vehicle_type || 'advertisement';
      const response = await axios.get(`/api/vehicles/${vehicle._id}/${vehicleType}/attachments`);
      
      if (response.data.success && response.data.data) {
        const attachments = response.data.data;
        
        // Filter and process images
        const listImages = attachments
          .filter((attachment: any) => 
            attachment.attachmentdata?.image?.imageCategory === "listImage" ||
            attachment.attachment_type === "image"
          )
          .map((attachment: any) => {
            const imageData = attachment.attachmentdata?.image || {};
            return {
              url: imageData.url || attachment.attachment_url || "",
              position: imageData.position || 0,
              filename: imageData.filename || attachment.attachment_name || "",
              title: imageData.title || "",
              selected: false
            };
          })
          .sort((a: any, b: any) => a.position - b.position);
        
        setVehicleImages(listImages);
      }
    } catch (error) {
      console.error("Error fetching vehicle images:", error);
      // Fallback to hero image if API fails
      if (vehicle.vehicle_hero_image) {
        setVehicleImages([{
          url: vehicle.vehicle_hero_image,
          position: 1,
          filename: "hero_image.jpg",
          title: "Hero Image",
          selected: false
        }]);
      }
    } finally {
      setLoadingImages(false);
    }
  };

  const fetchAdvertisements = async () => {
    try {
      setLoading(true);
      const response = await axios.get(
        `/api/adpublishing/${vehicle._id}/advertisements`
      );
      // Sort by created_at descending (latest first)
      const sortedAds = (response.data.data || []).sort((a: Advertisement, b: Advertisement) => 
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
      setAdvertisements(sortedAds);
    } catch (error) {
      console.error("Error fetching advertisements:", error);
      toast.error("Failed to load advertisements");
    } finally {
      setLoading(false);
    }
  };

  const handleCreateNew = async (provider: string) => {
    setSelectedProvider(provider);
    setEditMode(false);
    setEditingAdId("");
    setSideModalOpen(true);
    await resetForm();
  };

  const handleEdit = async (ad: Advertisement) => {
    setSelectedProvider(ad.provider);
    setEditMode(true);
    setEditingAdId(ad._id);
    // First load vehicle data (same as Create)
    await resetForm();
    // Then overlay saved payload data
    loadFormData(ad.payload, ad.provider);
    setSideModalOpen(true);
  };

  const resetForm = async () => {
    const safetyFeatures = vehicle.vehicle_specifications?.[0]?.safety_features || [];
    const interiorFeatures = vehicle.vehicle_specifications?.[0]?.interior_features || [];
    const otherFeatures = vehicle.vehicle_specifications?.[0]?.other_feature || [];
    const engineFeatures = vehicle.vehicle_eng_transmission?.[0]?.engine_features || [];
    const allFeatures = [...interiorFeatures, ...otherFeatures, ...safetyFeatures, ...engineFeatures].join(",");

    const colours = [
      vehicle.vehicle_specifications?.[0]?.exterior_primary_color || "",
      vehicle.vehicle_specifications?.[0]?.exterior_secondary_color || "",
      vehicle.vehicle_specifications?.[0]?.interior_color || "",
    ].filter(c => c).join(",");

    // Get latest odometer reading (sorted by created_at descending)
    let latestOdometerReading = "";
    if (vehicle.vehicle_odometer && vehicle.vehicle_odometer.length > 0) {
      const sortedOdometer = [...vehicle.vehicle_odometer].sort((a, b) => {
        // Sort by created_at descending (most recent first)
        if (a.created_at && b.created_at) {
          const createdA = new Date(a.created_at).getTime();
          const createdB = new Date(b.created_at).getTime();
          if (createdB !== createdA) return createdB - createdA;
        } else if (a.created_at && !b.created_at) return -1;
        else if (!a.created_at && b.created_at) return 1;
        
        // Second priority: reading_date descending
        if (a.reading_date && b.reading_date) {
          const dateA = new Date(a.reading_date).getTime();
          const dateB = new Date(b.reading_date).getTime();
          if (dateB !== dateA) return dateB - dateA;
        }
        
        // Third priority: reading descending
        return Number(b.reading) - Number(a.reading);
      });
      latestOdometerReading = sortedOdometer[0]?.reading?.toString().replace(/,/g, "") || "";
    }

    let dealershipName = "";
    const dealershipId = vehicle.dealership_id?._id || vehicle.dealership_id;
    
    if (dealershipId) {
      try {
        const response = await axios.get(`/api/dealership/${dealershipId}`);
        dealershipName = response.data.data?.dealership_name || "";
      } catch (error) {
        dealershipName = vehicle.dealership_id?.dealership_name || "";
      }
    }

    setFormData({
      dealer_id: vehicle.dealership_id?._id || vehicle.dealership_id || "",
      yard_id: "",
      dealer_name: dealershipName,
      item_id: vehicle.vehicle_stock_id?.toString() || "",
      stock_number: vehicle.vehicle_stock_id?.toString() || "",
      title: `${vehicle.year} ${vehicle.make} ${vehicle.model}`,
      subtitle: "",
      year: vehicle.year?.toString() || "",
      make: vehicle.make || "",
      model: vehicle.model || "",
      series: vehicle.body_style || "",
      variant: vehicle.variant || "",
      body: vehicle.body_style || "",
      price: "",
      price_special: "",
      price_info: "",
      description: "",
      summary: "",
      features: allFeatures,
      condition: "",
      safety_features: safetyFeatures,
      interior_features: interiorFeatures,
      other_feature: otherFeatures,
      colour: colours,
      odometer: latestOdometerReading,
      engine_make: vehicle.make || "",
      engine_number: vehicle.vehicle_eng_transmission?.[0]?.engine_no || "",
      engine_size: vehicle.vehicle_eng_transmission?.[0]?.engine_size?.toString() || "",
      engine_power: "",
      cylinders: vehicle.vehicle_eng_transmission?.[0]?.no_of_cylinders?.toString() || "",
      fuel_type: vehicle.vehicle_eng_transmission?.[0]?.primary_fuel_type || "",
      fuel_capacity: "",
      fuel_consumption: "",
      fuel_cost: "",
      transmission: vehicle.vehicle_eng_transmission?.[0]?.transmission_type || "",
      gears: "",
      doors: vehicle.vehicle_specifications?.[0]?.number_of_doors?.toString() || "",
      seats: vehicle.vehicle_specifications?.[0]?.number_of_seats?.toString() || "",
      drive_type: "",
      towing: "",
      induction: vehicle.vehicle_eng_transmission?.[0]?.turbo || "",
      VIN: vehicle.vin || "",
      rego_number: vehicle.plate_no || "",
      rego_expiry: (() => {
        try {
          const date = vehicle.vehicle_registration?.[0]?.license_expiry_date;
          if (!date) return "";
          const parsed = new Date(date);
          return isNaN(parsed.getTime()) ? "" : parsed.toISOString().split('T')[0];
        } catch {
          return "";
        }
      })(),
      build_date: vehicle.vehicle_registration?.[0]?.first_registered_year?.toString() || "",
      compliance_date: (() => {
        try {
          const date = vehicle.vehicle_registration?.[0]?.wof_cof_expiry_date;
          if (!date) return "";
          const parsed = new Date(date);
          return isNaN(parsed.getTime()) ? "" : parsed.toISOString().split('T')[0];
        } catch {
          return "";
        }
      })(),
      images: vehicleImages.length > 0 
        ? vehicleImages.map((img, idx) => ({ url: img.url, index: (idx + 1).toString() }))
        : (vehicle.vehicle_hero_image ? [{ url: vehicle.vehicle_hero_image, index: "1" }] : []),
      images_updated_at: new Date().toISOString().replace("T", " ").substring(0, 19),
      status: vehicle.vehicle_other_details?.[0]?.status || vehicle.status || "pending",
      // TradeMe specific fields
      duration: "45",
      price_type: "",
      excludes_gst: false,
      orc_included: false,
      orc_amount: "",
      chassis: vehicle.chassis_no || "",
      pickup_type: "",
      is_shipping_arranged: false,
      shipping_options: [],
      youtube_url: "",
      site_link: "",
    });

    // Reset Trade Me form with auto-populated data
    setTradeMeFormData({
      Title: `${vehicle.year} ${vehicle.make} ${vehicle.model}${vehicle.variant ? ' ' + vehicle.variant : ''}`,
      Subtitle: vehicle.variant || "",
      Description: "",
      PriceDisplay: vehicle.vehicle_other_details?.[0]?.retail_price?.toString() || "",
      Odometer: latestOdometerReading,
      OdometerUnits: "Kilometres",
      Year: vehicle.year?.toString() || "",
      Make: vehicle.make || "",
      Model: vehicle.model || "",
      BodyStyle: vehicle.body_style || "",
      Transmission: vehicle.vehicle_eng_transmission?.[0]?.transmission_type || "",
      FuelType: vehicle.vehicle_eng_transmission?.[0]?.primary_fuel_type || "",
      NumberOfDoors: vehicle.vehicle_specifications?.[0]?.number_of_doors?.toString() || "",
      NumberOfSeats: vehicle.vehicle_specifications?.[0]?.number_of_seats?.toString() || "",
      EngineSize: vehicle.vehicle_eng_transmission?.[0]?.engine_size?.toString() || "",
      NumberOfCylinders: vehicle.vehicle_eng_transmission?.[0]?.no_of_cylinders?.toString() || "",
      VIN: vehicle.vin || "",
      RegistrationPlate: vehicle.plate_no || "",
      Photos: vehicle.vehicle_hero_image ? [vehicle.vehicle_hero_image] : [],
    });
  };

  const loadFormData = (payload: any, provider?: string) => {
    const providerToUse = provider || selectedProvider;
    if (providerToUse === "TradeMe") {
      // Load TradeMe data into OnlyCars form (we use single form for both)
      // Only update fields that exist in payload, keep vehicle data for missing fields
      const price = payload.PriceDisplay || payload.retailPrice || "";
      
      const updates: any = {
        ...formData, // Keep all existing vehicle data
      };
      
      // Only override with payload data if it exists
      if (payload.title || payload.Title) updates.title = payload.title || payload.Title;
      if (payload.subtitle || payload.Subtitle) updates.subtitle = payload.subtitle || payload.Subtitle;
      if (payload.description || payload.Description) updates.description = payload.description || payload.Description;
      if (price) updates.price = price.toString();
      if (payload.odometer || payload.Odometer) updates.odometer = (payload.odometer || payload.Odometer).toString();
      if (payload.year || payload.Year) updates.year = (payload.year || payload.Year).toString();
      if (payload.make || payload.Make) updates.make = payload.make || payload.Make;
      if (payload.model || payload.Model) updates.model = payload.model || payload.Model;
      if (payload.bodyType || payload.BodyStyle) updates.body = payload.bodyType || payload.BodyStyle;
      if (payload.transmission || payload.Transmission) updates.transmission = payload.transmission || payload.Transmission;
      if (payload.fuelType || payload.FuelType) updates.fuel_type = payload.fuelType || payload.FuelType;
      if (payload.numberOfDoors || payload.NumberOfDoors) updates.doors = (payload.numberOfDoors || payload.NumberOfDoors).toString();
      if (payload.numberOfSeats || payload.NumberOfSeats) updates.seats = (payload.numberOfSeats || payload.NumberOfSeats).toString();
      if (payload.engineSize || payload.EngineSize) updates.engine_size = (payload.engineSize || payload.EngineSize).toString();
      if (payload.numberOfCylinders || payload.NumberOfCylinders) updates.cylinders = (payload.numberOfCylinders || payload.NumberOfCylinders).toString();
      if (payload.vin || payload.VIN) updates.VIN = payload.vin || payload.VIN;
      if (payload.registrationNumber || payload.RegistrationPlate) updates.rego_number = payload.registrationNumber || payload.RegistrationPlate;
      if (payload.stockNumber) updates.item_id = payload.stockNumber;
      if (payload.photos || payload.Photos) updates.images = (payload.photos || payload.Photos)?.map((url: string, idx: number) => ({ url, index: (idx + 1).toString() }));
      if (payload.status) updates.status = payload.status;
      
      // TradeMe specific fields - always update these
      updates.duration = payload.duration?.toString() || "45";
      if (payload.price_type || payload.PriceType) updates.price_type = payload.price_type || payload.PriceType;
      if (payload.excludes_gst !== undefined || payload.ExcludesGst !== undefined) updates.excludes_gst = payload.excludes_gst || payload.ExcludesGst || false;
      if (payload.orc_included !== undefined || payload.orcIncluded !== undefined) updates.orc_included = payload.orc_included || payload.orcIncluded || false;
      if (payload.orc_amount || payload.orcAmount) updates.orc_amount = payload.orc_amount?.toString() || payload.orcAmount?.toString();
      if (payload.chassis || payload.Chassis) updates.chassis = payload.chassis || payload.Chassis;
      if (payload.pickup_type || payload.PickupType) updates.pickup_type = payload.pickup_type || payload.PickupType;
      if (payload.is_shipping_arranged !== undefined || payload.IsShippingToBeArranged !== undefined) updates.is_shipping_arranged = payload.is_shipping_arranged || payload.IsShippingToBeArranged || false;
      if (payload.shipping_options || payload.ShippingOptions) updates.shipping_options = payload.shipping_options || payload.ShippingOptions;
      if (payload.youtube_url || payload.YoutubeUrl) updates.youtube_url = payload.youtube_url || payload.YoutubeUrl;
      if (payload.site_link || payload.SiteLink) updates.site_link = payload.site_link || payload.SiteLink;
      if (payload.color || payload.colour) updates.colour = payload.color || payload.colour;
      if (payload.condition) updates.condition = payload.condition;
      if (payload.features) updates.features = payload.features;
      if (payload.price_special) updates.price_special = payload.price_special;
      if (payload.price_info) updates.price_info = payload.price_info;
      if (payload.series) updates.series = payload.series;
      if (payload.variant) updates.variant = payload.variant;
      if (payload.engine_make) updates.engine_make = payload.engine_make;
      if (payload.engine_number) updates.engine_number = payload.engine_number;
      if (payload.engine_power) updates.engine_power = payload.engine_power?.toString();
      if (payload.fuel_capacity) updates.fuel_capacity = payload.fuel_capacity?.toString();
      if (payload.fuel_consumption) updates.fuel_consumption = payload.fuel_consumption?.toString();
      if (payload.fuel_cost) updates.fuel_cost = payload.fuel_cost?.toString();
      if (payload.gears) updates.gears = payload.gears?.toString();
      if (payload.drive_type) updates.drive_type = payload.drive_type;
      if (payload.towing) updates.towing = payload.towing?.toString();
      if (payload.induction) updates.induction = payload.induction;
      if (payload.rego_expiry) updates.rego_expiry = payload.rego_expiry;
      if (payload.build_date) updates.build_date = payload.build_date?.toString();
      if (payload.compliance_date) updates.compliance_date = payload.compliance_date;
      if (payload.safety_features) updates.safety_features = payload.safety_features;
      if (payload.interior_features) updates.interior_features = payload.interior_features;
      if (payload.other_feature) updates.other_feature = payload.other_feature;
      if (payload.images_updated_at) updates.images_updated_at = payload.images_updated_at;
      
      setFormData(updates);
    } else {
      setFormData({
        dealer_id: payload.dealer_id || "",
        yard_id: payload.yard_id || "",
        dealer_name: payload.dealer_name || "",
        item_id: payload.item_id?.toString() || "",
        stock_number: payload.stock_number?.toString() || "",
        title: payload.title || "",
        subtitle: payload.subtitle || "",
        year: payload.year?.toString() || "",
        make: payload.make || "",
        model: payload.model || "",
        series: payload.series || "",
        variant: payload.variant || "",
        body: payload.body || "",
        price: payload.price || "",
        price_special: payload.price_special || "",
        price_info: payload.price_info || "",
        description: payload.description || "",
        summary: payload.summary || "",
        features: payload.features || "",
        condition: payload.condition || "",
        safety_features: payload.safety_features || [],
        interior_features: payload.interior_features || [],
        other_feature: payload.other_feature || [],
        colour: payload.colour || "",
        odometer: payload.odometer?.toString() || "",
        engine_make: payload.engine_make || "",
        engine_number: payload.engine_number || "",
        engine_size: payload.engine_size?.toString() || "",
        engine_power: payload.engine_power?.toString() || "",
        cylinders: payload.cylinders?.toString() || "",
        fuel_type: payload.fuel_type || "",
        fuel_capacity: payload.fuel_capacity?.toString() || "",
        fuel_consumption: payload.fuel_consumption?.toString() || "",
        fuel_cost: payload.fuel_cost?.toString() || "",
        transmission: payload.transmission || "",
        gears: payload.gears?.toString() || "",
        doors: payload.doors?.toString() || "",
        seats: payload.seats?.toString() || "",
        drive_type: payload.drive_type || "",
        towing: payload.towing?.toString() || "",
        induction: payload.induction || "",
        VIN: payload.VIN || "",
        rego_number: payload.rego_number || "",
        rego_expiry: payload.rego_expiry || "",
        build_date: payload.build_date?.toString() || "",
        compliance_date: payload.compliance_date || "",
        images: payload.images || [],
        images_updated_at: payload.images_updated_at || "",
        // Always use current vehicle status from General Information
        status: vehicle.vehicle_other_details?.[0]?.status || vehicle.status || payload.status || "pending",
        // TradeMe specific fields
        duration: payload.duration?.toString() || "45",
        price_type: payload.price_type || payload.PriceType || "",
        excludes_gst: payload.excludes_gst || payload.ExcludesGst || false,
        orc_included: payload.orc_included || payload.orcIncluded || false,
        orc_amount: payload.orc_amount?.toString() || payload.orcAmount?.toString() || "",
        chassis: payload.chassis || payload.Chassis || "",
        pickup_type: payload.pickup_type || payload.PickupType || "",
        is_shipping_arranged: payload.is_shipping_arranged || payload.IsShippingToBeArranged || false,
        shipping_options: payload.shipping_options || payload.ShippingOptions || [],
        youtube_url: payload.youtube_url || payload.YoutubeUrl || "",
        site_link: payload.site_link || payload.SiteLink || "",
      });
    }
  };

  const buildPayload = () => {
    if (selectedProvider === "TradeMe") {
      // Map OnlyCars formData fields to Trade Me format
      const price = parseFloat(formData.price) || 0;
      
      // Helper to parse numbers
      const parseNum = (val: string) => {
        if (!val || val.trim() === '') return 0;
        const parsed = parseInt(val);
        return isNaN(parsed) ? 0 : parsed;
      };

      return {
        // TradeMe API fields
        // Category is determined by backend based on vehicle make/model mapping
        duration: parseInt(formData.duration) || 45,
        title: formData.title,
        subtitle: formData.subtitle,
        description: formData.description,
        retailPrice: price,
        odometer: parseInt(formData.odometer) || 0,
        year: parseInt(formData.year) || 0,
        make: formData.make,
        model: formData.model,
        bodyType: formData.body,
        transmission: formData.transmission,
        fuelType: formData.fuel_type,
        numberOfDoors: parseInt(formData.doors) || 0,
        numberOfSeats: parseInt(formData.seats) || 0,
        engineSize: parseInt(formData.engine_size) || 0,
        numberOfCylinders: parseInt(formData.cylinders) || 0,
        vin: formData.VIN,
        registrationNumber: formData.rego_number,
        chassis: formData.chassis,
        condition: formData.condition,
        color: formData.colour,
        features: Array.isArray(formData.features) 
          ? formData.features 
          : (formData.features && typeof formData.features === 'string' 
              ? formData.features.split(',').map((f: string) => f.trim()).filter((f: string) => f) 
              : []),
        stockNumber: formData.item_id,
        photos: formData.images?.map((img: any) => img.url || img) || [],
        
        // TradeMe specific pricing fields
        PriceType: formData.price_type || "",
        ExcludesGst: formData.excludes_gst,
        orcIncluded: formData.orc_included,
        orcAmount: parseNum(formData.orc_amount),
        
        // TradeMe specific delivery and listing fields
        Chassis: formData.chassis,
        PickupType: formData.pickup_type,
        IsShippingToBeArranged: formData.is_shipping_arranged,
        ShippingOptions: formData.shipping_options?.map((option: any) => ({
          ...option,
          Details: option.description || option.Details || ""
        })) || [],
        YoutubeUrl: formData.youtube_url,
        SiteLink: formData.site_link,
        
        // Additional fields for database storage (not sent to TradeMe API)
        price_special: formData.price_special,
        price_info: formData.price_info,
        series: formData.series,
        engine_make: formData.engine_make,
        engine_number: formData.engine_number,
        engine_power: parseNum(formData.engine_power),
        fuel_capacity: parseNum(formData.fuel_capacity),
        fuel_consumption: parseNum(formData.fuel_consumption),
        fuel_cost: parseNum(formData.fuel_cost),
        gears: parseNum(formData.gears),
        drive_type: formData.drive_type,
        towing: parseNum(formData.towing),
        induction: formData.induction,
        rego_expiry: formData.rego_expiry,
        build_date: formData.build_date,
        compliance_date: formData.compliance_date,
        safety_features: formData.safety_features,
        interior_features: formData.interior_features,
        other_feature: formData.other_feature,
        images_updated_at: formData.images_updated_at,
        status: formData.status,
      };
    } else if (selectedProvider === "OnlyCars") {
      // Helper to parse numbers, keeping empty strings as empty
      const parseNum = (val: string) => {
        if (!val || val.trim() === '') return 0;
        const parsed = parseInt(val);
        return isNaN(parsed) ? 0 : parsed;
      };

      return {
        dealer_id: formData.dealer_id,
        yard_id: formData.yard_id,
        dealer_name: formData.dealer_name,
        item_id: parseNum(formData.item_id),
        stock_number: parseNum(formData.stock_number),
        title: formData.title,
        year: parseNum(formData.year),
        make: formData.make,
        model: formData.model,
        series: formData.series,
        variant: formData.variant,
        body: formData.body,
        price: formData.price,
        price_special: formData.price_special,
        price_info: formData.price_info,
        description: formData.description,
        summary: formData.summary,
        features: formData.features,
        condition: formData.condition,
        safety_features: formData.safety_features,
        interior_features: formData.interior_features,
        other_feature: formData.other_feature,
        colour: formData.colour,
        odometer: parseNum(formData.odometer),
        engine_make: formData.engine_make,
        engine_number: formData.engine_number,
        engine_size: parseNum(formData.engine_size),
        engine_power: parseNum(formData.engine_power),
        cylinders: parseNum(formData.cylinders),
        fuel_type: formData.fuel_type,
        fuel_capacity: parseNum(formData.fuel_capacity),
        fuel_consumption: parseNum(formData.fuel_consumption),
        fuel_cost: parseNum(formData.fuel_cost),
        transmission: formData.transmission,
        gears: parseNum(formData.gears),
        doors: parseNum(formData.doors),
        seats: parseNum(formData.seats),
        drive_type: formData.drive_type,
        towing: parseNum(formData.towing),
        induction: formData.induction,
        VIN: formData.VIN,
        rego_number: formData.rego_number,
        rego_expiry: formData.rego_expiry,
        build_date: formData.build_date,
        compliance_date: formData.compliance_date,
        images: formData.images,
        images_updated_at: formData.images_updated_at,
        status: formData.status,
      };
    }
    return {};
  };

  const handleSaveDraft = async () => {
    try {
      // Validate retail price for TradeMe
      if (selectedProvider === "TradeMe" && (!formData.price || parseFloat(formData.price) <= 0)) {
        toast.error("Retail price is required and must be greater than 0 for Trade Me listings");
        return;
      }

      setLoading(true);
      const payload = buildPayload();

      if (editMode && editingAdId) {
        const response = await axios.put(
          `/api/adpublishing/${vehicle._id}/advertisements/${editingAdId}`,
          { payload }
        );
        toast.success("Advertisement draft updated successfully");
      } else {
        const response = await axios.post(`/api/adpublishing/${vehicle._id}/advertisements`, {
          provider: selectedProvider,
          payload,
        });
        toast.success("Advertisement draft saved successfully");
      }

      // Small delay to ensure backend has completed
      await new Promise(resolve => setTimeout(resolve, 500));
      await fetchAdvertisements();
      setSideModalOpen(false);
      onUpdate();
    } catch (error: any) {
      console.error("Error saving draft:", error);
      console.error("Error response:", error.response?.data);
      console.error("Error status:", error.response?.status);
      toast.error(error.response?.data?.message || error.message || "Failed to save draft");
    } finally {
      setLoading(false);
    }
  };

  const handlePublish = async (adId: string) => {
    let publishToast: string | number | undefined;
    
    try {
      setLoading(true);
      
      // Show initial publishing toast
      publishToast = toast.loading("Publishing advertisement...");
      
      const response = await axios.post(
        `/api/adpublishing/${vehicle._id}/advertisements/${adId}/publish`
      );
      
      // Check for image upload results
      const imageUpload = response.data?.data?.payload?.api_response?.image_upload;
      
      if (imageUpload) {
        const { uploaded, total, failed } = imageUpload;
        
        if (failed > 0) {
          toast.success(
            `Advertisement published with warnings: ${uploaded}/${total} images uploaded successfully. ${failed} image(s) failed.`,
            { id: publishToast, duration: 6000 }
          );
        } else if (uploaded > 0) {
          toast.success(
            `Advertisement published successfully with ${uploaded} image(s)!`,
            { id: publishToast }
          );
        } else {
          toast.success(
            `Advertisement published successfully (no images uploaded)`,
            { id: publishToast }
          );
        }
      } else {
        toast.success(`Advertisement published successfully`, { id: publishToast });
      }
      
      // Small delay to ensure backend has completed
      await new Promise(resolve => setTimeout(resolve, 500));
      await fetchAdvertisements();
      onUpdate();
    } catch (error: any) {
      console.error("Error publishing:", error);
      
      // Dismiss the loading toast and show error
      if (publishToast) {
        toast.error(error.response?.data?.message || "Failed to publish", { id: publishToast });
      } else {
        toast.error(error.response?.data?.message || "Failed to publish");
      }
      
      // Refresh list even on error to show failed status
      await new Promise(resolve => setTimeout(resolve, 500));
      await fetchAdvertisements();
    } finally {
      setLoading(false);
    }
  };

  const handleWithdraw = async () => {
    try {
      setLoading(true);
      await axios.post(
        `/api/adpublishing/${vehicle._id}/advertisements/${adToWithdraw}/withdraw`
      );
      toast.success("Advertisement withdrawn successfully");
      await fetchAdvertisements();
      setWithdrawDialogOpen(false);
      onUpdate();
    } catch (error: any) {
      console.error("Error withdrawing:", error);
      toast.error(error.response?.data?.message || "Failed to withdraw");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    try {
      setLoading(true);
      await axios.delete(
        `/api/adpublishing/${vehicle._id}/advertisements/${adToDelete}`
      );
      toast.success("Advertisement deleted successfully");
      await fetchAdvertisements();
      setDeleteDialogOpen(false);
      onUpdate();
    } catch (error: any) {
      console.error("Error deleting:", error);
      toast.error(error.response?.data?.message || "Failed to delete");
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { variant: "default" | "secondary" | "destructive" | "outline", icon: any, className?: string }> = {
      draft: { variant: "secondary", icon: Clock },
      published: { variant: "default", icon: CheckCircle2 },
      failed: { variant: "destructive", icon: XCircle },
      sold: { variant: "outline", icon: Ban, className: "border-orange-500 text-orange-700 bg-orange-50" },
      withdrawn: { variant: "outline", icon: Ban },
    };

    const config = variants[status] || { variant: "secondary", icon: Clock };
    const Icon = config.icon;

    return (
      <Badge variant={config.variant} className={`flex items-center gap-1 ${config.className || ""}`}>
        <Icon className="h-3 w-3" />
        {status.toUpperCase()}
      </Badge>
    );
  };

  const getProviderAds = (provider: string) => {
    return advertisements.filter(ad => ad.provider === provider);
  };

  return (
    <>
      <Accordion type="single" collapsible>
        <AccordionItem value="advertisement">
          <AccordionTrigger className="text-lg font-semibold">
            <div className="flex items-center justify-between w-full mr-4">
              <span>Advertisement Publishing</span>
            </div>
          </AccordionTrigger>
          <AccordionContent>
            <Card>
              <CardContent className="p-4 sm:p-6">
                <Tabs defaultValue={PROVIDERS[0]} className="w-full">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
                    <TabsList className="w-full sm:w-auto">
                      {PROVIDERS.map((provider) => {
                        const providerAds = getProviderAds(provider);
                        
                        return (
                          <TabsTrigger 
                            key={provider} 
                            value={provider}
                            className="flex-1 sm:flex-none"
                          >
                            <span className="font-medium">{provider}</span>
                            {providerAds.length > 0 && (
                              <Badge variant="outline" className="ml-2 text-xs">
                                {providerAds.length}
                              </Badge>
                            )}
                          </TabsTrigger>
                        );
                      })}
                    </TabsList>
                  </div>

                  {PROVIDERS.map((provider) => {
                    const providerAds = getProviderAds(provider);
                    const hasAnyAd = providerAds.length > 0;

                    return (
                      <TabsContent key={provider} value={provider} className="mt-0 space-y-4">
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-4">
                          <h3 className="text-base sm:text-lg font-semibold">{provider} Advertisements</h3>
                          {!hasAnyAd && (
                            <Button
                              onClick={() => handleCreateNew(provider)}
                              disabled={loading}
                              className="w-full sm:w-auto"
                            >
                              <Plus className="h-4 w-4 mr-2" />
                              Create New
                            </Button>
                          )}
                        </div>

                        {providerAds.length === 0 ? (
                          <Card className="border-2 border-dashed">
                            <CardContent className="flex flex-col items-center justify-center py-12 px-4 text-center">
                              <Send className="h-12 w-12 text-muted-foreground mb-4" />
                              <h3 className="font-semibold text-base sm:text-lg mb-2">No Advertisements Yet</h3>
                              <p className="text-sm text-muted-foreground mb-6 max-w-md">
                                Create your first advertisement for {provider}
                              </p>
                              <Button 
                                onClick={() => handleCreateNew(provider)} 
                                disabled={loading}
                                className="w-full sm:w-auto"
                              >
                                <Plus className="h-4 w-4 mr-2" />
                                Create {provider} Advertisement
                              </Button>
                            </CardContent>
                          </Card>
                        ) : (
                          <div className="rounded-lg border overflow-hidden">
                            <div className="overflow-x-auto">
                              <Table>
                                <TableHeader>
                                  <TableRow>
                                    <TableHead className="min-w-[120px]">Status</TableHead>
                                    <TableHead className="min-w-[140px]">Created</TableHead>
                                    {provider === "TradeMe" && <TableHead className="min-w-[100px]">Images</TableHead>}
                                    <TableHead className="text-right min-w-[200px]">Actions</TableHead>
                                  </TableRow>
                                </TableHeader>
                                <TableBody>
                                  {providerAds.map((ad) => {
                                    // Extract image upload info from API response
                                    const imageUpload = ad.payload?.api_response?.image_upload;
                                    
                                    return (
                                    <TableRow key={ad._id}>
                                      <TableCell className="py-3">{getStatusBadge(ad.status)}</TableCell>
                                      <TableCell className="text-sm py-3">
                                        <div className="flex flex-col">
                                          <span className="font-medium">{new Date(ad.created_at).toLocaleDateString()}</span>
                                          <span className="text-xs text-muted-foreground">
                                            {new Date(ad.created_at).toLocaleTimeString()}
                                          </span>
                                        </div>
                                      </TableCell>
                                      {provider === "TradeMe" && (
                                        <TableCell className="py-3">
                                          {imageUpload ? (
                                            <div className="flex flex-col gap-1">
                                              <div className="flex items-center gap-1.5">
                                                {imageUpload.uploaded > 0 && (
                                                  <Badge variant="outline" className="text-[10px] bg-green-50 text-green-700 border-green-200">
                                                    <CheckCircle2 className="h-2.5 w-2.5 mr-1" />
                                                    {imageUpload.uploaded}
                                                  </Badge>
                                                )}
                                                {imageUpload.failed > 0 && (
                                                  <Badge variant="outline" className="text-[10px] bg-red-50 text-red-700 border-red-200">
                                                    <XCircle className="h-2.5 w-2.5 mr-1" />
                                                    {imageUpload.failed}
                                                  </Badge>
                                                )}
                                              </div>
                                              <span className="text-[10px] text-muted-foreground">
                                                {imageUpload.uploaded}/{imageUpload.total} uploaded
                                              </span>
                                            </div>
                                          ) : ad.status === "published" ? (
                                            <span className="text-xs text-muted-foreground">No images</span>
                                          ) : (
                                            <span className="text-xs text-muted-foreground">-</span>
                                          )}
                                        </TableCell>
                                      )}
                                      <TableCell className="text-right py-3">
                                        <div className="flex items-center justify-end gap-2 flex-wrap">
                                          {/* Edit button - available for draft and failed (NOT published, withdrawn, or sold) */}
                                          {(ad.status === "draft" || ad.status === "failed") && (
                                            <Button
                                              variant="outline"
                                              size="sm"
                                              onClick={() => handleEdit(ad)}
                                              disabled={loading}
                                              className="min-w-[70px]"
                                            >
                                              <Edit className="h-3 w-3 mr-1" />
                                              Edit
                                            </Button>
                                          )}
                                          
                                          {/* Publish button - for draft and failed (NOT for withdrawn or sold) */}
                                          {(ad.status === "draft" || ad.status === "failed") && (
                                            <Button
                                              size="sm"
                                              onClick={() => handlePublish(ad._id)}
                                              disabled={loading}
                                              className="min-w-[90px]"
                                            >
                                              <Send className="h-3 w-3 mr-1" />
                                              {ad.status === "failed" ? "Retry" : "Publish"}
                                            </Button>
                                          )}
                                          
                                          {/* Withdraw button - only for published */}
                                          {ad.status === "published" && (
                                            <Button
                                              variant="outline"
                                              size="sm"
                                              onClick={() => {
                                                setAdToWithdraw(ad._id);
                                                setWithdrawDialogOpen(true);
                                              }}
                                              disabled={loading}
                                              className="min-w-[100px]"
                                            >
                                              <Ban className="h-3 w-3 mr-1" />
                                              Withdraw
                                            </Button>
                                          )}
                                          
                                          {/* Show Logs button - always available */}
                                          <Button
                                            size="sm"
                                            onClick={() => {
                                              setSelectedAdForLogs(ad);
                                              setLogsDialogOpen(true);
                                            }}
                                            disabled={loading}
                                            className="min-w-[90px]"
                                          >
                                            <FileText className="h-3 w-3 mr-1" />
                                            Show Logs
                                          </Button>
                                        </div>
                                      </TableCell>
                                    </TableRow>
                                    );
                                  })}
                                </TableBody>
                              </Table>
                            </div>
                          </div>
                        )}
                      </TabsContent>
                    );
                  })}
                </Tabs>
              </CardContent>
            </Card>
          </AccordionContent>
        </AccordionItem>
      </Accordion>

      {/* Side Modal for Creating/Editing Advertisement */}
      <Sheet open={sideModalOpen} onOpenChange={setSideModalOpen}>
        <SheetContent className="w-full sm:max-w-[700px] overflow-y-auto">
          <SheetHeader className="pb-4 border-b">
            <SheetTitle className="text-xl">
              {editMode ? "Edit" : "Create"} {selectedProvider} Advertisement
            </SheetTitle>
            <SheetDescription className="text-sm">
              Fill in the details for {selectedProvider} advertisement
            </SheetDescription>
          </SheetHeader>

          <div className="space-y-6 mt-6 pb-20">
            {/* Vehicle Identifiers Section (Read-only) */}
            <div className="space-y-4 bg-muted/50 p-4 sm:p-5 rounded-lg border">
              <h3 className="font-semibold text-sm uppercase tracking-wide text-muted-foreground">Vehicle Identifiers (Auto-filled)</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                <div className="sm:col-span-2">
                  <Label htmlFor="dealer_name" className="text-xs font-medium">Dealership Name</Label>
                  <Input
                    id="dealer_name"
                    type="text"
                    value={formData.dealer_name}
                    disabled
                    className="mt-1.5"
                  />
                </div>
                <div>
                  <Label htmlFor="item_id" className="text-xs font-medium">Item ID / Stock Number</Label>
                  <Input
                    id="item_id"
                    type="text"
                    value={formData.item_id}
                    disabled
                    className="mt-1.5"
                  />
                </div>
                <div className={selectedProvider === "OnlyCars" ? "sm:col-span-2" : ""}>
                  <Label htmlFor="title" className="text-xs font-medium">Title</Label>
                  <Input
                    id="title"
                    type="text"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    className="mt-1.5"
                  />
                </div>
                {selectedProvider === "TradeMe" && (
                  <div>
                    <Label htmlFor="subtitle" className="text-xs font-medium">Subtitle</Label>
                    <Input
                      id="subtitle"
                      type="text"
                      value={formData.subtitle}
                      onChange={(e) => setFormData({ ...formData, subtitle: e.target.value })}
                      placeholder="Optional subtitle"
                      className="mt-1.5"
                    />
                  </div>
                )}
                <div>
                  <Label htmlFor="make" className="text-xs font-medium">Make</Label>
                  <Input id="make" value={formData.make} disabled className="mt-1.5" />
                </div>
                <div>
                  <Label htmlFor="model" className="text-xs font-medium">Model</Label>
                  <Input id="model" value={formData.model} disabled className="mt-1.5" />
                </div>
                <div>
                  <Label htmlFor="year" className="text-xs font-medium">Year</Label>
                  <Input id="year" value={formData.year} disabled className="mt-1.5" />
                </div>
                <div>
                  <Label htmlFor="variant" className="text-xs font-medium">Variant</Label>
                  <Input id="variant" value={formData.variant} disabled className="mt-1.5" />
                </div>
              </div>
            </div>

            {/* Pricing Section */}
            <div className="space-y-4">
              <h3 className="font-semibold text-base">Pricing (Required)</h3>
              
              {selectedProvider === "TradeMe" ? (
                <>
                  {/* TradeMe Pricing Fields */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                    <div>
                      <Label htmlFor="price" className="text-sm font-medium">
                        Retail Price <span className="text-red-500">*</span>
                      </Label>
                      <Input
                        id="price"
                        type="number"
                        value={formData.price}
                        onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                        placeholder="Enter retail price"
                        required
                        className="mt-1.5"
                      />
                      <p className="text-xs text-muted-foreground mt-1">Required: The asking price for the vehicle</p>
                    </div>
                    <div>
                      <Label htmlFor="price_type" className="text-sm font-medium">Price Type</Label>
                      <Input
                        id="price_type"
                        type="text"
                        value={formData.price_type}
                        onChange={(e) => setFormData({ ...formData, price_type: e.target.value })}
                        placeholder="e.g., Fixed, Negotiable, POA"
                        className="mt-1.5"
                      />
                      <p className="text-xs text-muted-foreground mt-1">Price type (e.g., Fixed, Negotiable, POA)</p>
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="price_special" className="text-sm font-medium">Sale Price</Label>
                    <Input
                      id="price_special"
                      type="text"
                      value={formData.price_special}
                      onChange={(e) => setFormData({ ...formData, price_special: e.target.value })}
                      placeholder="Enter sale price (optional)"
                      className="mt-1.5"
                    />
                    <p className="text-xs text-muted-foreground mt-1">Discounted price if on sale</p>
                  </div>
                  
                  {/* GST and ORC Fields */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                    <div className="flex items-center space-x-2 p-3 border rounded-lg">
                      <input
                        type="checkbox"
                        id="excludes_gst"
                        checked={formData.excludes_gst}
                        onChange={(e) => setFormData({ ...formData, excludes_gst: e.target.checked })}
                        className="h-4 w-4 rounded border-gray-300"
                      />
                      <div>
                        <Label htmlFor="excludes_gst" className="text-sm font-medium cursor-pointer">
                          Excludes GST
                        </Label>
                        <p className="text-xs text-muted-foreground">Price excludes GST</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2 p-3 border rounded-lg">
                      <input
                        type="checkbox"
                        id="orc_included"
                        checked={formData.orc_included}
                        onChange={(e) => setFormData({ ...formData, orc_included: e.target.checked })}
                        className="h-4 w-4 rounded border-gray-300"
                      />
                      <div>
                        <Label htmlFor="orc_included" className="text-sm font-medium cursor-pointer">
                          ORC Included
                        </Label>
                        <p className="text-xs text-muted-foreground">On-road costs included</p>
                      </div>
                    </div>
                  </div>
                  
                  {formData.orc_included && (
                    <div>
                      <Label htmlFor="orc_amount" className="text-sm font-medium">ORC Amount</Label>
                      <Input
                        id="orc_amount"
                        type="number"
                        value={formData.orc_amount}
                        onChange={(e) => setFormData({ ...formData, orc_amount: e.target.value })}
                        placeholder="Enter ORC amount"
                        className="mt-1.5"
                      />
                      <p className="text-xs text-muted-foreground mt-1">On-road costs amount (if included in price)</p>
                    </div>
                  )}
                </>
              ) : (
                <>
                  {/* OnlyCars Pricing Fields */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                    <div>
                      <Label htmlFor="price" className="text-sm font-medium">Price *</Label>
                      <Input
                        id="price"
                        type="text"
                        value={formData.price}
                        onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                        placeholder="Enter price"
                        className="mt-1.5"
                      />
                    </div>
                    <div>
                      <Label htmlFor="price_special" className="text-sm font-medium">Special Price</Label>
                      <Input
                        id="price_special"
                        type="text"
                        value={formData.price_special}
                        onChange={(e) => setFormData({ ...formData, price_special: e.target.value })}
                        placeholder="Enter special price"
                        className="mt-1.5"
                      />
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="price_info" className="text-sm font-medium">Price Info</Label>
                    <Input
                      id="price_info"
                      type="text"
                      value={formData.price_info}
                      onChange={(e) => setFormData({ ...formData, price_info: e.target.value })}
                      placeholder="e.g., ORC included"
                      className="mt-1.5"
                    />
                  </div>
                </>
              )}
            </div>

            {/* TradeMe Listing Details Section */}
            {selectedProvider === "TradeMe" && (
              <div className="space-y-4">
                <h3 className="font-semibold text-base">Listing Details (TradeMe)</h3>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                  <div>
                    <Label htmlFor="duration" className="text-sm font-medium">Listing Duration (Days) <span className="text-red-500">*</span></Label>
                    <Input
                      id="duration"
                      type="number"
                      value={formData.duration}
                      onChange={(e) => setFormData({ ...formData, duration: e.target.value })}
                      placeholder="45"
                      min="1"
                      max="90"
                      className="mt-1.5"
                    />
                    <p className="text-xs text-muted-foreground mt-1">Number of days the listing will be active (default: 45)</p>
                  </div>
                  
                  <div>
                    <Label htmlFor="chassis" className="text-sm font-medium">Chassis Number</Label>
                    <Input
                      id="chassis"
                      type="text"
                      value={formData.chassis}
                      onChange={(e) => setFormData({ ...formData, chassis: e.target.value })}
                      placeholder="Enter chassis number"
                      className="mt-1.5"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                  <div>
                    <Label htmlFor="pickup_type" className="text-sm font-medium">Pickup Type</Label>
                    <Input
                      id="pickup_type"
                      type="text"
                      value={formData.pickup_type}
                      onChange={(e) => setFormData({ ...formData, pickup_type: e.target.value })}
                      placeholder="e.g., Pickup Only, Can Deliver, Buyer Arranges"
                      className="mt-1.5"
                    />
                    <p className="text-xs text-muted-foreground mt-1">Delivery/pickup options</p>
                  </div>
                  
                  <div className="flex items-center space-x-2 p-3 border rounded-lg">
                    <input
                      type="checkbox"
                      id="is_shipping_arranged"
                      checked={formData.is_shipping_arranged}
                      onChange={(e) => setFormData({ ...formData, is_shipping_arranged: e.target.checked })}
                      className="h-4 w-4 rounded border-gray-300"
                    />
                    <div>
                      <Label htmlFor="is_shipping_arranged" className="text-sm font-medium cursor-pointer">
                        Shipping to be Arranged
                      </Label>
                      <p className="text-xs text-muted-foreground">Buyer arranges shipping</p>
                    </div>
                  </div>
                </div>

                {/* Shipping Options */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label className="text-sm font-medium">Shipping Options</Label>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setFormData({
                          ...formData,
                          shipping_options: [
                            ...formData.shipping_options,
                            { type: 1, price: 0, cost: 0, description: "" }
                          ]
                        });
                      }}
                      className="text-xs"
                    >
                      <Plus className="h-3 w-3 mr-1" />
                      Add Shipping Option
                    </Button>
                  </div>
                  
                  {formData.shipping_options.length === 0 ? (
                    <div className="border-2 border-dashed rounded-lg p-4 text-center text-sm text-muted-foreground">
                      No shipping options added. Click "Add Shipping Option" to add delivery options for buyers.
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {formData.shipping_options.map((option: any, index: number) => (
                        <div key={index} className="border rounded-lg p-4 space-y-3">
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-medium">Option {index + 1}</span>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                const newOptions = formData.shipping_options.filter((_: any, i: number) => i !== index);
                                setFormData({ ...formData, shipping_options: newOptions });
                              }}
                              className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                          
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                            <div>
                              <Label className="text-xs">Type</Label>
                              <select
                                value={option.type || 1}
                                onChange={(e) => {
                                  const newOptions = [...formData.shipping_options];
                                  newOptions[index] = { ...newOptions[index], type: parseInt(e.target.value) };
                                  setFormData({ ...formData, shipping_options: newOptions });
                                }}
                                className="w-full mt-1 h-9 rounded-md border border-input bg-background px-2 text-xs"
                              >
                                <option value="1">Courier/Delivery</option>
                                <option value="2">Freight</option>
                                <option value="3">Pickup Only</option>
                              </select>
                            </div>
                            
                            <div>
                              <Label className="text-xs">Buyer Price ($)</Label>
                              <Input
                                type="number"
                                value={option.price || 0}
                                onChange={(e) => {
                                  const newOptions = [...formData.shipping_options];
                                  newOptions[index] = { ...newOptions[index], price: parseFloat(e.target.value) || 0 };
                                  setFormData({ ...formData, shipping_options: newOptions });
                                }}
                                placeholder="0"
                                className="mt-1 h-9 text-xs"
                              />
                            </div>
                            
                            <div>
                              <Label className="text-xs">Your Cost ($)</Label>
                              <Input
                                type="number"
                                value={option.cost || 0}
                                onChange={(e) => {
                                  const newOptions = [...formData.shipping_options];
                                  newOptions[index] = { ...newOptions[index], cost: parseFloat(e.target.value) || 0 };
                                  setFormData({ ...formData, shipping_options: newOptions });
                                }}
                                placeholder="0"
                                className="mt-1 h-9 text-xs"
                              />
                            </div>
                          </div>
                          
                          <div>
                            <Label className="text-xs">Description</Label>
                            <Textarea
                              value={option.description || ""}
                              onChange={(e) => {
                                const newOptions = [...formData.shipping_options];
                                newOptions[index] = { ...newOptions[index], description: e.target.value };
                                setFormData({ ...formData, shipping_options: newOptions });
                              }}
                              placeholder="e.g., Standard delivery within 5-7 business days"
                              rows={2}
                              className="mt-1 text-xs resize-none"
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                  <div>
                    <Label htmlFor="youtube_url" className="text-sm font-medium">YouTube Video URL</Label>
                    <Input
                      id="youtube_url"
                      type="url"
                      value={formData.youtube_url}
                      onChange={(e) => setFormData({ ...formData, youtube_url: e.target.value })}
                      placeholder="https://youtube.com/watch?v=..."
                      className="mt-1.5"
                    />
                    <p className="text-xs text-muted-foreground mt-1">Optional video showcase</p>
                  </div>
                  
                  <div>
                    <Label htmlFor="site_link" className="text-sm font-medium">Website Link</Label>
                    <Input
                      id="site_link"
                      type="url"
                      value={formData.site_link}
                      onChange={(e) => setFormData({ ...formData, site_link: e.target.value })}
                      placeholder="https://yourwebsite.com"
                      className="mt-1.5"
                    />
                    <p className="text-xs text-muted-foreground mt-1">Link to your website</p>
                  </div>
                </div>
              </div>
            )}

            {/* Description Section */}
            <div className="space-y-4">
              <h3 className="font-semibold text-base">Description</h3>
              <div>
                <Label htmlFor="description" className="text-sm font-medium">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Detailed description"
                  rows={4}
                  className="mt-1.5 resize-none"
                />
              </div>
              {selectedProvider === "OnlyCars" && (
                <div>
                  <Label htmlFor="summary" className="text-sm font-medium">Summary</Label>
                  <Textarea
                    id="summary"
                    value={formData.summary}
                    onChange={(e) => setFormData({ ...formData, summary: e.target.value })}
                    placeholder="Brief summary for advertisement"
                    rows={3}
                    className="mt-1.5 resize-none"
                  />
                </div>
              )}
              <div>
                <Label htmlFor="condition" className="text-sm font-medium">Condition *</Label>
                <Input
                  id="condition"
                  type="text"
                  value={formData.condition}
                  onChange={(e) => setFormData({ ...formData, condition: e.target.value })}
                  placeholder="e.g., New, Used, Certified Pre-Owned"
                  className="mt-1.5"
                />
              </div>
            </div>

            {/* Vehicle Details Section */}
            <div className="space-y-4">
              <h3 className="font-semibold text-base">Vehicle Details</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                <div>
                  <Label htmlFor="series" className="text-sm font-medium">Series</Label>
                  <Input
                    id="series"
                    value={formData.series}
                    onChange={(e) => setFormData({ ...formData, series: e.target.value })}
                    className="mt-1.5"
                  />
                </div>
                <div>
                  <Label htmlFor="body" className="text-sm font-medium">Body</Label>
                  <Input
                    id="body"
                    value={formData.body}
                    onChange={(e) => setFormData({ ...formData, body: e.target.value })}
                    className="mt-1.5"
                  />
                </div>
                <div>
                  <Label htmlFor="colour" className="text-sm font-medium">Colour</Label>
                  <Input
                    id="colour"
                    value={formData.colour}
                    onChange={(e) => setFormData({ ...formData, colour: e.target.value })}
                    className="mt-1.5"
                  />
                </div>
                <div>
                  <Label htmlFor="odometer" className="text-sm font-medium">Odometer (km)</Label>
                  <Input
                    id="odometer"
                    value={formData.odometer}
                    onChange={(e) => setFormData({ ...formData, odometer: e.target.value })}
                    className="mt-1.5"
                  />
                </div>
                <div>
                  <Label htmlFor="doors" className="text-sm font-medium">Doors</Label>
                  <Input
                    id="doors"
                    value={formData.doors}
                    onChange={(e) => setFormData({ ...formData, doors: e.target.value })}
                    className="mt-1.5"
                  />
                </div>
                <div>
                  <Label htmlFor="seats" className="text-sm font-medium">Seats</Label>
                  <Input
                    id="seats"
                    value={formData.seats}
                    onChange={(e) => setFormData({ ...formData, seats: e.target.value })}
                    className="mt-1.5"
                  />
                </div>
                {selectedProvider === "OnlyCars" && (
                  <>
                    <div>
                      <Label htmlFor="drive_type" className="text-sm font-medium">Drive Type</Label>
                      <Input
                        id="drive_type"
                        type="text"
                        value={formData.drive_type}
                        onChange={(e) => setFormData({ ...formData, drive_type: e.target.value })}
                        className="mt-1.5"
                      />
                    </div>
                    <div>
                      <Label htmlFor="towing" className="text-sm font-medium">Towing Capacity (kg)</Label>
                      <Input
                        id="towing"
                        type="number"
                        value={formData.towing}
                        onChange={(e) => setFormData({ ...formData, towing: e.target.value })}
                        placeholder="0"
                        className="mt-1.5"
                      />
                    </div>
                  </>
                )}
              </div>
              <div>
                <Label htmlFor="features" className="text-sm font-medium">Features</Label>
                <Textarea
                  id="features"
                  value={formData.features}
                  onChange={(e) => setFormData({ ...formData, features: e.target.value })}
                  placeholder="Comma-separated features"
                  rows={3}
                  className="mt-1.5 resize-none"
                />
              </div>
            </div>

            {/* Engine Details Section */}
            <div className="space-y-4">
              <h3 className="font-semibold text-base">Engine Details</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                {selectedProvider === "OnlyCars" && (
                  <>
                    <div>
                      <Label htmlFor="engine_make" className="text-sm font-medium">Engine Make</Label>
                      <Input
                        id="engine_make"
                        value={formData.engine_make}
                        onChange={(e) => setFormData({ ...formData, engine_make: e.target.value })}
                        className="mt-1.5"
                      />
                    </div>
                    <div>
                      <Label htmlFor="engine_number" className="text-sm font-medium">Engine Number</Label>
                      <Input
                        id="engine_number"
                        value={formData.engine_number}
                        onChange={(e) => setFormData({ ...formData, engine_number: e.target.value })}
                        className="mt-1.5"
                      />
                    </div>
                  </>
                )}
                <div>
                  <Label htmlFor="engine_size" className="text-sm font-medium">Engine Size (cc)</Label>
                  <Input id="engine_size" value={formData.engine_size} disabled className="mt-1.5" />
                </div>
                {selectedProvider === "OnlyCars" && (
                  <div>
                    <Label htmlFor="engine_power" className="text-sm font-medium">Engine Power (kW)</Label>
                    <Input
                      id="engine_power"
                      type="number"
                      value={formData.engine_power}
                      onChange={(e) => setFormData({ ...formData, engine_power: e.target.value })}
                      placeholder="0"
                      className="mt-1.5"
                    />
                  </div>
                )}
                <div>
                  <Label htmlFor="cylinders" className="text-sm font-medium">Cylinders</Label>
                  <Input id="cylinders" value={formData.cylinders} disabled className="mt-1.5" />
                </div>
                {selectedProvider === "OnlyCars" && (
                  <div>
                    <Label htmlFor="induction" className="text-sm font-medium">Induction</Label>
                    <Input
                      id="induction"
                      value={formData.induction}
                      onChange={(e) => setFormData({ ...formData, induction: e.target.value })}
                      className="mt-1.5"
                    />
                  </div>
                )}
                <div>
                  <Label htmlFor="fuel_type" className="text-sm font-medium">Fuel Type</Label>
                  <Input id="fuel_type" value={formData.fuel_type} disabled className="mt-1.5" />
                </div>
                {selectedProvider === "OnlyCars" && (
                  <>
                    <div>
                      <Label htmlFor="fuel_capacity" className="text-sm font-medium">Fuel Capacity (L)</Label>
                      <Input
                        id="fuel_capacity"
                        type="number"
                        value={formData.fuel_capacity}
                        onChange={(e) => setFormData({ ...formData, fuel_capacity: e.target.value })}
                        placeholder="0"
                        className="mt-1.5"
                      />
                    </div>
                    <div>
                      <Label htmlFor="fuel_consumption" className="text-sm font-medium">Fuel Consumption (L/100km)</Label>
                      <Input
                        id="fuel_consumption"
                        type="number"
                        value={formData.fuel_consumption}
                        onChange={(e) => setFormData({ ...formData, fuel_consumption: e.target.value })}
                        placeholder="0"
                        className="mt-1.5"
                      />
                    </div>
                    <div>
                      <Label htmlFor="fuel_cost" className="text-sm font-medium">Fuel Cost</Label>
                      <Input
                        id="fuel_cost"
                        type="number"
                        value={formData.fuel_cost}
                        onChange={(e) => setFormData({ ...formData, fuel_cost: e.target.value })}
                        placeholder="0"
                        className="mt-1.5"
                      />
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Transmission & Specs Section */}
            <div className="space-y-4">
              <h3 className="font-semibold text-base">Transmission & Specs</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                <div>
                  <Label htmlFor="transmission" className="text-sm font-medium">Transmission</Label>
                  <Input id="transmission" value={formData.transmission} disabled className="mt-1.5" />
                </div>
                {selectedProvider === "OnlyCars" && (
                  <div>
                    <Label htmlFor="gears" className="text-sm font-medium">Number of Gears</Label>
                    <Input
                      id="gears"
                      type="number"
                      value={formData.gears}
                      onChange={(e) => setFormData({ ...formData, gears: e.target.value })}
                      placeholder="0"
                      className="mt-1.5"
                    />
                  </div>
                )}
              </div>
            </div>

            {/* Registration & Compliance Section */}
            <div className="space-y-4">
              <h3 className="font-semibold text-base">Registration & Compliance</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                <div>
                  <Label htmlFor="VIN" className="text-sm font-medium">VIN</Label>
                  <Input
                    id="VIN"
                    value={formData.VIN}
                    onChange={(e) => setFormData({ ...formData, VIN: e.target.value })}
                    className="mt-1.5"
                  />
                </div>
                <div>
                  <Label htmlFor="rego_number" className="text-sm font-medium">Rego Number</Label>
                  <Input
                    id="rego_number"
                    value={formData.rego_number}
                    onChange={(e) => setFormData({ ...formData, rego_number: e.target.value })}
                    className="mt-1.5"
                  />
                </div>
                <div>
                  <Label htmlFor="rego_expiry" className="text-sm font-medium">Rego Expiry</Label>
                  <Input
                    id="rego_expiry"
                    type="date"
                    value={formData.rego_expiry}
                    onChange={(e) => setFormData({ ...formData, rego_expiry: e.target.value })}
                    className="mt-1.5"
                  />
                </div>
                <div>
                  <Label htmlFor="build_date" className="text-sm font-medium">Build Date</Label>
                  <Input
                    id="build_date"
                    value={formData.build_date}
                    onChange={(e) => setFormData({ ...formData, build_date: e.target.value })}
                    className="mt-1.5"
                  />
                </div>
                <div>
                  <Label htmlFor="compliance_date" className="text-sm font-medium">Compliance Date</Label>
                  <Input
                    id="compliance_date"
                    type="date"
                    value={formData.compliance_date}
                    onChange={(e) => setFormData({ ...formData, compliance_date: e.target.value })}
                    className="mt-1.5"
                  />
                </div>
              </div>
            </div>

            {/* Images & Status Section */}
            <div className="space-y-4">
              <h3 className="font-semibold text-base">Images & Status</h3>
              
              {/* Image Gallery Selector */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <Label className="text-sm font-medium">Vehicle Images</Label>
                  <div className="text-xs text-muted-foreground">
                    {formData.images.length} selected
                  </div>
                </div>
                
                {loadingImages ? (
                  <div className="border rounded-lg p-8 text-center">
                    <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full mx-auto mb-2"></div>
                    <p className="text-sm text-muted-foreground">Loading images...</p>
                  </div>
                ) : vehicleImages.length > 0 ? (
                  <>
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                      {vehicleImages.map((img: any, idx: number) => {
                        const isSelected = formData.images.some((selected: any) => selected.url === img.url);
                        
                        return (
                          <div
                            key={idx}
                            className={`relative group border-2 rounded-lg overflow-hidden cursor-pointer transition-all ${
                              isSelected 
                                ? 'border-primary ring-2 ring-primary ring-offset-2' 
                                : 'border-gray-200 hover:border-primary'
                            }`}
                            onClick={() => {
                              if (isSelected) {
                                // Remove from selection
                                setFormData({
                                  ...formData,
                                  images: formData.images.filter((selected: any) => selected.url !== img.url)
                                });
                              } else {
                                // Add to selection
                                setFormData({
                                  ...formData,
                                  images: [...formData.images, { url: img.url, index: (formData.images.length + 1).toString() }]
                                });
                              }
                            }}
                          >
                            <div className="aspect-video bg-muted flex items-center justify-center">
                              <img
                                src={img.url}
                                alt={img.title || `Image ${idx + 1}`}
                                className="w-full h-full object-cover"
                                onError={(e) => {
                                  (e.target as HTMLImageElement).style.display = 'none';
                                  (e.target as HTMLImageElement).parentElement!.innerHTML = 
                                    '<div class="flex flex-col items-center justify-center h-full text-muted-foreground"><svg class="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg></div>';
                                }}
                              />
                            </div>
                            
                            {/* Selection Indicator */}
                            {isSelected && (
                              <div className="absolute top-2 right-2 bg-primary text-white rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold">
                                {formData.images.findIndex((s: any) => s.url === img.url) + 1}
                              </div>
                            )}
                            
                            {/* Hover Overlay */}
                            <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 transition-all flex items-center justify-center">
                              {isSelected ? (
                                <CheckCircle2 className="h-8 w-8 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                              ) : (
                                <Plus className="h-8 w-8 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                              )}
                            </div>
                            
                            {/* Image Info */}
                            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-2">
                              <p className="text-white text-xs truncate">{img.filename || `Image ${idx + 1}`}</p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                    
                    {/* Action Buttons */}
                    <div className="flex gap-2 mt-3">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setFormData({
                            ...formData,
                            images: vehicleImages.map((img: any, idx: number) => ({ 
                              url: img.url, 
                              index: (idx + 1).toString() 
                            }))
                          });
                        }}
                        className="text-xs"
                      >
                        Select All
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setFormData({ ...formData, images: [] });
                        }}
                        className="text-xs"
                      >
                        Clear Selection
                      </Button>
                    </div>
                  </>
                ) : (
                  <div className="border-2 border-dashed rounded-lg p-8 text-center">
                    <ImageIcon className="h-10 w-10 mx-auto text-muted-foreground mb-2" />
                    <p className="text-sm text-muted-foreground mb-2">No images available</p>
                    <p className="text-xs text-muted-foreground">Upload images to the vehicle first</p>
                  </div>
                )}
              </div>

              {/* Selected Images Preview */}
              {formData.images.length > 0 && (
                <div>
                  <Label className="text-sm font-medium">Selected Images ({formData.images.length})</Label>
                  <div className="grid grid-cols-4 sm:grid-cols-6 gap-2 mt-2">
                    {formData.images.map((img: any, idx: number) => (
                      <div key={idx} className="relative group">
                        <div className="aspect-square bg-muted rounded border overflow-hidden">
                          <img
                            src={img.url}
                            alt={`Selected ${idx + 1}`}
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <div className="absolute -top-1 -right-1 bg-primary text-white rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold">
                          {idx + 1}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* JSON Editor (Advanced - Hidden by default) */}
              <details className="mt-4">
                <summary className="text-sm font-medium cursor-pointer text-muted-foreground hover:text-foreground">
                  Advanced: Edit JSON
                </summary>
                <Textarea
                  value={JSON.stringify(formData.images, null, 2)}
                  onChange={(e) => {
                    try {
                      const parsed = JSON.parse(e.target.value);
                      setFormData({ ...formData, images: parsed });
                    } catch (err) {
                      // Invalid JSON, don't update
                    }
                  }}
                  placeholder='[{"url": "https://...", "index": "1"}]'
                  rows={4}
                  className="font-mono text-xs mt-2 resize-none"
                />
                <p className="text-xs text-muted-foreground mt-1.5">
                  Format: Array of objects with url and index properties
                </p>
              </details>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                <div>
                  <Label htmlFor="images_updated_at" className="text-sm font-medium">Images Updated At</Label>
                  <Input
                    id="images_updated_at"
                    value={formData.images_updated_at}
                    onChange={(e) => setFormData({ ...formData, images_updated_at: e.target.value })}
                    placeholder="YYYY-MM-DD HH:MM:SS"
                    className="mt-1.5"
                  />
                </div>
                <div>
                  <Label htmlFor="status" className="text-sm font-medium">Status</Label>
                  <Input
                    id="status"
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                    placeholder="e.g., pending, active, sold"
                    className="mt-1.5"
                  />
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 pt-6 border-t sticky bottom-0 bg-white pb-4">
              <Button
                variant="outline"
                onClick={() => setSideModalOpen(false)}
                disabled={loading}
                className="w-full sm:w-auto order-2 sm:order-1"
              >
                Cancel
              </Button>
              <Button 
                onClick={handleSaveDraft} 
                disabled={loading}
                className="w-full sm:flex-1 order-1 sm:order-2"
              >
                {loading ? "Saving..." : "Save as Draft"}
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>

      {/* Withdraw Confirmation Dialog */}
      <AlertDialog open={withdrawDialogOpen} onOpenChange={setWithdrawDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Withdraw Advertisement</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to withdraw this advertisement? This will mark it as sold and it will no longer be active.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleWithdraw} disabled={loading}>
              {loading ? "Withdrawing..." : "Withdraw"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Advertisement</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this advertisement? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} disabled={loading}>
              {loading ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Advertisement Logs Dialog */}
      {selectedAdForLogs && (
        <AdvertisementLogsDialog
          vehicleId={vehicle._id}
          advertisementId={selectedAdForLogs._id}
          provider={selectedAdForLogs.provider}
          open={logsDialogOpen}
          onOpenChange={setLogsDialogOpen}
        />
      )}
    </>
  );
};

export default AdvertisementSection;
