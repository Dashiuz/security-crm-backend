import { PartialType } from '@nestjs/swagger';
import { CreateValueAddedDto } from './create-value-added.dto';

export class UpdateValueAddedDto extends PartialType(CreateValueAddedDto) {}
