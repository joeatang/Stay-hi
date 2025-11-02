# 🔑 Secrets Management Checklist

**Purpose**: Ensure proper separation of public vs. private API keys across all environments  
**Philosophy**: Never trust, always verify - assume client code is public  
**Last Updated**: 2025-11-01  

---

## Environment Matrix

### Local Development
| Variable | Value Type | Storage | Client Safe | Notes |
|----------|------------|---------|-------------|--------|
| `NEXT_PUBLIC_SUPABASE_URL` | Public URL | `.env.local` | ✅ Yes | Safe to expose |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Public Key | `.env.local` | ✅ Yes | RLS-protected |
| `SUPABASE_SERVICE_ROLE_KEY` | Private Key | `.env.local` | ❌ Never | Server-side only |
| `JWT_SECRET` | Private Secret | `.env.local` | ❌ Never | Auth verification |

### Preview Environment (Vercel)
| Variable | Value Type | Storage | Client Safe | Notes |
|----------|------------|---------|-------------|--------|
| `NEXT_PUBLIC_SUPABASE_URL` | Public URL | Vercel Env | ✅ Yes | Build-time injection |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Public Key | Vercel Env | ✅ Yes | Build-time injection |
| `SUPABASE_SERVICE_ROLE_KEY` | Private Key | Vercel Env | ❌ Never | Runtime-only |
| `JWT_SECRET` | Private Secret | Vercel Env | ❌ Never | Runtime-only |

### Production Environment (Vercel)
| Variable | Value Type | Storage | Client Safe | Notes |
|----------|------------|---------|-------------|--------|
| `NEXT_PUBLIC_SUPABASE_URL` | Public URL | Vercel Env | ✅ Yes | Production Supabase |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Public Key | Vercel Env | ✅ Yes | Production anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | Private Key | Vercel Env | ❌ Never | Production service key |
| `JWT_SECRET` | Private Secret | Vercel Env | ❌ Never | Production JWT secret |

---

## Security Verification Checklist

### ✅ Repository Security
- [ ] No `.env` files committed to repository
- [ ] `.env.local` in `.gitignore`
- [ ] No hardcoded keys in source code
- [ ] No service keys in client-side JavaScript
- [ ] GitHub secret scanning alerts resolved

### ✅ Client Bundle Security  
- [ ] Build process excludes server-only environment variables
- [ ] Browser dev tools cannot access service keys
- [ ] JavaScript bundle inspection shows only public keys
- [ ] Network tab shows no service key transmission
- [ ] Console logs do not expose private keys

### ✅ Environment Configuration
- [ ] Vercel environment variables properly scoped
- [ ] Preview environment uses non-production keys
- [ ] Production keys are production-only
- [ ] Service role keys never exposed to browser
- [ ] Key rotation procedures documented

### ✅ Runtime Security
- [ ] Server-side functions use service role properly
- [ ] Client-side code uses anon key only
- [ ] JWT verification uses proper secret
- [ ] API endpoints validate authentication
- [ ] RLS policies protect against anon key misuse

---

## Key Usage Patterns

### Safe: Public Keys (NEXT_PUBLIC_*)
```javascript
// ✅ SAFE: These can be exposed to client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, anonKey);
```

### Unsafe: Service Keys (Never in Client)
```javascript  
// ❌ NEVER DO THIS: Service key in client code
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY; // SECURITY BREACH

// ✅ CORRECT: Service key in API routes only
// pages/api/admin/users.js
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY // Server-side only
);
```

---

## Emergency Procedures

### Key Rotation (Compromise Response)
1. **Immediate**: Disable compromised key in Supabase dashboard
2. **Generate**: Create new key with same permissions
3. **Update**: Replace key in all environments (Local → Preview → Prod)
4. **Deploy**: Push changes to trigger environment refresh
5. **Verify**: Test all functionality with new keys
6. **Monitor**: Watch for failed authentication attempts

### Environment Isolation Breach
1. **Audit**: Review all environment variable configurations
2. **Rotate**: Change all potentially exposed keys
3. **Separate**: Ensure preview/prod environments use different keys
4. **Document**: Update incident response with lessons learned

### Client-Side Key Exposure
1. **Revoke**: Immediately disable exposed service keys
2. **Audit**: Review client bundle for other potential exposures  
3. **Rebuild**: Deploy new version with proper key isolation
4. **Monitor**: Watch for unauthorized API usage patterns

---

## Verification Scripts

### Local Environment Check
```bash
# Check for service keys in client bundle
npm run build
grep -r "service_role" .next/static/ && echo "❌ SERVICE KEY FOUND" || echo "✅ Clean"

# Check environment variable loading
node -e "console.log('Public:', !!process.env.NEXT_PUBLIC_SUPABASE_URL)"
node -e "console.log('Service:', !!process.env.SUPABASE_SERVICE_ROLE_KEY)"
```

### Browser Console Test
```javascript
// Paste in browser console - should show only public keys
console.log('Environment check:');
console.log('Public URL:', window.location.origin);  
console.log('Has service key:', document.body.innerHTML.includes('service_role')); // Should be false
```

### API Endpoint Verification
```bash
# Test that API routes can access service key
curl -X POST http://localhost:3000/api/admin/test-service-key
# Should return success if properly configured
```

---

## Compliance & Audit

### Regular Security Reviews
- **Weekly**: Scan repository for committed secrets
- **Monthly**: Audit Vercel environment variable configurations  
- **Quarterly**: Rotate all production keys as preventive measure
- **Annually**: Full security architecture review

### Automated Monitoring
- GitHub secret scanning (enabled)
- Vercel deployment logs (service key usage audit)
- Supabase API usage monitoring (detect anomalous patterns)
- Client-side error tracking (potential key exposure attempts)

---

*Secrets Security | Zero Trust | Environment Isolation*