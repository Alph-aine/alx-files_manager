import express from 'express';
import AppController from '../controllers/AppController';
import UsersController from '../controllers/UsersController';

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
  router.post('/users', (req, res) => {
    UsersController.postNew(req, res);
  });
}

export default appRoutes;
