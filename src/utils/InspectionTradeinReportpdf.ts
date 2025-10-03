// src/utils/pdfGenerator.ts
import jsPDF from 'jspdf';

interface PdfData {
  formData: any;
  formNotes: any;
  formImages: any;
  formVideos: any;
  calculations: any;
}

export const generatePdfBlob = async (
  data: PdfData,
  vehicle: any,
  config: any,
  vehicleType: string,
  selectedCategory?: string
): Promise<Blob> => {
  const pdf = new jsPDF('p', 'mm', 'a4');
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const margin = 5;
  const contentWidth = pageWidth - (2 * margin);
  let currentY = 25;

  // Helper function to get categories to render
  const getCategoriesToRender = () => {
    if (vehicleType !== "inspection") return [];
    
    if (selectedCategory && selectedCategory !== "all") {
      return config.categories.filter((cat: any) => cat.category_id === selectedCategory);
    }
    
    return config.categories;
  };

  // Helper function to get dropdown by ID
  const getDropdownById = (dropdownId: any) => {
    if (!config?.dropdowns) return null;
    const id = typeof dropdownId === "object" 
      ? dropdownId._id || dropdownId.$oid 
      : dropdownId;
    return config.dropdowns.find((d: any) => d._id === id);
  };

  // Helper function to format field values
  const formatValue = (field: any, value: any) => {
    if (!value && value !== 0 && value !== false) return 'N/A';
    
    switch (field.field_type) {
      case 'boolean':
        return value === true || value === 'true' ? 'Yes' : 'No';
      
      case 'dropdown':
        if (field.dropdown_config?.allow_multiple && Array.isArray(value)) {
          const dropdown = getDropdownById(field.dropdown_config?.dropdown_id);
          if (dropdown) {
            return value.map((v: string) => {
              const option = dropdown.values.find((opt: any) => opt.option_value === v);
              return option?.display_value || v;
            }).join(', ');
          }
          return value.join(', ');
        }
        return value;
      
      case 'multiplier':
        // This case is handled separately in processFields
        if (typeof value === 'object' && value !== null) {
          return `Quantity: ${value.quantity || 0}, Price: $${value.price || 0}, Total: $${value.total || 0}`;
        }
        return typeof value === 'object' ? JSON.stringify(value) : value;
      
      case 'currency':
        return `$${parseFloat(value || 0).toFixed(2)}`;
      
      default:
        return typeof value === 'object' ? JSON.stringify(value) : value;
    }
  };

  // Add header function
  const addHeader = (pageNum: number) => {
    pdf.setFillColor(245, 247, 250);
    pdf.rect(0, 0, pageWidth, 25, 'F');
    
    pdf.setFontSize(18);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(30, 41, 59);
    pdf.text('Auto ERP', pageWidth / 2, 15, { align: 'center' });
    
    pdf.setFontSize(10);
    pdf.setFont('helvetica', 'normal');
    pdf.setTextColor(100, 116, 139);
    pdf.text(`Generated on: ${new Date().toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    })}`, pageWidth / 2, 22, { align: 'center' });
    
    // Draw header line
    pdf.setDrawColor(226, 232, 240);
    pdf.line(margin, 25, pageWidth - margin, 25);
  };

  // Add footer function
  const addFooter = (pageNum: number, totalPages: number) => {
    const footerY = pageHeight - 15;
    pdf.setFontSize(8);
    pdf.setTextColor(100, 116, 139);
    
    // Footer line
    pdf.setDrawColor(226, 232, 240);
    pdf.line(margin, footerY - 5, pageWidth - margin, footerY - 5);
    
    pdf.text(`© ${new Date().getFullYear()} Vehicle Inspection System`, pageWidth / 2, footerY, { align: 'center' });
    pdf.text(`Page ${pageNum} of ${totalPages}`, pageWidth - margin, footerY, { align: 'right' });
  };

  // Check if new page is needed
  const checkPageBreak = (requiredHeight: number) => {
    if (currentY + requiredHeight > pageHeight - 30) {
      pdf.addPage();
      addHeader(pdf.getNumberOfPages());
      currentY = 35;
    }
  };

  // Add text with word wrap
  const addWrappedText = (
    text: string, 
    x: number, 
    y: number, 
    maxWidth: number, 
    fontSize: number = 10, 
    fontStyle: string = 'normal', 
    lineHeight: number = 0.4
  ) => {
    pdf.setFontSize(fontSize);
    pdf.setFont('helvetica', fontStyle);
    const lines = pdf.splitTextToSize(text, maxWidth);
    const calculatedLineHeight = fontSize * lineHeight;
    
    lines.forEach((line: string, index: number) => {
      checkPageBreak(calculatedLineHeight);
      pdf.text(line, x, currentY);
      currentY += calculatedLineHeight;
    });
    return currentY;
  };

  // Add section with title and background
  const addSection = (title: string, y: number, bgColor: number[]) => {
    pdf.setFillColor(bgColor[0], bgColor[1], bgColor[2]);
    pdf.rect(margin, y - 3, contentWidth, 12, 'F');
    pdf.setFontSize(12);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(255, 255, 255);
    pdf.text(title, margin + 5, y + 5);
    return y + 15;
  };

  // Process fields function
  const processFields = async (
    fields: any[],
    formData: any,
    formNotes: any,
    formImages: any,
    formVideos: any
  ) => {
    for (const field of fields) {
      const value = formData[field.field_id];
      const notes = formNotes[field.field_id];
      const images = formImages[field.field_id] || [];
      const videos = formVideos[field.field_id] || [];

      checkPageBreak(20);

      // Field header
      pdf.setDrawColor(226, 232, 240);
      pdf.setFillColor(248, 250, 252);
      pdf.rect(margin, currentY - 2, contentWidth, 8, 'F');

      // Field name
      pdf.setFontSize(10);
      pdf.setFont('helvetica', 'bold');
      pdf.setTextColor(30, 41, 59);
      pdf.text(field.field_name, margin + 5, currentY + 3);

      // Field type badge
      pdf.setFontSize(7);
      pdf.setFont('helvetica', 'normal');
      pdf.setTextColor(100, 116, 139);
      pdf.text(`[${field.field_type}]`, pageWidth - margin - 30, currentY + 3);

      currentY += 10;

      // Field value - Special handling for multiplier fields
      if (field.field_type === "multiplier" && typeof value === "object" && value !== null) {
        // For multiplier fields, show "Value:" label and then details on separate lines
        pdf.setFontSize(9);
        pdf.setFont('helvetica', 'normal');
        pdf.setTextColor(71, 85, 105);
        pdf.text("Value:", margin + 5, currentY);
        currentY += 5;

        // Show multiplier details with proper formatting
        pdf.setFontSize(9);
        pdf.setTextColor(71, 85, 105);

        pdf.text(`Quantity: ${value.quantity || 0}`, margin + 10, currentY);
        currentY += 5;

        pdf.text(`Price: $${value.price || 0}`, margin + 10, currentY);
        currentY += 5;

        pdf.text(`Total: $${value.total || 0}`, margin + 10, currentY);
        currentY += 5;
      } else {
        // For other field types, use the regular formatting
        const formattedValue = formatValue(field, value);
        pdf.setFontSize(9);
        pdf.setFont('helvetica', 'normal');
        pdf.setTextColor(71, 85, 105);
        currentY = addWrappedText(`Value: ${formattedValue}`, margin + 5, currentY, contentWidth - 10, 9);
      }

      // Notes
      if (notes) {
        checkPageBreak(10);

        pdf.setFontSize(8);

        // Label
        pdf.setFont('helvetica', 'bold');
        pdf.setTextColor(161, 98, 7);
        const label = "Notes:";
        pdf.text(label, margin + 8, currentY + 4);

        // Measure width of label
        const labelWidth = pdf.getTextWidth(label + " ");

        // Value (right after colon)
        pdf.setFont('helvetica', 'normal');
        pdf.setTextColor(71, 85, 105);
        pdf.text(notes, margin + 8 + labelWidth, currentY + 4);

        currentY += 10;
      }

      // Images
      if (images.length > 0) {
        checkPageBreak(10);
        pdf.setFontSize(8);
        pdf.setFont('helvetica', 'bold');
        pdf.setTextColor(30, 64, 175);
        pdf.text(`Images (${images.length}):`, margin + 5, currentY);
        currentY += 4;

        // Add image links with truncation
        pdf.setFontSize(8);
        pdf.setTextColor(59, 130, 246);
        images.forEach((image: string, index: number) => {
          checkPageBreak(4);
          // Truncate long URLs to prevent overflow
          const maxUrlLength = 50;
          const displayUrl = image.length > maxUrlLength 
            ? image.substring(0, maxUrlLength) + "..." 
            : image;
          pdf.textWithLink(`• ${displayUrl}`, margin + 10, currentY, { url: image });
          currentY += 4;
        });

        currentY += 2;
      }

      // Videos
      if (videos.length > 0) {
        checkPageBreak(10);
        pdf.setFontSize(8);
        pdf.setFont('helvetica', 'bold');
        pdf.setTextColor(30, 64, 175);
        pdf.text(`Videos (${videos.length}):`, margin + 5, currentY);
        currentY += 4;

        // Add video links with truncation
        pdf.setFontSize(8);
        pdf.setTextColor(59, 130, 246);
        videos.forEach((video: string, index: number) => {
          checkPageBreak(4);
          // Truncate long URLs to prevent overflow
          const maxUrlLength = 50;
          const displayUrl = video.length > maxUrlLength 
            ? video.substring(0, maxUrlLength) + "..." 
            : video;
          pdf.textWithLink(`• ${displayUrl}`, margin + 10, currentY, { url: video });
          currentY += 4;
        });

        currentY += 2;
      }

      currentY += 5; // Add spacing between fields
    }
  };

  // Process calculations
  const processCalculations = (calculations: any[], calcData: any, title: string) => {
    if (!calculations || calculations.length === 0) return;

    checkPageBreak(30);

    // Calculations header
    pdf.setFillColor(240, 253, 244);
    pdf.rect(margin, currentY - 2, contentWidth, 8, 'F');
    pdf.setFontSize(11);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(22, 101, 52);
    pdf.text(title, margin + 5, currentY + 3);
    currentY += 12;

    calculations
      .filter((calc: any) => calc.is_active)
      .forEach((calc: any) => {
        checkPageBreak(8);
        pdf.setFontSize(10);
        pdf.setFont('helvetica', 'normal');
        pdf.setTextColor(71, 85, 105);
        pdf.text(calc.display_name || calc.calculation_name, margin + 8, currentY);
        pdf.setFont('helvetica', 'bold');
        pdf.setTextColor(22, 101, 52);
        const calcValue = typeof calcData[calc.calculation_id] === "number"
          ? `$${calcData[calc.calculation_id].toFixed(2)}`
          : "$0.00";
        pdf.text(calcValue, pageWidth - margin - 30, currentY);
        currentY += 7;
      });
    currentY += 10;
  };

  // Start first page
  addHeader(1);
  currentY = 35;

  // Vehicle Information Header
  if (vehicle) {
    pdf.setFillColor(239, 246, 255);
    pdf.rect(margin, currentY - 5, contentWidth, 30, 'F');

    pdf.setFontSize(14);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(30, 64, 175);
    pdf.text('Vehicle Information', margin + 5, currentY + 5);

    pdf.setFontSize(10);
    pdf.setTextColor(51, 65, 85);

    const vehicleInfo = [
      { label: 'Stock ID:', value: vehicle.vehicle_stock_id },
      { label: 'Make/Model:', value: `${vehicle.make} ${vehicle.model}` },
      { label: 'Year:', value: vehicle.year },
      { label: 'VIN:', value: vehicle.vin || 'N/A' }
    ];

    vehicleInfo.forEach((info, index) => {
      const xPos = margin + 5 + (index % 2) * (contentWidth / 2);
      const yPos = currentY + 15 + Math.floor(index / 2) * 6;

      // Label in bold
      pdf.setFont('helvetica', 'bold');
      pdf.text(info.label, xPos, yPos);

      // Value in normal font (right after label)
      const labelWidth = pdf.getTextWidth(info.label) + 2;
      pdf.setFont('helvetica', 'normal');
      pdf.text(String(info.value), xPos + labelWidth, yPos);
    });

    currentY += 35;
  }

  // Process data based on vehicle type
  if (vehicleType === "inspection") {
    const categoriesToRender = getCategoriesToRender();
    const sortedCategories = categoriesToRender.sort(
      (a: any, b: any) => (a.display_order || 0) - (b.display_order || 0)
    );

    for (const category of sortedCategories) {
      checkPageBreak(20);

      // Category Header
      currentY = addSection(category.category_name, currentY, [59, 130, 246]);

      if (category.description) {
        pdf.setFontSize(9);
        pdf.setFont('helvetica', 'italic');
        pdf.setTextColor(71, 85, 105);
        currentY = addWrappedText(category.description, margin + 5, currentY, contentWidth - 10, 9, 'italic');
        currentY += 5;
      }

      // Process sections
      const sortedSections = category.sections.sort(
        (a: any, b: any) => (a.display_order || 0) - (b.display_order || 0)
      );

      for (const section of sortedSections) {
        checkPageBreak(15);

        // Section Header
        currentY = addSection(section.section_name, currentY, [100, 116, 139]);

        // Process fields
        const sortedFields = section.fields.sort(
          (a: any, b: any) => (a.display_order || 0) - (b.display_order || 0)
        );

        await processFields(sortedFields, data.formData, data.formNotes, data.formImages, data.formVideos);
      }

      // Category calculations
      processCalculations(category.calculations, data.calculations, "Category Calculations");
    }
  } else {
    // Process other vehicle types
    // Global calculations
    processCalculations(config.calculations, data.calculations, "Global Calculations");

    // Process sections
    const sortedSections = config.sections.sort(
      (a: any, b: any) => (a.display_order || 0) - (b.display_order || 0)
    );

    for (const section of sortedSections) {
      checkPageBreak(15);

      // Section Header
      currentY = addSection(section.section_name, currentY, [100, 116, 139]);

      // Process fields
      const sortedFields = section.fields.sort(
        (a: any, b: any) => (a.display_order || 0) - (b.display_order || 0)
      );

      await processFields(sortedFields, data.formData, data.formNotes, data.formImages, data.formVideos);
    }
  }

  // Update all footers with correct page numbers
  const totalPages = pdf.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    pdf.setPage(i);
    addFooter(i, totalPages);
  }

  return pdf.output('blob');
};