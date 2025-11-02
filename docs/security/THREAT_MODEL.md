# 🎯 Hi App Threat Model

**Methodology**: STRIDE (Spoofing, Tampering, Repudiation, Information Disclosure, Denial of Service, Elevation of Privilege)  
**Scope**: Hi App MVP with Supabase backend  
**Last Updated**: 2025-11-01  

---

## System Actors

### 1. Anonymous Visitor
- **Trust Level**: None
- **Access**: Public feed view only
- **Capabilities**: Browse public shares, view landing pages
- **Authentication**: No credentials required
- **Threat Potential**: Low (limited access, RLS protected)

### 2. Authenticated User  
- **Trust Level**: Medium (verified email/magic link)
- **Access**: Own data + public feed  
- **Capabilities**: Create shares, manage profile, track streaks
- **Authentication**: JWT token via Supabase Auth
- **Threat Potential**: Medium (can affect own data + public feed)

### 3. Admin/Service Role
- **Trust Level**: High (internal system)
- **Access**: Full database access (RLS bypass)
- **Capabilities**: System administration, data migration, analytics
- **Authentication**: Service role key (server-side only)
- **Threat Potential**: High (full system access if compromised)

---

## Critical Assets

### 1. User Shares (`hi_shares`)
- **Sensitivity**: High (personal emotional data)
- **Impact if Compromised**: Privacy violation, emotional harm
- **Protection**: RLS policies, encryption at rest
- **Threat Vectors**: Cross-user reads, unauthorized modifications

### 2. User Profiles (`hi_profiles`)  
- **Sensitivity**: High (PII: email, name, location)
- **Impact if Compromised**: Identity theft, privacy violation
- **Protection**: RLS policies, access logging
- **Threat Vectors**: Profile enumeration, data exfiltration

### 3. Streak Data (`hi_streaks`)
- **Sensitivity**: Medium (behavioral patterns)
- **Impact if Compromised**: Motivation manipulation, gaming system
- **Protection**: Owner-only RLS policies
- **Threat Vectors**: Streak manipulation, progress theft

### 4. Referral Codes (`hi_codes`)
- **Sensitivity**: Medium (economic value)
- **Impact if Compromised**: Fraudulent redemptions, revenue loss
- **Protection**: Server-side generation, audit logging
- **Threat Vectors**: Code generation, mass redemption attacks

### 5. API Keys & Secrets
- **Sensitivity**: Critical (system access)
- **Impact if Compromised**: Full system compromise
- **Protection**: Environment isolation, rotation procedures
- **Threat Vectors**: Key exposure, client-side leakage

---

## Threat Scenarios

### T1: Data Leakage (Information Disclosure)

#### T1.1 Cross-User Data Access
- **Attack**: User A attempts to read User B's private shares
- **Vector**: Direct API calls bypassing UI restrictions
- **Mitigation**: RLS policies enforce `auth.uid() = user_id`
- **Detection**: Audit policy violations in logs
- **Impact**: High (privacy breach)

#### T1.2 Anonymous Access to Private Data
- **Attack**: Unauthenticated user attempts table access
- **Vector**: Direct Supabase API calls with anon key
- **Mitigation**: RLS denies access, public view isolation
- **Detection**: Failed authentication attempts
- **Impact**: Medium (limited by RLS)

#### T1.3 Service Worker Cache Poisoning
- **Attack**: Malicious content cached by service worker
- **Vector**: Man-in-the-middle during SW update
- **Mitigation**: HTTPS only, SW integrity checks
- **Detection**: Unexpected cache behavior reports
- **Impact**: Medium (client-side only)

### T2: Cross-User Reads/Writes (Authorization Bypass)

#### T2.1 Profile Enumeration Attack
- **Attack**: Iterate through user IDs to harvest profiles
- **Vector**: Automated API requests with valid JWT
- **Mitigation**: RLS prevents cross-user access
- **Detection**: High-rate API usage patterns
- **Impact**: High (mass privacy violation)

#### T2.2 Share Injection Attack  
- **Attack**: Create shares attributed to other users
- **Vector**: Manipulated API requests during share creation
- **Mitigation**: RLS enforces `auth.uid() = new.user_id`
- **Detection**: Insert policy violations
- **Impact**: High (impersonation, reputation damage)

### T3: Key Exposure (Credential Compromise)

#### T3.1 Service Role Key in Client Bundle
- **Attack**: Extract service key from JavaScript bundle
- **Vector**: Client-side code analysis, browser dev tools
- **Mitigation**: Never include service keys in client code
- **Detection**: Code repository scans, bundle analysis
- **Impact**: Critical (full system compromise)

#### T3.2 Environment Variable Leakage
- **Attack**: Access server environment variables
- **Vector**: Server-side request forgery, deployment logs
- **Mitigation**: Proper env isolation, log sanitization
- **Detection**: Unusual admin activity patterns
- **Impact**: Critical (credential compromise)

### T4: Service Worker Security Risks

#### T4.1 Cache Poisoning via SW Update
- **Attack**: Inject malicious cached responses
- **Vector**: Compromised SW update mechanism  
- **Mitigation**: SW integrity verification, HTTPS enforcement
- **Detection**: Client-side cache anomaly reports
- **Impact**: Medium (client-side code execution)

#### T4.2 Offline Data Exposure
- **Attack**: Access cached sensitive data while offline
- **Vector**: Device compromise, shared devices
- **Mitigation**: Selective caching, sensitive data exclusion
- **Detection**: Cache audit, user behavior analysis
- **Impact**: Medium (limited to cached data)

---

## Attack Trees

### Attack Goal: Access Another User's Private Shares

```
Access User B's Private Shares
├── Bypass Authentication
│   ├── Steal User B's JWT Token
│   │   ├── XSS Attack on User B
│   │   ├── Session Hijacking
│   │   └── Social Engineering
│   └── Use Valid Token from User A
│       ├── Modify API Requests
│       └── Attempt Cross-User Access (BLOCKED by RLS)
├── Bypass Authorization  
│   ├── SQL Injection in Supabase Query
│   │   └── Parameter Manipulation (BLOCKED by prepared statements)
│   ├── RLS Policy Bypass
│   │   └── Privilege Escalation (BLOCKED by policy design)
│   └── Direct Database Access
│       └── Service Key Compromise (HIGH IMPACT)
└── Side Channel Attacks
    ├── Cache Timing Attacks
    ├── Error Message Analysis
    └── Public Feed Data Correlation
```

### Attack Goal: Generate Fraudulent Referral Codes

```
Generate Unauthorized Referral Codes
├── Client-Side Code Manipulation
│   ├── Modify JavaScript to Call Code Creation
│   └── Direct API Call with User JWT (BLOCKED by server-side RPC)
├── Server-Side Compromise
│   ├── Service Key Theft → Direct Table Insert
│   └── Admin Account Compromise
├── Mass Redemption Attack
│   ├── Code Enumeration/Brute Force  
│   ├── Race Conditions in Redemption Logic
│   └── Replay Attacks with Valid Codes
└── Social Engineering
    ├── Trick Admin into Code Generation
    └── Phishing for Admin Credentials
```

---

## Risk Matrix

| Threat | Likelihood | Impact | Risk Level | Mitigation Status |
|--------|------------|--------|------------|-------------------|
| T1.1 Cross-User Data Access | Medium | High | **High** | ✅ RLS Policies |
| T1.2 Anonymous Private Access | Low | Medium | **Medium** | ✅ RLS + Public Views |
| T2.1 Profile Enumeration | Medium | High | **High** | ✅ RLS + Rate Limiting |
| T2.2 Share Injection | Low | High | **Medium** | ✅ RLS + Auth Checks |
| T3.1 Service Key Exposure | Low | Critical | **High** | ✅ Environment Isolation |
| T3.2 Environment Leakage | Low | Critical | **High** | ✅ Secrets Management |
| T4.1 SW Cache Poisoning | Low | Medium | **Low** | ⚠️ HTTPS + Integrity |
| T4.2 Offline Data Exposure | Medium | Low | **Low** | ⚠️ Selective Caching |

---

## Security Controls Mapping

### Prevention Controls
- **Authentication**: Supabase Auth with magic links
- **Authorization**: Row Level Security (RLS) policies  
- **Input Validation**: Prepared statements, parameter binding
- **Encryption**: HTTPS, TLS 1.3, at-rest encryption
- **Access Control**: Least privilege, role-based access

### Detection Controls  
- **Audit Logging**: All database operations logged
- **Monitoring**: Real-time policy violation alerts
- **Anomaly Detection**: High-rate operation flagging
- **Error Tracking**: Failed auth/authz attempt logging

### Response Controls
- **Incident Playbook**: Documented response procedures
- **Key Rotation**: Automated and manual key rotation
- **Read-Only Mode**: Emergency database protection
- **Backup Recovery**: Point-in-time restore capability

---

## Assumptions & Dependencies

### Security Assumptions
- Supabase infrastructure is secure and properly configured
- HTTPS/TLS provides adequate transport security  
- JWT tokens have appropriate expiration times
- Client devices are not compromised (out of scope)
- Browser security features (CSP, CORS) are effective

### External Dependencies
- **Supabase Security**: Database security, patch management
- **Vercel Security**: Deployment platform security, env protection
- **Browser Security**: Client-side security features, SW integrity
- **DNS Security**: Domain hijacking protection, certificate management

---

*Threat Model | STRIDE Methodology | Defense-in-Depth Strategy*