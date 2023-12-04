import express from 'express';
import AppController from '../controllers/AppController';
import UsersController from '../controllers/UsersController';
import AuthController from '../controllers/AuthController';
import FilesController from '../controllers/FilesController';

function appRoutes(app) {
  const router = express.Router();
  app.use('/', router);

  // App Controller

  // returns db and redis status
  router.get('/status', (req, res) => {
    AppController.getStatus(req, res);
  });

  // returns number of users and files in db
  router.get('/stats', (req, res) => {
    AppController.getStats(req, res);
  });

  // Users Controller

  // creates a new user in the db
  router.post('/users', (req, res) => {
    UsersController.postNew(req, res);
  });

  router.get('/users/me', (req, res) => {
    UsersController.getMe(req, res);
  });

  // AuthController

  // signs in user
  router.get('/connect', (req, res) => {
    AuthController.getConnect(req, res);
  });

  // logs out user
  router.get('/disconnect', (req, res) => {
    AuthController.getDisconnect(req, res);
  });

  // FileController

  // writes a file to disk and db
  router.post('/files', (req, res) => {
    FilesController.postUpload(req, res);
  });

  // retrieve file document based on fileId and userId
  router.get('/files/:id', (req, res) => {
    FilesController.getShow(req, res);
  });

  // gets all user files for a specific parentId
  router.get('/files', (req, res) => {
    FilesController.getIndex(req, res);
  });
}

export default appRoutes;
