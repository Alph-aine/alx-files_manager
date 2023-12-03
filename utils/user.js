import dbClient from './db';
import redisClient from './redis';

const userUtils = {

  // gets user from db
  async getUser(query) {
    const user = await dbClient.usersCollection.findOne(query);
    return user;
  },

  // gets user id and key from redis
  async getUserIdAndKey(request) {
    const userObj = { userId: null, key: null };
    const xToken = request.header('X-Token');
    if (!xToken) return userObj;

    userObj.key = `auth_${xToken}`;
    userObj.userId = await redisClient.get(userObj.key);
    return userObj;
  },
};

export default userUtils;
