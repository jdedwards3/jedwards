import * as azure from "azure-storage";

const createTableIfNotExists = (
  tableService: azure.TableService,
  tableName: string
) =>
  new Promise((resolve, reject) => {
    tableService.createTableIfNotExists(tableName, (error, result) => {
      if (error) {
        reject(error);
      } else {
        resolve({ result: result });
      }
    });
  });

const insertEntity = (
  tableService: azure.TableService,
  tableName: string,
  entity: any
) =>
  new Promise((resolve, reject) => {
    tableService.insertEntity(tableName, entity, (error, result) => {
      if (error) {
        reject(error);
      } else {
        resolve({ result: result });
      }
    });
  });

export { azure, createTableIfNotExists, insertEntity };
