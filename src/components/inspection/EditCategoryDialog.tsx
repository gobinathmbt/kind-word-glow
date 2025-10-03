
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

interface EditCategoryDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onUpdateCategory: (categoryData: {
    category_name: string;
    category_id: string;
    description: string;
  }) => void;
  category: {
    category_id: string;
    category_name: string;
    description: string;
  } | null;
  isLoading: boolean;
}

const EditCategoryDialog: React.FC<EditCategoryDialogProps> = ({
  isOpen,
  onClose,
  onUpdateCategory,
  category,
  isLoading,
}) => {
  const [formData, setFormData] = useState({
    category_name: '',
    description: '',
  });

  useEffect(() => {
    if (category) {
      setFormData({
        category_name: category.category_name,
        description: category.description,
      });
    }
  }, [category]);

  const generateCategoryId = (name: string) => {
    return name.toLowerCase().replace(/\s+/g, '_');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!category) return;

    const categoryId = generateCategoryId(formData.category_name);
    
    onUpdateCategory({
      category_name: formData.category_name,
      category_id: categoryId,
      description: formData.description,
    });
  };

  const handleClose = () => {
    onClose();
    if (category) {
      setFormData({
        category_name: category.category_name,
        description: category.description,
      });
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit Category</DialogTitle>
          <DialogDescription>
            Update the category name and description
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="category_name">Category Name</Label>
            <Input
              id="category_name"
              value={formData.category_name}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  category_name: e.target.value,
                })
              }
              placeholder="Enter category name"
              required
            />
          </div>
          <div>
            <Label htmlFor="category_id">Category ID</Label>
            <Input
              id="category_id"
              value={generateCategoryId(formData.category_name)}
              disabled
              className="bg-muted"
            />
          </div>
          <div>
            <Label htmlFor="description">Description</Label>
            <Input
              id="description"
              value={formData.description}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  description: e.target.value,
                })
              }
              placeholder="Enter category description"
            />
          </div>
          <div className="flex justify-end space-x-2">
            <Button type="button" variant="outline" onClick={handleClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? 'Updating...' : 'Update Category'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default EditCategoryDialog;
