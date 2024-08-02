import { ApiPropertyOptional } from "@nestjs/swagger";
import { TransactionCategory, TransactionType } from "@prisma/client";
import { IsEnum, IsNumber, IsOptional } from "class-validator";

export class GetTransactionsDto {
    @ApiPropertyOptional()
    @IsOptional()
    @IsNumber()
    account_id?: number

    @ApiPropertyOptional()
    @IsOptional()
    @IsEnum(TransactionType,{
        message: 'type value must be : Credit | Debit'
    })
    type?: TransactionType

    @ApiPropertyOptional()
    @IsOptional()
    @IsEnum(TransactionCategory,{
        message: '`Income | Food | Entertainment | Transport | Healthcare | Shopping | Travel | Other`'
    })
    category?: TransactionCategory
}