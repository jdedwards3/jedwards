import { AzureFunction, Context } from "@azure/functions";
import { formHelpers } from "../common/formHelpers";

const httpTrigger: AzureFunction = async function (
  context: Context
): Promise<void> {
  context.log("HTTP trigger function processed a request.");

  context.res!.headers["Content-Type"] = "application/json";

  const utcTime = new Date().toUTCString();

  const submitTime = new Date(
    new Date(context.bindingData.timeStamp).toUTCString()
  ).getTime();

  // add some skew
  const futureDateLimit = new Date(utcTime).getTime() + 1000 * 60 * 5;

  const pastDateLimit = new Date(utcTime).getTime() - 1000 * 60 * 5;

  if (submitTime > futureDateLimit || submitTime < pastDateLimit) {
    // don't create token but also don't return error
    context.res!.status = 200;
    context.res!.body = { message: "success" };
  } else {
    const token = await formHelpers.createToken();

    context.res!.status = 200;
    context.res!.body = { token: token, type: context.bindingData.formType };
  }
};

export default httpTrigger;
