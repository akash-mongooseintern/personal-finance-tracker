import { AccessGuard, AuthenticatedRequest, BaseController, JwtAuthGuard } from "@Common";
import { BadRequestException, Body, Controller, Delete, Get, Param, ParseIntPipe, Patch, Post, Put, Req, UseGuards } from "@nestjs/common";
import { AccountsService } from "./accounts.service";
import { ApiBearerAuth, ApiOkResponse, ApiTags } from "@nestjs/swagger";
import { CreateAccountDto } from "./dto/create-account.dto";
import { Accounts } from "@prisma/client";
import { UpdateAccountsDto } from "./dto/update-account.dto";
import { SuccessResponseDto } from "src/common/dto/success-response.dto";


@ApiTags('Account')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, AccessGuard)
@Controller('accounts')
export class AccountsController extends BaseController {
    constructor(
        private readonly accountsService: AccountsService
    ){
        super()
    }

    @Get()
    @ApiOkResponse({
        type: Promise<SuccessResponseDto<Accounts[]>>
    })
    async getMyAccounts(@Req() req: AuthenticatedRequest): Promise<SuccessResponseDto<Accounts[]>> {
        const ctx = this.getContext(req)
        return new SuccessResponseDto(await this.accountsService.findAccountsByUserId(ctx.user.id))
    }
    
    @Get(':account_id')
    @ApiOkResponse({
        type: Promise<SuccessResponseDto<Accounts[]>>
    })
    async getMyAccountById(
        @Req() req: AuthenticatedRequest,
        @Param('account_id',ParseIntPipe) accountId: number
    ): Promise<SuccessResponseDto<Accounts | null>> {
        const ctx = this.getContext(req)
        return new SuccessResponseDto(await this.accountsService.findUniqueAccountByUserAndAccountId(accountId, ctx.user.id))
    }

    @Post()
    @ApiOkResponse({
        type: Promise<Accounts>
    })
    async createAccount(
        @Req() req: AuthenticatedRequest, 
        @Body() createAccountDto: CreateAccountDto
    ): Promise<Accounts>{
        const ctx = this.getContext(req)
            const isDuplicateAccount = await this.accountsService.isDuplicateAccount(createAccountDto.bankName, createAccountDto.accountNumber)
            if(isDuplicateAccount) throw new BadRequestException('Account already created!')
            return await this.accountsService.createAccount(createAccountDto, ctx.user.id)
    }

    @Put(':account_id')
    async updatePartialAccount(
        @Req() req: AuthenticatedRequest,
        @Param('account_id', ParseIntPipe) accountId: number,
        @Body() updateAccountDto: UpdateAccountsDto
    ): Promise<SuccessResponseDto<{status: string}>> {
        const ctx = this.getContext(req)
        const result = await this.accountsService.updatePartialAccount(accountId, updateAccountDto, ctx.user.id)
        return new SuccessResponseDto(result)
    }

    @Delete(':account_id')
    async deleteAccount(
        @Req() req: AuthenticatedRequest,
        @Param('account_id', ParseIntPipe) accountId: number
    ): Promise<Accounts> {
        const ctx = this.getContext(req)
        const account = await this.accountsService.findAccountById(accountId)
        if(!account){
            throw new BadRequestException('Account not found!')
        }
        return await this.accountsService.deleteAccount(accountId, ctx.user.id)
    }

}