import { PartialType } from '@nestjs/swagger';
import { CreateTextSnippetDto } from './create-text-snippet.dto';

export class UpdateTextSnippetDto extends PartialType(CreateTextSnippetDto) {}
