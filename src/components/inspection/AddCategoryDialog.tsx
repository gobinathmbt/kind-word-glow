
import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

interface AddCategoryDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onAddCategory: (categoryData: {
    category_name: string;
    category_id: string;
    description: string;
  }) => void;
  isLoading?: boolean;
}

const AddCategoryDialog: React.FC<AddCategoryDialogProps> = ({
  isOpen,
  onClose,
  onAddCategory,
  isLoading = false,
}) => {
  const [categoryName, setCategoryName] = useState('');
  const [description, setDescription] = useState('');
  const [categoryId, setCategoryId] = useState('');

  // Auto-generate category ID from category name
  useEffect(() => {
    const generatedId = categoryName
      .toLowerCase()
      .replace(/\s+/g, '_')
      .replace(/[^a-z0-9_]/g, '');
    setCategoryId(generatedId);
  }, [categoryName]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!categoryName.trim()) return;

    onAddCategory({
      category_name: categoryName.trim(),
      category_id: categoryId,
      description: description.trim(),
    });
  };

  const handleClose = () => {
    setCategoryName('');
    setDescription('');
    setCategoryId('');
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add Category</DialogTitle>
          <DialogDescription>
            Create a new category for this inspection configuration
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="category_name">Category Name</Label>
            <Input
              id="category_name"
              value={categoryName}
              onChange={(e) => setCategoryName(e.target.value)}
              placeholder="At Arrival"
              required
            />
          </div>
          
          <div>
            <Label htmlFor="category_id">Category ID</Label>
            <Input
              id="category_id"
              value={categoryId}
              disabled
              className="bg-muted"
              placeholder="Auto-generated from category name"
            />
          </div>
          
          <div>
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Inspection checks performed when vehicle arrives"
              rows={3}
            />
          </div>
          
          <div className="flex justify-end space-x-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isLoading || !categoryName.trim()}
            >
              {isLoading ? 'Adding...' : 'Add Category'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default AddCategoryDialog;
