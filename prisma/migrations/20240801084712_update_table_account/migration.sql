/*
  Warnings:

  - You are about to drop the column `account` on the `account` table. All the data in the column will be lost.
  - Added the required column `account_number` to the `account` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "account" DROP COLUMN "account",
ADD COLUMN     "account_number" TEXT NOT NULL;
