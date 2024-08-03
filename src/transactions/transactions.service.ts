import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma";
import { CreateTransactionsDto } from "./dto/create-transaction.dto";
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

    async getTotalAmountByCategory(userId: string): Promise<{ amount: number, category: string}[]> {
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
            amount: item._sum.amount as unknown as number,
            category: item.category
        }))
    }

    async getMyExpenses(userId: string): Promise<{ totalExpense: number }> {
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
            totalExpense: result._sum.amount as unknown as number
        }
    }

    async createTransaction(
        createTransactionDto: CreateTransactionsDto,
        userId: string): Promise<{ status: string; }> {
        return await this.prismaService.$transaction(async (txn) => {

            const isTypeCredit = createTransactionDto.type === 'Credit'

            if(isTypeCredit){
                createTransactionDto.debitFromAccountId = null
                const isCategoryIncome = createTransactionDto.category === 'Income'
                if(!isCategoryIncome){
                    throw new BadRequestException('Provide category Income for transaction type Credit')
                }
            }else{
                createTransactionDto.creditToAccountId = null
            }

            const isValidData = isTypeCredit ? !!createTransactionDto.creditToAccountId : !!createTransactionDto.debitFromAccountId
            
            if(!isValidData) throw new BadRequestException('Please provide "creditToAccountId" for type "Credit" and "debitFromAccountId" for type "Debit"')

            await txn.transaction.create({
                data: {
                    ...createTransactionDto,
                    userId
                }
            })
            await txn.accounts.update({
                where: {
                    id: isTypeCredit ? createTransactionDto.creditToAccountId as number : createTransactionDto.debitFromAccountId as number
                },
                data: {
                    amount: {
                        [isTypeCredit ? 'increment' : 'decrement']: createTransactionDto.amount
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
            
            if(updateTransactionDto.type){
                const isValidData = updateTransactionDto.type === 'Credit' ? !!updateTransactionDto.creditToAccountId : !!updateTransactionDto.debitFromAccountId
                if(!isValidData) throw new BadRequestException('Please provide creditToAccountId for type Credit and debitFromAccountId for type Debit')
            }

            //fetch previous transaction
            const transaction = await txn.transaction.findUnique({
                where: {
                    id: transactionId,
                    userId
                }
            })

            if (!transaction) throw new NotFoundException('Transaction not found!')

            const isTypeCredit = transaction.type === 'Credit'
            const accId = isTypeCredit ? transaction.creditToAccountId as number : transaction.debitFromAccountId as number
            const change = !isTypeCredit ? 'increment' : 'decrement'

            //reverse account data based on previous transaction details
            await txn.accounts.update({
                where: {
                    id: accId
                },
                data: {
                    amount: {
                        [change]: transaction.amount
                    }
                }
            })
            const isNewTypeCredit : boolean = updateTransactionDto.type ? updateTransactionDto.type === 'Credit' : transaction.type === 'Credit'
            if(isNewTypeCredit){
                updateTransactionDto.debitFromAccountId = null
                const isCategoryIncome = updateTransactionDto.category ? updateTransactionDto.category === 'Income' : transaction.category === 'Income'
                if(!isCategoryIncome){
                    throw new BadRequestException('Provide category Income for transaction type Credit')
                }
            }else{
                updateTransactionDto.creditToAccountId = null
            }
            console.log({
                updateTransactionDto
            })
            //update transaction with new values
            await txn.transaction.update({
                where: {
                    id: transactionId
                },
                data: updateTransactionDto
            })

            const newAccountId = updateTransactionDto.creditToAccountId ?? updateTransactionDto.debitFromAccountId ?? transaction.creditToAccountId ?? transaction.debitFromAccountId
            const newAmount = updateTransactionDto.amount ?? transaction.amount
            
            if(newAccountId && !isNaN(newAccountId)){
                // update account with new transaction values
                 await txn.accounts.update({
                    where: {
                        id: newAccountId
                    },
                    data: {
                        amount: {
                            [isNewTypeCredit ? 'increment' : 'decrement']: newAmount
                        }
                    }
                })
            }else{
                throw new BadRequestException('Account id argument is null or undefined')
            }

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
                throw new NotFoundException('No transaction found!')
            }
            const isTypeCredit = transaction.type === 'Credit'
            await txn.accounts.update({
                where: {
                    id: isTypeCredit ? transaction.creditToAccountId as number : transaction.debitFromAccountId as number,
                    userId
                },
                data: {
                    amount: {
                        [!isTypeCredit ? 'increment' : 'decrement']: transaction.amount
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