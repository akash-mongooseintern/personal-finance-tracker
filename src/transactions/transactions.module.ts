import { Module } from "@nestjs/common";
import { TransactionsController } from "./transactions.controller";
import { TransactionsService } from "./transactions.service";
import { PrismaModule } from "../prisma";

@Module({
    imports: [PrismaModule],
    controllers: [TransactionsController],
    providers: [TransactionsService]
})
export class TransactionModule {}