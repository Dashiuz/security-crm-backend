import { PartialType } from '@nestjs/swagger';
import { CreateSnippetDto } from './create-snippet.dto';
import { IsBoolean, IsOptional } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateSnippetDto extends PartialType(CreateSnippetDto) {
  @ApiPropertyOptional({
    description: 'Estado activo del fragmento',
  })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
