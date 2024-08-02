import { BadRequestException, Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma";
import { CreateTransactionsDto } from "./dto/create-transaction.dto";

@Injectable()
export class TransactionsService {
    constructor(
        private readonly prismaService: PrismaService
    ) { }

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
                        [isCredit ? 'increment' : 'decrement' ]: createTransactionDto.amount
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
    ): Promise<{ message : string }> {
        console.log({
            txnId,
            userId
        })
        return await this.prismaService.$transaction( async (txn) => {
            const transaction = await txn.transaction.findUnique({
                where: {
                    id: txnId
                }
            })
            if(!transaction){
                throw new BadRequestException('No transaction found!')
            }
            const isCreditTxn = transaction.type === 'Credit'
            const updateAcc = await txn.accounts.update({
                where: {
                    id: isCreditTxn ? transaction.creditToAccountId as number : transaction.debitFromAccountId as number
                },
                data: {
                    amount: {
                        [!isCreditTxn ? 'increment' : 'decrement' ]: transaction.amount
                    }
                }
            })
            const deleteTrans = await txn.transaction.delete({ where : { id: txnId }})
            console.log({
                transaction,
                deleteTrans,
                updateAcc
            })
            return {
                message: 'success'
            }
        })
    }
}