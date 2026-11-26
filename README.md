# MoneyMate — Smart Expense Tracker

A full-stack personal finance management SaaS platform built with React, Tailwind CSS, Recharts, Node.js, Express, and MongoDB.

## Features
- **Authentication & Security**: JWT-based login/registration, bcrypt password hashing, forgot/reset password flow, strict per-user data isolation, and profile management.
- **Dashboard**: Total Balance, Total Income, Total Expenses, Total Savings, Monthly Budget progress, Recent Transactions, Income vs Expense chart, Monthly Spending Overview, Expense Category Breakdown, and Smart Spending Insights.
- **Transaction Management**: Add, edit, delete, search, sort, and filter income & expense transactions across categories and payment methods.
- **Budget Management**: Monthly overall and category-wise spending limits with utilization progress bars and threshold alerts (>=80% & >=100%).
- **Analytics & Reports**: Interactive Daily, Weekly, Monthly, and Yearly charts, Category Spending, Income vs Expense comparison, Savings Trends, and **PDF** & **Excel** report exports.
- **Savings Goals**: Target tracking, progress percentages, remaining amounts, and deposit contributions with milestone notifications.
- **Recurring Transactions**: Automated daily, weekly, monthly, or yearly schedules.
- **Customization**: Light & Dark mode, multi-currency support (default `INR ₹`), and responsive mobile navigation.

## Quick Start

```bash
npm install
npm --prefix server install
npm --prefix client install
npm run dev
```

- Frontend runs on `http://localhost:5173`
- Backend API runs on `http://localhost:5000`
- By default, if `MONGO_URI` in `server/.env` is empty and no local MongoDB daemon is running on port `27017`, MoneyMate automatically runs a persistent embedded MongoDB instance storing data in `server/data/db`. Set `MONGO_URI` in `server/.env` to connect to MongoDB Atlas or a standalone MongoDB server.
