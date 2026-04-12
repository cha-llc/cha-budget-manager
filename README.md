# C.H.A. LLC Budget Manager

A personalized AI-powered budget management system built for C.H.A. LLC (Consulting, Tea Time Network, Digital Tools, Books divisions).

**Live URL**: https://getchabuggetmanager.vercel.app

## Features

- **Division Budget Management**: Set and track monthly budgets across 4 divisions
- **Expense Tracking**: Log expenses by division and category with real-time updates
- **Revenue Tracking**: Monitor sales from all products (BrandPulse, Clarity Engine, Flagged, etc.)
- **Dashboard Analytics**: Real-time KPIs and division health checks
- **MCP Integrations**: 
  - Stripe for payment processing
  - Supabase for database
  - HubSpot for deal tracking
  - Slack for notifications
  - Gmail for email reports
  - Google Calendar for scheduling
  - Canva for report design
  - Vercel for deployment

## Tech Stack

- **Frontend**: Next.js 14, React 18, TypeScript
- **Database**: Supabase (PostgreSQL)
- **State Management**: Zustand
- **Payments**: Stripe
- **Deployment**: Vercel

## Local Development

### Prerequisites
- Node.js 18+
- npm or yarn

### Setup

1. Clone the repository:
```bash
git clone https://github.com/cha-llc/cha-budget-manager.git
cd cha-budget-manager
```

2. Install dependencies:
```bash
npm install
```

3. Configure environment variables:
```bash
cp .env.local.example .env.local
```

Update `.env.local` with your credentials:
- Supabase URL and API key
- Stripe publishable key
- HubSpot API key
- Slack bot token
- Gmail credentials

4. Run the development server:
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Deployment on Vercel

### Prerequisites
- GitHub account with the repository pushed
- Vercel account

### Deploy

1. Go to [vercel.com](https://vercel.com)
2. Click "New Project"
3. Import the `cha-budget-manager` repository from GitHub
4. Add environment variables in Vercel project settings
5. Click "Deploy"

The application will be deployed to your custom domain.

## Project Structure

```
cha-budget-manager/
├── app/
│   ├── page.tsx              # Home redirect
│   ├── layout.tsx            # Root layout
│   ├── dashboard/            # Dashboard page
│   ├── budgets/              # Budget management
│   ├── expenses/             # Expense tracking
│   ├── revenue/              # Revenue tracking
│   ├── integrations/         # Integration status
│   └── reports/              # Financial reports
├── components/
│   └── Layout.tsx            # Main layout component
├── lib/
│   ├── supabase.ts          # Supabase client
│   └── store.ts             # Zustand store
├── public/                   # Static assets
├── .env.local.example        # Environment template
├── next.config.js            # Next.js config
├── package.json
└── tsconfig.json
```

## Database Schema

### Tables (Supabase)

**division_budgets**
- id: UUID
- division: string
- monthly_budget: number
- created_at: timestamp
- updated_at: timestamp

**expenses**
- id: UUID
- division: string
- category: string
- amount: number
- description: string
- date: date
- created_at: timestamp

**revenue**
- id: UUID
- product_name: string
- amount: number
- source: string
- date: date
- created_at: timestamp

## Usage

### Setting Division Budgets
1. Go to **Budgets** page
2. Select division and enter monthly budget amount
3. Click "Set Budget"

### Logging Expenses
1. Go to **Expenses** page
2. Fill in division, category, amount, and description
3. Click "Add Expense"

### Tracking Revenue
1. Go to **Revenue** page
2. Select product, enter amount and source
3. Click "Log Revenue"

### Viewing Reports
1. Go to **Reports** page
2. Filter by division or view all
3. See detailed expense and revenue tables

## Integrations

All 14 MCPs are pre-configured and connected:
- ✅ Stripe
- ✅ Supabase
- ✅ HubSpot
- ✅ Slack
- ✅ Gmail
- ✅ Google Calendar
- ✅ Canva
- ✅ Vercel

## Brand Colors

- Navy: #1A1A2E
- Gold: #C9A84C
- Teal: #2A9D8F
- Crimson: #C1121F
- Violet: #9B5DE5

## Support

For issues and questions:
- GitHub: https://github.com/cha-llc/cha-budget-manager
- Email: cs@cjhadisa.com

## License

© 2026 C.H.A. LLC. All rights reserved.

---

**Sip slow. Love loud. Live free.**
