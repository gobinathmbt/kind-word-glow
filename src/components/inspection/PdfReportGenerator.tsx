import React, { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Loader2,
  Download,
  Eye,
  X,
  FileText,
  Car,
  Calendar,
  Hash,
  DollarSign,
  User,
  Save,
} from "lucide-react";
import jsPDF from "jspdf";
import { S3Uploader } from "@/lib/s3-client";
import { toast } from "sonner";

interface PdfReportGeneratorProps {
  isOpen: boolean;
  onClose: () => void;
  data: any;
  vehicle: any;
  config: any;
  vehicleType: string;
  selectedCategory?: string;
  s3Uploader: S3Uploader | null;
  onPdfUploaded: (pdfUrl: string) => void;
  inspectorId: string;
}

const PdfReportGenerator: React.FC<PdfReportGeneratorProps> = ({
  isOpen,
  onClose,
  data,
  vehicle,
  config,
  vehicleType,
  s3Uploader,
  selectedCategory,
  onPdfUploaded,
  inspectorId,
}) => {
  const reportRef = useRef<HTMLDivElement>(null);

  // Filter categories based on selectedCategory - now for both inspection and tradein
  const getCategoriesToRender = () => {
    if (!config?.categories) return [];
    
    if (selectedCategory && selectedCategory !== "all") {
      return config.categories.filter((cat: any) => cat.category_id === selectedCategory);
    }
    
    return config.categories;
  };

  const formatValue = (field: any, value: any) => {
    if (!value && value !== 0 && value !== false) return "N/A";

    switch (field.field_type) {
      case "boolean":
        return value === true || value === "true" ? "Yes" : "No";

      case "dropdown":
        if (field.dropdown_config?.allow_multiple && Array.isArray(value)) {
          const dropdown = getDropdownById(field.dropdown_config?.dropdown_id);
          if (dropdown) {
            return value
              .map((v: string) => {
                const option = dropdown.values.find(
                  (opt: any) => opt.option_value === v
                );
                return option?.display_value || v;
              })
              .join(", ");
          }
          return value.join(", ");
        }
        return value;

      case "multiplier":
        // This case is now handled separately in the processFields function
        // But keeping this for fallback
        if (typeof value === "object" && value !== null) {
          return `Quantity: ${value.quantity || 0}, Price: $${
            value.price || 0
          }, Total: $${value.total || 0}`;
        }
        return typeof value === "object" ? JSON.stringify(value) : value;

      case "currency":
        return `$${parseFloat(value || 0).toFixed(2)}`;

      default:
        return typeof value === "object" ? JSON.stringify(value) : value;
    }
  };

  const getDropdownById = (dropdownId: any) => {
    if (!config?.dropdowns) return null;
    const id =
      typeof dropdownId === "object"
        ? dropdownId._id || dropdownId.$oid
        : dropdownId;
    return config.dropdowns.find((d: any) => d._id === id);
  };

  // Check if config has categories structure (for both inspection and tradein)
  const hasCategories = config?.categories && config.categories.length > 0;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl w-full h-full sm:max-h-[90vh] p-0 overflow-hidden">
        <DialogHeader className="px-6 py-4 border-b flex flex-row items-center justify-between bg-gradient-to-r from-primary/5 to-blue-50">
          <DialogTitle className="flex items-center space-x-2">
            <FileText className="h-5 w-5 text-primary" />
            <span className="text-primary">Generate Auto ERP Report</span>
            {selectedCategory && selectedCategory !== "all" && hasCategories && (
              <span className="text-sm text-muted-foreground ml-2">
                ({getCategoriesToRender()[0]?.category_name})
              </span>
            )}
          </DialogTitle>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </DialogHeader>

        <div className="h-full overflow-auto">
            <>
              <div className="p-6 bg-muted/20">
                <div
                  ref={reportRef}
                  className="bg-white p-8 rounded-lg shadow-sm border max-w-4xl mx-auto"
                >
                  {/* Report Header */}
                  <div className="text-center mb-8 pb-6 border-b border-gray-200">
                    <div className="w-16 h-16 mx-auto mb-4 bg-primary/10 rounded-full flex items-center justify-center">
                      <Car className="h-8 w-8 text-primary" />
                    </div>
                    <h1 className="text-3xl font-bold text-gray-900">
                      Auto ERP
                    </h1>
                    <h2 className="text-xl text-primary mt-2">
                      {config?.config_name}
                      {selectedCategory && selectedCategory !== "all" && hasCategories && (
                        <span className="text-sm text-muted-foreground block mt-1">
                          Category: {getCategoriesToRender()[0]?.category_name}
                        </span>
                      )}
                    </h2>

                    {vehicle && (
                      <div className="mt-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
                        <div className="bg-gray-50 p-3 rounded-lg">
                          <div className="text-xs text-gray-500 font-medium">
                            Stock ID
                          </div>
                          <div className="font-semibold">
                            {vehicle.vehicle_stock_id}
                          </div>
                        </div>
                        <div className="bg-gray-50 p-3 rounded-lg">
                          <div className="text-xs text-gray-500 font-medium">
                            Make/Model
                          </div>
                          <div className="font-semibold">
                            {vehicle.make} {vehicle.model}
                          </div>
                        </div>
                        <div className="bg-gray-50 p-3 rounded-lg">
                          <div className="text-xs text-gray-500 font-medium">
                            Year
                          </div>
                          <div className="font-semibold">{vehicle.year}</div>
                        </div>
                        <div className="bg-gray-50 p-3 rounded-lg">
                          <div className="text-xs text-gray-500 font-medium">
                            VIN
                          </div>
                          <div className="font-semibold">
                            {vehicle.vin || "N/A"}
                          </div>
                        </div>
                      </div>
                    )}

                    <div className="mt-6 flex items-center justify-center text-sm text-gray-500">
                      <Calendar className="h-4 w-4 mr-2" />
                      Generated on:{" "}
                      {new Date().toLocaleDateString("en-US", {
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                      })}
                    </div>
                  </div>

                  {/* Report Content */}
                  {hasCategories ? (
                    // Both inspection and tradein with categories structure
                    getCategoriesToRender()
                      .sort(
                        (a: any, b: any) =>
                          (a.display_order || 0) - (b.display_order || 0)
                      )
                      .map((category: any) => (
                        <div key={category.category_id} className="mb-10">
                          <div className="flex items-center mb-6">
                            <div className="w-3 h-8 bg-primary rounded-full mr-3"></div>
                            <h2 className="text-2xl font-semibold text-gray-900">
                              {category.category_name}
                            </h2>
                          </div>

                          {category.description && (
                            <p className="text-gray-600 mb-6 px-4 py-3 bg-blue-50 rounded-lg border-l-4 border-blue-200">
                              {category.description}
                            </p>
                          )}

                          {category.sections
                            .sort(
                              (a: any, b: any) =>
                                (a.display_order || 0) - (b.display_order || 0)
                            )
                            .map((section: any) => (
                              <div key={section.section_id} className="mb-8">
                                <h3 className="text-xl font-medium mb-4 text-gray-800 border-b pb-2">
                                  {section.section_name}
                                </h3>

                                <div className="grid grid-cols-1 gap-4">
                                  {section.fields
                                    .sort(
                                      (a: any, b: any) =>
                                        (a.display_order || 0) -
                                        (b.display_order || 0)
                                    )
                                    .map((field: any) => {
                                      const value =
                                        data.formData[field.field_id];
                                      const notes =
                                        data.formNotes[field.field_id];
                                      const images =
                                        data.formImages[field.field_id] || [];
                                      const videos =
                                        data.formVideos[field.field_id] || [];

                                      return (
                                        <div
                                          key={field.field_id}
                                          className="p-5 border rounded-lg hover:shadow-sm transition-shadow"
                                        >
                                          <div className="flex justify-between items-start mb-3">
                                            <h4 className="font-medium text-gray-900">
                                              {field.field_name}
                                            </h4>
                                            <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded-full capitalize">
                                              {field.field_type}
                                            </span>
                                          </div>

                                          <div className="mb-3">
                                            <span className="text-sm text-gray-600 font-medium">
                                              Value:{" "}
                                            </span>
                                            <span className="font-semibold">
                                              {formatValue(field, value)}
                                            </span>
                                            {field.field_type ===
                                              "multiplier" &&
                                              typeof value === "object" &&
                                              value !== null && (
                                                <div className="grid grid-cols-3 gap-2 text-sm mt-1">
                                                  <div className="flex items-center">
                                                    <Hash className="h-3 w-3 mr-1 text-muted-foreground" />
                                                    <span>
                                                      Qty: {value.quantity || 0}
                                                    </span>
                                                  </div>
                                                  <div className="flex items-center">
                                                    <DollarSign className="h-3 w-3 mr-1 text-muted-foreground" />
                                                    <span>
                                                      Price: ${value.price || 0}
                                                    </span>
                                                  </div>
                                                  <div className="flex items-center font-medium">
                                                    <DollarSign className="h-3 w-3 mr-1 text-primary" />
                                                    <span>
                                                      Total: ${value.total || 0}
                                                    </span>
                                                  </div>
                                                </div>
                                              )}
                                          </div>

                                          {notes && (
                                            <div className="mb-3 p-3 bg-yellow-50 border-l-4 border-yellow-200 rounded-r">
                                              <span className="text-sm text-gray-600 font-medium">
                                                Notes:{" "}
                                              </span>
                                              <p className="text-gray-700">
                                                {notes}
                                              </p>
                                            </div>
                                          )}

                                          {images.length > 0 && (
                                            <div className="mb-3">
                                              <span className="text-sm text-gray-600 font-medium block mb-2">
                                                Images:
                                              </span>
                                              <ul className="list-disc pl-5 space-y-1">
                                                {images.map(
                                                  (
                                                    image: string,
                                                    index: number
                                                  ) => (
                                                    <li
                                                      key={index}
                                                      className="text-sm text-blue-600 hover:text-blue-800"
                                                    >
                                                      <a
                                                        href={image}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="truncate"
                                                      >
                                                        Image {index + 1}
                                                      </a>
                                                    </li>
                                                  )
                                                )}
                                              </ul>
                                            </div>
                                          )}

                                          {videos.length > 0 && (
                                            <div>
                                              <span className="text-sm text-gray-600 font-medium block mb-1">
                                                Videos:
                                              </span>
                                              <ul className="list-disc pl-5 space-y-1">
                                                {videos.map(
                                                  (
                                                    video: string,
                                                    index: number
                                                  ) => (
                                                    <li
                                                      key={index}
                                                      className="text-sm text-blue-600 hover:text-blue-800"
                                                    >
                                                      <a
                                                        href={video}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="truncate"
                                                      >
                                                        Video {index + 1}
                                                      </a>
                                                    </li>
                                                  )
                                                )}
                                              </ul>
                                            </div>
                                          )}
                                        </div>
                                      );
                                    })}
                                </div>
                              </div>
                            ))}

                          {/* Category Calculations */}
                          {category.calculations &&
                            category.calculations.length > 0 && (
                              <div className="mt-6 p-5 bg-gradient-to-r from-primary/5 to-blue-50 rounded-lg border">
                                <h3 className="text-lg font-medium mb-4 text-primary">
                                  Calculations
                                </h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                  {category.calculations
                                    .filter((calc: any) => calc.is_active)
                                    .map((calc: any) => (
                                      <div
                                        key={calc.calculation_id}
                                        className="flex justify-between items-center p-3 bg-white rounded border"
                                      >
                                        <span className="text-gray-700">
                                          {calc.display_name}:
                                        </span>
                                        <span className="text-lg font-bold text-primary">
                                          {typeof data.calculations[
                                            calc.calculation_id
                                          ] === "number"
                                            ? `${data.calculations[
                                                calc.calculation_id
                                              ].toFixed(2)}`
                                            : "$0.00"}
                                        </span>
                                      </div>
                                    ))}
                                </div>
                              </div>
                            )}
                        </div>
                      ))
                  ) : (
                    <div>
                      {/* Global Calculations */}
                      {config.calculations &&
                        config.calculations.length > 0 && (
                          <div className="mb-8 p-5 bg-gradient-to-r from-primary/5 to-blue-50 rounded-lg border">
                            <h2 className="text-xl font-medium mb-4 text-primary">
                              Calculations
                            </h2>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                              {config.calculations
                                .filter((calc: any) => calc.is_active)
                                .map((calc: any) => (
                                  <div
                                    key={calc.calculation_id}
                                    className="flex justify-between items-center p-3 bg-white rounded border"
                                  >
                                    <span className="text-gray-700">
                                      {calc.calculation_name}:
                                    </span>
                                    <span className="text-lg font-bold text-primary">
                                      {typeof data.calculations[
                                        calc.calculation_id
                                      ] === "number"
                                        ? `${data.calculations[
                                            calc.calculation_id
                                          ].toFixed(2)}`
                                        : "$0.00"}
                                    </span>
                                  </div>
                                ))}
                            </div>
                          </div>
                        )}

                      {/* Sections */}
                      {config.sections
                        .sort(
                          (a: any, b: any) =>
                            (a.display_order || 0) - (b.display_order || 0)
                        )
                        .map((section: any) => (
                          <div key={section.section_id} className="mb-8">
                            <h3 className="text-xl font-medium mb-4 text-gray-800 border-b pb-2">
                              {section.section_name}
                            </h3>

                            <div className="grid grid-cols-1 gap-4">
                              {section.fields
                                .sort(
                                  (a: any, b: any) =>
                                    (a.display_order || 0) -
                                    (b.display_order || 0)
                                )
                                .map((field: any) => {
                                  const value = data.formData[field.field_id];
                                  const notes = data.formNotes[field.field_id];
                                  const images =
                                    data.formImages[field.field_id] || [];
                                  const videos =
                                    data.formVideos[field.field_id] || [];

                                  return (
                                    <div
                                      key={field.field_id}
                                      className="p-5 border rounded-lg hover:shadow-sm transition-shadow"
                                    >
                                      <div className="flex justify-between items-start mb-3">
                                        <h4 className="font-medium text-gray-900">
                                          {field.field_name}
                                        </h4>
                                        <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded-full capitalize">
                                          {field.field_type}
                                        </span>
                                      </div>

                                      <div className="mb-3">
                                        <span className="text-sm text-gray-600 font-medium">
                                          Value:{" "}
                                        </span>
                                        <span className="font-semibold">
                                          {formatValue(field, value)}
                                        </span>
                                        {field.field_type === "multiplier" &&
                                          typeof value === "object" &&
                                          value !== null && (
                                            <div className="grid grid-cols-3 gap-2 text-sm mt-1">
                                              <div className="flex items-center">
                                                <Hash className="h-3 w-3 mr-1 text-muted-foreground" />
                                                <span>
                                                  Qty: {value.quantity || 0}
                                                </span>
                                              </div>
                                              <div className="flex items-center">
                                                <DollarSign className="h-3 w-3 mr-1 text-muted-foreground" />
                                                <span>
                                                  Price: ${value.price || 0}
                                                </span>
                                              </div>
                                              <div className="flex items-center font-medium">
                                                <DollarSign className="h-3 w-3 mr-1 text-primary" />
                                                <span>
                                                  Total: ${value.total || 0}
                                                </span>
                                              </div>
                                            </div>
                                          )}
                                      </div>

                                      {notes && (
                                        <div className="mb-3 p-3 bg-yellow-50 border-l-4 border-yellow-200 rounded-r">
                                          <span className="text-sm text-gray-600 font-medium">
                                            Notes:{" "}
                                          </span>
                                          <p className="text-gray-700">
                                            {notes}
                                          </p>
                                        </div>
                                      )}

                                      {images.length > 0 && (
                                        <div className="mb-3">
                                          <span className="text-sm text-gray-600 font-medium block mb-2">
                                            Images:
                                          </span>
                                          <ul className="list-disc pl-5 space-y-1">
                                            {images.map(
                                              (
                                                image: string,
                                                index: number
                                              ) => (
                                                <li
                                                  key={index}
                                                  className="text-sm text-blue-600 hover:text-blue-800"
                                                >
                                                  <a
                                                    href={image}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="truncate"
                                                  >
                                                    Image {index + 1}
                                                  </a>
                                                </li>
                                              )
                                            )}
                                          </ul>
                                        </div>
                                      )}

                                      {videos.length > 0 && (
                                        <div>
                                          <span className="text-sm text-gray-600 font-medium block mb-1">
                                            Videos:
                                          </span>
                                          <ul className="list-disc pl-5 space-y-1">
                                            {videos.map(
                                              (
                                                video: string,
                                                index: number
                                              ) => (
                                                <li
                                                  key={index}
                                                  className="text-sm text-blue-600 hover:text-blue-800"
                                                >
                                                  <a
                                                    href={video}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="truncate"
                                                  >
                                                    Video {index + 1}
                                                  </a>
                                                </li>
                                              )
                                            )}
                                          </ul>
                                        </div>
                                      )}
                                    </div>
                                  );
                                })}
                            </div>
                          </div>
                        ))}
                    </div>
                  )}

                  {/* Report Footer */}
                  <div className="mt-12 pt-6 border-t border-gray-200 text-center text-xs text-gray-500">
                    <p>
                      This report was generated automatically by the Vehicle
                      Inspection System
                    </p>
                    <p className="mt-1">
                      © {new Date().getFullYear()} All rights reserved
                    </p>
                  </div>
                </div>
              </div>
            </>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default PdfReportGenerator;