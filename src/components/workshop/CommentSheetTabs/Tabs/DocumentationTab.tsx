import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FileText, FileCheck } from "lucide-react";
import { FormData } from "../../CommentSheetModal";

interface DocumentationTabProps {
  formData: FormData;
}

const DocumentationTab: React.FC<DocumentationTabProps> = ({
  formData,
}) => {
  return (
    <div className="space-y-3">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <FileText className="h-4 w-4 text-purple-600" />
            Documentation Overview
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-6">
            <FileCheck className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
            <h3 className="text-base font-medium mb-2">All documentation is managed per work entry</h3>
            <p className="text-sm text-muted-foreground mb-3">
              Individual invoices, PDFs, videos, warranties, and images are attached to specific work entries.
              Please use the Work Entries tab to manage documentation.
            </p>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3 text-xs">
              <div className="p-3 bg-blue-50 dark:bg-blue-950/20 rounded">
                <div className="font-bold text-blue-600">
                  {formData.work_entries.reduce((acc, entry) => acc + (entry.invoices?.length || 0), 0)}
                </div>
                <div className="text-muted-foreground">Invoices</div>
              </div>
              <div className="p-3 bg-green-50 dark:bg-green-950/20 rounded">
                <div className="font-bold text-green-600">
                  {formData.work_entries.reduce((acc, entry) => acc + (entry.pdfs?.length || 0), 0)}
                </div>
                <div className="text-muted-foreground">PDFs</div>
              </div>
              <div className="p-3 bg-purple-50 dark:bg-purple-950/20 rounded">
                <div className="font-bold text-purple-600">
                  {formData.work_entries.reduce((acc, entry) => acc + (entry.videos?.length || 0), 0)}
                </div>
                <div className="text-muted-foreground">Videos</div>
              </div>
              <div className="p-3 bg-orange-50 dark:bg-orange-950/20 rounded">
                <div className="font-bold text-orange-600">
                  {formData.work_entries.reduce((acc, entry) => acc + (entry.images?.length || 0), 0)}
                </div>
                <div className="text-muted-foreground">Images</div>
              </div>
              <div className="p-3 bg-pink-50 dark:bg-pink-950/20 rounded">
                <div className="font-bold text-pink-600">
                  {formData.work_entries.reduce((acc, entry) => acc + (entry.warranties?.length || 0), 0)}
                </div>
                <div className="text-muted-foreground">Warranties</div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Document Statistics */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Documentation Statistics</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {formData.work_entries.map((entry, index) => (
              <div key={entry.id} className="flex justify-between items-center p-3 bg-muted/30 rounded-lg">
                <div className="font-medium text-sm">Entry #{index + 1}</div>
                <div className="flex gap-4 text-xs">
                  <span className="text-blue-600">{entry.invoices?.length || 0} invoices</span>
                  <span className="text-green-600">{entry.pdfs?.length || 0} docs</span>
                  <span className="text-purple-600">{entry.videos?.length || 0} videos</span>
                  <span className="text-orange-600">{entry.images?.length || 0} images</span>
                  <span className="text-pink-600">{entry.warranties?.length || 0} warranties</span>
                </div>
              </div>
            ))}
            {formData.work_entries.length === 0 && (
              <div className="text-center py-4 text-muted-foreground text-sm">
                No entries available
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default DocumentationTab;