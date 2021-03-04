import * as csrf from "csrf";
import { ParsedUrlQuery } from "querystring";

const verifiedRequestBody = async (body: ParsedUrlQuery) => {
  if (
    body &&
    (body.password_honeyBadger === undefined ||
      body.password_honeyBadger.length ||
      !(await verifyToken(body)))
  ) {
    return false;
  }
  return true;
};

const createToken = async () => {
  const tokens = new csrf();

  const token = tokens.create(process.env["CSRF_TOKEN_SECRET"] as string);

  return token;
};

const verifyToken = async (body: ParsedUrlQuery) => {
  return (
    new csrf().verify(
      process.env["CSRF_TOKEN_SECRET"] as string,
      body._csrf as string
    ) &&
    Number(body.timestamp) >
      new Date(new Date().toUTCString()).getTime() - 1000 * 60 * 5
  );
};

const formHelpers = { verifiedRequestBody, createToken, verifyToken };

export { formHelpers };
