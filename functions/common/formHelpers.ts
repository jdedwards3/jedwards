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
    return false;
  }
  return true;
};

const createToken = async () => {
  const tokens = new csrf();

  const secret = await tokens.secret();

  const token = tokens.create(secret);

  const csrfEntity = {
    PartitionKey: "csrf",
    RowKey: token,
    secret: secret
  };

  await storageHelpers.createTableIfNotExists(csrfTable);

  // todo: check successful insert
  await storageHelpers.insertEntity(csrfTable, csrfEntity);

  return token;
};

// tokens are only good once
const verifyToken = async (body: ParsedUrlQuery) => {
  // todo: create interface
  let csrfEntity = null;

  let tokenStatus = false;

  try {
    csrfEntity = await storageHelpers.retrieveEntity(
      csrfTable,
      "csrf",
      body._csrf as string
    );

    if (
      new csrf().verify(csrfEntity.secret["_"], csrfEntity.RowKey["_"]) &&
      new Date(csrfEntity.Timestamp["_"]).getTime() >
        new Date(new Date().toUTCString()).getTime() - 1000 * 60 * 5
    ) {
      tokenStatus = true;
    }
    await storageHelpers.deleteEntity(csrfTable, csrfEntity);
  } catch (error) {
    throw error;
    // todo: if token not in request it is stuck storage
    // get tokens older than 5 mins old and delete?
  }
  return tokenStatus;
};

const formHelpers = { verifiedRequestBody, createToken, verifyToken };

export { formHelpers };
