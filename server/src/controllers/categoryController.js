const db = require('../db');

const getAllCategories = async (req, res, next) => {
    try {
        const result = await db.query('SELECT * FROM categories ORDER BY name ASC');
        return res.status(200).json({ categories: result.rows });
    } catch (error) {
        console.error('getAllCategories error:', error.message);
        next(error);
    }
};

module.exports = { getAllCategories };
