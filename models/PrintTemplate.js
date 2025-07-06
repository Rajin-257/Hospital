const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
    const PrintTemplate = sequelize.define('PrintTemplate', {
        id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true
        },
        name: {
            type: DataTypes.STRING(50),
            allowNull: false,
            validate: {
                notEmpty: true,
                len: [1, 50]
            }
        },
        header_img: {
            type: DataTypes.TEXT,
            allowNull: true,
            comment: 'URL/path to header image'
        },
        header_width: {
            type: DataTypes.INTEGER,
            allowNull: true,
            validate: {
                min: 50,
                max: 2000
            }
        },
        header_height: {
            type: DataTypes.INTEGER,
            allowNull: true,
            validate: {
                min: 20,
                max: 500
            }
        },
        footer_image: {
            type: DataTypes.TEXT,
            allowNull: true,
            comment: 'URL/path to footer image'
        },
        footer_width: {
            type: DataTypes.INTEGER,
            allowNull: true,
            validate: {
                min: 50,
                max: 2000
            }
        },
        footer_height: {
            type: DataTypes.INTEGER,
            allowNull: true,
            validate: {
                min: 20,
                max: 500
            }
        },
        status: {
            type: DataTypes.ENUM('active', 'inactive'),
            defaultValue: 'inactive',
            allowNull: false
        }
    }, {
        tableName: 'print_template',
        timestamps: true,
        createdAt: 'createdAt',
        updatedAt: 'updatedAt',
        indexes: [
            {
                fields: ['status']
            },
            {
                fields: ['name']
            }
        ]
    });

    return PrintTemplate;
}; 