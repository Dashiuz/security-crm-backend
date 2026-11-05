import { Test, TestingModule } from '@nestjs/testing';
import { TenantPublicController } from './tenant-public.controller';
import { TenantService } from './tenant.service';
import { NotFoundException } from '@nestjs/common';
import type { Response } from 'express';

describe('TenantPublicController', () => {
  let controller: TenantPublicController;
  let service: {
    getLogoStreamOrUrl: jest.Mock;
  };

  beforeEach(async () => {
    service = {
      getLogoStreamOrUrl: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [TenantPublicController],
      providers: [
        {
          provide: TenantService,
          useValue: service,
        },
      ],
    }).compile();

    controller = module.get<TenantPublicController>(TenantPublicController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('getLogo', () => {
    it('should redirect if result type is redirect', async () => {
      service.getLogoStreamOrUrl.mockResolvedValue({
        type: 'redirect',
        url: 'https://presigned.s3.aws.com/logo.png',
      });

      const res = {
        redirect: jest.fn(),
      } as unknown as Response;

      await controller.getLogo('t1', res);
      expect(res.redirect).toHaveBeenCalledWith(
        'https://presigned.s3.aws.com/logo.png',
      );
    });

    it('should send buffer if result type is buffer', async () => {
      const buffer = Buffer.from('image-data');
      service.getLogoStreamOrUrl.mockResolvedValue({
        type: 'buffer',
        buffer,
        mimeType: 'image/png',
      });

      const res = {
        setHeader: jest.fn(),
        send: jest.fn(),
      } as unknown as Response;

      await controller.getLogo('t1', res);
      expect(res.setHeader).toHaveBeenCalledWith('Content-Type', 'image/png');
      expect(res.send).toHaveBeenCalledWith(buffer);
    });

    it('should throw NotFoundException if getLogoStreamOrUrl returns null or invalid', async () => {
      service.getLogoStreamOrUrl.mockResolvedValue(null);

      const res = { redirect: jest.fn() } as unknown as Response;
      await expect(controller.getLogo('unknown', res)).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
