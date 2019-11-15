import * as csrf from "csrf";
import { storageHelpers } from "../common/storageHelpers";
import { ParsedUrlQuery } from "querystring";
const csrfTable = "csrf";

const verifiedRequestBody = async (body: ParsedUrlQuery) => {
  if (
    body &&
    (body.password_honeyBadger === undefined ||
      body.password_honeyBadger.length ||
      !(await verifyToken(body)))
  ) {
    return true;
  }
  return false;
};

const createToken = async () => {
  const tokens = new csrf();

  const secret = await tokens.secret();

  await storageHelpers.createTableIfNotExists(csrfTable);

  const token = tokens.create(secret);

  const csrfEntity = {
    PartitionKey: "csrf",
    RowKey: token,
    secret: secret
  };

  // todo: check successful insert
  await storageHelpers.insertEntity(csrfTable, csrfEntity);

  return token;
};

// tokens are only good once
const verifyToken = async (body: ParsedUrlQuery) => {
  const csrfEntity = await storageHelpers.retrieveEntity(
    csrfTable,
    "csrf",
    body._csrf as string
  );

  if (new csrf().verify(csrfEntity.secret["_"], csrfEntity.RowKey["_"])) {
    // todo: check successful delete
    await storageHelpers.deleteEntity(csrfTable, csrfEntity);

    return true;
  }

  return false;
};

const formHelpers = { verifiedRequestBody, createToken, verifyToken };

export { formHelpers };
