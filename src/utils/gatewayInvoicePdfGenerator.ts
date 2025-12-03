// Enhanced invoice PDF generator using payment gateway data
import jsPDF from 'jspdf';
import { format } from 'date-fns';

interface GatewayInvoiceData {
  gateway: 'stripe' | 'razorpay' | 'paypal';
  invoice_data: any;
  subscription_details: {
    subscription_id: string;
    number_of_days: number;
    number_of_users: number;
    selected_modules: Array<{ module_name: string; cost: number }>;
    total_amount: number;
    subscription_start_date: string;
    subscription_end_date: string;
    created_at: string;
  };
}

export const generateGatewayInvoicePDF = (data: GatewayInvoiceData, billingInfo?: any): void => {
  const pdf = new jsPDF('p', 'mm', 'a4');
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const margin = 15;
  const contentWidth = pageWidth - (2 * margin);
  let currentY = margin;

  // Determine currency symbol based on gateway
  const currencySymbol = data.gateway === 'razorpay' ? 'Rs.' : '$';

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
  pdf.setFillColor(59, 130, 246);
  pdf.rect(0, 0, pageWidth, 40, 'F');
  
  pdf.setFontSize(24);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(255, 255, 255);
  pdf.text('INVOICE', margin, 20);
  
  pdf.setFontSize(10);
  pdf.setFont('helvetica', 'normal');
  pdf.text('Auto ERP System', margin, 30);

  currentY = 50;

  // Gateway Badge
  const gatewayColors: Record<string, [number, number, number]> = {
    stripe: [99, 102, 241],
    razorpay: [0, 128, 255],
    paypal: [0, 112, 186],
  };
  const gatewayColor = gatewayColors[data.gateway] || [100, 116, 139];
  
  pdf.setFillColor(...gatewayColor);
  pdf.roundedRect(pageWidth - margin - 45, currentY - 5, 45, 8, 2, 2, 'F');
  pdf.setFontSize(9);
  pdf.setTextColor(255, 255, 255);
  pdf.text(`${data.gateway.toUpperCase()} INVOICE`, pageWidth - margin - 22.5, currentY, { align: 'center' });

  // Invoice Number
  pdf.setFontSize(16);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(30, 41, 59);
  const invoiceNumber = `INV-${data.subscription_details.subscription_id.slice(-8).toUpperCase()}`;
  pdf.text(invoiceNumber, margin, currentY);

  currentY += 15;

  // Gateway-specific invoice details
  pdf.setFontSize(10);
  pdf.setTextColor(100, 116, 139);
  pdf.setFont('helvetica', 'normal');

  if (data.gateway === 'stripe') {
    const stripeData = data.invoice_data;
    
    pdf.text('Payment Intent ID:', margin, currentY);
    pdf.setTextColor(30, 41, 59);
    pdf.setFont('courier', 'normal');
    pdf.text(stripeData.payment_intent_id, margin + 50, currentY);
    
    currentY += 6;
    pdf.setFont('helvetica', 'normal');
    pdf.setTextColor(100, 116, 139);
    pdf.text('Status:', margin, currentY);
    pdf.setTextColor(34, 197, 94);
    pdf.text(stripeData.status.toUpperCase(), margin + 50, currentY);
    
    if (stripeData.receipt_number) {
      currentY += 6;
      pdf.setTextColor(100, 116, 139);
      pdf.text('Receipt Number:', margin, currentY);
      pdf.setTextColor(30, 41, 59);
      pdf.text(stripeData.receipt_number, margin + 50, currentY);
    }
    
    currentY += 6;
    pdf.setTextColor(100, 116, 139);
    pdf.text('Payment Date:', margin, currentY);
    pdf.setTextColor(30, 41, 59);
    pdf.text(format(new Date(stripeData.created), 'PPP'), margin + 50, currentY);

  } else if (data.gateway === 'razorpay') {
    const razorpayData = data.invoice_data;
    
    pdf.text('Payment ID:', margin, currentY);
    pdf.setTextColor(30, 41, 59);
    pdf.setFont('courier', 'normal');
    pdf.text(razorpayData.payment_id, margin + 50, currentY);
    
    currentY += 6;
    pdf.setFont('helvetica', 'normal');
    pdf.setTextColor(100, 116, 139);
    pdf.text('Order ID:', margin, currentY);
    pdf.setTextColor(30, 41, 59);
    pdf.setFont('courier', 'normal');
    pdf.text(razorpayData.order_id, margin + 50, currentY);
    
    currentY += 6;
    pdf.setFont('helvetica', 'normal');
    pdf.setTextColor(100, 116, 139);
    pdf.text('Payment Method:', margin, currentY);
    pdf.setTextColor(30, 41, 59);
    pdf.text(razorpayData.method.toUpperCase(), margin + 50, currentY);
    
    currentY += 6;
    pdf.setTextColor(100, 116, 139);
    pdf.text('Status:', margin, currentY);
    pdf.setTextColor(34, 197, 94);
    pdf.text(razorpayData.status.toUpperCase(), margin + 50, currentY);
    
    currentY += 6;
    pdf.setTextColor(100, 116, 139);
    pdf.text('Payment Date:', margin, currentY);
    pdf.setTextColor(30, 41, 59);
    pdf.text(format(new Date(razorpayData.created), 'PPP'), margin + 50, currentY);

  } else if (data.gateway === 'paypal') {
    const paypalData = data.invoice_data;
    
    pdf.text('Order ID:', margin, currentY);
    pdf.setTextColor(30, 41, 59);
    pdf.setFont('courier', 'normal');
    pdf.text(paypalData.order_id, margin + 50, currentY);
    
    currentY += 6;
    pdf.setFont('helvetica', 'normal');
    pdf.setTextColor(100, 116, 139);
    pdf.text('Status:', margin, currentY);
    pdf.setTextColor(34, 197, 94);
    pdf.text(paypalData.status.toUpperCase(), margin + 50, currentY);
    
    currentY += 6;
    pdf.setTextColor(100, 116, 139);
    pdf.text('Payment Date:', margin, currentY);
    pdf.setTextColor(30, 41, 59);
    pdf.text(format(new Date(paypalData.created), 'PPP'), margin + 50, currentY);
    
    if (paypalData.payer?.email) {
      currentY += 6;
      pdf.setTextColor(100, 116, 139);
      pdf.text('Payer Email:', margin, currentY);
      pdf.setTextColor(30, 41, 59);
      pdf.text(paypalData.payer.email, margin + 50, currentY);
    }
  }

  currentY += 15;

  // Bill To Section
  if (billingInfo) {
    pdf.setFillColor(248, 250, 252);
    pdf.rect(margin, currentY, contentWidth / 2 - 5, 35, 'F');
    
    pdf.setFontSize(11);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(30, 41, 59);
    pdf.text('Bill To:', margin + 5, currentY + 7);
    
    pdf.setFontSize(10);
    pdf.setFont('helvetica', 'bold');
    pdf.text(billingInfo.name || 'N/A', margin + 5, currentY + 14);
    
    pdf.setFont('helvetica', 'normal');
    pdf.setTextColor(100, 116, 139);
    if (billingInfo.email) {
      pdf.text(billingInfo.email, margin + 5, currentY + 20);
    }
    
    if (billingInfo.phone) {
      pdf.text(billingInfo.phone, margin + 5, currentY + 26);
    }
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
  
  const items = [
    {
      description: `Subscription Plan - ${data.subscription_details.number_of_users} User(s) × ${data.subscription_details.number_of_days} Days`,
      quantity: 1,
      unit_price: data.subscription_details.total_amount,
      total_price: data.subscription_details.total_amount,
    },
    ...data.subscription_details.selected_modules.map(module => ({
      description: `Module: ${module.module_name}`,
      quantity: 1,
      unit_price: module.cost,
      total_price: module.cost,
    }))
  ];

  items.forEach((item, index) => {
    checkPageBreak(15);
    
    const itemY = currentY + 7;
    
    const descLines = pdf.splitTextToSize(item.description, contentWidth - 90);
    pdf.text(descLines, margin + 2, itemY);
    
    pdf.text(item.quantity.toString(), pageWidth - margin - 80, itemY, { align: 'right' });
    pdf.text(`${currencySymbol}${item.unit_price.toFixed(2)}`, pageWidth - margin - 50, itemY, { align: 'right' });
    pdf.text(`${currencySymbol}${item.total_price.toFixed(2)}`, pageWidth - margin - 2, itemY, { align: 'right' });
    
    const lineHeight = descLines.length * 5 + 5;
    currentY += lineHeight;
    
    if (index < items.length - 1) {
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
  
  const totalAmount = data.invoice_data.amount || data.subscription_details.total_amount;
  const currency = data.invoice_data.currency || 'USD';
  
  pdf.setFontSize(12);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(30, 41, 59);
  pdf.text('Total:', totalsX, currentY);
  pdf.text(`${currencySymbol}${totalAmount.toFixed(2)}`, pageWidth - margin - 2, currentY, { align: 'right' });

  // Gateway verification badge
  currentY += 15;
  checkPageBreak(25);
  
  pdf.setFillColor(240, 253, 244);
  pdf.rect(margin, currentY, contentWidth, 20, 'F');
  
  pdf.setFontSize(10);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(22, 163, 74);
  pdf.text('✓ Payment Verified', margin + 5, currentY + 8);
  
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(9);
  pdf.setTextColor(100, 116, 139);
  pdf.text(`This invoice has been verified and fetched directly from ${data.gateway.charAt(0).toUpperCase() + data.gateway.slice(1)} payment gateway.`, margin + 5, currentY + 14);

  // Footer
  const footerY = pageHeight - 15;
  pdf.setFontSize(8);
  pdf.setTextColor(148, 163, 184);
  pdf.setFont('helvetica', 'italic');
  pdf.text('Thank you for your business!', pageWidth / 2, footerY, { align: 'center' });
  pdf.text(`Generated on ${format(new Date(), 'PPP')}`, pageWidth / 2, footerY + 4, { align: 'center' });

  // Save the PDF
  const fileName = `${data.gateway.toUpperCase()}_Invoice_${invoiceNumber}_${format(new Date(), 'yyyy-MM-dd')}.pdf`;
  pdf.save(fileName);
};
