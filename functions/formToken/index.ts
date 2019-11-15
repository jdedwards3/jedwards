import { AzureFunction, Context, HttpRequest } from "@azure/functions";
import { formHelpers } from "../common/formHelpers";

const httpTrigger: AzureFunction = async function(
  context: Context,
  req: HttpRequest
): Promise<void> {
  context.log("HTTP trigger function processed a request.");

  context.res!.headers["Content-Type"] = "application/json";

  const utcTime = new Date().toUTCString();

  // todo: use moment?
  const submitTime = new Date(
    new Date(context.bindingData.timeStamp).toUTCString()
  ).getTime();

  // add some skew
  const futureDateLimit = new Date(utcTime).getTime() + 1000 * 60 * 5;

  const pastDateLimit = new Date(utcTime).getTime() - 1000 * 60 * 5;

  if (submitTime > futureDateLimit || submitTime < pastDateLimit) {
    context.res!.status = 400;
    context.res!.body = {
      message: "invalid request"
    };
  } else {
    const token = await formHelpers.createToken();

    context.res!.status = 200;
    context.res!.body = { token };
  }
};

export default httpTrigger;
