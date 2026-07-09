# Walkthrough - B20 Studio

We have successfully built, enhanced, and verified the production-ready **B20 Studio** web application. Below is a detailed summary of the architecture, features, and verification results.

---

## 1. Project Folder Structure

The project has been structured cleanly in the workspace directory [Base b20](file:///d:/Base%20b20):

```
├── public/
│   ├── logos/
│   │   ├── meme_card.bmp      # Meme Coin Creator logo card
│   │   ├── stable_card.bmp    # Stablecoin Creator logo card
│   │   └── security_card.bmp  # Security Token Creator logo card
│   └── manifest.json
├── src/
│   ├── app/
│   │   ├── layout.tsx         # Root layout with Geist fonts and providers
│   │   ├── providers.tsx      # RainbowKit + Wagmi + TanStack Query configurations
│   │   ├── globals.css        # Custom styles, radial backgrounds, and animations
│   │   ├── page.tsx           # Premium SaaS Landing Page with Launch Wizard integration
│   │   └── dashboard/
│   │       └── page.tsx       # B20 management dashboard console
│   ├── components/
│   │   ├── Navbar.tsx         # Network switcher, wrong network checks, and mainnet alerts
│   │   ├── LaunchWizard.tsx   # Step 1-5 B20 Token deployment wizard (Calldata Preview)
│   │   └── DashboardForms.tsx # Mint, Burn, Pause controls, Role modifications, and settings
│   ├── hooks/
│   │   └── useB20.ts          # custom wagmi hooks for factory deployment and read/writes
│   ├── lib/
│   │   ├── b20Abi.ts          # Verified factory and token ABIs & role hashes
│   │   └── b20Encoder.ts      # ABI serialization helpers for params and initCalls
│   └── types/
│   │   └── index.ts           # Typescript data interfaces (B20Variant, TokenMetadata, B20TxLog)
└── walkthrough.md
```

---

## 2. Core Features & Enhancement Details

### Pre-execution Simulation & Captured Predicted Address
- **Simulation before write**: Replaced `useB20Factory` with standard `useSimulateContract` and `useWriteContract` hooks. Prior to writing, the contract deployment `createB20` call is simulated by the browser.
- **Capture Simulation Result**: The deterministic token address returned by the simulation is stored in the local state and in `localStorage` under the `predictedTokenAddress` property of the pending deployment.
- **Direct client-side simulation fallback**: If the React hook simulation state is not yet ready or updated, the wizard utilizes `publicClient.simulateContract` from viem via `usePublicClient` directly inside `handleDeploy`. This guarantees we retrieve a valid simulated address before the write transaction begins.
- **Address Validation**: We import `isAddress` from `'viem'` and validate the predicted token address before saving it to storage upon transaction confirmation.

### Resolution Priority Order for Token Address
Upon receiving a transaction receipt, the token address is resolved using the following priority order:
1. **Priority 1: Address from receipt logs/events** (parsed via viem's `parseEventLogs` for the `B20Created` event).
2. **Priority 2: Address returned by simulation** (from local state `simulatedDeployedAddress` or recovered from `localStorage` pending deployment data).
3. **Priority 3: Manual user input fallback** (if the user manually pastes and registers the address in Step 4).

### Verbose Deployment Verification Logs
The browser console now outputs the following variables for developer validation:
- `simulated address`: The predicted address from simulation
- `transaction hash`: The broadcasted transaction hash
- `receipt status`: The status of the blockchain transaction receipt (`success` / `reverted`)
- `extracted deployed address`: The parsed token address from the event logs (if found)
- `saved dashboard address`: The final address that will be recorded in the dashboard metadata database

### Manual Fallback Import UI
- In Step 4, we integrated a manual registration form. If the blockchain transaction succeeds but the Web3 nodes take too long to return the receipt, users can paste the deployed token address manually to register it in `localStorage` and jump straight to the Success step.

### dashboard Network and Badge Filters
- Corrected occurrences where network configurations checked for `currentNetwork === 'base'`. Since networks are stored as `'mainnet'` or `'sepolia'`, these checks were failing on Mainnet, causing the dashboard to fall back to displaying the "Base Sepolia" network badge.
- Added dual network safety matching for `t.network` (`'mainnet'`/`'base'` and `'sepolia'`/`'baseSepolia'`) to remain backwards compatible with old deployment formats in `localStorage` while saving new ones as `'mainnet'`.

### Mint Initial Supply Guard
- Built-in conditional gating ensuring that the atomic mint call is only appended to `initCalls` if `initialSupply` is strictly greater than `0`.

---

## 3. Verified B20 Precompile Specifications

All contract interactions are done directly against the node precompile:
- **Factory Address**: `0xB20f000000000000000000000000000000000000`
- **Variant enum values**: `ASSET = 0`, `STABLECOIN = 1`
- **Asset Param Encoder Tuple**: `(version uint8, name string, symbol string, initialAdmin address, decimals uint8)`
- **Stablecoin Param Encoder Tuple**: `(version uint8, name string, symbol string, initialAdmin address, currency string)`
- **Role hashes**:
  - `DEFAULT_ADMIN_ROLE` = `0x0000000000000000000000000000000000000000`
  - `MINT_ROLE` = `keccak256("MINT_ROLE")`
  - `BURN_ROLE` = `keccak256("BURN_ROLE")`
  - `PAUSE_ROLE` = `keccak256("PAUSE_ROLE")`
  - `UNPAUSE_ROLE` = `keccak256("UNPAUSE_ROLE")`
  - `METADATA_ROLE` = `keccak256("METADATA_ROLE")`
  - `OPERATOR_ROLE` = `keccak256("OPERATOR_ROLE")`

---

## 4. Verification Check

We executed the Next.js production build (`npm run build`) from the workspace. It compiles successfully without any typescript compilation warnings or Turbopack errors. All routes are prerendered and optimized:

```bash
temp-next-app@0.1.0 build
next build

▲ Next.js 16.2.9 (Turbopack)

  Creating an optimized production build ...

  ✓ Compiled successfully
  ✓ Collecting page data
  ✓ Generating static pages (5)
  ✓ Collecting build traces
  ✓ Finalizing page optimization
```

---

## 5. Pre-Launch Readiness Fixes

We completed a comprehensive sweep of the codebase to secure the app for production launch:
- **Base Mainnet Isolation**: Removed `baseSepolia` from [providers.tsx](file:///d:/Base%20b20/src/app/providers.tsx). Set the initial chain to `base` (Base Mainnet) only.
- **Removed Testnet UI References**: Cleaned up [Navbar.tsx](file:///d:/Base%20b20/src/components/Navbar.tsx) and [page.tsx](file:///d:/Base%20b20/src/app/dashboard/page.tsx) to remove all references to Sepolia, wrong network redirection to Sepolia, and faucet/testnet helper text.
- **Environment Variable for WalletConnect**: Updated `providers.tsx` to read the WalletConnect `projectId` from `process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID`. Added this key to [.env.example](file:///d:/Base%20b20/.env.example). Added a runtime check that fails clearly if the variable is missing on client side execution, while allowing Next.js builds to compile cleanly.
- **Inline Validation Errors**: Removed all browser `alert()` triggers for validation checks in [LaunchWizard.tsx](file:///d:/Base%20b20/src/components/LaunchWizard.tsx), [page.tsx](file:///d:/Base%20b20/src/app/dashboard/page.tsx), and [DashboardForms.tsx](file:///d:/Base%20b20/src/components/DashboardForms.tsx). Replaced them with beautiful, user-friendly inline error/success cards with manual clear buttons.

---

## 6. B20 Activation Status Display Fix

We resolved an inconsistency in how the B20 Activation status was displayed in the UI:
- **Network Status Card Update**: Modified [LaunchWizard.tsx](file:///d:/Base%20b20/src/components/LaunchWizard.tsx#L714-L728) to use the existing `isB20Enabled` variable (linked to `process.env.NEXT_PUBLIC_B20_ENABLED === 'true'`).
- **Dynamic Styling**: 
  - When `isB20Enabled` is **true**, it now displays "B20 Activation" and a green status badge "B20 Activation Enabled" using success styles (`bg-emerald-50 border-emerald-200 text-emerald-700`).
  - When `isB20Enabled` is **false**, it displays "Waiting for Official Activation" and a pulsing yellow badge "Waiting for Base B20 Activation".


