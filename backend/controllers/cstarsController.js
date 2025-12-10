const Cstar = require('../models/cstar');
const { Prisma } = require('@prisma/client');

/**
 * Create a new Cstar
 */
exports.createCstar = async (req, res) => {
    try {
        const { name, description, category, points } = req.body;

        // Validation
        if (!name || !description) {
            return res.status(400).json({
                success: false,
                message: 'Name and description are required'
            });
        }

        // Get user ID from session/token (adjust based on your auth)
        const createdBy = req.user?.id || null;

        const cstarData = {
            name: name.trim(),
            description: description.trim(),
            category: category || 'General',
            points: parseInt(points) || 0,
            createdBy
        };

        const newCstar = await Cstar.create(cstarData);

        res.status(201).json({
            success: true,
            message: 'Cstar created successfully',
            data: newCstar
        });

    } catch (error) {
        console.error('Error creating Cstar:', error);
        
        if (error instanceof Prisma.PrismaClientKnownRequestError) {
            return res.status(400).json({
                success: false,
                message: 'Database error occurred',
                error: error.message
            });
        }
        
        res.status(500).json({
            success: false,
            message: 'Failed to create Cstar',
            error: error.message
        });
    }
};

/**
 * Get all Cstars
 */
exports.getAllCstars = async (req, res) => {
    try {
        const cstars = await Cstar.getAll();

        res.status(200).json({
            success: true,
            count: cstars.length,
            data: cstars
        });

    } catch (error) {
        console.error('Error fetching Cstars:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch Cstars',
            error: error.message
        });
    }
};

/**
 * Get single Cstar by ID
 */
exports.getCstarById = async (req, res) => {
    try {
        const { id } = req.params;
        const cstar = await Cstar.getById(id);

        if (!cstar) {
            return res.status(404).json({
                success: false,
                message: 'Cstar not found'
            });
        }

        res.status(200).json({
            success: true,
            data: cstar
        });

    } catch (error) {
        console.error('Error fetching Cstar:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch Cstar',
            error: error.message
        });
    }
};

/**
 * Update Cstar
 */
exports.updateCstar = async (req, res) => {
    try {
        const { id } = req.params;
        const { name, description, category, points } = req.body;

        // Validation
        if (!name || !description) {
            return res.status(400).json({
                success: false,
                message: 'Name and description are required'
            });
        }

        const updateData = {
            name: name.trim(),
            description: description.trim(),
            category,
            points: parseInt(points) || 0
        };

        const updatedCstar = await Cstar.update(id, updateData);

        res.status(200).json({
            success: true,
            message: 'Cstar updated successfully',
            data: updatedCstar
        });

    } catch (error) {
        console.error('Error updating Cstar:', error);
        
        if (error instanceof Prisma.PrismaClientKnownRequestError) {
            if (error.code === 'P2025') {
                return res.status(404).json({
                    success: false,
                    message: 'Cstar not found'
                });
            }
        }
        
        res.status(500).json({
            success: false,
            message: 'Failed to update Cstar',
            error: error.message
        });
    }
};

/**
 * Delete Cstar
 */
exports.deleteCstar = async (req, res) => {
    try {
        const { id } = req.params;
        const deletedCstar = await Cstar.delete(id);

        res.status(200).json({
            success: true,
            message: 'Cstar deleted successfully',
            data: deletedCstar
        });

    } catch (error) {
        console.error('Error deleting Cstar:', error);
        
        if (error instanceof Prisma.PrismaClientKnownRequestError) {
            if (error.code === 'P2025') {
                return res.status(404).json({
                    success: false,
                    message: 'Cstar not found'
                });
            }
        }
        
        res.status(500).json({
            success: false,
            message: 'Failed to delete Cstar',
            error: error.message
        });
    }
};

/**
 * Get Cstars by category
 */
exports.getCstarsByCategory = async (req, res) => {
    try {
        const { category } = req.params;
        const cstars = await Cstar.getByCategory(category);

        res.status(200).json({
            success: true,
            count: cstars.length,
            data: cstars
        });

    } catch (error) {
        console.error('Error fetching Cstars by category:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch Cstars',
            error: error.message
        });
    }
};

/**
 * Search Cstars
 */
exports.searchCstars = async (req, res) => {
    try {
        const { q } = req.query;
        
        if (!q) {
            return res.status(400).json({
                success: false,
                message: 'Search term is required'
            });
        }

        const cstars = await Cstar.search(q);

        res.status(200).json({
            success: true,
            count: cstars.length,
            data: cstars
        });

    } catch (error) {
        console.error('Error searching Cstars:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to search Cstars',
            error: error.message
        });
    }
};

/**
 * Get Cstars statistics
 */
exports.getCstarsStats = async (req, res) => {
    try {
        const totalCount = await Cstar.count();
        const allCstars = await Cstar.getAll();
        
        const totalPoints = allCstars.reduce((sum, cstar) => sum + cstar.points, 0);
        const averagePoints = totalCount > 0 ? totalPoints / totalCount : 0;
        
        const categoryCounts = allCstars.reduce((acc, cstar) => {
            acc[cstar.category] = (acc[cstar.category] || 0) + 1;
            return acc;
        }, {});

        res.status(200).json({
            success: true,
            data: {
                totalCount,
                totalPoints,
                averagePoints: Math.round(averagePoints * 100) / 100,
                categoryCounts
            }
        });

    } catch (error) {
        console.error('Error fetching stats:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch statistics',
            error: error.message
        });
    }
};