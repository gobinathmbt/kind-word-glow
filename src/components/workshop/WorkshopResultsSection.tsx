import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Plus } from "lucide-react";
import WorkshopFieldCard from "./WorkshopFieldCard";

interface WorkshopResultsSectionProps {
  vehicleType: string;
  resultData: any[];
  getStatus: (fieldId: string) => string | null;
  getQuote: (fieldId: string) => any;
  getBadgeColor: (status: string | undefined) => string;
  getFieldBorderColor: (field: any) => string;
  onSendQuote: (field: any, categoryId: string | null, sectionId: string) => void;
  onReceivedQuotes: (field: any, categoryId: string | null, sectionId: string) => void;
  onMessaging: (field: any, categoryId: string | null, sectionId: string) => void;
  onFinalWork: (field: any, categoryId: string | null, sectionId: string) => void;
  onViewWork: (field: any, categoryId: string | null, sectionId: string) => void;
  onEditField: (field: any, categoryId: string | null, sectionId: string) => void;
  onDeleteField: (field: any, categoryId: string | null, sectionId: string) => void;
  onOpenMediaViewer: (field: any, selectedMediaId: string) => void;
  onInsertField: (categoryId?: string) => void;
}

const WorkshopResultsSection: React.FC<WorkshopResultsSectionProps> = ({
  vehicleType,
  resultData,
  getStatus,
  getQuote,
  getBadgeColor,
  getFieldBorderColor,
  onSendQuote,
  onReceivedQuotes,
  onMessaging,
  onFinalWork,
  onViewWork,
  onEditField,
  onDeleteField,
  onOpenMediaViewer,
  onInsertField,
}) => {
  const renderInspectionResults = () => {
    return resultData.map((category: any, categoryIndex: number) => (
      <Card key={categoryIndex} className="mb-4">
        {category.sections?.length > 0 && (
          <>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>{category.category_name}</span>
                <div className="flex items-center gap-2">
                  <Badge variant="secondary">
                    {category.sections?.length || 0} Sections
                  </Badge>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => onInsertField(category.category_id)}
                    className="flex items-center gap-1"
                  >
                    <Plus className="h-3 w-3" />
                    Insert Field
                  </Button>
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Accordion type="multiple" className="w-full">
                {category.sections?.map((section: any, sectionIndex: number) => (
                  <AccordionItem
                    key={sectionIndex}
                    value={`section-${categoryIndex}-${sectionIndex}`}
                  >
                    {section.fields?.length > 0 && (
                      <>
                        <AccordionTrigger>
                          <div className="flex items-center justify-between w-full mr-4">
                            <span>{section.section_name}</span>
                            <Badge variant="outline">
                              {section.fields?.length || 0} Fields
                            </Badge>
                          </div>
                        </AccordionTrigger>
                        <AccordionContent>
                          <div className="space-y-4">
                            {section.fields?.map((field: any, fieldIndex: number) => (
                              <WorkshopFieldCard
                                key={fieldIndex}
                                field={field}
                                categoryId={category.category_id}
                                sectionId={section.section_id}
                                getStatus={getStatus}
                                getQuote={getQuote}
                                getBadgeColor={getBadgeColor}
                                getFieldBorderColor={getFieldBorderColor}
                                onSendQuote={onSendQuote}
                                onReceivedQuotes={onReceivedQuotes}
                                onMessaging={onMessaging}
                                onFinalWork={onFinalWork}
                                onViewWork={onViewWork}
                                onEditField={onEditField}
                                onDeleteField={onDeleteField}
                                onOpenMediaViewer={onOpenMediaViewer}
                                isWorkshopField={
                                  field.section_display_name === "at_workshop_onstaging" ||
                                  section.section_id.includes("workshop_section")
                                }
                              />
                            ))}
                          </div>
                        </AccordionContent>
                      </>
                    )}
                  </AccordionItem>
                ))}
              </Accordion>
            </CardContent>
          </>
        )}
      </Card>
    ));
  };

  const renderTradeInResults = () => {
    return resultData.map((item: any, itemIndex: number) => {
      const isCategory = item.category_id && item.sections;
      const isDirectSection = item.section_id && item.fields;

      if (isCategory) {
        return (
          <Card key={itemIndex} className="mb-4">
            {item.sections?.length > 0 && (
              <>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span>{item.category_name}</span>
                    <Badge variant="secondary">
                      {item.sections?.length || 0} Sections
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <Accordion type="multiple" className="w-full">
                    {item.sections?.map((section: any, sectionIndex: number) => (
                      <AccordionItem
                        key={sectionIndex}
                        value={`section-${itemIndex}-${sectionIndex}`}
                      >
                        {section.fields?.length > 0 && (
                          <>
                            <AccordionTrigger>
                              <div className="flex items-center justify-between w-full mr-4">
                                <span>{section.section_name}</span>
                                <Badge variant="outline">
                                  {section.fields?.length || 0} Fields
                                </Badge>
                              </div>
                            </AccordionTrigger>
                            <AccordionContent>
                              <div className="space-y-4">
                                {section.fields?.map((field: any, fieldIndex: number) => (
                                  <WorkshopFieldCard
                                    key={fieldIndex}
                                    field={field}
                                    categoryId={item.category_id}
                                    sectionId={section.section_id}
                                    getStatus={getStatus}
                                    getQuote={getQuote}
                                    getBadgeColor={getBadgeColor}
                                    getFieldBorderColor={getFieldBorderColor}
                                    onSendQuote={onSendQuote}
                                    onReceivedQuotes={onReceivedQuotes}
                                    onMessaging={onMessaging}
                                    onFinalWork={onFinalWork}
                                    onViewWork={onViewWork}
                                    onEditField={onEditField}
                                    onDeleteField={onDeleteField}
                                    onOpenMediaViewer={onOpenMediaViewer}
                                    isWorkshopField={
                                      field.section_display_name === "at_workshop_onstaging" ||
                                      section.section_id.includes("workshop_section")
                                    }
                                  />
                                ))}
                              </div>
                            </AccordionContent>
                          </>
                        )}
                      </AccordionItem>
                    ))}
                  </Accordion>
                </CardContent>
              </>
            )}
          </Card>
        );
      } else if (isDirectSection) {
        return (
            <>
              {item.fields?.length > 0 && (
          <Card key={itemIndex} className="mb-4">
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>{item.section_name}</span>
                <Badge variant="secondary">{item.fields?.length || 0} Fields</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {item.fields?.length > 0 && (
                <div className="space-y-4">
                  {item.fields?.map((field: any, fieldIndex: number) => (
                    <WorkshopFieldCard
                      key={fieldIndex}
                      field={field}
                      categoryId={null}
                      sectionId={item.section_id}
                      getStatus={getStatus}
                      getQuote={getQuote}
                      getBadgeColor={getBadgeColor}
                      getFieldBorderColor={getFieldBorderColor}
                      onSendQuote={onSendQuote}
                      onReceivedQuotes={onReceivedQuotes}
                      onMessaging={onMessaging}
                      onFinalWork={onFinalWork}
                      onViewWork={onViewWork}
                      onEditField={onEditField}
                      onDeleteField={onDeleteField}
                      onOpenMediaViewer={onOpenMediaViewer}
                      isWorkshopField={
                        field.section_display_name === "at_workshop_onstaging" ||
                        item.section_id.includes("workshop_section")
                      }
                    />
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
              )}</>
        );
      }

      return null;
    });
  };

  return (
    <div className="pt-4">
      {vehicleType === "inspection"
        ? renderInspectionResults()
        : renderTradeInResults()}
    </div>
  );
};

export default WorkshopResultsSection;
