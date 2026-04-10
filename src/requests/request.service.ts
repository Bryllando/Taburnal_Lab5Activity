import { db } from '../_helpers/db';
import { UserRequest, RequestCreationAttributes } from './request.model';

export const requestService = {
    getAll,
    getByEmployeeId,
    getById,
    create,
    update,
    updateStatus,
    delete: _delete,
};

async function getAll(): Promise<UserRequest[]> {
    return await db.Request.findAll({
        include: [{ model: db.Employee, as: 'employee' }],
    });
}

async function getByEmployeeId(employeeId: number): Promise<UserRequest[]> {
    return await db.Request.findAll({ where: { employeeId } });
}

async function getById(id: number): Promise<UserRequest> {
    return await getRequest(id);
}

async function create(params: RequestCreationAttributes): Promise<void> {
    await db.Request.create({ ...params, status: 'Pending' });
}

async function update(id: number, params: { status?: string }): Promise<void> {
    if (params.status) {
        await updateStatus(id, params.status as 'Pending' | 'Approved' | 'Rejected');
    }
}

async function updateStatus(id: number, status: 'Pending' | 'Approved' | 'Rejected'): Promise<void> {
    const req = await getRequest(id);
    await req.update({ status });
}

async function _delete(id: number): Promise<void> {
    const req = await getRequest(id);
    await req.destroy();
}

async function getRequest(id: number): Promise<UserRequest> {
    const req = await db.Request.findByPk(id);
    if (!req) throw new Error('Request not found');
    return req;
}