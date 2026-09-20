# Tapmo

**Tap your Fomo balance anywhere.**

Tapmo is an early-stage payments interface designed to make a user's supported Fomo wallet balance feel spendable in the real world.

## Current status

Tapmo currently has **real wallet authentication through Privy** and a sandbox payment UI.

The balance, card number, Apple Wallet action, and transactions are still simulated. Tapmo does not yet move funds, issue cards, custody assets, or connect to production payment rails.

### Current prototype flow

1. Authenticate an external EVM wallet with Privy
2. Read the authenticated wallet address
3. Display a mock spendable balance
4. Show a sandbox Tapmo virtual card
5. Display and simulate sandbox card transactions

## Planned architecture

- **Frontend:** Next.js + TypeScript
- **Wallet authentication:** Privy
- **Fomo integration:** adapter layer, mocked until a supported integration is available
- **Crypto / stablecoin infrastructure:** Zero Hash, subject to onboarding and supported use case
- **Card issuing / processing:** regulated card-issuing partner
- **Digital wallet provisioning:** card issuer + Apple Pay / Google Pay support

## Privy setup

The development Privy App ID is configured in `lib/privy-config.ts`, so wallet authentication can run immediately.

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

## Environment

See `.env.example` for planned provider variables. Server-side financial-provider secrets must remain server-only.

## Important

Never commit API secrets, private keys, wallet seed phrases, card data, or production credentials to this repository.
