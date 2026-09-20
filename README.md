# Tapmo

**Tap your Fomo balance anywhere.**

Tapmo is an early-stage payments interface designed to make supported onchain balances feel spendable in the real world.

## Current status

Tapmo currently has:

- **Privy authentication with email or external wallet**
- **Live onchain portfolio valuation for Base and Robinhood Chain**
- A **sandbox-only** virtual-card and transaction UI

Tapmo does not yet issue a real card, move funds, or custody assets. A server-side Zero Hash Cert adapter is now scaffolded, but authenticated Cert access still requires Zero Hash to provision Tapmo as a Platform and allowlist a static outbound IP.

The live balance shown today is **not the official Fomo unified balance**. It is the current USD value of priced native/ERC-20 holdings discovered for the authenticated EVM address on Base and Robinhood Chain. Tokens without a reliable exchange rate are excluded from the displayed USD total.

### Current prototype flow

1. Sign in with Privy using email or an external wallet
2. Read the authenticated wallet address
3. Query Base + Robinhood Chain through Blockscout
4. Calculate a live USD total from priced holdings
5. Show a sandbox Tapmo virtual card
6. Preview simulated card transactions without moving real funds

## Data sources

Tapmo's `/api/onchain/portfolio` route queries public Blockscout explorer APIs server-side. No Blockscout key is currently required for the two instance endpoints used by this beta.

## Planned architecture

- **Frontend:** Next.js + TypeScript
- **Wallet authentication:** Privy
- **Fomo integration:** adapter layer, pending an official supported Fomo integration
- **Onchain balance discovery:** Blockscout (beta)
- **Crypto / stablecoin infrastructure:** Zero Hash Cert adapter scaffolded; Platform provisioning + static-IP allowlisting still required
- **Card issuing / processing:** regulated card-issuing partner
- **Digital wallet provisioning:** card issuer + Apple Pay / Google Pay support

## Privy setup

The development Privy App ID is configured in `lib/privy-config.ts`.

You can override it per environment with:

```bash
NEXT_PUBLIC_PRIVY_APP_ID=your_privy_app_id
```

Privy's App ID is public client configuration. Never put Privy secrets, private keys, seed phrases, or other credentials in a `NEXT_PUBLIC_` variable.

## Development

```bash
npm install
npm run dev
```

Then open http://localhost:3000.

## Important

Never commit API secrets, private keys, wallet seed phrases, card data, or production credentials to this repository.


## Zero Hash Cert

Tapmo includes a server-only Zero Hash adapter at `lib/zerohash.ts` and a diagnostic endpoint at:

```
GET /api/zerohash/status
```

The diagnostic endpoint always attempts Zero Hash's unauthenticated `GET /time` connectivity check. If all three Cert credentials are configured, it also performs a signed authentication check without returning participant data.

Required server-only variables:

```bash
ZERO_HASH_ENV=cert
ZERO_HASH_API_KEY=
ZERO_HASH_API_SECRET=
ZERO_HASH_PASSPHRASE=
```

Do **not** expose these values with a `NEXT_PUBLIC_` prefix.

Zero Hash requires authenticated Cert/Prod traffic to originate from an allowlisted static IP. A normal dynamic residential IP, and ordinary serverless egress without fixed outbound IPs, should not be treated as sufficient for authenticated integration. Keep Tapmo in Cert until platform onboarding, compliance review, and payment-flow approval are complete.


## Marqeta sandbox

Tapmo now includes a server-only Marqeta Core API adapter at `lib/marqeta.ts`.

Diagnostic endpoint:

```
GET /api/marqeta/status
```

Sandbox bootstrap endpoint:

```
POST /api/marqeta/bootstrap
```

The bootstrap endpoint looks up an active sandbox card product, creates a Tapmo sandbox user, and issues a sandbox card for that user. It does not expose PAN, CVC, or other sensitive card data in the response.

Required server-only environment variables:

```bash
MARQETA_BASE_URL=https://sandbox-api.marqeta.com/v3
MARQETA_APPLICATION_TOKEN=
MARQETA_ADMIN_ACCESS_TOKEN=
```

Marqeta sandbox uses HTTP Basic Authentication with the application token as the username and the admin access token as the password. Keep both values server-side and never prefix them with `NEXT_PUBLIC_`.

Cards created in Marqeta sandbox cannot be used for real-world purchases. They are only for testing card issuance and simulated authorization flows.


## Solana / Jupiter-side Fomo balance

Tapmo can now link a separate Solana public address in addition to the Fomo EVM address.

The server route:

```
GET /api/solana/portfolio?address=<solana_pubkey>
```

uses Solana JSON-RPC to enumerate native SOL and SPL token balances. It prices supported mints with Jupiter Price V3 and specifically identifies Circle's native Solana USDC mint as cash. The UI sums priced Solana holdings with the EVM-side portfolio while keeping both sources visibly separate.

Optional server configuration:

```bash
SOLANA_RPC_URL=https://api.mainnet-beta.solana.com
JUPITER_API_KEY=
```

If `JUPITER_API_KEY` is omitted, the beta attempts Jupiter's lite price endpoint. A dedicated Solana RPC provider is recommended for production because the public RPC is rate-limited.
