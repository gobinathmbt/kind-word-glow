const auditService = require('../services/esign/audit.service');

/**
 * Create new signing group
 * POST /api/company/esign/signing-groups
 */
const createSigningGroup = async (req, res) => {
  try {
    const EsignSigningGroup = req.getModel('EsignSigningGroup');
    const companyId = req.user.company_id;
    const userId = req.user.id;

    const { name, description, members, signing_policy } = req.body;

    // Validate required fields (Req 79.1)
    if (!name || !name.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Signing group name is required'
      });
    }

    if (!members || !Array.isArray(members) || members.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'At least one member is required'
      });
    }

    // Validate member data
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    for (let i = 0; i < members.length; i++) {
      const member = members[i];
      
      if (!member.email || !emailRegex.test(member.email)) {
        return res.status(400).json({
          success: false,
          message: `Member ${i + 1}: valid email is required`
        });
      }
      
      if (!member.name || !member.name.trim()) {
        return res.status(400).json({
          success: false,
          message: `Member ${i + 1}: name is required`
        });
      }
    }

    // Validate signing_policy if provided
    if (signing_policy && !['any_member', 'all_members', 'majority'].includes(signing_policy)) {
      return res.status(400).json({
        success: false,
        message: 'signing_policy must be one of: any_member, all_members, majority'
      });
    }

    // Check for duplicate group name
    const existingGroup = await EsignSigningGroup.findOne({
      company_id: companyId,
      name: name.trim(),
      is_active: true
    });

    if (existingGroup) {
      return res.status(400).json({
        success: false,
        message: 'A signing group with this name already exists'
      });
    }

    // Create signing group
    const signingGroup = await EsignSigningGroup.create({
      company_id: companyId,
      name: name.trim(),
      description: description || '',
      members: members.map(m => ({
        email: m.email.toLowerCase(),
        name: m.name.trim(),
        user_id: m.user_id || null,
        is_active: m.is_active !== undefined ? m.is_active : true
      })),
      signing_policy: signing_policy || 'any_member',
      is_active: true,
      created_by: userId
    });

    // Log to audit
    await auditService.logEsignEvent({
      company_id: companyId,
      user_id: userId,
      action: 'signing_group.created',
      event_type: 'signing_group.created',
      resource: {
        type: 'signing_group',
        id: signingGroup._id.toString()
      },
      metadata: {
        name: signingGroup.name,
        member_count: signingGroup.members.length
      },
      ip_address: req.ip,
      user_agent: req.headers['user-agent']
    });

    res.status(201).json({
      success: true,
      data: signingGroup,
      message: 'Signing group created successfully'
    });
  } catch (error) {
    console.error('Error creating signing group:', error);
    res.status(500).json({
      success: false,
      message: 'Error creating signing group',
      error: error.message
    });
  }
};

/**
 * List signing groups with pagination and filters
 * GET /api/company/esign/signing-groups
 */
const listSigningGroups = async (req, res) => {
  try {
    const EsignSigningGroup = req.getModel('EsignSigningGroup');
    const companyId = req.user.company_id;

    const {
      page = 1,
      limit = 10,
      search,
      is_active,
      sort_by = 'createdAt',
      sort_order = 'desc'
    } = req.query;

    // Build query
    const query = { company_id: companyId };

    if (is_active !== undefined) {
      query.is_active = is_active === 'true';
    }

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
        { 'members.email': { $regex: search, $options: 'i' } },
        { 'members.name': { $regex: search, $options: 'i' } }
      ];
    }

    // Calculate pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const sortOrder = sort_order === 'asc' ? 1 : -1;

    // Execute query
    const [signingGroups, total] = await Promise.all([
      EsignSigningGroup.find(query)
        .sort({ [sort_by]: sortOrder })
        .skip(skip)
        .limit(parseInt(limit))
        .lean(),
      EsignSigningGroup.countDocuments(query)
    ]);

    res.json({
      success: true,
      data: signingGroups,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('Error listing signing groups:', error);
    res.status(500).json({
      success: false,
      message: 'Error listing signing groups',
      error: error.message
    });
  }
};

/**
 * Get single signing group details
 * GET /api/company/esign/signing-groups/:id
 */
const getSigningGroup = async (req, res) => {
  try {
    const EsignSigningGroup = req.getModel('EsignSigningGroup');
    const { id } = req.params;
    const companyId = req.user.company_id;

    const signingGroup = await EsignSigningGroup.findOne({
      _id: id,
      company_id: companyId
    }).lean();

    if (!signingGroup) {
      return res.status(404).json({
        success: false,
        message: 'Signing group not found'
      });
    }

    res.json({
      success: true,
      data: signingGroup
    });
  } catch (error) {
    console.error('Error getting signing group:', error);
    res.status(500).json({
      success: false,
      message: 'Error getting signing group',
      error: error.message
    });
  }
};

/**
 * Update signing group
 * PUT /api/company/esign/signing-groups/:id
 */
const updateSigningGroup = async (req, res) => {
  try {
    const EsignSigningGroup = req.getModel('EsignSigningGroup');
    const { id } = req.params;
    const companyId = req.user.company_id;
    const userId = req.user.id;

    const signingGroup = await EsignSigningGroup.findOne({
      _id: id,
      company_id: companyId
    });

    if (!signingGroup) {
      return res.status(404).json({
        success: false,
        message: 'Signing group not found'
      });
    }

    const { name, description, members, signing_policy, is_active } = req.body;

    // Validate name if provided
    if (name !== undefined) {
      if (!name.trim()) {
        return res.status(400).json({
          success: false,
          message: 'Signing group name cannot be empty'
        });
      }

      // Check for duplicate name (excluding current group)
      const existingGroup = await EsignSigningGroup.findOne({
        company_id: companyId,
        name: name.trim(),
        _id: { $ne: id },
        is_active: true
      });

      if (existingGroup) {
        return res.status(400).json({
          success: false,
          message: 'A signing group with this name already exists'
        });
      }

      signingGroup.name = name.trim();
    }

    // Validate members if provided
    if (members !== undefined) {
      if (!Array.isArray(members) || members.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'At least one member is required'
        });
      }

      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      for (let i = 0; i < members.length; i++) {
        const member = members[i];
        
        if (!member.email || !emailRegex.test(member.email)) {
          return res.status(400).json({
            success: false,
            message: `Member ${i + 1}: valid email is required`
          });
        }
        
        if (!member.name || !member.name.trim()) {
          return res.status(400).json({
            success: false,
            message: `Member ${i + 1}: name is required`
          });
        }
      }

      signingGroup.members = members.map(m => ({
        email: m.email.toLowerCase(),
        name: m.name.trim(),
        user_id: m.user_id || null,
        is_active: m.is_active !== undefined ? m.is_active : true,
        added_at: m.added_at || new Date()
      }));
    }

    // Validate signing_policy if provided
    if (signing_policy !== undefined) {
      if (!['any_member', 'all_members', 'majority'].includes(signing_policy)) {
        return res.status(400).json({
          success: false,
          message: 'signing_policy must be one of: any_member, all_members, majority'
        });
      }
      signingGroup.signing_policy = signing_policy;
    }

    if (description !== undefined) {
      signingGroup.description = description;
    }

    if (is_active !== undefined) {
      signingGroup.is_active = is_active;
    }

    signingGroup.updated_by = userId;
    await signingGroup.save();

    // Log to audit
    await auditService.logEsignEvent({
      company_id: companyId,
      user_id: userId,
      action: 'signing_group.updated',
      event_type: 'signing_group.updated',
      resource: {
        type: 'signing_group',
        id: signingGroup._id.toString()
      },
      metadata: {
        name: signingGroup.name,
        member_count: signingGroup.members.length
      },
      ip_address: req.ip,
      user_agent: req.headers['user-agent']
    });

    res.json({
      success: true,
      data: signingGroup,
      message: 'Signing group updated successfully'
    });
  } catch (error) {
    console.error('Error updating signing group:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating signing group',
      error: error.message
    });
  }
};

/**
 * Delete signing group (soft delete by setting is_active to false)
 * DELETE /api/company/esign/signing-groups/:id
 */
const deleteSigningGroup = async (req, res) => {
  try {
    const EsignSigningGroup = req.getModel('EsignSigningGroup');
    const EsignTemplate = req.getModel('EsignTemplate');
    const { id } = req.params;
    const companyId = req.user.company_id;
    const userId = req.user.id;

    const signingGroup = await EsignSigningGroup.findOne({
      _id: id,
      company_id: companyId
    });

    if (!signingGroup) {
      return res.status(404).json({
        success: false,
        message: 'Signing group not found'
      });
    }

    // Check if signing group is used in any active templates
    const templatesUsingGroup = await EsignTemplate.countDocuments({
      company_id: companyId,
      'recipients.signing_group_id': id,
      status: 'active',
      is_deleted: false
    });

    if (templatesUsingGroup > 0) {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete signing group that is used in active templates',
        templates_count: templatesUsingGroup
      });
    }

    // Soft delete
    signingGroup.is_active = false;
    signingGroup.updated_by = userId;
    await signingGroup.save();

    // Log to audit
    await auditService.logEsignEvent({
      company_id: companyId,
      user_id: userId,
      action: 'signing_group.deleted',
      event_type: 'signing_group.deleted',
      resource: {
        type: 'signing_group',
        id: signingGroup._id.toString()
      },
      metadata: {
        name: signingGroup.name
      },
      ip_address: req.ip,
      user_agent: req.headers['user-agent']
    });

    res.json({
      success: true,
      message: 'Signing group deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting signing group:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting signing group',
      error: error.message
    });
  }
};

/**
 * Add member to signing group
 * POST /api/company/esign/signing-groups/:id/members
 */
const addMember = async (req, res) => {
  try {
    const EsignSigningGroup = req.getModel('EsignSigningGroup');
    const { id } = req.params;
    const companyId = req.user.company_id;
    const userId = req.user.id;

    const signingGroup = await EsignSigningGroup.findOne({
      _id: id,
      company_id: companyId
    });

    if (!signingGroup) {
      return res.status(404).json({
        success: false,
        message: 'Signing group not found'
      });
    }

    const { email, name, user_id } = req.body;

    // Validate member data
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email || !emailRegex.test(email)) {
      return res.status(400).json({
        success: false,
        message: 'Valid email is required'
      });
    }

    if (!name || !name.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Name is required'
      });
    }

    // Check if member already exists
    const existingMember = signingGroup.members.find(
      m => m.email.toLowerCase() === email.toLowerCase()
    );

    if (existingMember) {
      return res.status(400).json({
        success: false,
        message: 'Member with this email already exists in the group'
      });
    }

    // Add member
    signingGroup.members.push({
      email: email.toLowerCase(),
      name: name.trim(),
      user_id: user_id || null,
      is_active: true,
      added_at: new Date()
    });

    signingGroup.updated_by = userId;
    await signingGroup.save();

    // Log to audit
    await auditService.logEsignEvent({
      company_id: companyId,
      user_id: userId,
      action: 'signing_group.member_added',
      event_type: 'signing_group.member_added',
      resource: {
        type: 'signing_group',
        id: signingGroup._id.toString()
      },
      metadata: {
        group_name: signingGroup.name,
        member_email: email,
        member_name: name
      },
      ip_address: req.ip,
      user_agent: req.headers['user-agent']
    });

    res.json({
      success: true,
      data: signingGroup,
      message: 'Member added successfully'
    });
  } catch (error) {
    console.error('Error adding member:', error);
    res.status(500).json({
      success: false,
      message: 'Error adding member',
      error: error.message
    });
  }
};

/**
 * Remove member from signing group
 * DELETE /api/company/esign/signing-groups/:id/members/:memberId
 */
const removeMember = async (req, res) => {
  try {
    const EsignSigningGroup = req.getModel('EsignSigningGroup');
    const { id, memberId } = req.params;
    const companyId = req.user.company_id;
    const userId = req.user.id;

    const signingGroup = await EsignSigningGroup.findOne({
      _id: id,
      company_id: companyId
    });

    if (!signingGroup) {
      return res.status(404).json({
        success: false,
        message: 'Signing group not found'
      });
    }

    // Find member
    const memberIndex = signingGroup.members.findIndex(
      m => m._id.toString() === memberId
    );

    if (memberIndex === -1) {
      return res.status(404).json({
        success: false,
        message: 'Member not found in signing group'
      });
    }

    // Check if this is the last member
    if (signingGroup.members.length === 1) {
      return res.status(400).json({
        success: false,
        message: 'Cannot remove the last member from a signing group'
      });
    }

    const removedMember = signingGroup.members[memberIndex];

    // Remove member
    signingGroup.members.splice(memberIndex, 1);
    signingGroup.updated_by = userId;
    await signingGroup.save();

    // Log to audit
    await auditService.logEsignEvent({
      company_id: companyId,
      user_id: userId,
      action: 'signing_group.member_removed',
      event_type: 'signing_group.member_removed',
      resource: {
        type: 'signing_group',
        id: signingGroup._id.toString()
      },
      metadata: {
        group_name: signingGroup.name,
        member_email: removedMember.email,
        member_name: removedMember.name
      },
      ip_address: req.ip,
      user_agent: req.headers['user-agent']
    });

    res.json({
      success: true,
      data: signingGroup,
      message: 'Member removed successfully'
    });
  } catch (error) {
    console.error('Error removing member:', error);
    res.status(500).json({
      success: false,
      message: 'Error removing member',
      error: error.message
    });
  }
};

module.exports = {
  createSigningGroup,
  listSigningGroups,
  getSigningGroup,
  updateSigningGroup,
  deleteSigningGroup,
  addMember,
  removeMember
};
