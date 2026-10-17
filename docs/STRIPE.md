# Stripe setup

What to do in Stripe so Aced can sell Pro on the web: yearly, monthly and the founding place. The server code is already in place (`apps/server/src/app.ts`, `billing.ts`). The App Store and Google Play come later through their own stores.

Do everything in **test mode** first, buy each plan with a test card, then repeat in live mode.

## 1. Account

1. Sign up at stripe.com with your business email.
2. Business type: **Individual / sole proprietorship**, country Canada. Stripe asks for your legal name, SIN, address and a Canadian bank account for payouts.
3. Public details (what buyers see on their card statement):
   - Business name: **Aced Poker**
   - Statement descriptor: `ACED POKER` (5 to 22 characters)
   - Support email: a role address, for example support@acedpoker.app
   - Website: https://acedpoker.app
   Your legal name stays in Stripe's records. Buyers see the business name and descriptor.
4. Prices are in USD. Add a USD bank account to avoid conversion fees on every payout, or let Stripe convert to CAD.

## 2. Products and prices

Create one product, **Aced Pro**, with three prices. Copy each price id (`price_...`).

| Price | Type | Amount | Env var |
| --- | --- | --- | --- |
| Yearly | Recurring, every year | $79.99 USD | `STRIPE_PRICE_ANNUAL` |
| Monthly | Recurring, every month | $14.99 USD | `STRIPE_PRICE_MONTHLY` |
| Founding member | One time | $79.99 USD | `STRIPE_PRICE_LIFETIME` |

The 7 day free trial on yearly is set by the server at checkout. Do not add a trial to the price.

## 3. Retention coupon

Products, then Coupons, then New:

- Name: `Stay with Aced` (the cancel screen reads its text from the coupon)
- 30% off, duration **Once** (one renewal)
- Copy the coupon id into `STRIPE_RETENTION_COUPON`

The server offers it at most once every 12 months per player, and only to someone who says Pro costs too much.

## 4. Webhook

Developers, then Webhooks, then Add endpoint:

- URL: `https://<your server>/api/billing/webhook`
- Events:
  - `checkout.session.completed`
  - `checkout.session.expired`
  - `customer.subscription.created`
  - `customer.subscription.updated`
  - `customer.subscription.deleted`
  - `invoice.paid`
  - `invoice.payment_failed`
  - `charge.refunded` (counts refunds for the console, see ADMIN.md)
- Copy the signing secret (`whsec_...`) into `STRIPE_WEBHOOK_SECRET`.

## 5. Billing settings

- **Customer portal** (Settings, Billing, Customer portal): allow updating payment methods, viewing invoices and cancelling. Turn **pausing off** in the portal; Aced offers its own pause in the cancel flow.
- **Revenue recovery** (Settings, Billing, Subscriptions and emails):
  - Smart Retries on, for up to 2 weeks.
  - After the last retry: **cancel the subscription**.
  - Turn on the emails for failed payments and expiring cards. Aced also shows its own banner in the app.
- **Emails** (Settings, Customer emails): turn on receipts for successful payments and refunds.

## 6. Keys and server settings

Developers, then API keys. Set these on the server (Render, Environment):

| Variable | Value |
| --- | --- |
| `STRIPE_SECRET_KEY` | `sk_live_...` (`sk_test_...` while testing) |
| `STRIPE_WEBHOOK_SECRET` | from step 4 |
| `STRIPE_PRICE_ANNUAL`, `STRIPE_PRICE_MONTHLY`, `STRIPE_PRICE_LIFETIME` | from step 2 |
| `STRIPE_RETENTION_COUPON` | from step 3 |
| `APP_URL` | `https://acedpoker.app/app` (where Checkout sends buyers back) |

Redeploy. The site's founding card switches from "Email me when it opens" to "Become a founding member" by itself once `GET /api/billing/founding` reports `open: true` (all of the above set and seats left).

## 7. Test before going live

With test keys, card `4242 4242 4242 4242`, any future date, any CVC:

1. Yearly: start the free week. Account shows Pro with the trial end date.
2. Monthly: subscribe. Then cancel with "Too expensive": the switch to yearly is offered. Cancel anyway: Pro stays until the period ends.
3. Founding: buy from the site's founding card. Pro shows "for as long as Aced runs" and the seat count goes down by one.
4. Failed payment: use card `4000 0000 0000 0341` on a monthly plan and advance the test clock to the renewal. The billing banner appears with "Update payment".
5. Refund the test founding purchase in the dashboard. Refunds of a founding place are manual: remove Pro by hand if you refund one.

## 8. Tax

As a sole proprietor in Canada you must register for GST/HST once worldwide taxable sales pass $30,000 CAD in four consecutive quarters. Digital services sold to Canadian consumers then carry GST/HST, and other countries have their own rules for digital sales. Stripe Tax can calculate and collect it at checkout. Ask an accountant when to turn it on. Prices on the site are shown before tax.
