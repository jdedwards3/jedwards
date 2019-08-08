const errorHandler = async (response: Response) => {
  if (!response.ok) {
    const err = await response.json().then(err => err);

    throw Error(
      JSON.stringify({
        status: response.status,
        statusText: response.statusText,
        error: err
      })
    );
  }

  return response;
};

const errorLogger = (error: Error) => {
  // overwrite message to inform user
  error.message = "An error occured. Please try again.";
  return error;
};

export { errorHandler, errorLogger };
