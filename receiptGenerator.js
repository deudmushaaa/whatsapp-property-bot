import { supabase } from './supabaseClient.js';
import puppeteer from 'puppeteer';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Generate PDF receipt and send to tenant via WhatsApp
 */
export async function generateAndSendReceipt(paymentId, tenantPhone, sock) {
  // 1. Get full payment details from Supabase
  const { data: payment, error } = await supabase
    .from('payments')
    .select(`
      *,
      tenants (
        name,
        phone,
        properties (
          address,
          landlords (
            name,
            phone,
            email
          )
        )
      )
    `)
    .eq('id', paymentId)
    .single();

  if (error || !payment) {
    throw new Error('Payment not found: ' + error?.message);
  }

  // 2. Create HTML receipt
  const receiptDate = new Date(payment.recorded_at).toLocaleDateString('en-UG', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <style>
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }
        body { 
          font-family: 'Arial', sans-serif; 
          padding: 40px;
          background: white;
        }
        .receipt {
          max-width: 600px;
          margin: 0 auto;
          border: 2px solid #333;
          padding: 30px;
        }
        .header { 
          text-align: center; 
          border-bottom: 3px solid #333;
          padding-bottom: 20px;
          margin-bottom: 30px;
        }
        .header h1 { 
          font-size: 32px;
          color: #333;
          margin-bottom: 5px;
        }
        .receipt-id { 
          color: #666; 
          font-size: 14px;
          margin-top: 10px;
          font-family: monospace;
        }
        .amount-box {
          background: #f0f0f0;
          border: 2px solid #333;
          padding: 20px;
          text-align: center;
          margin: 30px 0;
        }
        .amount-label {
          font-size: 14px;
          color: #666;
          margin-bottom: 5px;
        }
        .amount { 
          font-size: 36px; 
          font-weight: bold;
          color: #2d5;
        }
        .details { 
          margin: 30px 0; 
        }
        .row { 
          display: flex; 
          justify-content: space-between; 
          padding: 15px 10px;
          border-bottom: 1px solid #ddd;
        }
        .row:last-child {
          border-bottom: none;
        }
        .row .label { 
          color: #666;
          font-size: 14px;
        }
        .row .value { 
          font-weight: bold;
          font-size: 16px;
          text-align: right;
        }
        .footer {
          margin-top: 40px;
          padding-top: 20px;
          border-top: 2px solid #333;
          text-align: center;
        }
        .landlord-info {
          margin: 10px 0;
          color: #333;
        }
        .thank-you {
          margin-top: 30px;
          font-style: italic;
          color: #666;
          font-size: 14px;
        }
        .watermark {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%) rotate(-45deg);
          font-size: 100px;
          color: rgba(0, 200, 0, 0.05);
          font-weight: bold;
          z-index: -1;
        }
      </style>
    </head>
    <body>
      <div class="watermark">PAID</div>
      <div class="receipt">
        <div class="header">
          <h1>RENT RECEIPT</h1>
          <div class="receipt-id">Receipt No: ${payment.id.slice(0, 8).toUpperCase()}</div>
        </div>
        
        <div class="amount-box">
          <div class="amount-label">AMOUNT PAID</div>
          <div class="amount">UGX ${payment.amount.toLocaleString()}</div>
        </div>
        
        <div class="details">
          <div class="row">
            <span class="label">Tenant Name:</span>
            <span class="value">${payment.tenants.name}</span>
          </div>
          <div class="row">
            <span class="label">Property Address:</span>
            <span class="value">${payment.tenants.properties.address}</span>
          </div>
          <div class="row">
            <span class="label">Rent Period:</span>
            <span class="value">${payment.period}</span>
          </div>
          <div class="row">
            <span class="label">Payment Date:</span>
            <span class="value">${receiptDate}</span>
          </div>
          <div class="row">
            <span class="label">Payment Method:</span>
            <span class="value">${payment.payment_method === 'whatsapp_bot' ? 'Cash/Mobile Money' : 'Manual Entry'}</span>
          </div>
        </div>
        
        <div class="footer">
          <div class="landlord-info">
            <strong>Landlord:</strong> ${payment.tenants.properties.landlords.name}
          </div>
          <div class="landlord-info">
            <strong>Contact:</strong> ${payment.tenants.properties.landlords.phone}
          </div>
          ${payment.tenants.properties.landlords.email ? 
            `<div class="landlord-info">
              <strong>Email:</strong> ${payment.tenants.properties.landlords.email}
            </div>` : ''}
          <div class="thank-you">
            Thank you for your timely payment!
          </div>
        </div>
      </div>
    </body>
    </html>
  `;

  // 3. Generate PDF using Puppeteer
  let browser;
  try {
    browser = await puppeteer.launch({
      headless: 'new',
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu'
      ]
    });
    
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: 'networkidle0' });
    
    // Create temp directory if it doesn't exist
    const tmpDir = '/tmp';
    if (!fs.existsSync(tmpDir)) {
      fs.mkdirSync(tmpDir, { recursive: true });
    }
    
    const pdfPath = `${tmpDir}/receipt_${paymentId}.pdf`;
    
    await page.pdf({ 
      path: pdfPath, 
      format: 'A4',
      printBackground: true,
      margin: {
        top: '20px',
        right: '20px',
        bottom: '20px',
        left: '20px'
      }
    });
    
    await browser.close();

    // 4. Send PDF via WhatsApp
    const pdfBuffer = fs.readFileSync(pdfPath);
    
    // Format phone number for WhatsApp
    let whatsappPhone = tenantPhone;
    if (!whatsappPhone.includes('@')) {
      // Remove + if present
      whatsappPhone = whatsappPhone.replace('+', '');
      whatsappPhone = `${whatsappPhone}@s.whatsapp.net`;
    }
    
    await sock.sendMessage(whatsappPhone, {
      document: pdfBuffer,
      mimetype: 'application/pdf',
      fileName: `Receipt_${payment.tenants.name.replace(/\s+/g, '_')}_${payment.period}.pdf`,
      caption: `🧾 *Rent Receipt*\n\n` +
               `Tenant: ${payment.tenants.name}\n` +
               `Amount: UGX ${payment.amount.toLocaleString()}\n` +
               `Period: ${payment.period}\n` +
               `Date: ${receiptDate}\n\n` +
               `Thank you for your payment!`
    });

    // 5. Clean up temp file
    fs.unlinkSync(pdfPath);
    
    return true;
    
  } catch (error) {
    if (browser) {
      await browser.close();
    }
    throw new Error('PDF generation failed: ' + error.message);
  }
}
