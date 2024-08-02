/*
  Warnings:

  - You are about to drop the column `account_number` on the `account` table. All the data in the column will be lost.
  - Added the required column `account` to the `account` table without a default value. This is not possible if the table is not empty.
  - Added the required column `bank_name` to the `account` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "account" DROP COLUMN "account_number",
ADD COLUMN     "account" TEXT NOT NULL,
ADD COLUMN     "bank_name" TEXT NOT NULL;
