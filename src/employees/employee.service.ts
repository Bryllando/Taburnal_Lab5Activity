import { db } from '../_helpers/db';
import { UserRequest, RequestCreationAttributes } from '../requests/request.model';

export const requestService = {
    getAll,
    getById,
    getByEmployee,
    create,
    update,
    delete: _delete,
};

async function getAll(): Promise<UserRequest[]> {
    return await db.Request.findAll({
        include: [{ model: db.Employee, as: 'employee' }],
    });
}

async function getById(id: number): Promise<UserRequest> {
    return await getRequest(id);
}

async function getByEmployee(employeeId: number): Promise<UserRequest[]> {
    return await db.Request.findAll({ where: { employeeId } });
}

async function create(params: RequestCreationAttributes): Promise<void> {
    await db.Request.create({ ...params, status: 'Pending' });
}

async function update(id: number, params: Partial<RequestCreationAttributes> & { status?: string }): Promise<void> {
    const request = await getRequest(id);
    await request.update(params);
}

async function _delete(id: number): Promise<void> {
    const request = await getRequest(id);
    await request.destroy();
}

async function getRequest(id: number): Promise<UserRequest> {
    const request = await db.Request.findByPk(id);
    if (!request) throw new Error('Request not found');
    return request;
}