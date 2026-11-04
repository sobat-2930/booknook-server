import { createRemoteJWKSet, jwtVerify } from "jose";

let jwks;

function getJWKS() {
  const base = process.env.AUTH_URL;
  if (!base) {
    throw new Error("AUTH_URL is missing in the server .env file");
  }
  if (!jwks) {
    jwks = createRemoteJWKSet(new URL(`${base}/api/auth/jwks`));
  }
  return jwks;
}

export async function verifyJWT(req, res, next) {
  const header = req.headers.authorization;

  if (!header || !header.startsWith("Bearer ")) {
    return res.status(401).send({ message: "Unauthorized: token is missing." });
  }

  const token = header.split(" ")[1];

  try {
    const { payload } = await jwtVerify(token, getJWKS());

    req.user = {
      id: payload.id ?? payload.sub,
      email: payload.email,
      name: payload.name,
    };

    if (!req.user.email) {
      throw new Error("token has no email");
    }
    next();
  } catch (err) {
    console.error("JWT verify failed:", err.message);
    return res.status(401).send({ message: `Unauthorized: ${err.message}` });
  }
}