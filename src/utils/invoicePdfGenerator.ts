// src/utils/invoicePdfGenerator.ts
import jsPDF from 'jspdf';
import { format } from 'date-fns';

interface InvoiceData {
  _id: string;
  invoice_number: string;
  invoice_date: string;
  due_date: string;
  payment_status: string;
  payment_method: string;
  payment_date?: string;
  payment_transaction_id?: string;
  billing_info: {
    name: string;
    email: string;
    address?: string;
    city?: string;
    postal_code?: string;
    country?: string;
    phone?: string;
  };
  items: Array<{
    description: string;
    quantity: number;
    unit_price: number;
    total_price: number;
  }>;
  subtotal: number;
  tax_amount: number;
  tax_rate: number;
  discount_amount: number;
  total_amount: number;
  notes?: string;
  subscription_id?: string;
}

export const generateInvoicePDF = (invoice: InvoiceData): void => {
  const pdf = new jsPDF('p', 'mm', 'a4');
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const margin = 15;
  const contentWidth = pageWidth - (2 * margin);
  let currentY = margin;

  // Helper function to check if we need a new page
  const checkPageBreak = (requiredSpace: number) => {
    if (currentY + requiredSpace > pageHeight - margin) {
      pdf.addPage();
      currentY = margin;
      return true;
    }
    return false;
  };

  // Header with company branding
  pdf.setFillColor(59, 130, 246); // Blue color
  pdf.rect(0, 0, pageWidth, 40, 'F');
  
  pdf.setFontSize(24);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(255, 255, 255);
  pdf.text('INVOICE', margin, 20);
  
  pdf.setFontSize(10);
  pdf.setFont('helvetica', 'normal');
  pdf.text('Auto ERP System', margin, 30);

  currentY = 50;

  // Invoice Number and Status
  pdf.setFontSize(16);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(30, 41, 59);
  pdf.text(`Invoice #${invoice.invoice_number}`, margin, currentY);
  
  // Status badge
  const statusX = pageWidth - margin - 30;
  const statusColors: Record<string, [number, number, number]> = {
    paid: [34, 197, 94],
    pending: [234, 179, 8],
    overdue: [239, 68, 68],
  };
  const statusColor = statusColors[invoice.payment_status] || [148, 163, 184];
  pdf.setFillColor(...statusColor);
  pdf.roundedRect(statusX, currentY - 5, 28, 8, 2, 2, 'F');
  pdf.setFontSize(9);
  pdf.setTextColor(255, 255, 255);
  pdf.text(invoice.payment_status.toUpperCase(), statusX + 14, currentY, { align: 'center' });

  currentY += 15;

  // Invoice Details Section
  pdf.setFontSize(10);
  pdf.setTextColor(100, 116, 139);
  pdf.setFont('helvetica', 'normal');
  
  pdf.text('Invoice Date:', margin, currentY);
  pdf.setTextColor(30, 41, 59);
  pdf.text(format(new Date(invoice.invoice_date), 'PP'), margin + 40, currentY);
  
  currentY += 6;
  pdf.setTextColor(100, 116, 139);
  pdf.text('Due Date:', margin, currentY);
  pdf.setTextColor(30, 41, 59);
  pdf.text(format(new Date(invoice.due_date), 'PP'), margin + 40, currentY);
  
  currentY += 6;
  pdf.setTextColor(100, 116, 139);
  pdf.text('Payment Method:', margin, currentY);
  pdf.setTextColor(30, 41, 59);
  pdf.text(invoice.payment_method.charAt(0).toUpperCase() + invoice.payment_method.slice(1), margin + 40, currentY);

  if (invoice.payment_date) {
    currentY += 6;
    pdf.setTextColor(100, 116, 139);
    pdf.text('Paid On:', margin, currentY);
    pdf.setTextColor(34, 197, 94);
    pdf.text(format(new Date(invoice.payment_date), 'PP'), margin + 40, currentY);
  }

  currentY += 15;

  // Bill To Section
  pdf.setFillColor(248, 250, 252);
  pdf.rect(margin, currentY, contentWidth / 2 - 5, 35, 'F');
  
  pdf.setFontSize(11);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(30, 41, 59);
  pdf.text('Bill To:', margin + 5, currentY + 7);
  
  pdf.setFontSize(10);
  pdf.setFont('helvetica', 'bold');
  pdf.text(invoice.billing_info.name, margin + 5, currentY + 14);
  
  pdf.setFont('helvetica', 'normal');
  pdf.setTextColor(100, 116, 139);
  pdf.text(invoice.billing_info.email, margin + 5, currentY + 20);
  
  if (invoice.billing_info.phone) {
    pdf.text(invoice.billing_info.phone, margin + 5, currentY + 26);
  }
  
  if (invoice.billing_info.address) {
    const addressY = invoice.billing_info.phone ? currentY + 32 : currentY + 26;
    const addressText = `${invoice.billing_info.address}${invoice.billing_info.city ? ', ' + invoice.billing_info.city : ''}`;
    pdf.text(addressText, margin + 5, addressY);
  }

  currentY += 45;
  checkPageBreak(60);

  // Items Table Header
  pdf.setFillColor(241, 245, 249);
  pdf.rect(margin, currentY, contentWidth, 10, 'F');
  
  pdf.setFontSize(10);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(30, 41, 59);
  pdf.text('Description', margin + 2, currentY + 7);
  pdf.text('Qty', pageWidth - margin - 80, currentY + 7, { align: 'right' });
  pdf.text('Unit Price', pageWidth - margin - 50, currentY + 7, { align: 'right' });
  pdf.text('Total', pageWidth - margin - 2, currentY + 7, { align: 'right' });

  currentY += 10;

  // Items
  pdf.setFont('helvetica', 'normal');
  pdf.setTextColor(30, 41, 59);
  
  invoice.items.forEach((item, index) => {
    checkPageBreak(15);
    
    const itemY = currentY + 7;
    
    // Description (with text wrapping if needed)
    const descLines = pdf.splitTextToSize(item.description, contentWidth - 90);
    pdf.text(descLines, margin + 2, itemY);
    
    // Quantity
    pdf.text(item.quantity.toString(), pageWidth - margin - 80, itemY, { align: 'right' });
    
    // Unit Price
    pdf.text(`$${item.unit_price.toFixed(2)}`, pageWidth - margin - 50, itemY, { align: 'right' });
    
    // Total
    pdf.text(`$${item.total_price.toFixed(2)}`, pageWidth - margin - 2, itemY, { align: 'right' });
    
    const lineHeight = descLines.length * 5 + 5;
    currentY += lineHeight;
    
    // Draw separator line
    if (index < invoice.items.length - 1) {
      pdf.setDrawColor(226, 232, 240);
      pdf.line(margin, currentY, pageWidth - margin, currentY);
    }
  });

  currentY += 10;
  checkPageBreak(40);

  // Totals Section
  const totalsX = pageWidth - margin - 60;
  
  pdf.setDrawColor(226, 232, 240);
  pdf.line(totalsX - 10, currentY, pageWidth - margin, currentY);
  currentY += 8;
  
  pdf.setFontSize(10);
  pdf.setFont('helvetica', 'normal');
  pdf.setTextColor(100, 116, 139);
  
  // Subtotal
  pdf.text('Subtotal:', totalsX, currentY);
  pdf.setTextColor(30, 41, 59);
  pdf.text(`$${invoice.subtotal.toFixed(2)}`, pageWidth - margin - 2, currentY, { align: 'right' });
  
  // Tax
  if (invoice.tax_amount > 0) {
    currentY += 6;
    pdf.setTextColor(100, 116, 139);
    pdf.text(`Tax (${invoice.tax_rate}%):`, totalsX, currentY);
    pdf.setTextColor(30, 41, 59);
    pdf.text(`$${invoice.tax_amount.toFixed(2)}`, pageWidth - margin - 2, currentY, { align: 'right' });
  }
  
  // Discount
  if (invoice.discount_amount > 0) {
    currentY += 6;
    pdf.setTextColor(34, 197, 94);
    pdf.text('Discount:', totalsX, currentY);
    pdf.text(`-$${invoice.discount_amount.toFixed(2)}`, pageWidth - margin - 2, currentY, { align: 'right' });
  }
  
  currentY += 8;
  pdf.setDrawColor(226, 232, 240);
  pdf.line(totalsX - 10, currentY, pageWidth - margin, currentY);
  currentY += 8;
  
  // Total
  pdf.setFontSize(12);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(30, 41, 59);
  pdf.text('Total:', totalsX, currentY);
  pdf.text(`$${invoice.total_amount.toFixed(2)}`, pageWidth - margin - 2, currentY, { align: 'right' });

  // Payment Information
  if (invoice.payment_transaction_id) {
    currentY += 15;
    checkPageBreak(20);
    
    pdf.setFillColor(248, 250, 252);
    pdf.rect(margin, currentY, contentWidth, 15, 'F');
    
    pdf.setFontSize(10);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(30, 41, 59);
    pdf.text('Payment Information', margin + 5, currentY + 7);
    
    pdf.setFont('helvetica', 'normal');
    pdf.setTextColor(100, 116, 139);
    pdf.text('Transaction ID:', margin + 5, currentY + 12);
    pdf.setTextColor(30, 41, 59);
    pdf.setFont('courier', 'normal');
    pdf.text(invoice.payment_transaction_id, margin + 35, currentY + 12);
    
    currentY += 15;
  }

  // Notes
  if (invoice.notes) {
    currentY += 10;
    checkPageBreak(20);
    
    pdf.setFontSize(10);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(30, 41, 59);
    pdf.text('Notes:', margin, currentY);
    
    currentY += 6;
    pdf.setFont('helvetica', 'normal');
    pdf.setTextColor(100, 116, 139);
    const notesLines = pdf.splitTextToSize(invoice.notes, contentWidth);
    pdf.text(notesLines, margin, currentY);
  }

  // Footer
  const footerY = pageHeight - 15;
  pdf.setFontSize(8);
  pdf.setTextColor(148, 163, 184);
  pdf.setFont('helvetica', 'italic');
  pdf.text('Thank you for your business!', pageWidth / 2, footerY, { align: 'center' });
  pdf.text(`Generated on ${format(new Date(), 'PPP')}`, pageWidth / 2, footerY + 4, { align: 'center' });

  // Save the PDF
  const fileName = `Invoice_${invoice.invoice_number}_${format(new Date(), 'yyyy-MM-dd')}.pdf`;
  pdf.save(fileName);
};
