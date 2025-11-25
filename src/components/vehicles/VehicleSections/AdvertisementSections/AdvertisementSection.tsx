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
import { Plus, Edit, Trash2, Send, CheckCircle2, XCircle, Clock, Ban, ExternalLink, Image as ImageIcon } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import axios from "axios";

interface Advertisement {
  _id: string;
  provider: string;
  status: "draft" | "published" | "failed" | "sold";
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

  // Form state for OnlyCars - Complete payload fields
  const [formData, setFormData] = useState({
    dealer_id: "",
    yard_id: "",
    dealer_name: "",
    item_id: "",
    stock_number: "",
    title: "",
    year: "",
    make: "",
    model: "",
    series: "",
    variant: "",
    body: "",
    price: "",
    price_special: "",
    price_info: "",
    summary: "",
    description: "",
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
  });

  useEffect(() => {
    if (vehicle) {
      fetchAdvertisements();
    }
  }, [vehicle]);

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

  const handleEdit = (ad: Advertisement) => {
    setSelectedProvider(ad.provider);
    setEditMode(true);
    setEditingAdId(ad._id);
    loadFormData(ad.payload);
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
      year: vehicle.year?.toString() || "",
      make: vehicle.make || "",
      model: vehicle.model || "",
      series: vehicle.body_style || "",
      variant: vehicle.variant || "",
      body: vehicle.body_style || "",
      price: "",
      price_special: "",
      price_info: "",
      summary: "",
      description: "",
      features: allFeatures,
      condition: "",
      safety_features: safetyFeatures,
      interior_features: interiorFeatures,
      other_feature: otherFeatures,
      colour: colours,
      odometer: vehicle.vehicle_odometer?.[0]?.reading?.toString().replace(/,/g, "") || "",
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
      images: vehicle.vehicle_hero_image ? [{ url: vehicle.vehicle_hero_image, index: "1" }] : [],
      images_updated_at: new Date().toISOString().replace("T", " ").substring(0, 19),
      status: vehicle.vehicle_other_details?.[0]?.status || vehicle.status || "pending",
    });
  };

  const loadFormData = (payload: any) => {
    setFormData({
      dealer_id: payload.dealer_id || "",
      yard_id: payload.yard_id || "",
      dealer_name: payload.dealer_name || "",
      item_id: payload.item_id?.toString() || "",
      stock_number: payload.stock_number?.toString() || "",
      title: payload.title || "",
      year: payload.year?.toString() || "",
      make: payload.make || "",
      model: payload.model || "",
      series: payload.series || "",
      variant: payload.variant || "",
      body: payload.body || "",
      price: payload.price || "",
      price_special: payload.price_special || "",
      price_info: payload.price_info || "",
      summary: payload.summary || "",
      description: payload.description || "",
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
    });
  };

  const buildPayload = () => {
    if (selectedProvider === "OnlyCars") {
      return {
        dealer_id: formData.dealer_id,
        yard_id: formData.yard_id,
        dealer_name: formData.dealer_name,
        item_id: parseInt(formData.item_id) || 0,
        stock_number: parseInt(formData.stock_number) || 0,
        title: formData.title,
        year: parseInt(formData.year) || 0,
        make: formData.make,
        model: formData.model,
        series: formData.series,
        variant: formData.variant,
        body: formData.body,
        price: formData.price,
        price_special: formData.price_special,
        price_info: formData.price_info,
        summary: formData.summary,
        description: formData.description,
        features: formData.features,
        condition: formData.condition,
        colour: formData.colour,
        odometer: parseInt(formData.odometer) || 0,
        engine_make: formData.engine_make,
        engine_number: formData.engine_number,
        engine_size: parseInt(formData.engine_size) || 0,
        engine_power: parseInt(formData.engine_power) || 0,
        cylinders: parseInt(formData.cylinders) || 0,
        fuel_type: formData.fuel_type,
        fuel_capacity: parseInt(formData.fuel_capacity) || 0,
        fuel_consumption: parseInt(formData.fuel_consumption) || 0,
        fuel_cost: parseInt(formData.fuel_cost) || 0,
        transmission: formData.transmission,
        gears: parseInt(formData.gears) || 0,
        doors: parseInt(formData.doors) || 0,
        seats: parseInt(formData.seats) || 0,
        drive_type: formData.drive_type,
        towing: parseInt(formData.towing) || 0,
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
      setLoading(true);
      const payload = buildPayload();

      console.log('Saving draft:', {
        editMode,
        editingAdId,
        vehicleId: vehicle._id,
        provider: selectedProvider,
        payloadKeys: Object.keys(payload)
      });

      if (editMode && editingAdId) {
        const response = await axios.put(
          `/api/adpublishing/${vehicle._id}/advertisements/${editingAdId}`,
          { payload }
        );
        console.log('Update response:', response.data);
        toast.success("Advertisement draft updated successfully");
      } else {
        const response = await axios.post(`/api/adpublishing/${vehicle._id}/advertisements`, {
          provider: selectedProvider,
          payload,
        });
        console.log('Create response:', response.data);
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
    try {
      setLoading(true);
      await axios.post(
        `/api/adpublishing/${vehicle._id}/advertisements/${adId}/publish`
      );
      toast.success(`Advertisement published successfully`);
      // Small delay to ensure backend has completed
      await new Promise(resolve => setTimeout(resolve, 500));
      await fetchAdvertisements();
      onUpdate();
    } catch (error: any) {
      console.error("Error publishing:", error);
      toast.error(error.response?.data?.message || "Failed to publish");
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
    const variants: Record<string, { variant: "default" | "secondary" | "destructive" | "outline", icon: any }> = {
      draft: { variant: "secondary", icon: Clock },
      published: { variant: "default", icon: CheckCircle2 },
      failed: { variant: "destructive", icon: XCircle },
      sold: { variant: "outline", icon: Ban },
    };

    const config = variants[status] || { variant: "secondary", icon: Clock };
    const Icon = config.icon;

    return (
      <Badge variant={config.variant} className="flex items-center gap-1">
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
                                    <TableHead className="text-right min-w-[200px]">Actions</TableHead>
                                  </TableRow>
                                </TableHeader>
                                <TableBody>
                                  {providerAds.map((ad) => (
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
                                      <TableCell className="text-right py-3">
                                        <div className="flex items-center justify-end gap-2 flex-wrap">
                                          {/* Edit button - available for draft, published, and failed */}
                                          {(ad.status === "draft" || ad.status === "published" || ad.status === "failed") && (
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
                                          
                                          {/* Publish button - for draft and failed */}
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
                                          
                                          {/* Delete button - always available */}
                                          <Button
                                            variant="destructive"
                                            size="sm"
                                            onClick={() => {
                                              setAdToDelete(ad._id);
                                              setDeleteDialogOpen(true);
                                            }}
                                            disabled={loading}
                                            className="min-w-[40px]"
                                          >
                                            <Trash2 className="h-3 w-3" />
                                          </Button>
                                        </div>
                                      </TableCell>
                                    </TableRow>
                                  ))}
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
                <div>
                  <Label htmlFor="title" className="text-xs font-medium">Title</Label>
                  <Input
                    id="title"
                    type="text"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    className="mt-1.5"
                  />
                </div>
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
                <Label htmlFor="price_info">Price Info</Label>
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
            </div>

            {/* Description Section */}
            <div className="space-y-4">
              <h3 className="font-semibold text-base">Description</h3>
              <div>
                <Label htmlFor="summary" className="text-sm font-medium">Summary</Label>
                <Textarea
                  id="summary"
                  value={formData.summary}
                  onChange={(e) => setFormData({ ...formData, summary: e.target.value })}
                  placeholder="Brief summary"
                  rows={2}
                  className="mt-1.5 resize-none"
                />
              </div>
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
                <div>
                  <Label htmlFor="engine_size" className="text-sm font-medium">Engine Size (cc)</Label>
                  <Input id="engine_size" value={formData.engine_size} disabled className="mt-1.5" />
                </div>
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
                <div>
                  <Label htmlFor="cylinders" className="text-sm font-medium">Cylinders</Label>
                  <Input id="cylinders" value={formData.cylinders} disabled className="mt-1.5" />
                </div>
                <div>
                  <Label htmlFor="induction" className="text-sm font-medium">Induction</Label>
                  <Input
                    id="induction"
                    value={formData.induction}
                    onChange={(e) => setFormData({ ...formData, induction: e.target.value })}
                    className="mt-1.5"
                  />
                </div>
                <div>
                  <Label htmlFor="fuel_type" className="text-sm font-medium">Fuel Type</Label>
                  <Input id="fuel_type" value={formData.fuel_type} disabled className="mt-1.5" />
                </div>
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
              
              {/* Image Gallery */}
              <div>
                <Label className="text-sm font-medium">Vehicle Images</Label>
                {formData.images && formData.images.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3">
                    {formData.images.map((img: any, idx: number) => (
                      <div
                        key={idx}
                        className="relative group border rounded-lg overflow-hidden hover:shadow-md transition-all cursor-pointer"
                        onClick={() => window.open(img.url, '_blank')}
                      >
                        <div className="aspect-video bg-muted flex items-center justify-center">
                          <img
                            src={img.url}
                            alt={`Vehicle image ${img.index || idx + 1}`}
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              (e.target as HTMLImageElement).style.display = 'none';
                              (e.target as HTMLImageElement).parentElement!.innerHTML = 
                                '<div class="flex flex-col items-center justify-center h-full text-muted-foreground"><svg class="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg><span class="text-xs mt-2">Image unavailable</span></div>';
                            }}
                          />
                        </div>
                        <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-30 transition-all flex items-center justify-center">
                          <ExternalLink className="h-5 w-5 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="border-2 border-dashed rounded-lg p-8 text-center mt-3">
                    <ImageIcon className="h-10 w-10 mx-auto text-muted-foreground mb-2" />
                    <p className="text-sm text-muted-foreground">No images available</p>
                  </div>
                )}
              </div>

              {/* Raw JSON Editor (Advanced) */}
              <div>
                <Label htmlFor="images" className="text-sm font-medium">Images (JSON - Advanced)</Label>
                <Textarea
                  id="images"
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
                  rows={3}
                  className="font-mono text-xs mt-1.5 resize-none"
                />
                <p className="text-xs text-muted-foreground mt-1.5">
                  Format: Array of objects with url and index properties
                </p>
              </div>

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
    </>
  );
};

export default AdvertisementSection;
