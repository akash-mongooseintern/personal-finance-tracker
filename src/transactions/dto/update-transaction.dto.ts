import { PartialType } from "@nestjs/swagger";
import { CreateTransactionsDto } from "./create-transaction.dto";

export class UpdateTransactionDto extends PartialType(CreateTransactionsDto) {}