
export const validate =
  (schema) => {

    return async (
      req,
      res,
      next
    ) => {

      try {

        // VALIDATE REQUEST BODY
        req.body =
          await schema.parseAsync(
            req.body
          );

        next();

      } catch (error) {

        // FORMAT ERRORS
        const formattedErrors =
          error.issues.map(
            (issue) => ({

              field:
                issue.path[0],

              message:
                issue.message
            })
          );

        return res
          .status(400)
          .json({

            success: false,

            message:
              "Validation failed",

            errors:
              formattedErrors
          });
      }
    };
  };