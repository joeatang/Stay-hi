# 🚀 Stay Hi → Trac Network: Strategic Port Plan

> **Date:** February 6, 2026  
> **Feasibility:** 75-80% (High, with strategic approach)  
> **Impact on Current Users:** 0% (parallel development)  
> **Timeline:** 3-6 months for MVP, 9-12 months for feature parity

---

## 📊 FEASIBILITY ASSESSMENT: 75-80%

### Why High Feasibility ✅

| Factor | Current State | Trac Alignment | Score |
|--------|---------------|----------------|-------|
| **Language** | JavaScript (ES6+) | JS contracts + Pear Runtime | 95% ✅ |
| **Data Model** | Simple relational (moments, profiles, stats) | Maps to key-value (Hyperbee) | 80% ✅ |
| **Points System** | Hi Points (database ledger) | TAP tokens (Bitcoin-native) | 90% ✅ |
| **Philosophy** | Positivity, self-improvement | Self-custody, P2P ownership | 85% ✅ |
| **User Base** | 30 users (manageable migration) | Small seed group for beta | 95% ✅ |
| **Code Quality** | Modular, well-documented | Easy to adapt | 80% ✅ |

### Why Not 100% ❌

| Challenge | Impact | Mitigation |
|-----------|--------|------------|
| **30+ Supabase tables** | High complexity | Incremental migration, core tables first |
| **Real-time social feed** | P2P sync latency | Hypercore replication + MSB for ordering |
| **Email auth familiarity** | User friction | Seed phrase education + recovery options |
| **Admin Mission Control** | Centralized paradigm | Distributed admin via TAP privilege-auth |
| **Web-first UX** | Desktop app requirement | Dual deployment: Web + Pear |

**Overall Score: 75-80% feasible**

---

## 🎯 STRATEGIC APPROACH: PARALLEL DEVELOPMENT

**CRITICAL:** Build Trac version as **separate app** with **zero impact** on current users.

```
┌─────────────────────────────────────────────────────────────┐
│              CURRENT STAY HI (Unchanged)                    │
│                                                             │
│   Supabase → Vercel → Web PWA → 30 users                  │
│   Continues operating 100% normally                        │
└─────────────────────────────────────────────────────────────┘
                           ↓ (optional migration bridge)
┌─────────────────────────────────────────────────────────────┐
│         STAY HI: SELF-CUSTODY EDITION (New)                │
│                                                             │
│   TAP Contracts → Trac Peers → Pear Runtime → Beta users  │
│   New repo, separate branding, opt-in only                 │
└─────────────────────────────────────────────────────────────┘
```

### Why This Works

1. **Zero risk** - Current users unaffected during entire build
2. **Learn iteratively** - Beta test with power users first
3. **Dual value props** - Web for casual, Trac for custody believers
4. **Data bridge** - Export from Supabase, import to Trac (user choice)
5. **Marketing angle** - "Web3-native wellness app" for crypto community

---

## 📋 PHASE-BY-PHASE PORT PLAN

### Phase 0: Preparation (Week 1-2)

**Goal:** Set up parallel dev environment with Trac context

✅ **Workspace Setup**
```bash
# Current Stay Hi (unchanged)
cd ~/Stay-hi

# New Trac port (separate repo)
cd ~/
git clone https://github.com/joeatang/stay-hi-trac
cd stay-hi-trac

# Trac dependencies (reference repos)
git clone https://github.com/Trac-Systems/trac-contract-example
git clone https://github.com/Trac-Systems/trac-peer
git clone https://github.com/Trac-Systems/pear-appling-v2
git clone https://github.com/Trac-Systems/tap-protocol-specs
git clone https://github.com/Trac-Systems/tap-protocol-token-auth-boilerplate
git clone https://github.com/Trac-Systems/tap-protocol-privilege-auth-boilerplate
```

✅ **VS Code Multi-Root Workspace**
- Add all folders to workspace for Copilot context
- Install Copilot + Copilot Chat extensions
- Open key Trac files: `contract.js`, `protocol.js`, `index.js` from examples

✅ **Audit Current App with Copilot**

Create `audit-for-trac.md`:
```markdown
@copilot: Audit Stay Hi app for:
1. Supabase dependencies that block P2P migration
2. Centralization risks (single-point-of-failure)
3. Data structures that need key-value refactoring
4. Features requiring Bitcoin settlement (Hi Points)
5. Admin controls needing TAP privilege-auth

Files in context: [list all Stay Hi core files]
```

**Deliverables:**
- [ ] Multi-root workspace configured
- [ ] Audit report with migration complexity per module
- [ ] Architecture comparison diagram (Supabase vs Trac)

---

### Phase 1: Core Data Layer (Weeks 3-6)

**Goal:** Migrate 5 core tables from Supabase → Hyperbee (local-first)

#### 1.1 Table Prioritization

| Priority | Supabase Table | Hyperbee Key Pattern | Complexity |
|----------|----------------|----------------------|-----------|
| **P0** | `profiles` | `profile:{user_id}` | Low |
| **P0** | `hi_archives` | `archive:{user_id}:{timestamp}` | Low |
| **P0** | `user_stats` | `stats:{user_id}` | Medium |
| **P1** | `public_shares` | `share:{share_id}` + `feed:{timestamp}` | Medium |
| **P1** | `user_streaks` | `streak:{user_id}` | Low |

**Why these first:** Core journaling works without social features.

#### 1.2 Hyperbee Schema Design

```javascript
// profiles table → Hyperbee
await db.put('profile:' + userId, {
  username: 'joeatang',
  bio: 'Hi explorer',
  avatar_url: 'ipfs://...',  // Migrate to IPFS for decentralization
  created_at: Date.now()
});

// hi_archives (private journals) → Hyperbee
await db.put('archive:' + userId + ':' + timestamp, {
  content: 'Today I felt grateful for...',
  emotion: 'gratitude',
  hi_intensity: 8,
  created_at: timestamp
});

// user_stats → Hyperbee (local aggregation)
await db.put('stats:' + userId, {
  total_archives: 42,
  current_streak: 7,
  longest_streak: 30,
  total_waves: 125
});
```

#### 1.3 Data Migration Tool

**File:** `tools/supabase-to-hyperbee-migrator.js`

```javascript
// @copilot: Generate migration script:
// 1. Export user's data from Supabase as JSON
// 2. Convert to Hyperbee key-value format
// 3. Import to local Pear app storage
// 4. Verify data integrity (checksums)

const { createClient } = require('@supabase/supabase-js');
const Hyperbee = require('hyperbee');

async function migrateUser(userId, supabaseUrl, supabaseKey) {
  // Export from Supabase
  const supabase = createClient(supabaseUrl, supabaseKey);
  const profile = await supabase.from('profiles').select('*').eq('user_id', userId).single();
  const archives = await supabase.from('hi_archives').select('*').eq('user_id', userId);
  
  // Create local Hyperbee
  const db = new Hyperbee(/* Pear storage path */);
  
  // Import to Hyperbee
  await db.put(`profile:${userId}`, profile.data);
  for (const archive of archives.data) {
    await db.put(`archive:${userId}:${archive.created_at}`, archive);
  }
  
  console.log(`✅ Migrated user ${userId}: ${archives.data.length} entries`);
}
```

**Deliverables:**
- [ ] Hyperbee schema for 5 core tables
- [ ] Migration script (Supabase → Hyperbee)
- [ ] Data validation tests (checksums, counts)
- [ ] User export tool (JSON download from current app)

---

### Phase 2: TAP Smart Contracts (Weeks 7-10)

**Goal:** Port Hi Points system to TAP tokens on Bitcoin L1

#### 2.1 Hi Points → TAP Token

**Why TAP?**
- Hi Points are database numbers → TAP makes them Bitcoin-native tokens
- Provably scarce (can't be inflated by admin)
- Transferable (user owns, not platform)
- Rewards become real assets

**Use Boilerplate:** `tap-protocol-token-auth-boilerplate`

```javascript
// File: contract/hi-points-tap.js
// Based on: tap-protocol-specs + token-auth-boilerplate

import { Contract } from 'trac-peer';

class HiPointsContract extends Contract {
  constructor(protocol, options = {}) {
    super(protocol, options);
    
    // Register TAP operations
    this.addSchema('award_points', {
      user: { type: 'string', length: 66 }, // Bitcoin pubkey
      points: { type: 'number', min: 1, max: 1000 },
      reason: { type: 'string', enum: ['checkin', 'share', 'reaction', 'tap'] }
    });
    
    this.addSchema('spend_points', {
      user: { type: 'string', length: 66 },
      points: { type: 'number', min: 1 },
      item: { type: 'string' } // 'hi_wall_note', 'reward', etc.
    });
  }
  
  // Award points (replaces Supabase hi_award_points RPC)
  async award_points() {
    const { user, points, reason } = this.value;
    
    // TAP mint operation on Bitcoin
    const currentBalance = await this.get(`balance:${user}`) || 0;
    await this.put(`balance:${user}`, currentBalance + points);
    
    // Log transaction (append-only ledger)
    await this.put(`tx:${Date.now()}:${user}`, {
      type: 'award',
      amount: points,
      reason,
      timestamp: Date.now()
    });
    
    console.log(`✅ Awarded ${points} Hi Points to ${user} for ${reason}`);
  }
  
  // Spend points (Hi Wall, rewards)
  async spend_points() {
    const { user, points, item } = this.value;
    
    const currentBalance = await this.get(`balance:${user}`) || 0;
    
    // Validate balance
    this.assert(currentBalance >= points, new Error('Insufficient Hi Points'));
    
    // TAP burn/transfer operation
    await this.put(`balance:${user}`, currentBalance - points);
    await this.put(`tx:${Date.now()}:${user}`, {
      type: 'spend',
      amount: points,
      item,
      timestamp: Date.now()
    });
    
    console.log(`✅ ${user} spent ${points} Hi Points on ${item}`);
  }
}

export default HiPointsContract;
```

#### 2.2 Tier Multipliers → TAP Privilege Auth

**Use Boilerplate:** `tap-protocol-privilege-auth-boilerplate`

```javascript
// File: contract/hi-tier-auth.js
// Manages tier privileges (Bronze, Silver, Gold, etc.)

class HiTierAuthContract extends Contract {
  async checkTierMultiplier(user) {
    const tier = await this.get(`tier:${user}`) || 'free';
    
    const multipliers = {
      free: 0.0,
      bronze: 1.0,
      silver: 1.25,
      gold: 1.5,
      premium: 2.0,
      collective: 2.5
    };
    
    return multipliers[tier];
  }
  
  async upgradeTier(user, newTier, proofOfPayment) {
    // Verify Bitcoin payment for tier upgrade
    // (Could use TAP token transfer as proof)
    
    await this.put(`tier:${user}`, newTier);
    console.log(`✅ ${user} upgraded to ${newTier}`);
  }
}
```

**Deliverables:**
- [ ] TAP contract for Hi Points minting/burning
- [ ] TAP contract for tier privileges
- [ ] Test suite (simulate awards, spends, tier upgrades)
- [ ] Bitcoin testnet deployment

---

### Phase 3: P2P Social Features (Weeks 11-14)

**Goal:** Migrate Hi Island feed + sharing to P2P replication

#### 3.1 Public Shares → Hypercore Append-Only Log

```javascript
// File: lib/hi-feed-hypercore.js
// Replace Supabase public_shares with Hypercore

const Hypercore = require('hypercore');
const Hyperdrive = require('hyperdrive');

class HiFeedP2P {
  constructor() {
    this.feed = new Hypercore('./storage/public-feed');
  }
  
  // Post a public share (replaces Supabase insert)
  async postShare(userId, content, emotion, location) {
    const share = {
      id: crypto.randomBytes(16).toString('hex'),
      user_id: userId,
      content,
      emotion,
      location,
      timestamp: Date.now()
    };
    
    // Append to P2P feed (auto-replicates to peers)
    await this.feed.append(JSON.stringify(share));
    
    console.log(`✅ Posted share to P2P feed: ${share.id}`);
  }
  
  // Read feed (latest 50 shares)
  async getFeed(limit = 50) {
    const shares = [];
    const length = this.feed.length;
    
    for (let i = Math.max(0, length - limit); i < length; i++) {
      const data = await this.feed.get(i);
      shares.push(JSON.parse(data));
    }
    
    return shares.reverse(); // Newest first
  }
  
  // Replicate with other peers
  async syncWithPeers(peerDiscoveryKey) {
    const swarm = new Hyperswarm();
    swarm.join(peerDiscoveryKey);
    
    swarm.on('connection', (socket) => {
      this.feed.replicate(socket); // Auto-sync feed
      console.log('🔄 Syncing feed with peer');
    });
  }
}
```

#### 3.2 Hi Island Map → Decentralized Location Sharing

**Challenge:** Geocoding API (Supabase Edge Function) is centralized  
**Solution:** Client-side geocoding or decentralized oracle

```javascript
// Option A: Client-side reverse geocoding (offline-first)
// Use local GeoJSON data for city names

// Option B: Trac peer as oracle (feeds location data to contract)
// See: trac-contract-example/features/timer/index.js pattern

class LocationOracleFeature extends Feature {
  async start() {
    // Periodically fetch location data for shares
    // Could use decentralized IPFS-hosted GeoJSON
    while (true) {
      const shares = await getRecentShares();
      for (const share of shares) {
        if (share.lat && share.lng) {
          const cityName = await lookupCity(share.lat, share.lng);
          await this.append('location:' + share.id, cityName);
        }
      }
      await this.sleep(60000); // Every minute
    }
  }
}
```

**Deliverables:**
- [ ] Hypercore-based public feed
- [ ] P2P replication setup (peer discovery)
- [ ] Hi Island map with decentralized location data
- [ ] Test with 3-5 devices syncing

---

### Phase 4: Auth & Identity (Weeks 15-18)

**Goal:** Replace Supabase Auth with Bitcoin self-custody keys

#### 4.1 Seed Phrase → User Identity

**Challenge:** Users expect email/password  
**Solution:** Progressive disclosure + recovery options

```javascript
// File: lib/hi-auth-bitcoin.js
// Bitcoin keypair as user identity (self-custody)

const bitcoin = require('bitcoinjs-lib');
const bip39 = require('bip39');

class HiAuthBitcoin {
  // Generate new user identity
  static createIdentity() {
    // Generate 12-word seed phrase
    const mnemonic = bip39.generateMnemonic();
    const seed = bip39.mnemonicToSeedSync(mnemonic);
    
    // Derive Bitcoin keypair
    const root = bitcoin.bip32.fromSeed(seed);
    const child = root.derivePath("m/44'/0'/0'/0/0");
    const { address, publicKey } = bitcoin.payments.p2wpkh({
      pubkey: child.publicKey
    });
    
    return {
      mnemonic, // User must back this up!
      address,  // User's "username" (public)
      publicKey: publicKey.toString('hex'),
      privateKey: child.privateKey.toString('hex') // NEVER share
    };
  }
  
  // Sign in with seed phrase
  static recoverIdentity(mnemonic) {
    const seed = bip39.mnemonicToSeedSync(mnemonic);
    const root = bitcoin.bip32.fromSeed(seed);
    const child = root.derivePath("m/44'/0'/0'/0/0");
    const { address, publicKey } = bitcoin.payments.p2wpkh({
      pubkey: child.publicKey
    });
    
    return { address, publicKey };
  }
  
  // Sign a message (prove ownership)
  static signMessage(message, privateKey) {
    // Use Bitcoin signature for auth
    const keyPair = bitcoin.ECPair.fromPrivateKey(Buffer.from(privateKey, 'hex'));
    const signature = keyPair.sign(Buffer.from(message));
    return signature.toString('hex');
  }
}

// Usage in app
const identity = HiAuthBitcoin.createIdentity();
console.log('Your Hi ID:', identity.address);
console.log('⚠️ BACKUP THIS SEED PHRASE:', identity.mnemonic);
```

#### 4.2 Onboarding UX

**Flow:**
1. **First-time user:** "Create your Hi identity" → Generate seed phrase
2. **Seed phrase backup:** Show 12 words, make user write down
3. **Verification:** "Enter word #3, #7, #11" to confirm backup
4. **Login:** "Restore from seed phrase" input

**Recovery options:**
- Social recovery (Shamir's Secret Sharing - split seed across 3 friends)
- Email backup (encrypted seed sent to user's email)
- Cloud backup (optional, encrypted with user password)

**Deliverables:**
- [ ] Bitcoin keypair auth system
- [ ] Seed phrase generation + backup UI
- [ ] Recovery flow (restore from mnemonic)
- [ ] Migration guide (Supabase → Bitcoin ID)

---

### Phase 5: Pear Runtime App (Weeks 19-22)

**Goal:** Package as native desktop/mobile app via Pear

#### 5.1 App Structure

**Use Template:** `pear-appling-v2`

```
stay-hi-trac/
├── index.js                    # Pear app entry point
├── package.json                # Dependencies (trac-peer, hyperbee, etc.)
├── contract/
│   ├── hi-points-tap.js       # Hi Points TAP contract
│   ├── hi-tier-auth.js        # Tier privilege contract
│   └── protocol.js             # Contract protocol (from trac-contract-example)
├── lib/
│   ├── hi-auth-bitcoin.js     # Bitcoin self-custody auth
│   ├── hi-feed-hypercore.js   # P2P feed replication
│   └── hyperbee-db.js          # Local-first database
├── ui/
│   ├── dashboard.html          # Main UI (similar to current)
│   ├── hi-island.html          # P2P feed map
│   └── profile.html            # User profile
└── storage/                    # Local Hypercore/Hyperbee data
```

#### 5.2 Pear App Config

**File:** `package.json`

```json
{
  "name": "stay-hi-self-custody",
  "version": "1.0.0",
  "pear": {
    "name": "Hi Collective: Self-Custody Edition",
    "type": "desktop",
    "stage": 0,
    "links": {
      "source": "https://github.com/joeatang/stay-hi-trac"
    }
  },
  "dependencies": {
    "trac-peer": "latest",
    "hyperbee": "^2.0.0",
    "hypercore": "^10.0.0",
    "hyperdrive": "^11.0.0",
    "bitcoinjs-lib": "^6.1.0",
    "bip39": "^3.1.0"
  }
}
```

**Deliverables:**
- [ ] Pear app template configured
- [ ] Trac peer integration (MSB connection)
- [ ] Desktop app builds (Mac/Windows/Linux)
- [ ] Mobile app builds (iOS/Android via Capacitor bridge)

---

### Phase 6: Migration Bridge (Weeks 23-24)

**Goal:** Allow current users to opt-in migrate from Supabase → Trac

#### 6.1 Export Tool (in Current Web App)

**File:** `public/admin/export-to-trac.html`

```javascript
// Add to current Stay Hi web app (Supabase)
async function exportUserDataForTrac(userId) {
  // Fetch all user data from Supabase
  const { data: profile } = await supabase.from('profiles').select('*').eq('user_id', userId).single();
  const { data: archives } = await supabase.from('hi_archives').select('*').eq('user_id', userId);
  const { data: stats } = await supabase.from('user_stats').select('*').eq('user_id', userId).single();
  const { data: shares } = await supabase.from('public_shares').select('*').eq('user_id', userId);
  
  // Bundle as JSON
  const exportData = {
    version: '1.0',
    exported_at: new Date().toISOString(),
    user_id: userId,
    profile,
    archives,
    stats,
    public_shares: shares
  };
  
  // Download as file
  const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `stay-hi-export-${userId}.json`;
  a.click();
  
  console.log('✅ Exported data for Trac migration');
}
```

#### 6.2 Import Tool (in Trac App)

**File:** `ui/import-from-supabase.html`

```javascript
// In Trac version (Pear app)
async function importFromSupabase(jsonFile) {
  const data = JSON.parse(await jsonFile.text());
  
  // Create Bitcoin identity for user (or let them bring their own)
  const identity = HiAuthBitcoin.createIdentity();
  
  // Import to Hyperbee
  const db = new Hyperbee('./storage/hyperbee');
  
  await db.put(`profile:${identity.address}`, {
    ...data.profile,
    bitcoin_address: identity.address,
    migrated_from: 'supabase',
    migrated_at: Date.now()
  });
  
  // Import archives
  for (const archive of data.archives) {
    await db.put(`archive:${identity.address}:${archive.created_at}`, archive);
  }
  
  // Award Hi Points as TAP tokens (convert from database points)
  if (data.stats?.hi_points_balance > 0) {
    await awardHiPoints(identity.address, data.stats.hi_points_balance, 'migration');
  }
  
  console.log('✅ Migration complete! Your data is now self-custody.');
  console.log('⚠️ BACKUP YOUR SEED PHRASE:', identity.mnemonic);
}
```

**Deliverables:**
- [ ] Export tool in current web app (JSON download)
- [ ] Import tool in Trac app (JSON upload)
- [ ] Migration guide documentation
- [ ] Support for partial migration (keep using web app alongside)

---

## 🎯 RECOMMENDED ROLLOUT STRATEGY

### Option A: Parallel Apps (Recommended 🌟)

**Timeline:** 6 months to Trac MVP, then coexist indefinitely

```
Month 1-2:  Build core Trac app (local journals + Hi Points TAP)
Month 3-4:  Add P2P feed + Bitcoin auth
Month 5:    Beta test with 5-10 power users
Month 6:    Public launch: "Hi Collective: Self-Custody Edition"

Ongoing:    Both apps coexist
  - Web version: Casual users, onboarding, ease of use
  - Trac version: Self-custody believers, crypto natives, privacy-focused
```

**Pros:**
- ✅ Zero risk to current users
- ✅ Learn from beta before sunsetting web app
- ✅ Two revenue streams (web subscriptions + Trac self-custody sales)
- ✅ Marketing: "First dual-custody wellness app"

**Cons:**
- ⚠️ Maintain two codebases (but ~60% shared UI)
- ⚠️ Social features fragmented (web users can't see Trac users' shares)

---

### Option B: Gradual Migration

**Timeline:** 12 months to full Trac replacement

```
Month 1-6:   Build Trac version (parallel)
Month 7:     Announce migration plan to users
Month 8-9:   Offer export/import tools, incentivize migration
Month 10-11: Feature freeze web app, focus on Trac
Month 12:    Sunset web app (redirect to Trac app download)
```

**Pros:**
- ✅ Eventually unified platform
- ✅ All users on self-custody (stronger brand)
- ✅ Single codebase to maintain

**Cons:**
- ⚠️ Lose users who refuse desktop app download
- ⚠️ Higher support burden (seed phrase recovery, etc.)
- ⚠️ Slower growth (crypto-only audience)

---

## 💰 COST-BENEFIT ANALYSIS

### Current Supabase App (Keep Running)

| Cost | Amount | Effort |
|------|--------|--------|
| Supabase hosting | $25-100/month | Passive |
| Vercel hosting | Free (hobby) | Passive |
| Your dev time | Minimal (maintenance) | 2-4 hrs/week |

**Total:** ~$50/month + 8-16 hrs/month

### Trac Version (New Build)

| Phase | Time | Effort |
|-------|------|--------|
| Phase 1-2 (Core + TAP) | 8 weeks | 20-30 hrs/week |
| Phase 3-4 (P2P + Auth) | 8 weeks | 20-30 hrs/week |
| Phase 5-6 (Pear + Bridge) | 4 weeks | 15-20 hrs/week |
| **Total** | **20 weeks** | **~400 hours** |

**Hosting cost:** $0/month (P2P + Bitcoin L1, no servers!)

---

## 🚧 RISKS & MITIGATION

| Risk | Impact | Probability | Mitigation |
|------|--------|-------------|------------|
| **Bitcoin UX too complex** | Users abandon app | Medium | Progressive disclosure, social recovery, email backup option |
| **P2P sync unreliable** | Offline-first breaks | Low | Hypercore battle-tested, use MSB for critical sync |
| **TAP protocol changes** | Contract refactor | Low | Monitor Trac Discord, version contracts |
| **Current users resist migration** | Split community | High | Keep both apps, don't force migration |
| **Trac Network shuts down** | Total failure | Very Low | Bitcoin L1 settlement = censorship resistant |
| **Dev burnout (400 hrs)** | Incomplete port | Medium | Hire contractor, use Copilot heavily, build incrementally |

---

## 🎉 SUCCESS METRICS

### Minimum Viable Trac App (MVP - Month 6)

- [ ] 5 beta users journaling daily on Trac version
- [ ] Hi Points awarded as TAP tokens (verified on Bitcoin testnet)
- [ ] P2P feed syncing between 3+ devices
- [ ] Migration tool: 3 users successfully ported from Supabase
- [ ] Zero critical bugs in seed phrase backup/restore
- [ ] Desktop app builds for Mac/Windows/Linux

### Full Feature Parity (Month 12)

- [ ] All 30 current users offered migration
- [ ] 50+ new Trac-native users (crypto community)
- [ ] Hi Island map with P2P shares
- [ ] Analytics v2.0 on local Hyperbee (Patterns + Milestones)
- [ ] Mobile app via Capacitor bridge
- [ ] Admin controls via TAP privilege-auth (distributed)

---

## 🛠️ TOOLS & RESOURCES

### Development Tools

| Tool | Purpose | Link |
|------|---------|------|
| **VS Code + Copilot** | Code generation with Trac context | [Install](https://code.visualstudio.com/) |
| **Pear CLI** | Build/test Pear desktop apps | `npm i -g pear-cli` |
| **Bitcoin Testnet** | Test TAP contracts risk-free | [bitcoin.org/en/developer-guide](https://bitcoin.org/en/developer-guide) |
| **Hypercore Protocol** | Local-first P2P storage | [hypercore-protocol.org](https://hypercore-protocol.org/) |

### Trac Resources

| Resource | Purpose | Link |
|----------|---------|------|
| TAP Protocol Specs | Understand token operations | [GitHub](https://github.com/Trac-Systems/tap-protocol-specs) |
| Contract Example | Template for contracts | [GitHub](https://github.com/Trac-Systems/trac-contract-example) |
| Token Auth Boilerplate | Hi Points implementation guide | [GitHub](https://github.com/Trac-Systems/tap-protocol-token-auth-boilerplate) |
| Trac Discord | Live support from devs | [trac.network](https://trac.network) |

---

## 📅 NEXT STEPS (This Week)

### Day 1-2: Copilot Setup + Audit

1. Clone Trac repos into multi-root workspace
2. Run Copilot audit on current Stay Hi code
3. Create architecture comparison doc (Supabase vs Trac)

### Day 3-4: Prototype Core Storage

1. Install Hyperbee: `npm i hyperbee`
2. Build proof-of-concept: Store 1 profile + 3 journals in Hyperbee
3. Test read/write performance vs Supabase

### Day 5: TAP Contract Prototype

1. Clone `tap-protocol-token-auth-boilerplate`
2. Adapt for Hi Points (mint/burn operations)
3. Deploy to Bitcoin testnet (get testnet BTC from faucet)

### Week 2: Decision Point

**Review prototypes and decide:**
- [ ] Go/no-go on full Trac port?
- [ ] Parallel apps (Option A) or gradual migration (Option B)
- [ ] Hire contractor or solo build?
- [ ] Set milestones for Month 1-6

---

## ✅ FINAL RECOMMENDATION

**Proceed with PARALLEL DEVELOPMENT (Option A)**

**Why:**
1. **0% risk** - Current users completely unaffected
2. **75-80% feasible** - JavaScript stack aligns, small user base manageable
3. **Strategic timing** - Crypto wellness apps are emerging niche
4. **Marketing gold** - "First Bitcoin-native wellness app"
5. **Future-proof** - If Trac fails, web app still running

**Start with Phase 0-1** (setup + core storage) to validate technical feasibility before committing to full port.

**Budget:** 400 hours over 20 weeks = ~20 hrs/week (half-time effort)

**Alternative:** Hire contractor for $10-20k (saves you 300+ hours)

---

> **Author:** Copilot + Joe  
> **Last Updated:** February 6, 2026  
> **Next Review:** After Phase 0 completion (Week 2)
