
import React from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Edit, Trash2, ChevronLeft, ChevronRight } from "lucide-react";

interface Configuration {
  _id: string;
  config_name: string;
  description: string;
  is_active: boolean;
  created_at: string;
  version: string;
}

interface ConfigurationListProps {
  configs: Configuration[];
  selectedConfig: Configuration | null;
  onSelectConfig: (config: Configuration) => void;
  onEditConfig: (config: Configuration) => void;
  onDeleteConfig: (config: Configuration) => void;
  pagination: {
    current_page: number;
    total_pages: number;
    total_items: number;
  };
  currentPage: number;
  onPageChange: (page: number) => void;
  isLoading: boolean;
}

const ConfigurationList: React.FC<ConfigurationListProps> = ({
  configs,
  selectedConfig,
  onSelectConfig,
  onEditConfig,
  onDeleteConfig,
  pagination,
  currentPage,
  onPageChange,
  isLoading,
}) => {
  if (isLoading) {
    return (
      <div className="flex justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (configs.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-muted-foreground">No configurations found</p>
      </div>
    );
  }

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {configs.map((config) => (
          <Card
            key={config._id}
            className={`cursor-pointer transition-all hover:shadow-md ${
              selectedConfig?._id === config._id
                ? "ring-2 ring-primary bg-primary/5"
                : ""
            }`}
            onClick={() => onSelectConfig(config)}
          >
            <CardHeader className="pb-3">
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <CardTitle className="text-lg">{config.config_name}</CardTitle>
                  <CardDescription className="mt-1">
                    {config.description || "No description"}
                  </CardDescription>
                </div>
                <div className="flex space-x-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      onEditConfig(config);
                    }}
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      onDeleteConfig(config);
                    }}
                  >
                    <Trash2 className="h-4 w-4 text-red-500" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex justify-between items-center">
                <Badge variant={config.is_active ? "default" : "secondary"}>
                  {config.is_active ? "Active" : "Inactive"}
                </Badge>
                <span className="text-sm text-muted-foreground">
                  v{config.version}
                </span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Pagination */}
      {pagination && pagination.total_pages > 1 && (
        <div className="flex items-center justify-between px-2 py-4">
          <div className="text-sm text-muted-foreground">
            Showing {(currentPage - 1) * 6 + 1} to{" "}
            {Math.min(currentPage * 6, pagination.total_items)} of{" "}
            {pagination.total_items} results
          </div>
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              disabled={currentPage <= 1}
              onClick={() => onPageChange(currentPage - 1)}
            >
              <ChevronLeft className="h-4 w-4" />
              Previous
            </Button>
            <div className="flex items-center space-x-1">
              {Array.from(
                { length: Math.min(5, pagination.total_pages) },
                (_, i) => {
                  const pageNumber = i + 1;
                  return (
                    <Button
                      key={pageNumber}
                      variant={
                        currentPage === pageNumber ? "default" : "outline"
                      }
                      size="sm"
                      onClick={() => onPageChange(pageNumber)}
                    >
                      {pageNumber}
                    </Button>
                  );
                }
              )}
            </div>
            <Button
              variant="outline"
              size="sm"
              disabled={currentPage >= pagination.total_pages}
              onClick={() => onPageChange(currentPage + 1)}
            >
              Next
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </>
  );
};

export default ConfigurationList;
