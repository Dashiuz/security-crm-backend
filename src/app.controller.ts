import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { AppService } from './app.service';

@ApiTags('Ping')
@Controller()
export class AppController {
  constructor(private readonly appService: AppService) { }

  @Get()
  @ApiOperation({ summary: `Checks server status` })
  @ApiResponse({
    status: 200,
    description: `Pong!, server's Ok!`,
    type: String,
  })
  ping(): string {
    return this.appService.getPing();
  }
}
