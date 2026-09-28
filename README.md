This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Local testing against the Firebase emulators

Sign-in needs an account whose Firebase Auth custom claim `role` is `coach` or `admin`.
To test without touching prod:

1. Start the emulators from `../beshaped-backend` (`npm run emulators`; auth 9099, firestore 8080, storage 9199).
2. Seed test accounts and data (refuses to run unless the emulator hosts are set):

   ```bash
   FIRESTORE_EMULATOR_HOST=127.0.0.1:8080 FIREBASE_AUTH_EMULATOR_HOST=127.0.0.1:9099 npm run seed:emulator
   ```

   Accounts: `coach-a@beshaped.test`, `coach-b@beshaped.test` (coaches), `admin@beshaped.test` (admin),
   `client-only@beshaped.test` (no role, must be refused). Password: `TEST_PASSWORD` in `scripts/seed-emulator.mjs`.
3. `npm run dev:emulators` (sets `NEXT_PUBLIC_USE_EMULATORS=true`; the app then uses project `demo-beshaped`).
   Add `-- --webpack` if Turbopack dev crashes on your machine. `next build` refuses to run with the flag on.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
