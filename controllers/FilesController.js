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
}

export default FilesController;
