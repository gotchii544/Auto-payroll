# Timemark Auto-Payroll

Upload timemark photos → timestamps are read automatically (OCR in the browser) → weekly payroll is computed:
- Schedule: Mon–Fri, 7:00 AM – 4:00 PM (1-hr lunch = 8 regular hours)
- Overtime: hours past 4:00 PM at hourly rate × 1.3
- Deductions: Wednesday CA, SSS, PH, PI, Other CA → Final Pay
- Data is saved in the browser (localStorage). Export to CSV anytime.

## Run locally
```bash
npm install
npm run dev
```
Open http://localhost:3000

## Host it (production)
```bash
npm install
npm run build
npm start        # serves on port 3000
```

### Easiest hosting: Vercel
1. Push this folder to a GitHub repo
2. Import the repo at vercel.com — no config needed (Next.js auto-detected)

### Or any Node server / VPS
```bash
npm install && npm run build
npm start   # keep alive with pm2: pm2 start npm --name payroll -- start
```

No environment variables or database required — everything runs client-side.
