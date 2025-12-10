const { prisma } = require('../database');

class Cstar {
    /**
     * Create a new Cstar
     */
    static async create(cstarData) {
        const { name, description, category, points, createdBy } = cstarData;
        
        return await prisma.cstar.create({
            data: {
                name,
                description,
                category: category || 'General',
                points: points || 0,
                createdBy: createdBy || null
            }
        });
    }

    /**
     * Get all Cstars with optional user relation
     */
    static async getAll() {
        return await prisma.cstar.findMany({
            orderBy: {
                createdAt: 'desc'
            },
            // Uncomment this if you have User relation in schema
            // include: {
            //     user: {
            //         select: {
            //             id: true,
            //             username: true,
            //             email: true
            //         }
            //     }
            // }
        });
    }

    /**
     * Get Cstar by ID
     */
    static async getById(id) {
        return await prisma.cstar.findUnique({
            where: {
                id: parseInt(id)
            },
            // Uncomment if you have User relation
            // include: {
            //     user: {
            //         select: {
            //             id: true,
            //             username: true
            //         }
            //     }
            // }
        });
    }

    /**
     * Update Cstar
     */
    static async update(id, updateData) {
        const { name, description, category, points } = updateData;
        
        return await prisma.cstar.update({
            where: {
                id: parseInt(id)
            },
            data: {
                name,
                description,
                category,
                points: parseInt(points)
            }
        });
    }

    /**
     * Delete Cstar
     */
    static async delete(id) {
        return await prisma.cstar.delete({
            where: {
                id: parseInt(id)
            }
        });
    }

    /**
     * Get Cstars by category
     */
    static async getByCategory(category) {
        return await prisma.cstar.findMany({
            where: {
                category: category
            },
            orderBy: {
                createdAt: 'desc'
            }
        });
    }

    /**
     * Get Cstars count
     */
    static async count() {
        return await prisma.cstar.count();
    }

    /**
     * Search Cstars by name or description
     */
    static async search(searchTerm) {
        return await prisma.cstar.findMany({
            where: {
                OR: [
                    {
                        name: {
                            contains: searchTerm,
                            mode: 'insensitive'
                        }
                    },
                    {
                        description: {
                            contains: searchTerm,
                            mode: 'insensitive'
                        }
                    }
                ]
            },
            orderBy: {
                createdAt: 'desc'
            }
        });
    }
}

module.exports = Cstar;