import { AccessGuard, AuthenticatedRequest, BaseController, JwtAuthGuard } from "@Common";
import { BadRequestException, Body, Controller, Delete, Get, Param, ParseIntPipe, Post, Put, Query, Req, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiCreatedResponse, ApiOkResponse, ApiTags } from "@nestjs/swagger";
import { TransactionsService } from "./transactions.service";
import { Transaction } from "@prisma/client";
import { CreateTransactionsDto } from "./dto/create-transaction.dto";
import { GetTransactionsDto } from "./dto/get-transaction.dto";
import { SuccessResponseDto } from "src/common/dto/success-response.dto";
import { UpdateTransactionDto } from "./dto/update-transaction.dto";

@ApiTags('Transaction')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, AccessGuard)
@Controller('transactions')
export class TransactionsController extends BaseController {
    constructor(private readonly transactionsService: TransactionsService) {
        super()
    }

    @Get()
    @ApiOkResponse({
        type: Promise<Transaction[]>
    })
    async getTransactions(
        @Req() req: AuthenticatedRequest,
        @Query() query: GetTransactionsDto
    ): Promise<Transaction[]> {
        const ctx = this.getContext(req)
        try {
            return await this.transactionsService.getTransactions({
                accountId: query.account_id,
                type: query.type,
                category: query.category
            }, ctx.user.id)
        } catch (err) {
            throw new BadRequestException(err.message)
        }
    }

    @Get('amount-by-category')
    @ApiOkResponse({
        type: Promise<SuccessResponseDto<{
            amounts: number,
            category: string
        }[]>>
    })
    async getTotalAmountByCategory(
        @Req() req: AuthenticatedRequest
    ): Promise<SuccessResponseDto<{amount: number, category: string}[]>> {
        const ctx = this.getContext(req)
        try {
            return new SuccessResponseDto(await this.transactionsService.getTotalAmountByCategory(ctx.user.id))
        } catch (err) {
            throw new BadRequestException(err.message)
        }
    }

    @Get('expense')
    @ApiOkResponse({
        type: Promise<SuccessResponseDto<{ totalExpense: number }>>
    })
    async getMyExpenses(
        @Req() req: AuthenticatedRequest
    ): Promise<SuccessResponseDto<{ totalExpense: number }>> {
        const ctx = this.getContext(req)
        try {
            return new SuccessResponseDto(await this.transactionsService.getMyExpenses(ctx.user.id))
        } catch (err) {
            throw new BadRequestException(err.message)
        }
    }

    @Get(':transaction_id')
    @ApiOkResponse({
        type: Promise<SuccessResponseDto<Transaction | null>>
    })
    async getTransactionsById(
        @Req() req: AuthenticatedRequest,
        @Param('transaction_id', ParseIntPipe) txnId: number
    ): Promise<SuccessResponseDto<Transaction | null>> {
        const ctx = this.getContext(req)
        try {
            return new SuccessResponseDto(await this.transactionsService.getTransactionsById(txnId, ctx.user.id))
        } catch (err) {
            throw new BadRequestException(err.message)
        }
    }

    @Post()
    @ApiCreatedResponse({
        type: Promise<Transaction>
    })
    async createTransaction(
        @Req() req: AuthenticatedRequest,
        @Body() createTransactionDto: CreateTransactionsDto
    ): Promise<{ status: string; }> {
        const ctx = this.getContext(req)
        return await this.transactionsService.createTransaction(createTransactionDto, ctx.user.id)
    }

    @Put(':transaction_id')
    @ApiCreatedResponse({
        type: Promise<Transaction>
    })
    async updateTransaction(
        @Req() req: AuthenticatedRequest,
        @Body() updateTransactionDto: UpdateTransactionDto,
        @Param('transaction_id', ParseIntPipe) transactionId: number
    ): Promise<{ status: string; }> {
        const ctx = this.getContext(req)
        return await this.transactionsService.updateTransaction(
            transactionId,
            updateTransactionDto,
            ctx.user.id
        )
    }

    @Delete(':transaction_id')
    @ApiOkResponse({
        type: Promise<{ status: string }>
    })
    async deleteTransactions(
        @Req() req: AuthenticatedRequest,
        @Param('transaction_id', ParseIntPipe) txnId: number
    ): Promise<{ status: string }> {
        const ctx = this.getContext(req)
        return await this.transactionsService.deleteTransaction(txnId, req.user.id)
    }
}