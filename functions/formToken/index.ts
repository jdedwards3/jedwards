import { AzureFunction, Context, HttpRequest } from "@azure/functions";
import { formHelpers } from "../common/formHelpers";

const httpTrigger: AzureFunction = async function(
  context: Context,
  req: HttpRequest
): Promise<void> {
  context.log("HTTP trigger function processed a request.");

  const timeStamp = context.bindingData.timeStamp;

  const currentTimeStamp = new Date().valueOf();

  if (
    timeStamp > currentTimeStamp ||
    timeStamp < currentTimeStamp - 60 * 1000
  ) {
    context.res!.status = 400;
    context.res!.body = {
      message: "invalid request"
    };
  } else {
    context.res!.headers["Content-Type"] = "application/json";

    const token = await formHelpers.createToken();

    context.res!.status = 200;
    context.res!.body = { token };
  }
};

export default httpTrigger;
