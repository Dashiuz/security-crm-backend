export const configuration = () => {
  return {
    environment: process.env.NODE_ENV || 'development',
    contentful: {
      spaceId: process.env.CONTENTFUL_SPACE_ID,
      environmentId: process.env.CONTENTFUL_ENVIRONMENT,
      accessToken: process.env.CONTENTFUL_ACCESS_TOKEN,
      contentType: process.env.CONTENTFUL_CONTENT_TYPE,
    },
    api: {
      port: process.env.API_PORT,
      secret: process.env.JWT_API_SECRET,
      expiresIn: process.env.JWT_EXPIRES_IN,
    },
    database: {
      db_name: process.env.DB_NAME,
      db_username: process.env.DB_USERNAME,
      db_password: process.env.DB_PASSWORD,
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
