import { SignersController } from './signers.controller';

describe('SignersController', () => {
  let controller: SignersController;
  let mockService: any;

  const mockReq = {
    user: {
      sub: 'usr-1',
      tenantId: 'ten-1',
      roles: ['ADMIN'],
      permissions: ['commercial:settings:manage'],
    },
  };

  const sampleSigner = {
    id: 'sig-1',
    fullName: 'Alberto Ruiz',
    email: 'alberto@noxia.com',
  };

  beforeEach(() => {
    mockService = {
      getSigners: jest.fn().mockResolvedValue([sampleSigner]),
      getSignerById: jest.fn().mockResolvedValue(sampleSigner),
      createSigner: jest.fn().mockResolvedValue(sampleSigner),
      updateSigner: jest.fn().mockResolvedValue(sampleSigner),
      uploadSignerSignature: jest.fn().mockResolvedValue({ s3Key: 'sig.png' }),
      deleteSigner: jest.fn().mockResolvedValue({ success: true }),
    };

    controller = new SignersController(mockService);
  });

  it('debe listar los firmantes autorizados', async () => {
    const res = await controller.getSigners(mockReq);
    expect(mockService.getSigners).toHaveBeenCalledWith(mockReq.user);
    expect(res).toHaveLength(1);
  });

  it('debe listar usuarios del sistema elegibles como firmantes', async () => {
    mockService.getSystemUsersAsSigners = jest.fn().mockResolvedValue([
      { id: 'usr-1', fullName: 'Carlos Admin', hasSignature: true },
    ]);
    const res = await controller.getSystemUsersAsSigners(mockReq);
    expect(mockService.getSystemUsersAsSigners).toHaveBeenCalledWith(mockReq.user);
    expect(res).toHaveLength(1);
    expect(res[0].hasSignature).toBe(true);
  });

  it('debe consultar firmante por id', async () => {
    const res = await controller.getSignerById('sig-1', mockReq);
    expect(mockService.getSignerById).toHaveBeenCalledWith(
      'sig-1',
      mockReq.user,
    );
    expect(res.id).toBe('sig-1');
  });

  it('debe crear un nuevo firmante', async () => {
    const dto = {
      fullName: 'Alberto Ruiz',
      idNumber: '12345',
      corporateTitle: 'Director',
      email: 'alberto@noxia.com',
    };
    const res = await controller.createSigner(dto, mockReq);
    expect(mockService.createSigner).toHaveBeenCalledWith(dto, mockReq.user);
    expect(res.id).toBe('sig-1');
  });

  it('debe actualizar un firmante', async () => {
    const res = await controller.updateSigner(
      'sig-1',
      { phone: '123' },
      mockReq,
    );
    expect(mockService.updateSigner).toHaveBeenCalledWith(
      'sig-1',
      { phone: '123' },
      mockReq.user,
    );
    expect(res.id).toBe('sig-1');
  });

  it('debe subir firma digitalizada', async () => {
    const file = { buffer: Buffer.from('data') } as Express.Multer.File;
    const res = await controller.uploadSignature('sig-1', file, mockReq);
    expect(mockService.uploadSignerSignature).toHaveBeenCalledWith(
      'sig-1',
      file,
      mockReq.user,
    );
    expect(res.s3Key).toBe('sig.png');
  });

  it('debe inhabilitar firmante', async () => {
    const res = await controller.deleteSigner('sig-1', mockReq);
    expect(mockService.deleteSigner).toHaveBeenCalledWith(
      'sig-1',
      mockReq.user,
    );
    expect(res.success).toBe(true);
  });
});
