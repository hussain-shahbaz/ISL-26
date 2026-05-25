export const validate =
  (schema) => {
    return async (
      req,
      res,
      next
    ) => {

      try {

        req.body =
          await schema.parseAsync(
            req.body
          );
        next();
      } catch (error) {

        return res.status(400)
          .json({

            message:
              "Validation failed",

            errors:
              error.errors
          });
      }
    };
};