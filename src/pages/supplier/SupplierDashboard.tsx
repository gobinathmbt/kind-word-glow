import React, { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { supplierAuthServices } from "@/api/services";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Car,
  Calendar,
  Eye,
} from "lucide-react";
import { Link, useNavigate } from "react-router-dom";

const SupplierDashboard = () => {
  const [supplierUser, setSupplierUser] = useState<any>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const token = sessionStorage.getItem("supplier_token");
    const user = sessionStorage.getItem("supplier_user");

    if (!token || !user) {
      navigate("/login");
      return;
    }

    setSupplierUser(JSON.parse(user));
  }, [navigate]);

  const { data: vehicles, isLoading } = useQuery({
    queryKey: ["supplier-vehicles"],
    queryFn: async () => {
      const response = await supplierAuthServices.getVehicles();
      return response.data?.data || [];
    },
    enabled: !!supplierUser,
  });

  if (!supplierUser) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="h-full overflow-auto">
      <div className="mb-6">
        <h2 className="text-2xl font-bold mb-2">
          Welcome back, {supplierUser.name}!
        </h2>
        <p className="text-muted-foreground">
          {supplierUser.supplier_shop_name &&
            `${supplierUser.supplier_shop_name} | `}
          {supplierUser.email}
        </p>
      </div>

      {/* Vehicles Grid */}
      {isLoading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      ) : vehicles && vehicles.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 lg:gap-6">
          {vehicles.map((vehicle: any) => (
            <Card
              key={vehicle._id}
              className="hover:shadow-lg transition-shadow"
            >
              <div className="aspect-video relative overflow-hidden rounded-t-lg">
                <img
                  src={vehicle.vehicle_hero_image}
                  alt={vehicle.name}
                  className="object-cover w-full h-full"
                />
                <div className="absolute top-2 right-2">
                  <Badge
                    variant={
                      vehicle.vehicle_type === "inspection"
                        ? "default"
                        : "secondary"
                    }
                  >
                    {vehicle.vehicle_type}
                  </Badge>
                </div>
              </div>

              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2">
                  <Car className="h-4 w-4" />
                  <span className="text-sm sm:text-base truncate">
                    {vehicle.name ||
                      `${vehicle.year} ${vehicle.make} ${vehicle.model}`}
                  </span>
                </CardTitle>
                <div className="text-sm text-muted-foreground">
                  Stock ID: {vehicle.vehicle_stock_id} | {vehicle.plate_no}
                </div>
              </CardHeader>

              <CardContent>
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm">
                    <Calendar className="h-4 w-4" />
                    {new Date(vehicle.created_at).toLocaleDateString()}
                  </div>

                  <div className="text-sm">
                    <Badge variant="outline">
                      {(() => {
                        // Filter the quotes where vehicle_type matches
                        const filteredQuotes =
                          vehicle.quotes?.filter(
                            (quote) =>
                              quote.vehicle_type === vehicle.vehicle_type
                          ) || [];

                        return `${filteredQuotes.length} Quote${
                          filteredQuotes.length !== 1 ? "s" : ""
                        } Available`;
                      })()}
                    </Badge>
                  </div>
                </div>

                <div className="mt-4">
                  <Link
                    to={`/supplier/vehicle/${vehicle.vehicle_stock_id}/${vehicle.vehicle_type}`}
                  >
                    <Button className="w-full" size="sm">
                      <Eye className="h-4 w-4 mr-2" />
                      View Details
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="py-16">
            <div className="text-center">
              <Car className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-lg font-semibold mb-2">
                No Vehicles Assigned
              </h3>
              <p className="text-muted-foreground">
                You don't have any vehicles assigned at the moment. Check
                back later or contact the workshop.
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default SupplierDashboard;