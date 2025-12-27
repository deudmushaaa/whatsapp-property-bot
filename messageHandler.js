import Groq from 'groq-sdk';
import { supabase } from './supabaseClient.js';
import { generateAndSendReceipt } from './receiptGenerator.js';
import dotenv from 'dotenv';

dotenv.config();

if (!process.env.GROQ_API_KEY) {
  console.error('❌ ERROR: Missing GROQ_API_KEY in .env file');
  process.exit(1);
}

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

/**
 * Process incoming WhatsApp message with AI
 */
export async function processMessage(text, landlordPhone, sock) {
  // Clean phone number (remove @s.whatsapp.net)
  const cleanPhone = landlordPhone.replace('@s.whatsapp.net', '').replace('+', '');
  
  // 1. Verify landlord exists
  const { data: landlord, error: landlordError } = await supabase
    .from('landlords')
    .select('id, name')
    .eq('phone', cleanPhone)
    .maybeSingle();
  
  if (landlordError) {
    console.error('Database error:', landlordError);
    return "❌ Database error. Please try again or contact support.";
  }
  
  if (!landlord) {
    return `❌ Your number (${cleanPhone}) is not registered as a landlord.\n\n` +
           `Please register first or contact support if this is an error.`;
  }

  console.log(`   Landlord: ${landlord.name}`);

  // 2. Use Groq AI to extract payment information
  let extracted;
  try {
    const currentMonth = new Date().toISOString().slice(0, 7); // YYYY-MM format
    
    const chatCompletion = await groq.chat.completions.create({
      messages: [
        {
          role: "system",
          content: `You extract payment information from Ugandan landlord messages.
Return ONLY valid JSON, no markdown, no explanation, no code blocks.

Response format:
{
  "action": "record_payment" | "check_status" | "unknown",
  "tenant_name": "string or null",
  "amount": number or null (in UGX),
  "period": "YYYY-MM" or null
}

Rules:
- Amounts: "500k" = 500000, "1m" = 1000000, "600" = 600000 (assume thousands)
- Months: "December" = "2024-12", "Dec" = "2024-12", "12" = "2024-12"
- If no period specified, use current month: "${currentMonth}"
- Tenant names are case-insensitive
- "Did X pay?" or "Has X paid?" = check_status action

Examples:
"Kamau paid 500k" → {"action":"record_payment","tenant_name":"Kamau","amount":500000,"period":"${currentMonth}"}
"Record 600000 from John December" → {"action":"record_payment","tenant_name":"John","amount":600000,"period":"2024-12"}
"Did Sarah pay this month?" → {"action":"check_status","tenant_name":"Sarah","amount":null,"period":"${currentMonth}"}
"Amina 450k" → {"action":"record_payment","tenant_name":"Amina","amount":450000,"period":"${currentMonth}"}`
        },
        {
          role: "user",
          content: text
        }
      ],
      model: "llama-3.3-70b-versatile",
      temperature: 0.1,
      max_tokens: 300,
      response_format: { type: "json_object" }
    });

    const rawResponse = chatCompletion.choices[0].message.content.trim();
    console.log('   AI response:', rawResponse);
    
    extracted = JSON.parse(rawResponse);
    
  } catch (error) {
    console.error('AI processing error:', error.message);
    return "🤔 I didn't understand that. Please try:\n" +
           "• 'Kamau paid 500000'\n" +
           "• 'Record payment: John 600k December'\n" +
           "• 'Did Sarah pay this month?'";
  }

  // 3. Handle payment recording
  if (extracted.action === "record_payment") {
    if (!extracted.tenant_name || !extracted.amount) {
      return "❌ Please include tenant name and amount.\n" +
             "Example: 'Kamau paid 500000'";
    }

    // Find tenant (fuzzy match by name)
    const { data: tenants, error: tenantError } = await supabase
      .from('tenants')
      .select(`
        id, 
        name, 
        phone,
        properties!inner(
          id,
          address,
          landlord_id
        )
      `)
      .eq('properties.landlord_id', landlord.id)
      .ilike('name', `%${extracted.tenant_name}%`);

    if (tenantError) {
      console.error('Tenant query error:', tenantError);
      return "❌ Database error. Please try again.";
    }

    if (!tenants || tenants.length === 0) {
      return `❌ Couldn't find tenant "${extracted.tenant_name}".\n\n` +
             `Check spelling or add them to your property first.`;
    }

    // If multiple matches, use first one (could improve with disambiguation)
    const tenant = tenants[0];
    console.log(`   Tenant found: ${tenant.name}`);

    // Record payment
    const { data: payment, error: paymentError } = await supabase
      .from('payments')
      .insert({
        tenant_id: tenant.id,
        amount: extracted.amount,
        period: extracted.period,
        recorded_at: new Date().toISOString(),
        payment_method: 'whatsapp_bot'
      })
      .select()
      .single();

    if (paymentError) {
      console.error('Payment insert error:', paymentError);
      return "❌ Failed to record payment. Please try again.";
    }

    console.log(`   Payment recorded: ${payment.id}`);

    // Generate and send receipt to tenant
    try {
      await generateAndSendReceipt(payment.id, tenant.phone, sock);
      console.log(`   Receipt sent to ${tenant.phone}`);
    } catch (receiptError) {
      console.error('Receipt generation error:', receiptError);
      // Payment is recorded, just receipt failed
      return `✅ ${extracted.amount.toLocaleString()} UGX recorded for ${tenant.name} (${extracted.period}).\n\n` +
             `⚠️ Receipt generation failed. You can generate it manually from dashboard.`;
    }

    return `✅ ${extracted.amount.toLocaleString()} UGX recorded for ${tenant.name} (${extracted.period}).\n` +
           `📄 Receipt sent to ${tenant.phone}.`;
  }

  // 4. Handle payment status check
  if (extracted.action === "check_status") {
    if (!extracted.tenant_name) {
      return "❌ Please specify which tenant.\nExample: 'Did Kamau pay this month?'";
    }

    // Find tenant
    const { data: tenants } = await supabase
      .from('tenants')
      .select(`
        id, 
        name,
        properties!inner(landlord_id)
      `)
      .eq('properties.landlord_id', landlord.id)
      .ilike('name', `%${extracted.tenant_name}%`);

    if (!tenants || tenants.length === 0) {
      return `❌ Couldn't find tenant "${extracted.tenant_name}".`;
    }

    const tenant = tenants[0];
    const checkPeriod = extracted.period || new Date().toISOString().slice(0, 7);

    // Check if payment exists for this period
    const { data: payment } = await supabase
      .from('payments')
      .select('amount, recorded_at')
      .eq('tenant_id', tenant.id)
      .eq('period', checkPeriod)
      .maybeSingle();

    if (payment) {
      const paidDate = new Date(payment.recorded_at).toLocaleDateString('en-UG');
      return `✅ Yes, ${tenant.name} paid ${payment.amount.toLocaleString()} UGX for ${checkPeriod}.\n` +
             `📅 Paid on: ${paidDate}`;
    } else {
      return `❌ No, ${tenant.name} has not paid for ${checkPeriod} yet.`;
    }
  }

  // 5. Unknown action
  return "🤔 I didn't understand that. I can help you:\n\n" +
         "• Record payments: 'Kamau paid 500000'\n" +
         "• Check status: 'Did Sarah pay this month?'\n\n" +
         "Try one of these!";
}
