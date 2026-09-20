# Tapmo

**Tap your Fomo balance anywhere.**

Tapmo is an early-stage payments interface designed to make a user's supported Fomo wallet balance feel spendable in the real world.

## Current status

This repository currently contains a **sandbox UI prototype** only. It does not move funds, issue cards, custody assets, or connect to production payment rails.

### Prototype flow

1. Connect a Fomo wallet
2. Verify the wallet
3. Display a mock spendable balance
4. Show a Tapmo virtual card
5. Display simulated card transactions

## Planned architecture

- **Frontend:** Next.js + TypeScript
- **Wallet authentication:** Privy
- **Fomo integration:** adapter layer, mocked until an official integration is available
- **Crypto / stablecoin infrastructure:** Zero Hash, subject to onboarding and supported use case
- **Card issuing / processing:** regulated card-issuing partner
- **Digital wallet provisioning:** card issuer + Apple Pay / Google Pay support

## Development

```bash
npm install
npm run dev
```

Then open http://localhost:3000.

## Environment

Copy `.env.example` to `.env.local` when integrations are added.

## Important

Never commit API secrets, private keys, wallet seed phrases, card data, or production credentials to this repository.
