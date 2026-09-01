export const configuration = () => {
  return {
    environment: process.env.NODE_ENV || 'development',
    api: {
      port: process.env.API_PORT,
      secret: process.env.JWT_API_SECRET,
      expiresIn: process.env.JWT_ACCESS_TTL,
    },
    cors: {
      origin: process.env.ALLOWED_ORIGIN?.split(','),
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD'],
      allowedHeaders: [
        'Origin',
        'X-Requested-With',
        'Content-Type',
        'Accept',
        'X-Access-Token',
        'Authorization',
      ],
    },
  };
};
