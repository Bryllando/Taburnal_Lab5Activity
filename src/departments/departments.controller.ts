import type { Request, Response, NextFunction } from 'express';
import { Router } from 'express';
import Joi from 'joi';
import { validateRequest } from '../_middleware/validateRequest';
import { departmentService } from './department.service';

const router = Router();

router.get('/', getAll);
router.get('/:id', getById);
router.post('/', createSchema, create);
router.put('/:id', updateSchema, update);
router.delete('/:id', _delete);

export default router;

function getAll(req: Request, res: Response, next: NextFunction): void {
    departmentService.getAll()
        .then(depts => res.json(depts))
        .catch(next);
}

function getById(req: Request, res: Response, next: NextFunction): void {
    departmentService.getById(Number(req.params.id))
        .then(dept => res.json(dept))
        .catch(next);
}

function create(req: Request, res: Response, next: NextFunction): void {
    departmentService.create(req.body)
        .then(() => res.json({ message: 'Department created' }))
        .catch(next);
}

function update(req: Request, res: Response, next: NextFunction): void {
    departmentService.update(Number(req.params.id), req.body)
        .then(() => res.json({ message: 'Department updated' }))
        .catch(next);
}

function _delete(req: Request, res: Response, next: NextFunction): void {
    departmentService.delete(Number(req.params.id))
        .then(() => res.json({ message: 'Department deleted' }))
        .catch(next);
}

function createSchema(req: Request, res: Response, next: NextFunction): void {
    const schema = Joi.object({
        name: Joi.string().required(),
        description: Joi.string().required(),
    });
    validateRequest(req, next, schema);
}

function updateSchema(req: Request, res: Response, next: NextFunction): void {
    const schema = Joi.object({
        name: Joi.string().empty(''),
        description: Joi.string().empty(''),
    });
    validateRequest(req, next, schema);
}