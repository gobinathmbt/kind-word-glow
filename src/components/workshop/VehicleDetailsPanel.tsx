import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Car } from "lucide-react";

interface VehicleDetailsPanelProps {
  vehicle: any;
}

const VehicleDetailsPanel: React.FC<VehicleDetailsPanelProps> = ({ vehicle }) => {
  return (
    <Card className="h-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Car className="h-5 w-5" />
          Vehicle Details
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="aspect-video rounded-lg overflow-hidden">
          <img
            src={vehicle.vehicle_hero_image}
            alt={vehicle.name}
            className="w-full h-full object-cover"
          />
        </div>

        <div className="space-y-2">
          <h3 className="font-semibold text-lg">
            {vehicle.name ||
              `${vehicle.year} ${vehicle.make} ${vehicle.model}`}
          </h3>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div>
              <span className="text-muted-foreground">Stock ID:</span>
              <p className="font-medium">{vehicle.vehicle_stock_id}</p>
            </div>
            <div>
              <span className="text-muted-foreground">Type:</span>
              <p className="font-medium capitalize">{vehicle.vehicle_type}</p>
            </div>
            <div>
              <span className="text-muted-foreground">VIN:</span>
              <p className="font-medium">{vehicle.vin}</p>
            </div>
            <div>
              <span className="text-muted-foreground">Plate:</span>
              <p className="font-medium">{vehicle.plate_no}</p>
            </div>
          </div>
        </div>

        <div className="pt-4 border-t">
          <h4 className="font-medium mb-2">Specifications</h4>
          <div className="space-y-1 text-sm">
            {vehicle.variant && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Variant:</span>
                <span>{vehicle.variant}</span>
              </div>
            )}
            {vehicle.body_style && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Body Style:</span>
                <span>{vehicle.body_style}</span>
              </div>
            )}
            {vehicle.chassis_no && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Chassis:</span>
                <span>{vehicle.chassis_no}</span>
              </div>
            )}
          </div>
        </div>

        <div className="pt-4 border-t">
          <div className="flex justify-between items-center">
            <span className="text-muted-foreground">Status:</span>
            <Badge
              variant={
                vehicle.status === "completed" ? "default" : "secondary"
              }
            >
              {vehicle.status}
            </Badge>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default VehicleDetailsPanel;
