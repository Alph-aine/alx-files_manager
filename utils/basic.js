import { ObjectId } from 'mongodb';

// basic/general utils

const basicUtils = {
  // checks if Id is valid for mongodb
  isValid(id) {
    try {
      ObjectId(id);
    } catch (err) {
      return false;
    }
    return true;
  },
};

export default basicUtils;
