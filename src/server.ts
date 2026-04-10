import path from 'path';
import express, { Application } from 'express';
import cors from 'cors';
import { errorHandler } from './_middleware/errorHandler';
import { initialize } from './_helpers/db';
import userController from './users/users.controller';
import departmentController from './departments/departments.controller';
import employeeController from './employees/employees.controller';
import requestController from './requests/requests.controller';

const app: Application = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors());

// Serve compiled frontend from /public
app.use(express.static(path.join(__dirname, '..', 'public')));

// API routes
app.use('/users', userController);
app.use('/departments', departmentController);
app.use('/employees', employeeController);
app.use('/requests', requestController);

app.use(errorHandler);

const PORT = process.env.PORT || 4000;

initialize()
    .then(() => {
        app.listen(PORT, () => {
            console.log(`Backend API  →  http://localhost:${PORT}`);
            console.log(`Frontend UI  →  http://localhost:${PORT}/index.html`);
            console.log('Routes: /users | /departments | /employees | /requests');
        });
    })
    .catch((err) => {
        console.error('Failed to initialize database:', err);
        process.exit(1);
    });