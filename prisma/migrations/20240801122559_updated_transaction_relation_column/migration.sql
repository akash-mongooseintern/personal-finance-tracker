/*
  Warnings:

  - You are about to drop the column `debit_to` on the `transaction` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "transaction" DROP CONSTRAINT "transaction_debit_to_fkey";

-- AlterTable
ALTER TABLE "transaction" DROP COLUMN "debit_to",
ADD COLUMN     "debit_from" INTEGER;

-- AddForeignKey
ALTER TABLE "transaction" ADD CONSTRAINT "transaction_debit_from_fkey" FOREIGN KEY ("debit_from") REFERENCES "account"("id") ON DELETE SET NULL ON UPDATE CASCADE;
