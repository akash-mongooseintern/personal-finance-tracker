import { AccessGuard, AuthenticatedRequest, BaseController, JwtAuthGuard } from "@Common";
import { BadRequestException, Body, Controller, Delete, Param, ParseIntPipe, Post, Req, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiCreatedResponse, ApiOkResponse, ApiTags } from "@nestjs/swagger";
import { TransactionsService } from "./transactions.service";
import { Transaction } from "@prisma/client";
import { CreateTransactionsDto } from "./dto/create-transaction.dto";

@ApiTags('Transaction')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, AccessGuard)
@Controller('transactions')
export class TransactionsController extends BaseController{
    constructor(private readonly transactionsService: TransactionsService){
        super()
    }

    @Post('me')
    @ApiCreatedResponse({
        type : Promise<Transaction>
    })
    async createTransaction(
        @Req() req: AuthenticatedRequest,
        @Body() createTransactionDto: CreateTransactionsDto
    ) : Promise<{ status: string; }> {
        const ctx = this.getContext(req)
        console.log(createTransactionDto)
        try{
            return await this.transactionsService.createTransaction(createTransactionDto, ctx.user.id)
        }catch(err){
            console.log(err)
            throw new BadRequestException('Something went wrong!')
        }
    }

    @Delete('me/:transaction_id')
    @ApiOkResponse({
        type: Promise<{message: string}>
    })
    async deleteTransactions(
        @Req() req: AuthenticatedRequest,
        @Param('transaction_id',ParseIntPipe) txnId: number
    ): Promise<{message: string}>{
        const ctx = this.getContext(req)
        return await this.transactionsService.deleteTransaction(txnId, req.user.id)
    }
}