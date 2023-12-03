import { ObjectId } from 'mongodb';
import sha1 from 'sha1';
import Queue from 'bull';
import dbClient from '../utils/db';
import userUtils from '../utils/user';

const userQueue = new Queue('userQueue');

class UsersController {
  /**
     * Creates new User with email and password
     *
     * if email or password is missing, return an error with status code 400
     * if email already exist, return an error with status code 400
     * password must be stored after being hashed with sha1
     * the user is created with an auto id from mongodb
     */
  static async postNew(request, response) {
    const { email, password } = request.body;
    if (!email) return response.status(400).send({ error: 'Missing email' });
    if (!password) return response.status(400).send({ error: 'Missing password' });

    const emailExists = await dbClient.usersCollection.findOne({ email });
    if (emailExists) return response.status(400).send({ error: 'Already exist' });

    const hashedPassword = sha1(password);

    let result;
    try {
      result = await dbClient.usersCollection.insertOne({
        email,
        password: hashedPassword,
      });
    } catch (err) {
      await userQueue.add({});
      return response.status(500).send({ error: 'Error creating user' });
    }

    const user = {
      id: result.insertedId,
      email,
    };

    await userQueue.add({
      userId: result.insertedId.toString(),
    });

    return response.status(201).send(user);
  }

  // retrieves user details based on userid and returns user email and id only
  static async getMe(request, response) {
    const { userId } = await userUtils.getUserIdAndKey(request);

    const user = await userUtils.getUser({
      _id: ObjectId(userId),
    });
    if (!user) return response.status(401).send({ error: 'Unauthorized' });

    const userObj = { id: user._id, ...user };
    delete userObj._id;
    delete userObj.password;
    return response.status(200).send(userObj);
  }
}

export default UsersController;
