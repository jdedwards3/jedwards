export const config: any = {
  local: {
    domain: "http://localhost:8080",
    functionsUrl: "http://localhost:7071/api"
  },
  staging: {
    domain: "https://jedwards-staging.azureedge.net",
    functionsUrl: "https://jedwards-staging.azurewebsites.net/api"
  },
  production: {
    domain: "https://www.jamesedwards.name",
    functionsUrl: "https://jedwards.azurewebsites.net/api"
  },
  version: "1.4.4"
};
