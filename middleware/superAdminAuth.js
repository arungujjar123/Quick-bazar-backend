const jwt = require("jsonwebtoken");

const superAdminAuth = (req, res, next) => {
  try {
    let token = req.header("x-auth-token");

    if (!token) {
      const authHeader = req.header("Authorization");
      if (authHeader && authHeader.startsWith("Bearer ")) {
        token = authHeader.substring(7);
      }
    }

    if (!token) {
      return res.status(401).json({ message: "No token, access denied" });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    if (!decoded.isAdmin || decoded.role !== "super_admin") {
      return res
        .status(403)
        .json({ message: "Access denied. Super Admin privileges required." });
    }

    req.admin = decoded;
    next();
  } catch (error) {
    res.status(401).json({ message: "Token is not valid" });
  }
};

module.exports = superAdminAuth;
