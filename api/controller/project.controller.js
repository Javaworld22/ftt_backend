const Project = require('../models/Project');

const VALID_CATEGORIES = [
  'education', 'health', 'environment', 'humanitarian',
  'community', 'religion', 'arts', 'technology', 'sports', 'other',
];

// ============================================================================
// CREATE PROJECT
// ============================================================================

/**
 * Create a new project / campaign
 *
 * @route POST /api/v1/projects
 * @access Public
 *
 * @bodyparam {string} title       - Project title (required)
 * @bodyparam {string} category    - Category (required)
 * @bodyparam {string} description - Project description (required)
 * @bodyparam {number} goal        - Fundraising goal amount (required)
 * @bodyparam {string} status      - Status: draft | active | completed | cancelled
 * @bodyparam {string} createdBy   - ID of the creator (optional)
 * @bodyparam {string} createdByModel - Model type: ProjectOwner | Agent | CorporateAgent
 */
exports.createProject = async (req, res) => {
  try {
    const { title, category, description, goal, status, createdBy, createdByModel } = req.body;

    // ── Required field check ─────────────────────────────────────────────────
    const missingFields = [];
    if (!title || !String(title).trim()) missingFields.push('title');
    if (!category || !String(category).trim()) missingFields.push('category');
    if (!description || !String(description).trim()) missingFields.push('description');
    if (goal === undefined || goal === null || String(goal).trim() === '') missingFields.push('goal');

    if (missingFields.length > 0) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields',
        missingFields,
      });
    }

    // ── Category validation ──────────────────────────────────────────────────
    if (!VALID_CATEGORIES.includes(category.trim().toLowerCase())) {
      return res.status(400).json({
        success: false,
        error: 'Invalid category',
        validCategories: VALID_CATEGORIES,
      });
    }

    // ── Goal validation ──────────────────────────────────────────────────────
    const goalNum = parseFloat(goal);
    if (isNaN(goalNum) || goalNum <= 0) {
      return res.status(400).json({
        success: false,
        error: 'Goal must be a positive number',
      });
    }

    // ── Build project data ───────────────────────────────────────────────────
    const projectData = {
      title: title.trim(),
      category: category.trim().toLowerCase(),
      description: description.trim(),
      goal: goalNum,
      status: status || 'draft',
    };

    if (createdBy && createdByModel) {
      projectData.createdBy = createdBy;
      projectData.createdByModel = createdByModel;
    }

    const project = await Project.create(projectData);

    res.status(201).json({
      success: true,
      message: 'Project created successfully',
      data: project,
    });
  } catch (error) {
    console.error('Error in createProject:', error);

    if (error.name === 'ValidationError') {
      const errors = Object.values(error.errors).map((err) => ({
        field: err.path,
        message: err.message,
      }));
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        errors,
      });
    }

    res.status(500).json({
      success: false,
      error: 'Failed to create project',
      message: error.message,
    });
  }
};

// ============================================================================
// GET ALL PROJECTS
// ============================================================================

/**
 * Get all projects with pagination and filtering
 *
 * @route GET /api/v1/projects
 * @access Public
 */
exports.getAllProjects = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      sort = '-createdAt',
      category,
      status,
      search,
      minGoal,
      maxGoal,
      createdBy,
    } = req.query;

    const pageNum = Math.max(1, parseInt(page));
    const limitNum = Math.min(100, Math.max(1, parseInt(limit)));

    const query = {};

    if (category) {
      query.category = category.toLowerCase();
    }

    if (status) {
      query.status = status;
    }

    if (createdBy) {
      query.createdBy = createdBy;
    }

    if (minGoal || maxGoal) {
      query.goal = {};
      if (minGoal) query.goal.$gte = parseFloat(minGoal);
      if (maxGoal) query.goal.$lte = parseFloat(maxGoal);
    }

    if (search) {
      query.$text = { $search: search };
    }

    const projects = await Project.find(query)
      .sort(sort)
      .limit(limitNum)
      .skip((pageNum - 1) * limitNum)
      .lean();

    const count = await Project.countDocuments(query);

    res.json({
      success: true,
      data: projects,
      pagination: {
        total: count,
        page: pageNum,
        limit: limitNum,
        pages: Math.ceil(count / limitNum),
        hasNextPage: pageNum < Math.ceil(count / limitNum),
        hasPrevPage: pageNum > 1,
      },
    });
  } catch (error) {
    console.error('Error in getAllProjects:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve projects',
      message: error.message,
    });
  }
};

// ============================================================================
// GET SINGLE PROJECT
// ============================================================================

/**
 * Get a single project by ID
 *
 * @route GET /api/v1/projects/:id
 * @access Public
 */
exports.getProject = async (req, res) => {
  try {
    const { id } = req.params;

    if (!id.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid project ID format',
      });
    }

    const project = await Project.findById(id).lean();

    if (!project) {
      return res.status(404).json({
        success: false,
        error: 'Project not found',
      });
    }

    // Calculate progress
    const progressPercent = project.goal > 0
      ? Math.round((project.totalRaised / project.goal) * 100 * 100) / 100
      : 0;

    res.json({
      success: true,
      data: {
        ...project,
        progressPercent,
        amountRemaining: Math.max(0, project.goal - project.totalRaised),
        isGoalReached: project.totalRaised >= project.goal,
      },
    });
  } catch (error) {
    console.error('Error in getProject:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve project',
      message: error.message,
    });
  }
};

// ============================================================================
// UPDATE PROJECT
// ============================================================================

/**
 * Update a project by ID
 *
 * @route PUT /api/v1/projects/:id
 * @access Public
 */
exports.updateProject = async (req, res) => {
  try {
    const { id } = req.params;
    const { title, category, description, goal, status } = req.body;

    if (!id.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid project ID format',
      });
    }

    // Prevent modification of calculated fields
    const protectedFields = ['totalRaised', 'donationCount'];
    const attempted = protectedFields.filter((f) => req.body[f] !== undefined);
    if (attempted.length > 0) {
      return res.status(400).json({
        success: false,
        error: 'Cannot manually update calculated fields',
        protectedFields: attempted,
      });
    }

    // Validate category if provided
    if (category && !VALID_CATEGORIES.includes(category.trim().toLowerCase())) {
      return res.status(400).json({
        success: false,
        error: 'Invalid category',
        validCategories: VALID_CATEGORIES,
      });
    }

    // Validate goal if provided
    if (goal !== undefined) {
      const goalNum = parseFloat(goal);
      if (isNaN(goalNum) || goalNum <= 0) {
        return res.status(400).json({
          success: false,
          error: 'Goal must be a positive number',
        });
      }
    }

    const updateData = {};
    if (title) updateData.title = title.trim();
    if (category) updateData.category = category.trim().toLowerCase();
    if (description) updateData.description = description.trim();
    if (goal !== undefined) updateData.goal = parseFloat(goal);
    if (status) updateData.status = status;

    const project = await Project.findByIdAndUpdate(
      id,
      updateData,
      { new: true, runValidators: true }
    ).lean();

    if (!project) {
      return res.status(404).json({
        success: false,
        error: 'Project not found',
      });
    }

    res.json({
      success: true,
      message: 'Project updated successfully',
      data: project,
    });
  } catch (error) {
    console.error('Error in updateProject:', error);

    if (error.name === 'ValidationError') {
      const errors = Object.values(error.errors).map((err) => ({
        field: err.path,
        message: err.message,
      }));
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        errors,
      });
    }

    res.status(500).json({
      success: false,
      error: 'Failed to update project',
      message: error.message,
    });
  }
};

// ============================================================================
// DELETE PROJECT
// ============================================================================

/**
 * Delete a project by ID
 *
 * @route DELETE /api/v1/projects/:id
 * @access Public
 */
exports.deleteProject = async (req, res) => {
  try {
    const { id } = req.params;

    if (!id.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid project ID format',
      });
    }

    const project = await Project.findByIdAndDelete(id);

    if (!project) {
      return res.status(404).json({
        success: false,
        error: 'Project not found',
      });
    }

    res.json({
      success: true,
      message: 'Project deleted successfully',
      deletedProject: {
        id: project._id,
        title: project.title,
        category: project.category,
        goal: project.goal,
        totalRaised: project.totalRaised,
      },
    });
  } catch (error) {
    console.error('Error in deleteProject:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete project',
      message: error.message,
    });
  }
};
