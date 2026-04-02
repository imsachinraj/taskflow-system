const mongoose = require('mongoose');

const teamSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Team name is required'],
      trim: true,
      minlength: [2, 'Team name must be at least 2 characters'],
      maxlength: [100, 'Team name cannot exceed 100 characters'],
    },
    description: {
      type: String,
      trim: true,
      maxlength: [500, 'Description cannot exceed 500 characters'],
    },
    slug: {
      type: String,
      unique: true,
      lowercase: true,
    },
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    members: [
      {
        user: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User',
          required: true,
        },
        role: {
          type: String,
          enum: ['owner', 'admin', 'member', 'viewer'],
          default: 'member',
        },
        joinedAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],
    inviteCode: {
      type: String,
      unique: true,
    },
    inviteCodeExpires: Date,
    isActive: {
      type: Boolean,
      default: true,
    },
    settings: {
      isPublic: { type: Boolean, default: false },
      allowMemberInvite: { type: Boolean, default: true },
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// ─── Indexes ────────────────────────────────────────────────────────────────
teamSchema.index({ slug: 1 });
teamSchema.index({ owner: 1 });
teamSchema.index({ 'members.user': 1 });
teamSchema.index({ inviteCode: 1 });

// ─── Virtuals ───────────────────────────────────────────────────────────────
teamSchema.virtual('memberCount').get(function () {
  return this.members.length;
});

// ─── Pre-save: Generate slug & invite code ───────────────────────────────────
teamSchema.pre('save', async function (next) {
  if (this.isNew || this.isModified('name')) {
    const baseSlug = this.name
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, '')
      .replace(/\s+/g, '-');
    const randomSuffix = Math.random().toString(36).substring(2, 7);
    this.slug = `${baseSlug}-${randomSuffix}`;
  }

  if (this.isNew && !this.inviteCode) {
    const { v4: uuidv4 } = require('uuid');
    this.inviteCode = uuidv4().split('-')[0].toUpperCase();
    this.inviteCodeExpires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days
  }

  next();
});

// ─── Instance Methods ────────────────────────────────────────────────────────
teamSchema.methods.getMemberRole = function (userId) {
  const member = this.members.find((m) => m.user.toString() === userId.toString());
  return member ? member.role : null;
};

teamSchema.methods.isMember = function (userId) {
  return this.members.some((m) => m.user.toString() === userId.toString());
};

teamSchema.methods.hasPermission = function (userId, requiredRole) {
  const roleHierarchy = { viewer: 0, member: 1, admin: 2, owner: 3 };
  const memberRole = this.getMemberRole(userId);
  if (!memberRole) return false;
  return roleHierarchy[memberRole] >= roleHierarchy[requiredRole];
};

const Team = mongoose.model('Team', teamSchema);
module.exports = Team;
