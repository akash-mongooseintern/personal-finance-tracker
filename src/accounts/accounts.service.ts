import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma";
import { CreateAccountDto } from "./dto/create-account.dto";
import { Accounts } from "@prisma/client";
import { UpdateAccountsDto } from "./dto/update-account.dto";

@Injectable()
export class AccountsService {
    constructor(
        private readonly prismaService: PrismaService,
    ) { }

    async isDuplicateAccount(bankName: string, accountNumber: string): Promise<boolean> {
        const result = await this.prismaService.accounts.findUnique({
            where: {
                accountNumber_bankName: {
                    bankName,
                    accountNumber
                }
            }
        })
        return Boolean(result)
    }

    async findAccountById(id: number): Promise<Accounts | null> {
        return await this.prismaService.accounts.findUnique({
            where: { id }
        })
    }

    async findAccountsByUserId(userId: string): Promise<Accounts[]> {
        return await this.prismaService.accounts.findMany({
            where: {
                userId
            }
        })
    }

    async findUniqueAccountByUserAndAccountId(accountId: number, userId: string): Promise<Accounts | null> {
        return await this.prismaService.accounts.findUnique({
            where: {
                id: accountId,
                userId
            }
        })
    }

    async createAccount(createAccountDto: CreateAccountDto, userId: string): Promise<Accounts> {
        const data = {
            ...createAccountDto,
            userId
        }
        return await this.prismaService.accounts.create({ data })
    }

    async updatePartialAccount(accountId: number, updateAccountDto: UpdateAccountsDto, userId: string): Promise<Accounts> {
        return await this.prismaService.accounts.update({
            where: {
                id: accountId,
                userId
            },
            data: updateAccountDto
        })
    }

    async deleteAccount(accountId: number, userId: string): Promise<Accounts> {
        return await this.prismaService.accounts.delete({
            where: {
                id: accountId,
                userId
            }
        })
    }
}