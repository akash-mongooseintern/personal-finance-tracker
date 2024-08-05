import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma";
import { CreateTransactionsDto } from "./dto/create-transaction.dto";
import { Transaction, TransactionCategory, TransactionType } from "@prisma/client";
import { UpdateTransactionDto } from "./dto/update-transaction.dto";
import { TRANSACTION_ERROR, TRANSACTION_VALUES } from "./transactions.constant";
import { ACCOUNT_ERROR } from "src/accounts/accounts.constant";
import { API_RESPONSE_VALUE } from "src/app.constant";

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
                type: TransactionType.Debit
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

            const isTypeCredit = createTransactionDto.type === TransactionType.Credit

            if(isTypeCredit){
                createTransactionDto.debitFromAccountId = null
                const isCategoryIncome = createTransactionDto.category === TransactionCategory.Income
                if(!isCategoryIncome){
                    throw new BadRequestException(TRANSACTION_ERROR.INVALID_TYPE_AND_CATEGORY)
                }
            }else{
                createTransactionDto.creditToAccountId = null
            }

            const isValidData = isTypeCredit ? !!createTransactionDto.creditToAccountId : !!createTransactionDto.debitFromAccountId
            
            if(!isValidData) throw new BadRequestException(TRANSACTION_ERROR.MISSING_CREDIT_OR_DEBIT_ACC_ID)

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
                        [isTypeCredit ? TRANSACTION_VALUES.INCREMENT : TRANSACTION_VALUES.DECREMENT]: createTransactionDto.amount
                    }
                }
            })
            return {
                status: API_RESPONSE_VALUE.SUCCESS
            }
        })
    }

    async updateTransaction(
        transactionId: number,
        updateTransactionDto: UpdateTransactionDto,
        userId: string): Promise<{ status: string; }> {

        return await this.prismaService.$transaction(async (txn) => {
            
            if(updateTransactionDto.type){
                const isValidData = updateTransactionDto.type === TransactionType.Credit ? !!updateTransactionDto.creditToAccountId : !!updateTransactionDto.debitFromAccountId
                if(!isValidData) throw new BadRequestException(TRANSACTION_ERROR.MISSING_CREDIT_OR_DEBIT_ACC_ID)
            }

            //fetch previous transaction
            const transaction = await txn.transaction.findUnique({
                where: {
                    id: transactionId,
                    userId
                }
            })

            if (!transaction) throw new NotFoundException(TRANSACTION_ERROR.TRANSACTION_NOT_FOUND)

            const isTypeCredit = transaction.type === TransactionType.Credit
            const accId = isTypeCredit ? transaction.creditToAccountId as number : transaction.debitFromAccountId as number
            const change = !isTypeCredit ? TRANSACTION_VALUES.INCREMENT : TRANSACTION_VALUES.DECREMENT

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
            const isNewTypeCredit : boolean = updateTransactionDto.type ? updateTransactionDto.type === TransactionType.Credit : transaction.type === TransactionType.Credit
            if(isNewTypeCredit){
                updateTransactionDto.debitFromAccountId = null
                const isCategoryIncome = updateTransactionDto.category ? updateTransactionDto.category === TransactionCategory.Income : transaction.category === TransactionCategory.Income
                if(!isCategoryIncome){
                    throw new BadRequestException(TRANSACTION_ERROR.INVALID_TYPE_AND_CATEGORY)
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
                            [isNewTypeCredit ? TRANSACTION_VALUES.INCREMENT : TRANSACTION_VALUES.DECREMENT]: newAmount
                        }
                    }
                })
            }else{
                throw new BadRequestException(ACCOUNT_ERROR.ID_IS_MISSING)
            }

            return {
                status: API_RESPONSE_VALUE.SUCCESS
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
                throw new NotFoundException(TRANSACTION_ERROR.TRANSACTION_NOT_FOUND)
            }
            const isTypeCredit = transaction.type === TransactionType.Credit
            await txn.accounts.update({
                where: {
                    id: isTypeCredit ? transaction.creditToAccountId as number : transaction.debitFromAccountId as number,
                    userId
                },
                data: {
                    amount: {
                        [!isTypeCredit ? TRANSACTION_VALUES.INCREMENT : TRANSACTION_VALUES.DECREMENT]: transaction.amount
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
                status: API_RESPONSE_VALUE.SUCCESS
            }
        })
    }
}