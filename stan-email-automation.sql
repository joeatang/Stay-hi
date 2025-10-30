-- ========================================
-- 🚀 TESLA EMAIL AUTOMATION FOR STAN CUSTOMERS  
-- Auto-send invitation codes via Supabase Edge Functions
-- ========================================

CREATE OR REPLACE FUNCTION send_stan_invitation_email(
  p_customer_email TEXT,
  p_customer_name TEXT,
  p_invitation_code TEXT,
  p_trial_days INTEGER DEFAULT 30
) RETURNS JSONB AS $$
DECLARE
  v_email_body TEXT;
  v_subject TEXT;
  v_result JSONB;
BEGIN
  
  -- Build Tesla-grade email content
  v_subject := '🎉 Welcome to Hi Collective - Your Premium Access Code Inside';
  
  v_email_body := format('
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Welcome to Hi Collective</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto; margin: 0; padding: 20px; background: linear-gradient(135deg, #667eea 0%%, #764ba2 100%%); }
    .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 20px 40px rgba(0,0,0,0.1); }
    .header { background: linear-gradient(135deg, #FFD166, #FF7B24); padding: 40px 30px; text-align: center; }
    .logo { width: 80px; height: 80px; margin-bottom: 20px; }
    .title { color: white; font-size: 28px; font-weight: bold; margin: 0; text-shadow: 0 2px 4px rgba(0,0,0,0.2); }
    .content { padding: 40px 30px; }
    .welcome { font-size: 18px; color: #333; margin-bottom: 25px; }
    .code-box { background: #f8f9fa; border: 2px solid #FFD166; border-radius: 8px; padding: 20px; text-align: center; margin: 25px 0; }
    .code { font-size: 24px; font-weight: bold; color: #FF7B24; letter-spacing: 2px; font-family: monospace; }
    .steps { background: #f1f3f4; border-radius: 8px; padding: 20px; margin: 25px 0; }
    .step { margin: 10px 0; color: #555; }
    .cta-button { display: inline-block; background: linear-gradient(135deg, #667eea 0%%, #764ba2 100%%); color: white; text-decoration: none; padding: 15px 30px; border-radius: 8px; font-weight: bold; margin: 20px 0; }
    .footer { background: #f8f9fa; padding: 20px 30px; text-align: center; color: #666; font-size: 14px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="title">Welcome to Hi Collective</div>
      <div style="color: rgba(255,255,255,0.9); margin-top: 10px;">Your Premium Access Awaits</div>
    </div>
    
    <div class="content">
      <div class="welcome">
        Hi %s! 👋<br><br>
        Thank you for your purchase! You now have <strong>Premium Access</strong> to Hi Collective - the world''s most inspiring community platform.
      </div>
      
      <div class="code-box">
        <div style="color: #666; margin-bottom: 10px;">Your Exclusive Invitation Code:</div>
        <div class="code">%s</div>
      </div>
      
      <div class="steps">
        <div style="font-weight: bold; color: #333; margin-bottom: 15px;">🚀 Get Started in 3 Easy Steps:</div>
        <div class="step">1️⃣ Visit Hi Collective App</div>
        <div class="step">2️⃣ Click "Sign Up" and enter your invitation code</div>
        <div class="step">3️⃣ Start sharing His and inspiring the world!</div>
      </div>
      
      <div style="text-align: center;">
        <a href="https://your-hi-collective-app.com/signup" class="cta-button">
          🎯 Access Hi Collective Now
        </a>
      </div>
      
      <div style="margin-top: 30px; padding: 20px; background: #fff3cd; border-radius: 8px; border-left: 4px solid #FFD166;">
        <strong>⏰ Important:</strong> Your invitation code expires in 7 days and grants you <strong>%s days of Premium access</strong>.
      </div>
      
      <div style="margin-top: 20px; color: #666; font-size: 14px;">
        Questions? Reply to this email or contact our support team.<br>
        Welcome to the #HIREVOLUTION! 🌟
      </div>
    </div>
    
    <div class="footer">
      <div>Hi Collective - Help Inspire The World, One Hi at a Time</div>
      <div style="margin-top: 5px;">This email was sent because you purchased Hi Collective access via Stan Store.</div>
    </div>
  </div>
</body>
</html>
  ', p_customer_name, p_invitation_code, p_trial_days);

  -- TODO: Replace with actual email service integration
  -- Options: Supabase Edge Functions with Resend, SendGrid, etc.
  
  -- For now, log the email for manual sending or integrate with your preferred service
  INSERT INTO email_log (
    recipient_email,
    recipient_name, 
    subject,
    body_html,
    email_type,
    metadata,
    created_at
  ) VALUES (
    p_customer_email,
    p_customer_name,
    v_subject,
    v_email_body,
    ''stan_invitation'',
    jsonb_build_object(
      ''invitation_code'', p_invitation_code,
      ''trial_days'', p_trial_days
    ),
    NOW()
  );
  
  v_result := jsonb_build_object(
    ''success'', true,
    ''email_queued'', true,
    ''recipient'', p_customer_email,
    ''invitation_code'', p_invitation_code
  );
  
  RETURN v_result;
  
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object(
    ''success'', false,
    ''error'', SQLERRM
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create email log table if it doesn''t exist
CREATE TABLE IF NOT EXISTS email_log (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  recipient_email TEXT NOT NULL,
  recipient_name TEXT,
  subject TEXT NOT NULL,
  body_html TEXT,
  body_text TEXT,
  email_type TEXT,
  status TEXT DEFAULT ''pending'',
  sent_at TIMESTAMPTZ,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Grant permissions
GRANT EXECUTE ON FUNCTION send_stan_invitation_email TO anon, authenticated;