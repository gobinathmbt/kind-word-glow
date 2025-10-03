import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Search, Filter, X } from 'lucide-react';

interface ConfigurationSearchProps {
  searchTerm: string;
  onSearchChange: (term: string) => void;
  statusFilter: string;
  onFilterChange: (value: string) => void;
  onSearch: () => void;
  isLoading: boolean;
}

const ConfigurationSearch: React.FC<ConfigurationSearchProps> = ({
  searchTerm,
  onSearchChange,
  statusFilter,
  onFilterChange,
  onSearch,
  isLoading
}) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Search & Filter</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search configurations..."
                value={searchTerm}
                onChange={(e) => onSearchChange(e.target.value)}
                className="pl-10"
                onKeyPress={(e) => e.key === "Enter" && onSearch()}
              />
            </div>
          </div>
          <Button 
            className="bg-blue-500 hover:bg-blue-600 text-white disabled:bg-blue-300"
            onClick={onSearch}
            disabled={isLoading || !searchTerm}
          >
            <X className="h-4 w-4 mr-2" />
            Clear
          </Button>
          <Select value={statusFilter} onValueChange={onFilterChange}>
            <SelectTrigger className="w-48">
              <Filter className="h-4 w-4 mr-2" />
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="inactive">Inactive</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardContent>
    </Card>
  );
};

export default ConfigurationSearch;