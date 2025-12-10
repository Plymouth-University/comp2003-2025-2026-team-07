const db = require('../db/connection'); // Adjust path based on your DB connection file

class Cstar {
    // Create a new Cstar
    static async create(cstarData) {
        const { name, description, category, points, created_by } = cstarData;
        
        const query = `
            INSERT INTO cstars (name, description, category, points, created_by)
            VALUES ($1, $2, $3, $4, $5)
            RETURNING *
        `;
        
        const values = [name, description, category, points || 0, created_by];
        const result = await db.query(query, values);
        return result.rows[0];
    }

    // Get all Cstars
    static async getAll() {
        const query = `
            SELECT c.*, u.username as creator_name
            FROM cstars c
            LEFT JOIN users u ON c.created_by = u.id
            ORDER BY c.created_at DESC
        `;
        
        const result = await db.query(query);
        return result.rows;
    }

    // Get Cstar by ID
    static async getById(id) {
        const query = `
            SELECT c.*, u.username as creator_name
            FROM cstars c
            LEFT JOIN users u ON c.created_by = u.id
            WHERE c.id = $1
        `;
        
        const result = await db.query(query, [id]);
        return result.rows[0];
    }

    // Update Cstar
    static async update(id, updateData) {
        const { name, description, category, points } = updateData;
        
        const query = `
            UPDATE cstars
            SET name = $1, description = $2, category = $3, points = $4, updated_at = NOW()
            WHERE id = $5
            RETURNING *
        `;
        
        const values = [name, description, category, points, id];
        const result = await db.query(query, values);
        return result.rows[0];
    }

    // Delete Cstar
    static async delete(id) {
        const query = 'DELETE FROM cstars WHERE id = $1 RETURNING *';
        const result = await db.query(query, [id]);
        return result.rows[0];
    }

    // Get Cstars by category
    static async getByCategory(category) {
        const query = `
            SELECT c.*, u.username as creator_name
            FROM cstars c
            LEFT JOIN users u ON c.created_by = u.id
            WHERE c.category = $1
            ORDER BY c.created_at DESC
        `;
        
        const result = await db.query(query, [category]);
        return result.rows;
    }
}

module.exports = Cstar;