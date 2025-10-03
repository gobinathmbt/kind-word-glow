import React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Search, Filter, X, SlidersHorizontal } from "lucide-react";

type FilterOption = {
  value: string;
  label: string;
};

interface ConfigurationSearchProps {
  searchTerm: string;
  onSearchChange: (term: string) => void;
  statusFilter: string;
  onFilterChange: (value: string) => void;
  onClear: () => void;
  isLoading: boolean;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  filterOptions: FilterOption[];
  filterLabel: string;
}

const ConfigurationSearchmore: React.FC<ConfigurationSearchProps> = ({
  searchTerm,
  onSearchChange,
  statusFilter,
  onFilterChange,
  onClear,
  isLoading,
  isOpen,
  onOpenChange,
  filterLabel,
  filterOptions
}) => {
  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Search & Filter Vehicles</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          {/* Search Input */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Search</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by stock no, make, model, or plate..."
                value={searchTerm}
                onChange={(e) => onSearchChange(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          {/* Status Filter */}
          {/* Dynamic Filter */}
          <div className="space-y-2">
            <label className="text-sm font-medium">{filterLabel}</label>
            <Select value={statusFilter} onValueChange={onFilterChange}>
              <SelectTrigger>
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder={`Select ${filterLabel}`} />
              </SelectTrigger>
              <SelectContent>
                {filterOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Additional Filters (you can add more here) */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Additional Filters</label>
            <div className="text-sm text-muted-foreground">
              More filter options coming soon...
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2 pt-4">
            <Button
              variant="outline"
              onClick={onClear}
              disabled={isLoading || (!searchTerm && statusFilter === "all")}
              className="flex-1"
            >
              <X className="h-4 w-4 mr-2" />
              Clear All
            </Button>
            <Button
              onClick={() => onOpenChange(false)}
              className="flex-1 bg-blue-500 hover:bg-blue-600"
            >
              Apply Filters
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ConfigurationSearchmore;
