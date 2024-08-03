import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { TransactionCategory, TransactionType } from "@prisma/client";
import { IsEnum, IsNumber, IsOptional } from "class-validator";

export class CreateTransactionsDto {
    @ApiProperty()
    @IsNumber()
    amount: number;

    @ApiProperty()
    @IsEnum(TransactionType, { message: "Invalid transaction type, example: `Credit | Debit`"})
    type: TransactionType;

    @ApiProperty()
    @IsEnum(TransactionCategory, { 
        message: "Invalid transaction category, example: `Income | Food | Entertainment | Transport | Healthcare | Shopping | Travel | Other`"
    })
    category: TransactionCategory;

    @ApiPropertyOptional()
    @IsNumber()
    @IsOptional()
    creditToAccountId?: number | null;

    @ApiPropertyOptional()
    @IsNumber()
    @IsOptional()
    debitFromAccountId?: number | null;
}