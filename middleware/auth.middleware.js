import jwt from "jsonwebtoken";

export const authenticateUser = (req, res, next) => {
  const token = req.header("Authorization");

  if (!token) return res.status(401).json({ error: "Access denied" });

  try {
    const verified = jwt.verify(
      token.replace("Bearer ", ""),
      process.env.JWT_SECRET
    );
    req.user = verified;
    next();
  } catch (error) {
    console.log(error);
    res.status(400).json({ error: "Invalid token" });
  }
};
