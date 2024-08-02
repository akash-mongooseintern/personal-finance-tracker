import { BadRequestException, Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma";
import { CreateTransactionsDto } from "./dto/create-transaction.dto";
import { GetTransactionsDto } from "./dto/get-transaction.dto";
import { Transaction, TransactionCategory, TransactionType } from "@prisma/client";
import { UpdateTransactionDto } from "./dto/update-transaction.dto";

interface IWhereInputForGetTransaction {
    type?: TransactionType,
    category?: TransactionCategory
}

@Injectable()
export class TransactionsService {
    constructor(
        private readonly prismaService: PrismaService
    ) { }

    async getTransactions(
        query: {
            accountId?: number,
            type?: TransactionType,
            category?: TransactionCategory
        },
        userId: string
    ): Promise<Transaction[]> {
        const where: IWhereInputForGetTransaction = {}
        const orCondition = []
        if (query.accountId) {
            orCondition.push(
                { creditToAccountId: query.accountId },
                { debitFromAccountId: query.accountId }
            )
        }
        if (query.type) {
            where.type = query.type
        }
        if (query.category) {
            where.category = query.category
        }
        return await this.prismaService.transaction.findMany({
            where: {
                userId,
                AND: [
                    {
                        ...where
                    },
                    {
                        OR: orCondition
                    }
                ]
            }
        })
    }

    async getTransactionsById(txnId: number, userId: string): Promise<Transaction | null> {
        return await this.prismaService.transaction.findUnique({
            where: {
                id: txnId,
                userId
            }
        })
    }

    async getTotalAmountByCategory(userId: string): Promise<any> {
        const result = await this.prismaService.transaction.groupBy({
            by: 'category',
            _sum: {
                amount: true
            },
            where: {
                userId
            }
        })
        return result.map(item => ({
            amount: item._sum.amount,
            category: item.category
        }))
    }

    async getMyExpenses(userId: string): Promise<{ totalExpense: string }> {
        const result = await this.prismaService.transaction.aggregate({
            _sum: {
                amount: true
            },
            where: {
                userId,
                type: 'Debit'
            }
        })

        return {
            totalExpense: `${result._sum.amount}`
        }
    }


    async createTransaction(
        createTransactionDto: CreateTransactionsDto,
        userId: string): Promise<{ status: string; }> {
        return await this.prismaService.$transaction(async (txn) => {
            await txn.transaction.create({
                data: {
                    ...createTransactionDto,
                    userId
                }
            })
            const isCredit = createTransactionDto.type === 'Credit'
            await txn.accounts.update({
                where: {
                    id: isCredit ? createTransactionDto.creditToAccountId : createTransactionDto.debitFromAccountId
                },
                data: {
                    amount: {
                        [isCredit ? 'increment' : 'decrement']: createTransactionDto.amount
                    }
                }
            })
            return {
                status: 'successful!'
            }
        })
    }

    async updateTransaction(
        transactionId: number,
        updateTransactionDto: UpdateTransactionDto,
        userId: string): Promise<{ status: string; }> {
        return await this.prismaService.$transaction(async (txn) => {
            const transaction = await txn.transaction.findUnique({
                where: {
                    id: transactionId,
                    userId
                }
            })

            if (!transaction) throw new BadRequestException('Transaction not found!')

            const isCredit = transaction.type === 'Credit'

            await txn.accounts.update({
                where: {
                    id: isCredit ? transaction.creditToAccountId as number : transaction.debitFromAccountId as number
                },
                data: {
                    amount: {
                        [!isCredit ? 'increment' : 'decrement']: transaction.amount
                    }
                }
            })

            await txn.transaction.update({
                where: {
                    id: transactionId
                },
                data: updateTransactionDto
            })
            
            let accId = (transaction.creditToAccountId || transaction.debitFromAccountId) as number
            if(updateTransactionDto.creditToAccountId || updateTransactionDto.debitFromAccountId){
                accId = (updateTransactionDto.creditToAccountId || updateTransactionDto.debitFromAccountId) as number
            }
            const isCreditUpdate = updateTransactionDto.type ? updateTransactionDto.type === 'Credit' : transaction.type === 'Credit'

            await txn.accounts.update({
                where: {
                    id: accId
                },
                data: {
                    amount: {
                        [isCreditUpdate ? 'increment' : 'decrement']: transaction.amount
                    }
                }
            })

            return {
                status: 'successful!'
            }
        })
    }

    async deleteTransaction(
        txnId: number,
        userId: string
    ): Promise<{ status: string }> {
        return await this.prismaService.$transaction(async (txn) => {
            const transaction = await txn.transaction.findUnique({
                where: {
                    id: txnId,
                    userId
                }
            })
            if (!transaction) {
                throw new BadRequestException('No transaction found!')
            }
            const isCreditTxn = transaction.type === 'Credit'
            await txn.accounts.update({
                where: {
                    id: isCreditTxn ? transaction.creditToAccountId as number : transaction.debitFromAccountId as number,
                    userId
                },
                data: {
                    amount: {
                        [!isCreditTxn ? 'increment' : 'decrement']: transaction.amount
                    }
                }
            })
            await txn.transaction.delete({
                where: {
                    id: txnId,
                    userId
                }
            })
            return {
                status: 'success'
            }
        })
    }
}