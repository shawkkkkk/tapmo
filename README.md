# Tapmo

**Tap your Fomo balance anywhere.**

Tapmo is an early-stage payments interface designed to make supported onchain balances feel spendable in the real world.

## Current status

Tapmo currently has:

- **Real wallet authentication through Privy**
- **Live onchain portfolio valuation for Base and Robinhood Chain**
- A **sandbox-only** virtual-card and transaction UI

Tapmo does not yet issue a real card, move funds, custody assets, or connect to production off-ramp/card rails.

The live balance shown today is **not the official Fomo unified balance**. It is the current USD value of priced native/ERC-20 holdings discovered for the authenticated EVM address on Base and Robinhood Chain. Tokens without a reliable exchange rate are excluded from the displayed USD total.

### Current prototype flow

1. Authenticate an external EVM wallet with Privy
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
- **Crypto / stablecoin infrastructure:** Zero Hash, subject to onboarding and supported use case
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
