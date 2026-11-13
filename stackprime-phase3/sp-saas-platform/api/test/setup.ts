// Defaults for local runs. CI provides DATABASE_URL / REDIS_URL from its service containers.
process.env.NODE_ENV = 'test';
process.env.APP_ORIGIN ??= 'http://localhost:5173';
process.env.API_PUBLIC_URL ??= 'http://localhost:4000';
process.env.DATABASE_URL ??= 'postgresql://sp:sp@localhost:5432/sp_saas_test?schema=public';
process.env.REDIS_URL ??= 'redis://localhost:6379/1';
process.env.JWT_SECRET ??= 'test-secret-test-secret-test-secret-123456';
process.env.PAYSTACK_SECRET_KEY ??= 'sk_test_unit_test_secret';
process.env.MFA_ENC_KEY ??= Buffer.alloc(32, 7).toString('base64');
