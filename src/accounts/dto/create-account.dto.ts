import { ApiProperty } from "@nestjs/swagger";
import { AccountType } from "@prisma/client";
import { IsEnum, IsNumber, IsString } from "class-validator";

export class CreateAccountDto {
    @ApiProperty()
    @IsString()
    name: string;

    @ApiProperty({
        description: 'balance in account',
        example: 123.45
    })
    @IsNumber()
    amount: number;

    @ApiProperty({
        description: 'the type of the account',
        enum: AccountType,
        example: AccountType.Bank 
    })
    @IsEnum(AccountType, { message: "Invalid account type, example: `Bank | FixedDeposit`"})
    type: AccountType;

    @ApiProperty()
    @IsString()
    accountNumber: string;

    @ApiProperty()
    @IsString()
    bankName: string
}