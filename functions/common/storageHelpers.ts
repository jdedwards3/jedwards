import * as azureStorage from "azure-storage";

const tableService = azureStorage.createTableService(
  process.env["TableStorageConnection"] as string
);

const createTableIfNotExists = (tableName: string) =>
  new Promise((resolve, reject) => {
    tableService.createTableIfNotExists(tableName, (error, result) => {
      if (error) {
        reject(error);
      } else {
        resolve(result);
      }
    });
  });

const insertEntity = (tableName: string, entity: any) =>
  new Promise((resolve, reject) => {
    tableService.insertEntity(tableName, entity, (error, result) => {
      if (error) {
        reject(error);
      } else {
        resolve(result);
      }
    });
  });

const retrieveEntity = (
  tableName: string,
  partitionKey: string,
  rowKey: string
): Promise<any> =>
  new Promise((resolve, reject) => {
    tableService.retrieveEntity(
      tableName,
      partitionKey,
      rowKey,
      (error, result) => {
        if (error) {
          reject(error);
        } else {
          resolve(result);
        }
      }
    );
  });

const deleteEntity = (tableName: string, entity: any): Promise<any> =>
  new Promise((resolve, reject) => {
    tableService.deleteEntity(tableName, entity, (error, result) => {
      if (error) {
        reject(error);
      } else {
        resolve(result);
      }
    });
  });

const getSharedAccessPolicy = () => {
  const startDate = new Date();
  const expiryDate = new Date(startDate);

  expiryDate.setMinutes(startDate.getMinutes() + 15);
  startDate.setMinutes(startDate.getMinutes() - 15);

  const sharedAccessPolicy: azureStorage.TableService.TableSharedAccessPolicy = {
    AccessPolicy: {
      Permissions: azureStorage.TableUtilities.SharedAccessPermissions.QUERY,
      Start: startDate,
      Expiry: expiryDate
    }
  };

  return sharedAccessPolicy;
};

const storageHelpers = {
  tableService,
  createTableIfNotExists,
  insertEntity,
  retrieveEntity,
  deleteEntity,
  getSharedAccessPolicy
};

export { storageHelpers };
