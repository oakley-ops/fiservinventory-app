/**
 * Utility functions for generating PDF purchase orders
 */

/**
 * Generates a purchase order PDF using browser's print-to-PDF functionality
 * @param {Object} purchaseOrder - The purchase order data to populate
 * @returns {Promise<void>} - Opens a printable window
 */
export const generatePurchaseOrderPDF = (purchaseOrder) => {
  return new Promise((resolve) => {
    // Create a new window for printing
    const printWindow = window.open('', '_blank');
    
    if (!printWindow) {
      alert('Please allow popups for this website to generate PDF');
      resolve();
      return;
    }
    
    // Normalize supplier data for consistency (handling both old vendor_ fields and new supplier_ fields)
    const supplierName = purchaseOrder.supplier_name || purchaseOrder.vendor_name || '';
    const supplierAddress = purchaseOrder.supplier_address || purchaseOrder.address || purchaseOrder.vendor_address || '';
    const supplierEmail = purchaseOrder.supplier_email || purchaseOrder.email || purchaseOrder.vendor_email || '';
    const supplierPhone = purchaseOrder.supplier_phone || purchaseOrder.phone || purchaseOrder.vendor_phone || '';
    const contactName = purchaseOrder.contact_name || '';
    
    // Determine priority level and next day air requirements
    const priority = purchaseOrder.is_urgent === true || purchaseOrder.priority === 'urgent' ? 'Urgent' : 'Not Urgent';
    const nextDayAir = purchaseOrder.next_day_air === true ? 'Yes' : 'No';
    
    // Format date properly
    const formattedDate = purchaseOrder.created_at
      ? new Date(purchaseOrder.created_at).toLocaleDateString('en-US', {
          month: '2-digit',
          day: '2-digit',
          year: '2-digit'
        }).replace(/\//g, '.')
      : new Date().toLocaleDateString('en-US', {
          month: '2-digit',
          day: '2-digit',
          year: '2-digit'
        }).replace(/\//g, '.');
    
    // Extract machine information from notes if available
    let machineInfo = '';
    if (purchaseOrder.notes) {
      const machineMatch = purchaseOrder.notes.match(/Machine:?\s*([^,\n]+)/i);
      if (machineMatch && machineMatch[1]) {
        machineInfo = machineMatch[1].trim();
      }
    }
    
    // Determine if this is a "For Stock" purchase order
    const isForStock = purchaseOrder.notes && 
      purchaseOrder.notes.toLowerCase().includes('stock') ? 'Yes' : 'No';
    
    // Generate items HTML
    let itemsHTML = '';
    
    // Calculate the total amount of the purchase order
    let totalAmount = 0;
    if (purchaseOrder.items && purchaseOrder.items.length > 0) {
      purchaseOrder.items.forEach(item => {
        totalAmount += Number(item.total_price || (item.quantity * item.unit_price) || 0);
      });
    }
    
    // Add shipping cost and tax to total
    const shippingCost = purchaseOrder.shipping_cost || 0;
    const taxAmount = purchaseOrder.tax_amount || 0;
    const grandTotal = totalAmount + shippingCost + taxAmount;
    
    // Format all monetary values
    const formattedTotal = `$${totalAmount.toFixed(2)}`;
    const formattedShippingCost = `$${shippingCost.toFixed(2)}`;
    const formattedTaxAmount = `$${taxAmount.toFixed(2)}`;
    const formattedGrandTotal = `$${grandTotal.toFixed(2)}`;
    
    // Generate items HTML
    if (purchaseOrder.items && Array.isArray(purchaseOrder.items) && purchaseOrder.items.length > 0) {
      purchaseOrder.items.forEach((item, index) => {
        // Safely extract values with fallbacks
        const unitPrice = typeof item.unit_price === 'number' ? item.unit_price : 
                         (parseFloat(item.unit_price) || 0);
        
        const quantity = typeof item.quantity === 'number' ? item.quantity : 
                        (parseInt(item.quantity) || 0);
        
        const totalPrice = typeof item.total_price === 'number' ? item.total_price :
                          (parseFloat(item.total_price) || (unitPrice * quantity));
        
        itemsHTML += `
          <tr>
            <td>${item.manufacturer_part_number || ''}</td>
            <td>${item.fiserv_part_number || ''}</td>
            <td>${item.part_name || item.description || ''}</td>
            <td>$${unitPrice.toFixed(2)}</td>
            <td>${quantity}</td>
            <td>$${totalPrice.toFixed(2)}</td>
          </tr>
        `;
      });
    }
    
    // Generate HTML content for the printable page
    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Purchase Order #${purchaseOrder.po_number || ''}</title>
        <style>
          @page {
            size: portrait;
            margin: 0.5in;
          }
          body {
            font-family: Arial, sans-serif;
            margin: 0;
            padding: 20px;
            color: #333;
            background-color: #fff;
          }
          .purchase-order {
            max-width: 100%;
            margin: 0 auto;
          }
          .header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 20px;
            border-bottom: 2px solid #FF6600;
            padding-bottom: 10px;
          }
          .fiserv-logo {
            color: #FF6600;
            font-weight: bold;
            display: flex;
            align-items: center;
          }
          .fiserv-logo img {
            height: 40px;
            margin-right: 10px;
          }
          .po-number {
            font-size: 16px;
            font-weight: bold;
            color: #444;
          }
          .info-section {
            display: flex;
            justify-content: space-between;
            margin-bottom: 20px;
          }
          .vendor-info, .order-info {
            width: 48%;
            background-color: #f8f8f8;
            border-radius: 4px;
            padding: 15px;
            box-shadow: 0 1px 3px rgba(0,0,0,0.1);
          }
          .section-title {
            font-weight: bold;
            margin-bottom: 10px;
            border-bottom: 1px solid #ddd;
            padding-bottom: 5px;
            color: #FF6600;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 20px;
            page-break-inside: auto;
          }
          tr {
            page-break-inside: avoid;
            page-break-after: auto;
          }
          thead {
            display: table-header-group;
          }
          tfoot {
            display: table-footer-group;
          }
          th, td {
            border: 1px solid #ddd;
            padding: 8px;
            text-align: left;
          }
          th {
            background-color: #FF6600;
            color: white;
            font-weight: bold;
          }
          tr:nth-child(even) {
            background-color: #f2f2f2;
          }
          .highlight {
            background-color: #FFFF00;
            padding: 2px 5px;
            border-radius: 2px;
          }
          .totals-section {
            margin-top: 20px;
            display: flex;
            justify-content: flex-end;
          }
          .totals-table {
            width: 300px;
            border: 1px solid #ddd;
            border-radius: 4px;
            overflow: hidden;
          }
          .totals-table td {
            padding: 8px;
            border: 1px solid #ddd;
          }
          .total-row {
            font-weight: bold;
            background-color: #f0f0f0;
          }
          .total-row td:last-child {
            color: #FF6600;
          }
          .signatures {
            display: flex;
            justify-content: space-between;
            margin-top: 30px;
            page-break-inside: avoid;
          }
          .signature-line {
            width: 45%;
            border-top: 1px solid #333;
            padding-top: 5px;
            text-align: center;
            color: #666;
          }
          .page-footer {
            text-align: center;
            margin-top: 30px;
            font-size: 12px;
            color: #666;
            border-top: 1px solid #ddd;
            padding-top: 10px;
            page-break-inside: avoid;
          }
          @media print {
            body {
              padding: 0;
              -webkit-print-color-adjust: exact;
              print-color-adjust: exact;
            }
            .no-print {
              display: none;
            }
            table { page-break-inside: auto; }
            tr { page-break-inside: avoid; page-break-after: auto; }
            thead { display: table-header-group; }
            tfoot { display: table-footer-group; }
          }
        </style>
      </head>
      <body>
        <div class="purchase-order">
          <div class="header">
            <div class="fiserv-logo">
              <!-- Use the Fiserv logo image file with absolute path -->
              <img src="${window.location.origin}/assets/fiservlogo.png" alt="" />
            </div>
            <div>
              <div class="po-number">Purchase Order #${purchaseOrder.po_number || ''}</div>
              <div>Date: ${formattedDate}</div>
            </div>
          </div>
          
          <div class="info-section">
            <div class="vendor-info">
              <div class="section-title">Supplier Information</div>
              <div><strong>Supplier:</strong> ${supplierName}</div>
              ${contactName ? `<div><strong>Contact:</strong> ${contactName}</div>` : ''}
              <div style="white-space: pre-line;"><strong>Address:</strong> ${supplierAddress ? supplierAddress.replace(/\n/g, '<br>') : 'NASHVILLE'}</div>
              ${supplierEmail ? `<div><strong>Email:</strong> ${supplierEmail}</div>` : ''}
              ${supplierPhone ? `<div><strong>Phone:</strong> ${supplierPhone}</div>` : ''}
            </div>
            
            <div class="order-info">
              <div class="section-title">Order Information</div>
              <div><strong>PO Number:</strong> ${purchaseOrder.po_number || ''}</div>
              <div><strong>Date Created:</strong> ${formattedDate}</div>
              <div><strong>Status:</strong> ${purchaseOrder.status?.toUpperCase() || 'PENDING'}</div>
              <div><strong>For Stock:</strong> <span class="highlight">${isForStock}</span></div>
              ${machineInfo ? `<div><strong>Machine:</strong> ${machineInfo}</div>` : ''}
              <div><strong>Priority:</strong> <span class="highlight">${priority}</span></div>
              <div><strong>Next Day Air:</strong> <span class="highlight">${nextDayAir}</span></div>
            </div>
          </div>
          
          <table>
            <thead>
              <tr>
                <th>Supplier Part #</th>
                <th>Fiserv Part #</th>
                <th>Description</th>
                <th>Unit Price</th>
                <th>Qty</th>
                <th>Total</th>
              </tr>
            </thead>
            <tbody>
              ${itemsHTML}
            </tbody>
          </table>
          
          <div class="signatures">
            <div class="signature-line">Requested By</div>
            <div class="signature-line">Approved By</div>
          </div>
          
          <div class="totals-section">
            <table class="totals-table">
              <tbody>
                <tr>
                  <td><strong>Subtotal:</strong></td>
                  <td>${formattedTotal}</td>
                </tr>
                <tr>
                  <td><strong>Shipping:</strong></td>
                  <td>${formattedShippingCost}</td>
                </tr>
                <tr>
                  <td><strong>Tax:</strong></td>
                  <td>${formattedTaxAmount}</td>
                </tr>
                <tr class="total-row">
                  <td><strong>Grand Total:</strong></td>
                  <td>${formattedGrandTotal}</td>
                </tr>
              </tbody>
            </table>
          </div>
          
          <div class="page-footer">
            <div>Fiserv Purchase Order - Generated on ${new Date().toLocaleDateString()}</div>
          </div>
          
          <div class="no-print" style="margin-top: 30px; text-align: center;">
            <button onclick="window.print();" style="padding: 10px 20px; font-size: 16px; cursor: pointer; background-color: #FF6600; color: white; border: none; border-radius: 4px;">
              Print / Save as PDF
            </button>
          </div>
        </div>
        
        <script>
          // Auto-print when the page loads
          window.onload = function() {
            // Give a moment for styles to apply
            setTimeout(() => {
              window.print();
            }, 500);
          };
        </script>
      </body>
      </html>
    `;
    
    // Write the HTML content to the new window
    printWindow.document.open();
    printWindow.document.write(htmlContent);
    printWindow.document.close();
    
    // Wait for window to load before resolving
    printWindow.onload = function() {
      resolve();
    };
  });
};
