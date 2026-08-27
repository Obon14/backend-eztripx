-- AlterEnum: add MIDTRANS (keep XENDIT for historical rows)
ALTER TYPE "PaymentProvider" ADD VALUE IF NOT EXISTS 'MIDTRANS';
