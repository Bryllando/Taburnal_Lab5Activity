import { DataTypes, Model, Optional } from 'sequelize';
import type { Sequelize } from 'sequelize';

export interface EmployeeAttributes {
    id: number;
    employeeId: string;
    userId: number;
    position: string;
    departmentId: number;
    hireDate: Date;
    createdAt: Date;
    updatedAt: Date;
}

export interface EmployeeCreationAttributes
    extends Optional<EmployeeAttributes, 'id' | 'createdAt' | 'updatedAt'> { }

export class Employee
    extends Model<EmployeeAttributes, EmployeeCreationAttributes>
    implements EmployeeAttributes {
    public id!: number;
    public employeeId!: string;
    public userId!: number;
    public position!: string;
    public departmentId!: number;
    public hireDate!: Date;
    public readonly createdAt!: Date;
    public readonly updatedAt!: Date;
}

export default function (sequelize: Sequelize): typeof Employee {
    Employee.init(
        {
            id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
            employeeId: { type: DataTypes.STRING, allowNull: false, unique: true },
            userId: { type: DataTypes.INTEGER, allowNull: false },
            position: { type: DataTypes.STRING, allowNull: false },
            departmentId: { type: DataTypes.INTEGER, allowNull: false },
            hireDate: { type: DataTypes.DATEONLY, allowNull: false },
            createdAt: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
            updatedAt: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
        },
        {
            sequelize,
            modelName: 'Employee',
            tableName: 'employees',
            timestamps: true,
        }
    );
    return Employee;
}