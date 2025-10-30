# 🚀 TESLA-GRADE STAN + ZAPIER INTEGRATION GUIDE

## OVERVIEW
Automate Stan Store purchases → Hi Collective membership activation using Zapier webhooks and Supabase Edge Functions.

## STEP 1: DEPLOY SUPABASE FUNCTIONS

### A) Deploy Webhook Processor
```sql
-- Copy contents of supabase-stan-webhook.sql to Supabase SQL Editor
-- This creates the process_stan_purchase() function
```

### B) Deploy Email Automation  
```sql
-- Copy contents of stan-email-automation.sql to Supabase SQL Editor
-- This creates the email automation system
```

### C) Create Supabase Edge Function (Webhook Endpoint)
Create file: `supabase/functions/stan-webhook/index.ts`

```typescript
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const body = await req.json()
    console.log('Stan webhook received:', body)

    // Extract Zapier/Stan data
    const customerEmail = body.email || body.customer_email
    const customerName = body.name || body.customer_name || body.full_name
    const productName = body.product_name || body.product_title
    const amount = body.amount || body.total_amount
    const stanCustomerId = body.customer_id || body.stan_customer_id
    const stanTransactionId = body.transaction_id || body.id

    if (!customerEmail) {
      throw new Error('Customer email is required')
    }

    // Process Stan purchase
    const { data: processResult, error: processError } = await supabase
      .rpc('process_stan_purchase', {
        p_customer_email: customerEmail,
        p_customer_name: customerName,
        p_product_name: productName,
        p_amount: amount,
        p_stan_customer_id: stanCustomerId,
        p_stan_transaction_id: stanTransactionId
      })

    if (processError) {
      throw processError
    }

    // Send invitation email
    if (processResult.success) {
      const { data: emailResult } = await supabase
        .rpc('send_stan_invitation_email', {
          p_customer_email: customerEmail,
          p_customer_name: customerName,
          p_invitation_code: processResult.invitation_code,
          p_trial_days: 30
        })

      console.log('Email automation result:', emailResult)
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        data: processResult,
        message: 'Stan purchase processed successfully'
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    )

  } catch (error) {
    console.error('Stan webhook error:', error)
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400
      }
    )
  }
})
```

Deploy with: `supabase functions deploy stan-webhook`

## STEP 2: CONFIGURE ZAPIER INTEGRATION

### A) Connect Stan to Zapier
1. In Stan Store → Settings → Integrations → Connect Zapier
2. Choose trigger: **"New Customer"** (triggers on any purchase)
3. Test the connection (make a test purchase first)

### B) Configure Webhook Action
1. Add Action: **"Webhooks by Zapier"**
2. Choose **"POST"** method
3. URL: `https://[your-supabase-project].functions.supabase.co/stan-webhook`
4. Headers:
   ```
   Content-Type: application/json
   Authorization: Bearer [your-supabase-anon-key]
   ```
5. Data (JSON):
   ```json
   {
     "email": "{{customer_email}}",
     "name": "{{customer_name}}",
     "product_name": "{{product_name}}",
     "amount": "{{amount}}",
     "customer_id": "{{customer_id}}",
     "transaction_id": "{{transaction_id}}"
   }
   ```

### C) Test the Integration
1. Make a test purchase on your Stan Store
2. Check Zapier logs for successful trigger
3. Verify Supabase logs for function execution
4. Confirm invitation code generation in database

## STEP 3: UPGRADE.HTML INTEGRATION

### A) Update Upgrade Flow
The current upgrade.html will redirect to Stan Store:
- Expired users → upgrade.html → Stan Store purchase
- Stan purchase → Zapier → Auto invitation code → Email
- Customer uses code → Premium access activated

### B) Return Flow Enhancement
After Stan purchase, customers receive:
1. **Immediate**: Invitation code via email
2. **Instructions**: How to access Hi Collective
3. **Timeline**: Code expires in 7 days
4. **Support**: Contact info for assistance

## STEP 4: MONITORING & ANALYTICS

### A) Database Tracking
- All Stan purchases logged in `membership_transactions`
- Invitation codes tracked in `invitation_codes`
- User memberships updated in `user_memberships`

### B) Success Metrics
- Conversion rate: Stan purchase → App signup
- Code usage rate: Invitations sent → Used
- Customer lifetime value tracking

## STEP 5: ERROR HANDLING

### A) Failed Webhook Processing
- Zapier automatic retry (3 attempts)
- Error logging in Supabase functions
- Manual intervention alerts

### B) Customer Support
- Email log for all invitation deliveries  
- Support can regenerate codes if needed
- Manual membership activation option

## SECURITY CONSIDERATIONS

### A) Webhook Validation
- Verify requests come from Zapier
- Rate limiting on webhook endpoint
- Input sanitization and validation

### B) Code Security
- Single-use invitation codes
- 7-day expiration window
- Audit trail for all activations

---

## 🎯 EXPECTED CUSTOMER JOURNEY

1. **Purchase**: Customer buys Hi Collective on Stan Store
2. **Automation**: Zapier triggers → Supabase processes → Email sent
3. **Access**: Customer receives invitation code within minutes
4. **Signup**: Customer uses code at Hi Collective signup
5. **Premium**: Immediate premium access for 30 days
6. **Retention**: In-app upgrade prompts before trial ends

**Timeline**: Entire process from purchase to app access = **< 5 minutes**

**Success Rate Target**: >95% automation success rate