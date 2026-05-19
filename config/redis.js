const Redis = require('ioredis');

let redisClient = null;
let isConnected = false;

const connectRedis = async () => {
  if (redisClient && isConnected) {
    return redisClient;
  }

  try {
    const redisUrl = process.env.REDIS_HOST || 'redis://localhost:6379';
    const isTls = redisUrl.startsWith('rediss://');

    redisClient = new Redis(redisUrl, {
      maxRetriesPerRequest: 3,
      lazyConnect: true,
      ...(isTls && { tls: { rejectUnauthorized: false } })
    });

    redisClient.on('connect', () => {
      console.log('[+] Redis connected successfully');
      isConnected = true;
    });

    redisClient.on('error', (err) => {
      console.error('[-] Redis connection error:', err.message);
      isConnected = false;
    });

    redisClient.on('close', () => {
      console.log('[-] Redis connection closed');
      isConnected = false;
    });

    await redisClient.connect();
    return redisClient;
  } catch (error) {
    console.error('[-] Failed to connect to Redis:', error.message);
    console.log('[!] Running without Redis cache');
    return null;
  }
};

const getRedisClient = () => redisClient;
const isRedisConnected = () => isConnected;

const cacheGet = async (key) => {
  if (!redisClient || !isConnected) return null;
  try {
    const data = await redisClient.get(key);
    return data ? JSON.parse(data) : null;
  } catch (error) {
    console.error('Redis GET error:', error.message);
    return null;
  }
};

const cacheSet = async (key, value, ttlSeconds = 3600) => {
  if (!redisClient || !isConnected) return false;
  try {
    await redisClient.set(key, JSON.stringify(value), 'EX', ttlSeconds);
    return true;
  } catch (error) {
    console.error('Redis SET error:', error.message);
    return false;
  }
};

const cacheDel = async (key) => {
  if (!redisClient || !isConnected) return false;
  try {
    await redisClient.del(key);
    return true;
  } catch (error) {
    console.error('Redis DEL error:', error.message);
    return false;
  }
};

const cacheDelPattern = async (pattern) => {
  if (!redisClient || !isConnected) return false;
  try {
    const keys = await redisClient.keys(pattern);
    if (keys.length > 0) {
      await redisClient.del(...keys);
    }
    return true;
  } catch (error) {
    console.error('Redis DEL pattern error:', error.message);
    return false;
  }
};

module.exports = {
  connectRedis,
  getRedisClient,
  isRedisConnected,
  cacheGet,
  cacheSet,
  cacheDel,
  cacheDelPattern
};
