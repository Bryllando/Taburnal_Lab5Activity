import config from '../../config.json';
import mysql from 'mysql2/promise';
import { Sequelize } from 'sequelize';

export interface Database {
    User: any;
    Department: any;
    Employee: any;
    Request: any;
}

export const db: Database = {} as Database;

export async function initialize(): Promise<void> {
    const { host, port, user, password, database } = config.database;

    const connection = await mysql.createConnection({ host, port, user, password });
    await connection.query(`CREATE DATABASE IF NOT EXISTS \`${database}\`;`);
    await connection.end();

    const sequelize = new Sequelize(database, user, password, {
        dialect: 'mysql',
        host,
        port,
        logging: false,
    });

    const { default: userModel } = await import('../users/user.model');
    db.User = userModel(sequelize);

    const { default: departmentModel } = await import('../departments/department.model');
    db.Department = departmentModel(sequelize);

    const { default: employeeModel } = await import('../employees/employee.model');
    db.Employee = employeeModel(sequelize);

    const { default: requestModel } = await import('../requests/request.model');
    db.Request = requestModel(sequelize);

    // Set up associations
    db.Employee.belongsTo(db.User, { foreignKey: 'userId', as: 'user' });
    db.User.hasOne(db.Employee, { foreignKey: 'userId', as: 'employee' });

    db.Employee.belongsTo(db.Department, { foreignKey: 'departmentId', as: 'department' });
    db.Department.hasMany(db.Employee, { foreignKey: 'departmentId', as: 'employees' });

    db.Request.belongsTo(db.Employee, { foreignKey: 'employeeId', as: 'employee' });
    db.Employee.hasMany(db.Request, { foreignKey: 'employeeId', as: 'requests' });

    await sequelize.sync({ alter: true });

    console.log('Database initialized and models synced');
}