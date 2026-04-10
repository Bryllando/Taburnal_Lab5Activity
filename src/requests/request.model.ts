import { DataTypes, Model, Optional } from 'sequelize';
import type { Sequelize } from 'sequelize';

export interface RequestAttributes {
    id: number;
    type: string;
    items: object;
    status: string;
    employeeId: number;
    createdAt: Date;
    updatedAt: Date;
}

export interface RequestCreationAttributes
    extends Optional<RequestAttributes, 'id' | 'status' | 'createdAt' | 'updatedAt'> { }

export class UserRequest
    extends Model<RequestAttributes, RequestCreationAttributes>
    implements RequestAttributes {
    public id!: number;
    public type!: string;
    public items!: object;
    public status!: string;
    public employeeId!: number;
    public readonly createdAt!: Date;
    public readonly updatedAt!: Date;
}

export default function (sequelize: Sequelize): typeof UserRequest {
    UserRequest.init(
        {
            id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
            type: { type: DataTypes.STRING, allowNull: false },
            items: { type: DataTypes.JSON, allowNull: false },
            status: { type: DataTypes.STRING, allowNull: false, defaultValue: 'Pending' },
            employeeId: { type: DataTypes.INTEGER, allowNull: false },
            createdAt: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
            updatedAt: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
        },
        {
            sequelize,
            modelName: 'Request',
            tableName: 'requests',
            timestamps: true,
        }
    );
    return UserRequest;
}