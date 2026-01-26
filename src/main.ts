import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { NestExpressApplication } from '@nestjs/platform-express';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';
import cookieParser from 'cookie-parser';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  const config = app.get(ConfigService);
  const port = config.get<number>('api.port') || 3000;
  const environment = config.get<string>('environment');

  const swaggerConfig = SwaggerModule.createDocument(
    app,
    new DocumentBuilder()
      .setTitle('Security CRM Backend')
      .setDescription(`API documentation for Security CRM Backend`)
      .setVersion('1.0')
      .addBearerAuth(
        {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          in: 'header',
          description: 'Paste your access token',
        },
        'access-token',
      )
      .build(),
  );

  SwaggerModule.setup('api/docs', app, swaggerConfig, {
    swaggerOptions: {
      persistAuthorization: true,
    },
  });

  app.use(cookieParser());
  app.enableCors({
    origin: process.env.CORS_ORIGIN?.split(',') ?? true,
    credentials: true,
  });
  app.useGlobalPipes(new ValidationPipe({ transform: true }));
  app.enableShutdownHooks();

  await app.listen(port, () => {
    console.log('🚀 API running on port ', port);
    console.log(`🖥 You're working on environment `, environment);
  });
}
bootstrap();
