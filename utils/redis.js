import redis from 'redis';
import { promisify } from 'util';
/**
 * class to perform operations with Redis
 */
class RedisClient {
  constructor() {
    this.client = redis.createClient();
    this.getAsync = promisify(this.client.get).bind(this.client);

    this.client.on('error', (error) => {
      console.log(`Redis client not connected to the server: ${error.message}`);
    });

    this.client.on('connect', () => {
      console.log('Redis connected to server');
    });
  }

  /**
   * checks if Redis connection is alive
   */
  isAlive() {
    return this.client.connected;
  }

  // gets value for corresponding key in redis
  async get(key) {
    const value = await this.getAsync(key);
    return value;
  }

  // creates a new key in redis
  async set(key, value, duration) {
    this.client.setex(key, duration, value);
  }

  // deletes a key from redis
  async del(key) {
    this.client.del(key);
  }
}

const redisClient = new RedisClient();

export default redisClient;
