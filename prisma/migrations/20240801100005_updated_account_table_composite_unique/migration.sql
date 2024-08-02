/*
  Warnings:

  - A unique constraint covering the columns `[account_number,bank_name]` on the table `account` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "account_account_number_bank_name_key" ON "account"("account_number", "bank_name");
