# ChapaCash

Crash game with **M-PESA STK deposits via Paystack**. 18+ only. 1 credit = 1 KES.

## Setup

1. Copy `.env.example` to `.env.local`.
2. Set `MONGODB_URI`.
3. Set `PAYSTACK_SECRET_KEY` (`sk_test_…` first). Optional: `PAYSTACK_PUBLIC_KEY`.
4. In Paystack Dashboard → Settings → API, set webhook URL to  
   `https://YOUR_PUBLIC_HOST/api/webhooks/paystack`  
   (use ngrok or similar on localhost).
5. Kenya business / M-PESA must be enabled on the Paystack account.

```bash
export PATH="$HOME/.local/node/bin:$PATH"
npm install
npm run db:seed
npm run dev
```

Register with a Safaricom `07…`, `010…`, or `011…` number. Log in with phone or email.

Demo (after seed): `0700000001` / `ChapaCashPlayer1` (or `player@chapacash.test`).

Deposits: Wallet → amount in KES → STK push. Balance updates after Paystack `charge.success` (webhook) or status poll.

## Tests

```bash
npm test
```
