const db = require("../models");
const { Role, RoleScope, Scope, UserRole } = db;

/**
 * verifyAccess(requiredScopes)
 * Usage: router.get("/admin", verifyToken, verifyAccess(["user.manage", "orders.view"]), handler)
 */
module.exports = (requiredScopes = []) => {
  return async (req, res, next) => {
    try {
      const { id } = req.user;

      // Fetch user's roles
      const userRoles = await UserRole.findAll({ where: { userId: id } });
      const roleIds = userRoles.map((ur) => ur.roleId);

      if (roleIds.length === 0)
        return res.status(403).json({ message: "No role assigned to this user" });

      // Fetch role scopes
      const roleScopes = await RoleScope.findAll({
        where: { roleId: roleIds },
        include: [{ model: Scope, as: "scope" }],
      });

      const userScopes = roleScopes.map((rs) => rs.scope?.name);

      // Check if required scopes exist in userScopes
      const hasAccess = requiredScopes.every((scope) =>
        userScopes.includes(scope)
      );

      if (!hasAccess)
        return res.status(403).json({ message: "Access denied: insufficient permissions" });

      next();
    } catch (err) {
      console.error("❌ verifyAccess error:", err.message);
      res.status(500).json({ message: "Error verifying access" });
    }
  };
};
