import { ObjectId } from 'mongodb';
import Queue from 'bull';
import fileUtils from '../utils/file';
import userUtils from '../utils/user';
import basicUtils from '../utils/basic';

const FOLDER_PATH = process.env.FOLDER_PATH || '/tmp/files_manager';
const fileQueue = new Queue('fileQueue');

class FilesController {
  // creates a file in db and disk
  static async postUpload(request, response) {
    const { userId } = await userUtils.getUserIdAndKey(request);

    if (!basicUtils.isValid(userId)) {
      return response.status(401).send({ error: 'Unauthorized' });
    }
    if (!userId && request.body.type === 'image') {
      await fileQueue.add({});
    }

    const user = await userUtils.getUser({
      _id: ObjectId(userId),
    });
    if (!user) return response.status(401).send({ error: 'Unauthorized' });

    const { error: validationError, fileParams } = await fileUtils.validateBody(request);

    if (validationError) return response.status(400).send({ error: validationError });

    if (fileParams.parentId !== 0 && !basicUtils.isValid(fileParams.parentId)) {
      return response.status(400).send({ error: 'Parent not found' });
    }

    const { error, code, newFile } = await fileUtils.saveFile(
      userId, fileParams, FOLDER_PATH,
    );
    if (error) {
      if (response.body.type === 'image') await fileQueue.add({ userId });
      return response.status(code).send(error);
    }
    if (fileParams.type === 'image') {
      await fileQueue.add({
        fileId: newFile.id.toString(),
        userId: newFile.userId.toString(),
      });
    }
    return response.status(201).send(newFile);
  }

  // gets file based on fileId and userId
  static async getShow(request, response) {
    const fileId = request.params.id;
    const { userId } = await userUtils.getUserIdAndKey(request);

    const user = await userUtils.getUser({
      _id: ObjectId(userId),
    });
    if (!user) return response.status(401).send({ error: 'Unauthorized' });

    if (!basicUtils.isValid(userId) || !basicUtils.isValid(fileId)) {
      return response.status(404).send({ error: 'Not found' });
    }

    const result = await fileUtils.getFile({
      _id: Object(fileId),
      userId: ObjectId(userId),
    });

    if (!result) return response.status(404).send({ error: 'Not found' });

    const file = fileUtils.processFile(result);
    return response.status(200).send(file);
  }

  // gets all user files from db for a specific parentId with pagination
  static async getIndex(request, response) {
    const { userId } = await userUtils.getUserIdAndKey(request);
    const user = await userUtils.getUser({
      _id: ObjectId(userId),
    });
    if (!user) return response.status(401).send({ error: 'Unauthorized' });

    let parentId = request.query.parentId || '0';
    if (parentId === '0') parentId = 0;

    let page = Number(request.query.page) || 0;
    if (Number.isNaN(page)) page = 0;

    if (parentId !== 0 && parentId !== '0') {
      if (!basicUtils.isValid(parentId)) return response.status(401).send({ error: 'Unauthorized' });

      parentId = ObjectId(parentId);

      const folder = await fileUtils.getFile({
        _id: parentId,
      });

      if (!folder || !folder.type === 'folder') return response.status(200).send([]);
    }
    const query = [
      { $match: { parentId } },
      { $skip: page * 20 },
      { $limit: 20 },
    ];

    const fileCursor = await fileUtils.getFIlesOfParentId(query);
    const fileList = [];
    await fileCursor.forEach((doc) => {
      const document = fileUtils.processFile(doc);
      fileList.push(document);
    });
    return response.status(200).send(fileList);
  }
}

export default FilesController;
