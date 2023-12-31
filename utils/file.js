import { promises as fsPromises } from 'fs';
import { ObjectId } from 'mongodb';
import { v4 as uuidv4 } from 'uuid';
import dbClient from './db';
import basicUtils from './basic';
import userUtils from './user';

/**
 * File utilities
 */

const fileUtils = {

  // checks if body is valid for creating a file
  // Files can only be of types file , image and folder
  async validateBody(request) {
    const {
      name, type, isPublic = false, data,
    } = request.body;

    let { parentId = 0 } = request.body;
    const typesAllowed = ['file', 'image', 'folder'];

    let msg = null;
    if (!parentId === '0') parentId = 0;
    if (!name) {
      msg = 'Missing name';
    } else if (!type || !typesAllowed.includes(type)) {
      msg = 'Missing type';
    } else if (!data && type !== 'folder') {
      msg = 'Missing data';
    } else if (parentId && parentId !== '0') {
      let file;
      if (basicUtils.isValid(parentId)) {
        file = await this.getFile({
          _id: ObjectId(parentId),
        });
      } else {
        file = null;
      }

      if (!file) {
        msg = 'Parent not found';
      } else if (file.type !== 'folder') {
        msg = 'Parent is not a folder';
      }
    }

    const obj = {
      error: msg,
      fileParams: {
        name,
        type,
        parentId,
        isPublic,
        data,
      },
    };

    return obj;
  },

  // gets file from db
  async getFile(query) {
    const file = await dbClient.filesCollection.findOne(query);
    return file;
  },

  // changes _id into id for files
  processFile(doc) {
    // Changes _id for id and removes localPath

    const file = { id: doc._id, ...doc };

    delete file.localPath;
    delete file._id;

    return file;
  },

  // saves file to db and disk
  async saveFile(userId, fileParams, FOLDER_PATH) {
    const {
      name, type, isPublic, data,
    } = fileParams;

    let { parentId } = fileParams;
    if (parentId !== 0) parentId = ObjectId(parentId);

    const query = {
      userId: ObjectId(userId),
      name,
      type,
      isPublic,
      parentId,
    };

    if (fileParams.type !== 'folder') {
      const fileId = uuidv4();

      const fileDataDecoded = Buffer.from(data, 'base64');
      const path = `${FOLDER_PATH}/${fileId}`;

      query.localPath = path;

      try {
        await fsPromises.mkdir(FOLDER_PATH, { recursive: true });
        await fsPromises.writeFile(path, fileDataDecoded);
      } catch (err) {
        return { error: err.message, code: 400 };
      }
    }
    const result = await dbClient.filesCollection.insertOne(query);
    const file = this.processFile(query);
    const newFile = { id: result.insertId, ...file };
    return { error: null, newFile };
  },

  // gets list of files belonging to a parentId from the db
  async getFIlesOfParentId(query) {
    const fileList = await dbClient.filesCollection.aggregate(query);
    return fileList;
  },

  // updates a file in the database
  async updateFile(query, set) {
    const fileList = await dbClient.filesCollection.findOneAndUpdate(
      query,
      set,
      { returnOriginal: false },
    );
    return fileList;
  },

  // helper method to set isPublish value to true or false based on the need
  async isPublish(request, setPublish) {
    const { id: fileId } = request.params;
    if (!basicUtils.isValid(fileId)) return { error: 'Unauthorized', code: 401 };

    const { userId } = await userUtils.getUserIdAndKey(request);
    if (!basicUtils.isValid(userId)) return { error: 'Unauthorized', code: 401 };

    const user = await userUtils.getUser({
      _id: ObjectId(userId),
    });
    if (!user) return { error: 'Unauthorized', code: 401 };

    const file = await fileUtils.getFile({
      _id: ObjectId(fileId),
      userId: ObjectId(userId),
    });
    if (!file) return { error: 'Not found', code: 404 };

    const result = await this.updateFile(
      {
        _id: ObjectId(fileId),
        userId: ObjectId(userId),
      },
      { $set: { isPublish: setPublish } },
    );
    const {
      _id: id,
      userId: resultUserId,
      name,
      type,
      isPublic,
      parentId,
    } = result.value;

    const updatedFile = {
      id,
      userId: resultUserId,
      name,
      type,
      isPublic,
      parentId,
    };

    return { error: null, code: 200, updatedFile };
  },
};

export default fileUtils;
