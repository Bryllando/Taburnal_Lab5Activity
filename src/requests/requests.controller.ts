import type { Request, Response, NextFunction } from 'express';
import { Router } from 'express';
import Joi from 'joi';
import { validateRequest } from '../_middleware/validateRequest';
import { requestService } from './request.service';

const router = Router();

router.get('/', getAll);
router.get('/employee/:employeeId', getByEmployeeId);
router.get('/:id', getById);
router.post('/', createSchema, create);
router.put('/:id/status', updateStatusSchema, updateStatus);
router.delete('/:id', _delete);

export default router;

function getAll(req: Request, res: Response, next: NextFunction): void {
    requestService.getAll()
        .then(reqs => res.json(reqs))
        .catch(next);
}

function getByEmployeeId(req: Request, res: Response, next: NextFunction): void {
    requestService.getByEmployeeId(Number(req.params.employeeId))
        .then(reqs => res.json(reqs))
        .catch(next);
}

function getById(req: Request, res: Response, next: NextFunction): void {
    requestService.getById(Number(req.params.id))
        .then(req_ => res.json(req_))
        .catch(next);
}

function create(req: Request, res: Response, next: NextFunction): void {
    requestService.create(req.body)
        .then(() => res.json({ message: 'Request created' }))
        .catch(next);
}

function updateStatus(req: Request, res: Response, next: NextFunction): void {
    requestService.updateStatus(Number(req.params.id), req.body.status)
        .then(() => res.json({ message: 'Request status updated' }))
        .catch(next);
}

function _delete(req: Request, res: Response, next: NextFunction): void {
    requestService.delete(Number(req.params.id))
        .then(() => res.json({ message: 'Request deleted' }))
        .catch(next);
}

function createSchema(req: Request, res: Response, next: NextFunction): void {
    const schema = Joi.object({
        employeeId: Joi.number().required(),
        type: Joi.string().valid('Equipment', 'Leave', 'Resources').required(),
        items: Joi.array().items(
            Joi.object({ name: Joi.string().required(), qty: Joi.number().min(1).required() })
        ).min(1).required(),
    });
    validateRequest(req, next, schema);
}

function updateStatusSchema(req: Request, res: Response, next: NextFunction): void {
    const schema = Joi.object({
        status: Joi.string().valid('Pending', 'Approved', 'Rejected').required(),
    });
    validateRequest(req, next, schema);
}