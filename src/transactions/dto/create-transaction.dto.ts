import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { TransactionCategory, TransactionType } from "@prisma/client";
import { IsDate, IsEnum, IsNumber, IsOptional } from "class-validator";

export class CreateTransactionsDto {
    @ApiProperty()
    @IsNumber()
    amount: number;

    @ApiProperty()
    @IsEnum(TransactionType, { message: "Invalid account type, example: `Credit | Debit`"})
    type: TransactionType;

    @ApiProperty()
    @IsEnum(TransactionCategory, { 
        message: "Invalid account type, example: `Income | Food | Entertainment | Transport | Healthcare | Shopping | Travel | Other`"
    })
    category: TransactionCategory;

    @ApiPropertyOptional()
    @IsNumber()
    @IsOptional()
    creditToAccountId: number | undefined;

    @ApiPropertyOptional()
    @IsNumber()
    @IsOptional()
    debitFromAccountId: number | undefined;
}